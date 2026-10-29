import os
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, List
from ..database import get_db
from ..models import BOM, BOMItem, Component, Report, Organisation, generate_uuid
from ..services.alternative_service import find_alternatives_for_component
from ..services.report_generator import generate_csv_report, generate_pdf_report
from ..config import settings

router = APIRouter(prefix="/reports", tags=["Reports"])

REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "generated_reports")

@router.get("/template/csv")
def download_sample_bom_template():
    """Provides downloadable sample BOM CSV template with all expected columns."""
    template_content = (
        "product_name,part_number,manufacturer,quantity,category,required_voltage,required_current,package,interface,criticality,notes\n"
        "Smart Energy Meter,STM32F401RET6,STMicroelectronics,1,Microcontroller,3.3V,50mA,LQFP-64,SPI/I2C/UART,HIGH,Main controller IC\n"
        "Smart Energy Meter,LM1117IMP-3.3,Texas Instruments,2,Voltage Regulator,5.0V,800mA,SOT-223,Analog,MEDIUM,System 3.3V power regulator\n"
        "Smart Energy Meter,INA219AIDR,Texas Instruments,1,Sensor,3.3V,10mA,SOIC-8,I2C,HIGH,Precision shunt power monitor\n"
    )
    return Response(
        content=template_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=indigenous_platform_sample_bom_template.csv"}
    )

@router.post("/generate")
def create_report(
    bom_id: Optional[str] = Query(None),
    report_type: str = Query("PDF", pattern="^(PDF|CSV)$"),
    db: Session = Depends(get_db)
):
    org = db.query(Organisation).first()
    org_name = org.name if org else "Default Workspace"
    bom_name = "All Components Catalogue"

    if bom_id:
        bom = db.query(BOM).filter(BOM.id == bom_id).first()
        if not bom:
            raise HTTPException(status_code=404, detail="BOM not found")
        bom_name = bom.name
        bom_items = db.query(BOMItem).filter(BOMItem.bom_id == bom_id).all()
        target_comps = []
        for bi in bom_items:
            c = db.query(Component).filter(
                (Component.id == bi.component_id) | (Component.part_number.ilike(bi.part_number))
            ).first()
            if c:
                target_comps.append((c, bi.criticality))
    else:
        all_comps = db.query(Component).all()
        target_comps = [(c, c.user_criticality) for c in all_comps]

    components_data = []
    verified_indian_count = 0
    indian_supplier_count = 0
    foreign_count = 0
    unknown_origin_count = 0
    critical_count = 0

    for comp, crit in target_comps:
        if comp.origin_category == "VERIFIED_INDIAN":
            verified_indian_count += 1
        elif comp.origin_category == "INDIAN_SUPPLIER_UNVERIFIED_MFR":
            indian_supplier_count += 1
        elif comp.origin_category == "FOREIGN":
            foreign_count += 1
        else:
            unknown_origin_count += 1

        if (crit or comp.user_criticality or "").upper() == "CRITICAL":
            critical_count += 1

        alts = find_alternatives_for_component(db, comp.id)
        candidates = alts.get("candidates", [])
        top_alt = candidates[0] if candidates else None

        components_data.append({
            "part_number": comp.part_number,
            "manufacturer": comp.manufacturer,
            "category": comp.category,
            "origin_category": comp.origin_category,
            "manufacturer_country": comp.manufacturer_country,
            "criticality": crit or comp.user_criticality or "MEDIUM",
            "lifecycle_status": comp.lifecycle_status,
            "datasheet_url": comp.datasheet_url,
            "source_url": comp.source_url,
            "last_verified_at": comp.last_verified_at.strftime("%Y-%m-%d") if comp.last_verified_at else "Unknown",
            "top_alternative": top_alt
        })

    report_context = {
        "organisation_name": org_name,
        "bom_name": bom_name,
        "total_components": len(target_comps),
        "critical_count": critical_count,
        "verified_indian_count": verified_indian_count,
        "indian_supplier_count": indian_supplier_count,
        "foreign_count": foreign_count,
        "unknown_origin_count": unknown_origin_count,
        "components": components_data
    }

    os.makedirs(REPORTS_DIR, exist_ok=True)
    timestamp_slug = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    file_id = generate_uuid()

    if report_type == "CSV":
        filename = f"report_{timestamp_slug}.csv"
        file_path = os.path.join(REPORTS_DIR, f"{file_id}_{filename}")
        csv_text = generate_csv_report(report_context)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(csv_text)
    else:
        filename = f"report_{timestamp_slug}.pdf"
        file_path = os.path.join(REPORTS_DIR, f"{file_id}_{filename}")
        generate_pdf_report(report_context, file_path)

    # Persist report record
    report_record = Report(
        id=file_id,
        org_id=org.id if org else generate_uuid(),
        bom_id=bom_id,
        title=f"{bom_name} Technical Dependency Audit",
        report_type=report_type,
        file_path=file_path,
        summary_data={
            "total_components": len(target_comps),
            "critical_count": critical_count,
            "verified_indian_count": verified_indian_count,
            "unknown_origin_count": unknown_origin_count
        }
    )
    db.add(report_record)
    db.commit()

    return {
        "report_id": report_record.id,
        "title": report_record.title,
        "report_type": report_record.report_type,
        "download_url": f"/api/reports/{report_record.id}/download",
        "created_at": report_record.created_at.isoformat()
    }

@router.get("/{report_id}/download")
def download_report(report_id: str, db: Session = Depends(get_db)):
    rep = db.query(Report).filter(Report.id == report_id).first()
    if not rep or not os.path.exists(rep.file_path):
        raise HTTPException(status_code=404, detail="Report file not found or expired")

    media_type = "application/pdf" if rep.report_type == "PDF" else "text/csv"
    ext = "pdf" if rep.report_type == "PDF" else "csv"
    download_filename = f"indigenous_dependency_report_{report_id[:8]}.{ext}"

    return FileResponse(
        path=rep.file_path,
        media_type=media_type,
        filename=download_filename,
        headers={"Content-Disposition": f"attachment; filename={download_filename}"}
    )

@router.get("")
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(Report).order_by(Report.created_at.desc()).limit(20).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "report_type": r.report_type,
            "bom_id": r.bom_id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "download_url": f"/api/reports/{r.id}/download",
            "summary_data": r.summary_data
        }
        for r in reports
    ]
