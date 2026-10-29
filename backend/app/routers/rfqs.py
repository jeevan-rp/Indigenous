import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import RFQ, RFQItem, RFQStatusHistory, Organisation
from ..schemas import (
    RFQCreate, RFQResponse, RFQStatusUpdate, RFQStatusHistoryResponse
)
from ..services.rfq_service import (
    create_rfq, update_rfq_status
)

router = APIRouter(prefix="/rfqs", tags=["Request for Quotation (RFQ)"])

@router.post("", response_model=RFQResponse, status_code=status.HTTP_201_CREATED)
def submit_rfq(rfq_in: RFQCreate, db: Session = Depends(get_db)):
    """
    Submits a new Request for Quotation.
    Saves RFQ with unique reference (e.g. RFQ-2026-XXXX).
    Enforces truthful status: Saved as Draft / Ready to Send, unless a live EDI integration submits it.
    """
    try:
        rfq = create_rfq(db=db, rfq_in=rfq_in)
        return rfq
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create RFQ: {str(e)}")


@router.get("", response_model=List[RFQResponse])
def list_rfqs(
    status_filter: Optional[str] = Query(None, alias="status"),
    part_number: Optional[str] = Query(None),
    seller_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Lists tracked RFQs with optional status or part filters.
    """
    query = db.query(RFQ)
    if status_filter:
        query = query.filter(RFQ.status == status_filter)
    if part_number:
        query = query.filter(RFQ.part_number.ilike(f"%{part_number.strip()}%"))
    if seller_id:
        query = query.filter(RFQ.seller_id == seller_id)
        
    rfqs = query.order_by(RFQ.created_at.desc()).all()
    return rfqs


@router.get("/{rfq_id}", response_model=RFQResponse)
def get_rfq(rfq_id: str, db: Session = Depends(get_db)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq


@router.patch("/{rfq_id}/status", response_model=RFQResponse)
def change_rfq_status(
    rfq_id: str,
    update_data: RFQStatusUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates the operational lifecycle status of an RFQ.
    Valid statuses: DRAFT, READY_TO_SEND, SENT_BY_USER, SUBMITTED_VIA_INTEGRATION, RESPONSE_RECEIVED, CLOSED
    """
    try:
        rfq = update_rfq_status(
            db=db,
            rfq_id=rfq_id,
            new_status=update_data.status,
            notes=update_data.notes,
            changed_by=update_data.changed_by or "User"
        )
        return rfq
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.get("/{rfq_id}/mailto")
def get_rfq_mailto(rfq_id: str, db: Session = Depends(get_db)):
    """
    Generates a pre-populated mailto URL for verified manual client dispatch.
    """
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    recipient = rfq.seller_contact_email or ""
    subject = f"Request for Quotation: {rfq.part_number} (Qty: {rfq.quantity_requested}) - Ref: {rfq.rfq_reference}"
    body = rfq.generated_email_body or ""
    
    mailto_url = f"mailto:{recipient}?subject={urllib.parse.quote(subject)}&body={urllib.parse.quote(body)}"
    
    return {
        "rfq_reference": rfq.rfq_reference,
        "recipient_email": recipient,
        "has_verified_email": bool(recipient),
        "subject": subject,
        "body": body,
        "mailto_url": mailto_url,
        "instructions": (
            "No direct EDI/API transmission configured for this seller. "
            "Click the mailto link or copy the formatted text below to dispatch from your corporate mail client."
        )
    }
