from fastapi import APIRouter, Depends, HTTPException,Body
from sqlalchemy.orm import Session
from models.schema import RFP
from methods.functions import get_db

router = APIRouter(prefix="/api", tags=["RFP"])

@router.get("/rfps/{rfp_id}/messages")
def get_rfp_messages(rfp_id: int, db: Session = Depends(get_db)):
    rfp = db.query(RFP).filter(RFP.id == rfp_id).first()
    if not rfp:
        raise HTTPException(status_code=404, detail="RFP not found.")
    # Return the message list as is
    return {"messages": rfp.message or []}

@router.post("/admin/rfps/message")
def send_admin_message(message: dict = Body(...), db: Session = Depends(get_db)):
    try:
        rfp = db.query(RFP).filter(RFP.id == message.get("id")).first()
        if not rfp:
            raise HTTPException(status_code=404, detail="RFP not found.")

        content = message.get("content")
        if not content:
            raise HTTPException(status_code=400, detail="Message content is required.")

        if not rfp.message:
            rfp.message = []
        rfp.message.append({"admin": content})

        db.commit()
        return {"messages": rfp.message}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send admin message: {str(e)}")

@router.post("/employee/rfps/message")
def send_employee_message(message: dict = Body(...), db: Session = Depends(get_db)):
    rfp = db.query(RFP).filter(RFP.id == message.get("id")).first()
    if rfp:
        if not rfp.message:
            rfp.message = []    
        rfp.message.append({"employee": message.get("content")})
        db.commit()
        return {"messages": rfp.message}
    raise HTTPException(status_code=404, detail="RFP not found.")
