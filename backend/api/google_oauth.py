from fastapi import APIRouter, Request, HTTPException, Depends
from starlette.responses import RedirectResponse, JSONResponse
from starlette.config import Config
from authlib.integrations.starlette_client import OAuth
from methods.functions import (
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    get_db,
    get_password_hash,
    SECRET_KEY,
)
from datetime import timedelta
from sqlalchemy.orm import Session
from models.schema import User
from pydantic import BaseModel
from passlib.hash import bcrypt
from fastapi.security import OAuth2PasswordBearer
import os
import traceback
import logging
from jose import jwt

# Load environment config (if you use a .env file, starlette Config can still read it)
config = Config(".env")

oauth = OAuth(config)

# Register Google OAuth client. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
google = oauth.register(
    name="google",
    client_id=config("GOOGLE_CLIENT_ID", default=None),
    client_secret=config("GOOGLE_CLIENT_SECRET", default=None),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    api_base_url="https://www.googleapis.com/oauth2/v1/",
    client_kwargs={"scope": "openid email profile"},
)

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

@router.get("/api/login/google")
async def login_google(request: Request):
    # Build redirect URI for the OAuth callback. This must match the redirect URI configured
    # in your Google API Console for the OAuth client.
    redirect_uri = str(request.url_for("google_auth"))
    return await google.authorize_redirect(request, redirect_uri)

from urllib.parse import urlencode

@router.get("/api/auth", name="google_auth")
async def google_auth(request: Request, db: Session = Depends(get_db)):
    try:
        # Exchange the authorization code for tokens
        token_data = await google.authorize_access_token(request)

        # Try to parse the ID token (preferred for OIDC) then fallback to userinfo endpoint
        user_info = None
        try:
            user_info = await google.parse_id_token(request, token_data)
        except Exception:
            # Fallback: call userinfo endpoint
            try:
                resp = await google.get("userinfo", token=token_data)
                user_info = resp.json()
            except Exception:
                logging.exception("Failed to obtain user info from Google")
                raise HTTPException(status_code=400, detail="Failed to obtain user info from Google")

        logging.debug("User Info: %s", user_info)

        # Accept either 'verified_email' or 'email_verified' key depending on provider
        email_verified = user_info.get("verified_email") or user_info.get("email_verified")
        if not email_verified:
            raise HTTPException(status_code=400, detail="Email not verified by Google")

        user_email = user_info.get("email")
        user_name = user_info.get("name") or user_info.get("given_name") or user_email

        # Look for user in your DB
        user = db.query(User).filter(User.email == user_email).first()

        frontend_base = os.getenv("FRONTEND_URL", "http://localhost:3000")

        if not user:
            # If user doesn't exist, redirect to frontend register/login with pre-filled info
            return RedirectResponse(
                f"{frontend_base}/login?email={user_email}&name={user_name}"
            )

        # ✅ User exists — create JWT token (use create_access_token for consistent signing)
        jwt_payload = {
            "sub": user.email,
            "name": user.username,
            "role": user.role,
        }

        logging.debug("JWT Payload: %s", jwt_payload)

        jwt_token = create_access_token(jwt_payload, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))

        # ✅ Send token and role to frontend
        query_params = urlencode({
            "token": jwt_token,
            "email": user.email,
            "name": user.username,
            "role": user.role,
        })

        return RedirectResponse(f"{frontend_base}/login?{query_params}")

    except Exception as e:
        print("OAuth Error:", repr(e))
        traceback.print_exc()
        raise HTTPException(status_code=400, detail="OAuth login failed")
    
# Pydantic model for registration input
class UserRegistrationRequest(BaseModel):
    email: str
    name: str
    password: str  # plain text

@router.post("/api/register")
async def register_user(user_data: UserRegistrationRequest, db: Session = Depends(get_db)):
    try:
        # Check if user already exists
        if db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(status_code=400, detail="User already exists")

        # Hash password before storing
        hashed_pw = get_password_hash(user_data.password)

        # Ensure the fields match the User model: username and hashed_password
        new_user = User(username=user_data.name, email=user_data.email, hashed_password=hashed_pw)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return {"message": "User registered successfully"}

    except Exception as e:
        print("Registration error:", e)
        raise HTTPException(status_code=500, detail="Failed to register user")

@router.get("/api/user/me")
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        # Use the same SECRET_KEY as the rest of the app (from methods.functions)
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")

        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")

        if not (user := db.query(User).filter(User.email == email).first()):
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "id": user.id,
            "email": user.email,
            "name": user.username,
            "role": user.role,
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
