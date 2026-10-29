import re
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models import (
    RFQ, RFQItem, RFQStatusHistory, Seller, SellerContact, Organisation,
    generate_uuid
)
from ..schemas import RFQCreate, RFQResponse, RFQStatusHistoryResponse

def generate_rfq_reference(db: Session) -> str:
    """
    Generates a unique, professional sequential reference: RFQ-YYYY-XXXX
    """
    current_year = datetime.now(timezone.utc).year
    prefix = f"RFQ-{current_year}-"
    
    # Query last RFQ for this year
    last_rfq = (
        db.query(RFQ)
        .filter(RFQ.rfq_reference.like(f"{prefix}%"))
        .order_by(RFQ.created_at.desc())
        .first()
    )
    
    if last_rfq and last_rfq.rfq_reference:
        try:
            seq_num = int(last_rfq.rfq_reference.replace(prefix, "")) + 1
        except ValueError:
            seq_num = 1001
    else:
        seq_num = 1001
        
    return f"{prefix}{seq_num:04d}"


def build_rfq_email_template(
    rfq_reference: str,
    company_name: str,
    contact_person: str,
    business_email: str,
    phone: Optional[str],
    part_number: str,
    manufacturer: str,
    quantity: int,
    delivery_location: str,
    delivery_date: Optional[str],
    seller_name: str,
    notes: Optional[str]
) -> str:
    """
    Constructs a formal, industry-standard copyable RFQ email message.
    """
    date_str = delivery_date or "ASAP / Next Scheduled Production Batch"
    phone_str = f" | Phone: {phone}" if phone else ""
    tech_notes = f"\nTechnical / Sourcing Notes:\n{notes}\n" if notes else ""

    template = f"""Subject: Request for Quotation: {part_number} (Qty: {quantity}) - Ref: {rfq_reference}

Dear {seller_name} Commercial & Sales Desk,

We are seeking a formal commercial quotation for the following electronic component for our production assembly:

• Requested Part Number: {part_number}
• Manufacturer: {manufacturer}
• Required Quantity: {quantity} units
• Target Delivery Location: {delivery_location}
• Required Delivery Schedule: {date_str}
• Platform RFQ Reference: {rfq_reference}
{tech_notes}
Could you please provide a formal quote addressing:
1. Unit price breakdown & volume price tiers (in INR or USD)
2. Current stock availability and lead time in business days
3. Minimum Order Quantity (MOQ) and packaging format (Cut Tape / Reel / Tray)
4. Official Component Datasheet & Certificate of Conformance (CoC)
5. Manufacturer Country of Origin (CoO) declaration

Buyer Details:
Company: {company_name}
Contact Person: {contact_person}
Email: {business_email}{phone_str}

Please reply directly to {business_email}. Thank you for your assistance.

Best regards,
{contact_person}
{company_name}
"""
    return template.strip()


