from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import Component, ComponentSpecification, ComponentSource, BOMItem, BOM, generate_uuid
from ..schemas import ComponentResponse, ComponentCreate, ComponentUpdate
from ..services.alternative_service import serialize_component

router = APIRouter(prefix="/components", tags=["Components"])

@router.get("")
def list_components(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    origin_category: Optional[str] = Query(None),
    lifecycle_status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    query = db.query(Component)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Component.part_number.ilike(s)) |
            (Component.manufacturer.ilike(s)) |
            (Component.description.ilike(s))
        )

    if category:
        query = query.filter(Component.category.ilike(f"%{category.strip()}%"))

    if origin_category:
        query = query.filter(Component.origin_category == origin_category.strip())

    if lifecycle_status:
        query = query.filter(Component.lifecycle_status == lifecycle_status.strip().upper())

    if source:
        query = query.filter(Component.source_name.ilike(f"%{source.strip()}%"))

    total = query.count()
    comps = query.order_by(Component.part_number.asc()).offset(offset).limit(limit).all()

    # Pre-fetch BOMs where parts appear
    bom_items = db.query(BOMItem).all()
    part_bom_map = {}
    for bi in bom_items:
        part_bom_map.setdefault(bi.part_number, set()).add(bi.bom_id)

    results = []
    for c in comps:
        cdict = serialize_component(c)
        bom_ids = list(part_bom_map.get(c.part_number, set()))
        cdict["bom_count"] = len(bom_ids)
        cdict["boms"] = bom_ids
        results.append(cdict)

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "components": results
    }

@router.get("/{component_id}")
def get_component(component_id: str, db: Session = Depends(get_db)):
    comp = db.query(Component).filter(Component.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    cdict = serialize_component(comp)

    # Fetch BOMs where this component appears
    bom_items = db.query(BOMItem).filter(
        (BOMItem.component_id == comp.id) | (BOMItem.part_number == comp.part_number)
    ).all()

    boms_info = []
    for bi in bom_items:
        bom = db.query(BOM).filter(BOM.id == bi.bom_id).first()
        boms_info.append({
            "bom_id": bi.bom_id,
            "bom_name": bom.name if bom else "Unknown BOM",
            "product_name": bi.product_name,
            "quantity": bi.quantity,
            "criticality": bi.criticality
        })

    cdict["bom_occurrences"] = boms_info
    cdict["bom_count"] = len(boms_info)

    # Compute list of missing/unknown fields
    unknown_fields = []
    specs = cdict.get("specifications") or {}
    for key, val in specs.items():
        if val is None or val == []:
            unknown_fields.append(key)
    if comp.origin_category == "UNKNOWN":
        unknown_fields.append("country_of_manufacture")
    if comp.lifecycle_status == "UNKNOWN":
        unknown_fields.append("lifecycle_status")
    if not comp.datasheet_url:
        unknown_fields.append("datasheet_url")

    cdict["unknown_fields"] = unknown_fields

    # Sources provenance
    sources = db.query(ComponentSource).filter(ComponentSource.component_id == comp.id).all()
    cdict["sources"] = [
        {
            "id": s.id,
            "source_type": s.source_type,
            "source_name": s.source_name,
            "source_url": s.source_url,
            "confidence_level": s.confidence_level,
            "retrieved_at": s.retrieved_at.isoformat() if s.retrieved_at else None,
            "notes": s.notes
        }
        for s in sources
    ]

    return cdict

@router.post("", status_code=201)
def create_component(payload: ComponentCreate, db: Session = Depends(get_db)):
    existing = db.query(Component).filter(Component.part_number == payload.part_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Component '{payload.part_number}' already exists in catalogue")

    comp = Component(
        id=generate_uuid(),
        part_number=payload.part_number,
        manufacturer=payload.manufacturer,
        category=payload.category,
        description=payload.description,
        manufacturer_country=payload.manufacturer_country,
        manufacturer_country_confidence=payload.manufacturer_country_confidence,
        manufacturer_country_evidence_url=payload.manufacturer_country_evidence_url,
        distributor_country=payload.distributor_country,
        distributor_name=payload.distributor_name,
        design_origin_country=payload.design_origin_country,
        origin_category=payload.origin_category,
        lifecycle_status=payload.lifecycle_status,
        datasheet_url=payload.datasheet_url,
        source_url=payload.source_url,
        source_name=payload.source_name,
        is_synthetic=payload.is_synthetic,
        user_criticality=payload.user_criticality,
        user_notes=payload.user_notes
    )
    db.add(comp)
    db.flush()

    if payload.specifications:
        sp = payload.specifications
        spec = ComponentSpecification(
            id=generate_uuid(),
            component_id=comp.id,
            min_voltage_v=sp.min_voltage_v,
            max_voltage_v=sp.max_voltage_v,
            nominal_voltage_v=sp.nominal_voltage_v,
            max_current_ma=sp.max_current_ma,
            package=sp.package,
            pin_count=sp.pin_count,
            operating_temp_min_c=sp.operating_temp_min_c,
            operating_temp_max_c=sp.operating_temp_max_c,
            interfaces=sp.interfaces,
            clock_speed_mhz=sp.clock_speed_mhz,
            flash_kb=sp.flash_kb,
            ram_kb=sp.ram_kb,
            custom_specs=sp.custom_specs
        )
        db.add(spec)

    db.commit()
    db.refresh(comp)
    return serialize_component(comp)

@router.patch("/{component_id}")
def update_component(
    component_id: str,
    payload: ComponentUpdate,
    db: Session = Depends(get_db)
):
    """
    Allows updating user-defined criticality and notes without overwriting
    verified manufacturer facts.
    """
    comp = db.query(Component).filter(Component.id == component_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Component not found")

    if payload.user_criticality is not None:
        comp.user_criticality = payload.user_criticality.upper()

    if payload.user_notes is not None:
        comp.user_notes = payload.user_notes

    if payload.category is not None:
        comp.category = payload.category

    if payload.description is not None:
        comp.description = payload.description

    db.commit()
    db.refresh(comp)
    return serialize_component(comp)
