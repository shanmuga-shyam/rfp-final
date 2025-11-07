import contextlib
from fastapi import FastAPI, HTTPException, Form
import uuid
import shutil
import os
from fastapi import UploadFile, File
from agents.extract_rfp_structure import extract_rfp_structure
from pydantic_models.datatypes import RFP_STORE
from fastapi import APIRouter
import tempfile
import requests
from pydantic import BaseModel
from methods.functions import Session,Depends,get_db,require_role1

from models.schema import RFP,User,UserRole,Employee

router = APIRouter(prefix="/api", tags=["RFP"])

class temp(BaseModel):
    file_name:str
    
@router.post("/upload-rfp/", response_model=dict)
async def upload_rfp(
    file_name: str = Form(...),
    current_user: Employee = Depends(require_role1([UserRole.EMPLOYEE])),
    db: Session = Depends(get_db)
):
    # defensive initialization
    temp_file = None
    file_path = None

    # Find the RFP record first and validate
    rfp = db.query(RFP).filter(RFP.filename == file_name).first()
    if not rfp:
        raise HTTPException(status_code=404, detail="RFP not found for provided file_name")

    file_url = getattr(rfp, "file_url", None)
    rfp_id = getattr(rfp, "id", None)
    company_id = getattr(rfp, "company_id", None)

    try:
        if not file_url:
            raise HTTPException(status_code=400, detail="No file_url available for this RFP")

        # Debug: log rfp and file_url
        print(f"upload_rfp: rfp_id={rfp_id}, company_id={company_id}, file_url={file_url}")

        # Download from S3 or HTTP(S) URL
        response = requests.get(file_url, stream=True, timeout=30)
        print(f"download status: {getattr(response, 'status_code', None)}")
        if response.status_code != 200:
            # include response text in debug logs (but don't expose to clients)
            print(f"download failed, status={response.status_code}, text={response.text[:500]}")
            raise HTTPException(status_code=400, detail="Failed to download file from URL")

        file_extension = os.path.splitext(file_url)[1] or ".tmp"
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_extension)
        for chunk in response.iter_content(chunk_size=8192):
            if chunk:
                temp_file.write(chunk)
        temp_file.close()
        file_path = temp_file.name
        print("santhosh3, temp saved:", file_path)

        # Attempt to extract structure from file_path; trap and log errors
        try:
            structured_data = extract_rfp_structure(file_path)
        except Exception as exc:
            print("extract_rfp_structure raised:", repr(exc))
            traceback.print_exc()
            # ensure file removed before raising
            if file_path and os.path.exists(file_path):
                with contextlib.suppress(Exception):
                    os.remove(file_path)
            raise HTTPException(status_code=500, detail=f"Failed to process document: {str(exc)}")

        # Clean up downloaded temp
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

        structured_data["company_id"] = company_id
        structured_data["employee_id"] = current_user.id
        structured_data["rfp_id"] = rfp_id
        print("structured_data keys:", list(structured_data.keys()) if isinstance(structured_data, dict) else type(structured_data))
        return {
            "message": "RFP uploaded and processed successfully",
            "structured_data": structured_data
        }
    except HTTPException:
        # re-raise HTTPExceptions so FastAPI can handle them unchanged
        raise
    except Exception as e:
        # cleanup
        if file_path and os.path.exists(file_path):
            with contextlib.suppress(Exception):
                os.remove(file_path)
        # Log the exception to stdout for debugging and return a 500
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing RFP: {str(e)}")
    finally:
        if temp_file:
            with contextlib.suppress(Exception):
                with contextlib.suppress(Exception):
                    os.remove(temp_file.name)