def create_rfq(db: Session, rfq_in: RFQCreate, org_id: Optional[str] = None) -> RFQ:
    """
    Creates and persists an RFQ in the database.
    Enforces validation and draft vs submitted integrity.
    """
    # 1. Validation
    if rfq_in.quantity_requested <= 0:
        raise ValueError("Requested quantity must be at least 1 unit.")
        
    email_regex = r"^[^@]+@[^@]+\.[^@]+$"
    if not re.match(email_regex, rfq_in.business_email.strip()):
        raise ValueError("Invalid business email address format.")

    # 2. Resolve Organisation ID
    if not org_id:
        default_org = db.query(Organisation).first()
        org_id = default_org.id if default_org else generate_uuid()

    # 3. Resolve Seller Contact Email
    seller_email = None
    seller_name = rfq_in.seller_name or "Component Supplier"
    
    if rfq_in.seller_id:
        seller = db.query(Seller).filter(Seller.id == rfq_in.seller_id).first()
        if seller:
            seller_name = seller.name
            email_contact = (
                db.query(SellerContact)
                .filter(
                    SellerContact.seller_id == seller.id,
                    SellerContact.contact_type == "EMAIL"
                )
                .first()
            )
            if email_contact:
                seller_email = email_contact.value

    # 4. Generate unique reference
    reference = generate_rfq_reference(db)

    # 5. Build copyable message body
    email_body = build_rfq_email_template(
        rfq_reference=reference,
        company_name=rfq_in.company_name.strip(),
        contact_person=rfq_in.contact_person.strip(),
        business_email=rfq_in.business_email.strip(),
        phone=rfq_in.phone.strip() if rfq_in.phone else None,
        part_number=rfq_in.part_number.strip(),
        manufacturer=rfq_in.manufacturer.strip(),
        quantity=rfq_in.quantity_requested,
        delivery_location=rfq_in.target_delivery_location.strip(),
        delivery_date=rfq_in.target_delivery_date.strip() if rfq_in.target_delivery_date else None,
        seller_name=seller_name,
        notes=rfq_in.notes.strip() if rfq_in.notes else None
    )

    # 6. Safety Rule: Show "Saved as draft" (or READY_TO_SEND) if no live seller API is connected.
    # Never claim that an email was sent when no integration submitted it!
    initial_status = "DRAFT"
    submission_method = "MANUAL_EMAIL"

    rfq = RFQ(
        id=generate_uuid(),
        rfq_reference=reference,
        org_id=org_id,
        bom_id=rfq_in.bom_id,
        seller_id=rfq_in.seller_id,
        seller_name=seller_name,
        company_name=rfq_in.company_name.strip(),
        contact_person=rfq_in.contact_person.strip(),
        business_email=rfq_in.business_email.strip(),
        phone=rfq_in.phone.strip() if rfq_in.phone else None,
        part_number=rfq_in.part_number.strip(),
        manufacturer=rfq_in.manufacturer.strip(),
        quantity_requested=rfq_in.quantity_requested,
        target_delivery_location=rfq_in.target_delivery_location.strip(),
        target_delivery_date=rfq_in.target_delivery_date.strip() if rfq_in.target_delivery_date else None,
        notes=rfq_in.notes.strip() if rfq_in.notes else None,
        status=initial_status,
        submission_method=submission_method,
        seller_contact_email=seller_email,
        generated_email_body=email_body,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(rfq)
    db.flush()

    # Add RFQ Line Item
    rfq_item = RFQItem(
        id=generate_uuid(),
        rfq_id=rfq.id,
        part_number=rfq_in.part_number.strip(),
        manufacturer=rfq_in.manufacturer.strip(),
        quantity=rfq_in.quantity_requested,
        notes=rfq_in.notes
    )
    db.add(rfq_item)

    # Add initial status history record
    history = RFQStatusHistory(
        id=generate_uuid(),
        rfq_id=rfq.id,
        previous_status=None,
        new_status=initial_status,
        changed_by=rfq_in.contact_person,
        notes="RFQ created and saved as draft. Ready for dispatch via verified supplier contact.",
        changed_at=datetime.now(timezone.utc)
    )
    db.add(history)
    db.commit()
    db.refresh(rfq)

    return rfq


def update_rfq_status(
    db: Session,
    rfq_id: str,
    new_status: str,
    notes: Optional[str] = None,
    changed_by: str = "User"
) -> RFQ:
    """
    Updates an RFQ's operational lifecycle status and appends audit history.
    """
    valid_statuses = [
        "DRAFT",
        "READY_TO_SEND",
        "SENT_BY_USER",
        "SUBMITTED_VIA_INTEGRATION",
        "RESPONSE_RECEIVED",
        "CLOSED"
    ]
    if new_status not in valid_statuses:
        raise ValueError(f"Invalid status '{new_status}'. Must be one of: {', '.join(valid_statuses)}")

    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise ValueError("RFQ not found.")

    old_status = rfq.status
    rfq.status = new_status
    rfq.updated_at = datetime.now(timezone.utc)

    # Log history
    history = RFQStatusHistory(
        id=generate_uuid(),
        rfq_id=rfq.id,
        previous_status=old_status,
        new_status=new_status,
        changed_by=changed_by,
        notes=notes or f"Status transitioned from {old_status} to {new_status}",
        changed_at=datetime.now(timezone.utc)
    )
    db.add(history)
    db.commit()
    db.refresh(rfq)

    return rfq
