import io
import pytest
from app.models import Component, BOM

def test_api_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "features" in data

def test_api_dashboard_summary(client):
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_boms"] >= 1
    assert data["total_unique_components"] >= 10
    assert data["verified_indian_count"] >= 1
    assert data["unknown_origin_count"] >= 1
    assert "risk_distribution" in data
    assert "category_distribution" in data
    assert len(data["high_priority_components"]) > 0

def test_api_components_catalogue_search_and_filters(client):
    # Search by part number
    res = client.get("/api/components?search=STM32")
    assert res.status_code == 200
    data = res.json()
    assert any("STM32" in c["part_number"] for c in data["components"])

    # Filter by origin category
    res_ind = client.get("/api/components?origin_category=VERIFIED_INDIAN")
    assert res_ind.status_code == 200
    ind_data = res_ind.json()
    assert all(c["origin_category"] == "VERIFIED_INDIAN" for c in ind_data["components"])
    assert len(ind_data["components"]) >= 1

def test_api_component_detail_and_user_criticality_update(client, db):
    comp = db.query(Component).filter(Component.part_number == "STM32F401RET6").first()
    assert comp is not None

    res = client.get(f"/api/components/{comp.id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["part_number"] == "STM32F401RET6"
    assert "specifications" in detail
    assert "sources" in detail
    assert "bom_occurrences" in detail

    # Patch user criticality without overwriting manufacturer facts
    res_patch = client.patch(f"/api/components/{comp.id}", json={
        "user_criticality": "HIGH",
        "user_notes": "Assessed during Q3 audit"
    })
    assert res_patch.status_code == 200
    patched = res_patch.json()
    assert patched["user_criticality"] == "HIGH"
    assert patched["user_notes"] == "Assessed during Q3 audit"
    # Manufacturer facts must stay intact
    assert patched["manufacturer"] == "STMicroelectronics"

def test_api_alternative_finder(client, db):
    # Find alternatives for STM32F401RET6 (should discover SHAKTI-E-CLASS as viable Indian alternative)
    stm32 = db.query(Component).filter(Component.part_number == "STM32F401RET6").first()
    assert stm32 is not None

    res = client.get(f"/api/components/{stm32.id}/alternatives")
    assert res.status_code == 200
    data = res.json()
    assert data["has_suitable_alternatives"] is True
    cand_pns = [c["part_number"] for c in data["candidates"]]
    assert "SHAKTI-E-CLASS" in cand_pns
    
    # Check top candidate details
    top = data["candidates"][0]
    assert top["compatibility_status"] in ["COMPATIBLE", "REVIEW_REQUIRED"]
    assert "ranking_reason" in top
    assert len(top["comparison_details"]) > 0

def test_api_single_source_component_shows_no_alternatives(client, db):
    # CUSTOM-FPGA-99 has no alternative in current catalogue
    fpga = db.query(Component).filter(Component.part_number == "CUSTOM-FPGA-99").first()
    assert fpga is not None

    res = client.get(f"/api/components/{fpga.id}/alternatives")
    assert res.status_code == 200
    data = res.json()
    # Must explicitly state message
    assert "No verified suitable alternative found in the current dataset" in data["message"]
    assert len(data["candidates"]) == 0

def test_api_bom_upload_valid_csv(client):
    csv_content = (
        "product_name,part_number,manufacturer,quantity,category,required_voltage,package,criticality\n"
        "Telemetry Pod,STM32F401RET6,STMicroelectronics,1,Microcontroller,3.3V,LQFP-64,HIGH\n"
        "Telemetry Pod,LM1117IMP-3.3,Texas Instruments,2,Voltage Regulator,5.0V,SOT-223,MEDIUM\n"
    )
    files = {"file": ("telemetry_pod.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/api/boms/upload", files=files, data={"name": "Telemetry Pod BOM"})
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Telemetry Pod BOM"
    assert data["total_items"] == 2
    assert data["total_quantity"] == 3

def test_api_bom_upload_invalid_file_rejected(client):
    # Invalid file with missing part_number header
    bad_csv = "product_name,wrong_column,quantity\nDrone,ABC,1\n"
    files = {"file": ("bad_bom.csv", io.BytesIO(bad_csv.encode("utf-8")), "text/csv")}
    res = client.post("/api/boms/upload", files=files)
    assert res.status_code == 422
    data = res.json()
    assert "validation failed" in data["detail"]["message"].lower()

def test_api_simulation_unavailability_scenario(client, db):
    # Simulate LM1117IMP-3.3 failure (shared across multiple BOMs)
    lm1117 = db.query(Component).filter(Component.part_number == "LM1117IMP-3.3").first()
    assert lm1117 is not None

    res = client.post("/api/simulations", json={
        "component_id": lm1117.id,
        "scenario_type": "COMPONENT_UNAVAILABLE"
    })
    assert res.status_code == 200
    data = res.json()
    assert "Hypothetical Outage" in data["scenario"]["title"]
    assert "is not an empirical supply forecast" in data["scenario"]["disclaimer"]
    assert data["impact"]["affected_boms_count"] >= 1
    assert data["impact"]["total_affected_quantity"] >= 1
    assert len(data["recommended_actions"]) > 0

def test_api_report_generation_csv_and_pdf(client):
    # Test CSV report generation
    res_csv = client.post("/api/reports/generate?report_type=CSV")
    assert res_csv.status_code == 200
    data_csv = res_csv.json()
    assert data_csv["report_type"] == "CSV"
    
    # Download CSV
    res_dl_csv = client.get(data_csv["download_url"])
    assert res_dl_csv.status_code == 200
    assert "INDIGENOUS COMPONENT DEPENDENCY" in res_dl_csv.text

    # Test PDF report generation
    res_pdf = client.post("/api/reports/generate?report_type=PDF")
    assert res_pdf.status_code == 200
    data_pdf = res_pdf.json()
    assert data_pdf["report_type"] == "PDF"

    # Download PDF
    res_dl_pdf = client.get(data_pdf["download_url"])
    assert res_dl_pdf.status_code == 200
    assert res_dl_pdf.headers["content-type"] == "application/pdf"
    assert len(res_dl_pdf.content) > 1000 # Valid non-empty PDF binary

def test_api_data_sources_status(client):
    res = client.get("/api/data-sources/status")
    assert res.status_code == 200
    data = res.json()
    assert data["active_data_source"] == "Local Curated Catalogue (Offline-Ready)"
    # Ensure Nexar and DigiKey show NOT_CONFIGURED
    sources = {s["id"]: s["status"] for s in data["sources"]}
    assert sources["nexar_octopart"] == "NOT_CONFIGURED"
    assert sources["digikey_api"] == "NOT_CONFIGURED"
    assert sources["local_curated"] == "ACTIVE"

def test_api_bom_upload_valid_xlsx(client):
    import pandas as pd
    df = pd.DataFrame([
        {
            "product_name": "Sensor Pod Rev B",
            "part_number": "STM32F401RET6",
            "manufacturer": "STMicroelectronics",
            "quantity": 2,
            "category": "Microcontroller",
            "required_voltage": "3.3V",
            "package": "LQFP-64",
            "criticality": "CRITICAL"
        },
        {
            "product_name": "Sensor Pod Rev B",
            "part_number": "LM1117IMP-3.3",
            "manufacturer": "Texas Instruments",
            "quantity": 1,
            "category": "Voltage Regulator",
            "required_voltage": "3.3V",
            "package": "SOT-223",
            "criticality": "HIGH"
        }
    ])
    xlsx_buf = io.BytesIO()
    df.to_excel(xlsx_buf, index=False)
    xlsx_buf.seek(0)
    files = {"file": ("sensor_pod.xlsx", xlsx_buf, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    res = client.post("/api/boms/upload", files=files, data={"name": "Sensor Pod XLSX Assembly"})
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Sensor Pod XLSX Assembly"
    assert data["total_items"] == 2
    assert data["total_quantity"] == 3

def test_api_bom_preview_duplicates_and_unrecognised_columns(client):
    csv_content = (
        "part_number,manufacturer,quantity,unusual_custom_column\n"
        "STM32F401RET6,STMicroelectronics,1,CustomValue1\n"
        "STM32F401RET6,STMicroelectronics,2,CustomValue2\n"
    )
    files = {"file": ("dup_bom.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post("/api/boms/preview", files=files)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "STM32F401RET6" in data["duplicate_part_numbers"]
    assert "unusual_custom_column" in data["unrecognised_columns"]

def test_api_bom_analysis_summary_metrics(client, db):
    bom = db.query(BOM).first()
    assert bom is not None
    res = client.post(f"/api/analysis/{bom.id}")
    assert res.status_code == 200
    data = res.json()
    assert "summary_metrics" in data
    sm = data["summary_metrics"]
    assert sm["total_items"] >= 1
    assert sm["unique_components"] >= 1
    assert sm["critical_components"] >= 0
    assert sm["verified_foreign_components"] >= 0
    assert sm["unknown_origin_components"] >= 0
    assert sm["components_with_potential_indian_alternatives"] >= 0
    # Items analyzed must include provenance and explanation
    assert len(data["items_analyzed"]) > 0
    first_item = data["items_analyzed"][0]
    assert "why_critical" in first_item
    assert "why_sourcing_concern" in first_item
    assert "country_evidence_summary" in first_item

def test_origin_distributor_vs_manufacturer_distinction(client, db):
    # Retrieve a component that has an Indian distributor but foreign/unverified manufacturer
    comps = client.get("/api/components").json()["components"]
    ind_supplier_comps = [c for c in comps if c["origin_category"] == "INDIAN_SUPPLIER_UNVERIFIED_MFR"]
    for c in ind_supplier_comps:
        # Must not be classified as VERIFIED_INDIAN
        assert c["origin_category"] != "VERIFIED_INDIAN"
        # Must have distributor details
        assert c.get("distributor_country") == "India" or c.get("distributor_name") is not None
