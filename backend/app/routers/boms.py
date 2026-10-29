import os
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import BOM, BOMItem, Component, Organisation, generate_uuid
from ..schemas import BOMResponse, BOMItemCreate
from ..services.bom_parser import parse_bom_file
from ..config import settings

router = APIRouter(prefix="/boms", tags=["BOMs"])

@router.get("", response_model=List[BOMResponse])
def list_boms(db: Session = Depends(get_db)):
    boms = db.query(BOM).order_by(BOM.created_at.desc()).all()
    return boms

@router.get("/{bom_id}", response_model=BOMResponse)
def get_bom(bom_id: str, db: Session = Depends(get_db)):
    bom = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")
    return bom

@router.delete("/{bom_id}", status_code=status.HTTP_200_OK)
def delete_bom(bom_id: str, db: Session = Depends(get_db)):
    bom = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")
    db.delete(bom)
    db.commit()
    return {"message": f"BOM '{bom.name}' deleted successfully", "id": bom_id}

@router.post("/preview")
async def preview_bom_upload(file: UploadFile = File(...)):
    """Validates file and returns preview data before persisting to DB."""
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB"
        )
    result = parse_bom_file(contents, file.filename or "bom.csv")
    return result

@router.post("/upload", response_model=BOMResponse)
async def upload_bom(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB"
        )

    filename = file.filename or "uploaded_bom.csv"
    parse_result = parse_bom_file(contents, filename)

    if not parse_result["success"]:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "BOM file validation failed. Review rows and headers before uploading.",
                "errors": parse_result["errors"]
            }
        )

    # Save raw file to private upload dir (not served publicly)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    stored_path = os.path.join(settings.UPLOAD_DIR, f"{generate_uuid()}_{filename}")
    with open(stored_path, "wb") as f:
        f.write(contents)

    # Get or create default organisation
    org = db.query(Organisation).first()
    if not org:
        org = Organisation(name="Default Workspace", slug="default-workspace")
        db.add(org)
        db.flush()

    items_data = parse_result["items"]
    total_qty = sum(item["quantity"] for item in items_data)
    bom_name = name or os.path.splitext(filename)[0].replace("_", " ").title()

    bom = BOM(
        id=generate_uuid(),
        org_id=org.id,
        name=bom_name,
        description=description or f"Uploaded from {filename} with {len(items_data)} line items",
        filename=filename,
        total_items=len(items_data),
        total_quantity=total_qty,
        status="ANALYZED"
    )
    db.add(bom)
    db.flush()

    # Link items to existing catalogue components or create stubs
    for item in items_data:
        comp = db.query(Component).filter(
            Component.part_number.ilike(item["part_number"])
        ).first()

        bom_item = BOMItem(
            id=generate_uuid(),
            bom_id=bom.id,
            component_id=comp.id if comp else None,
            product_name=item["product_name"],
            part_number=item["part_number"],
            manufacturer=item["manufacturer"],
            category=item["category"],
            quantity=item["quantity"],
            required_voltage=item["required_voltage"],
            required_current=item["required_current"],
            package=item["package"],
            interface=item["interface"],
            criticality=item["criticality"],
            notes=item["notes"]
        )
        db.add(bom_item)

    db.commit()
    db.refresh(bom)
    return bom

@router.post("/manual", response_model=BOMResponse)
def create_manual_bom(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    items: List[BOMItemCreate] = Form(...),
    db: Session = Depends(get_db)
):
    """Allows manual creation of BOM without uploading a file."""
    if not items:
        raise HTTPException(status_code=400, detail="At least one component item is required")

    org = db.query(Organisation).first()
    if not org:
        org = Organisation(name="Default Workspace", slug="default-workspace")
        db.add(org)
        db.flush()

    total_qty = sum(i.quantity for i in items)
    bom = BOM(
        id=generate_uuid(),
        org_id=org.id,
        name=name,
        description=description or "Manually constructed Bill of Materials",
        filename="manual_entry.csv",
        total_items=len(items),
        total_quantity=total_qty,
        status="ANALYZED"
    )
    db.add(bom)
    db.flush()

    for item in items:
        comp = db.query(Component).filter(
            Component.part_number.ilike(item.part_number)
        ).first()

        bom_item = BOMItem(
            id=generate_uuid(),
            bom_id=bom.id,
            component_id=comp.id if comp else None,
            product_name=item.product_name,
            part_number=item.part_number,
            manufacturer=item.manufacturer,
            category=item.category,
            quantity=item.quantity,
            required_voltage=item.required_voltage,
            required_current=item.required_current,
            package=item.package,
            interface=item.interface,
            criticality=item.criticality,
            notes=item.notes
        )
        db.add(bom_item)

    db.commit()
    db.refresh(bom)
    return bom
