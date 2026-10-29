import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import get_db, SessionLocal
from app.services.part_matcher import normalize_part_number, is_exact_part_match, classify_part_match
from app.services.rfq_service import generate_rfq_reference, build_rfq_email_template
from app.services.discovery_service import classify_seller_listing, discover_sellers_for_part
from app.models import Seller, SellerListing, RFQ, Organisation, Component

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# -----------------------------------------------------------------------------
# 1. EXACT PART-NUMBER MATCHING & SUFFIX MISMATCH HANDLING
# -----------------------------------------------------------------------------

def test_exact_part_number_matching():
    # Whitespace normalization and case insensitivity
    assert is_exact_part_match("stm32f401ret6", "STM32F401RET6") is True
    assert is_exact_part_match("  STM32F401RET6  ", "STM32F401RET6") is True
    assert is_exact_part_match("LM1117IMP-3.3", "lm1117imp - 3.3") is True

    # Meaningful voltage suffixes preserved
    assert is_exact_part_match("LM1117IMP-3.3", "LM1117IMP-5.0") is False
    assert is_exact_part_match("LM1117IMP-3.3", "LM1117IMP-ADJ") is False

    # Meaningful package / memory / temperature suffixes preserved
    assert is_exact_part_match("STM32F401RET6", "STM32F401RCT6") is False # 512KB vs 256KB flash
    assert is_exact_part_match("STM32F401RET6", "STM32F401") is False # Family prefix vs specific MPN
    assert is_exact_part_match("ATMEGA328P-PU", "ATMEGA328P-AU") is False # DIP vs TQFP package


def test_variant_suffix_mismatch_classified_as_substitute_not_exact():
    # Same base family prefix should be classified as POTENTIAL_ALTERNATIVE, not exact match
    match_type, is_exact = classify_part_match("STM32F401RET6", "STM32F401RCT6")
    assert match_type == "POTENTIAL_ALTERNATIVE"
    assert is_exact is False

    # Completely different part should be NO_MATCH
    match_type2, is_exact2 = classify_part_match("STM32F401RET6", "IR2104STRPBF")
    assert match_type2 == "NO_MATCH"
    assert is_exact2 is False


# -----------------------------------------------------------------------------
# 2. CORRECT SELLER / MANUFACTURER DISTINCTION
# -----------------------------------------------------------------------------

def test_seller_manufacturer_provenance_distinction():
    """
    CRITICAL RULE:
    Never classify a component as Indian-manufactured solely because its seller is in India.
    """
    # Case A: Foreign component sold by an Indian seller
    classification_foreign = classify_seller_listing(
        listing_exact=True,
        seller_is_mfr=False,
        seller_is_auth_dist=False,
        seller_is_indian=True,
        component_origin_cat="FOREIGN"
    )
    assert classification_foreign == "FOREIGN_MFR_INDIAN_SELLER"

    # Case B: Foreign component sold by an Indian AUTHORISED distributor
    classification_auth = classify_seller_listing(
        listing_exact=True,
        seller_is_mfr=False,
        seller_is_auth_dist=True,
        seller_is_indian=True,
        component_origin_cat="FOREIGN"
    )
    assert classification_auth == "INDIAN_AUTHORISED_DISTRIBUTOR"

    # Case C: Verified Indian Manufacturer selling their own indigenous component
    classification_mfr = classify_seller_listing(
        listing_exact=True,
        seller_is_mfr=True,
        seller_is_auth_dist=True,
        seller_is_indian=True,
        component_origin_cat="VERIFIED_INDIAN"
    )
    assert classification_mfr == "VERIFIED_INDIAN_MANUFACTURER"


# -----------------------------------------------------------------------------
# 3. SELLER SEARCH API & MISSING SELLER HANDLING
# -----------------------------------------------------------------------------

def test_api_seller_search_exact_and_alternatives(client):
    # STM32F401RET6 should have Indian sellers and Indian alternatives (SHAKTI-E-CLASS)
    res = client.get("/api/sellers/search/STM32F401RET6")
    assert res.status_code == 200
    data = res.json()
    assert data["part_number"] == "STM32F401RET6"
    assert data["exact_sellers_count"] > 0
    assert any(m["seller_name"] == "Element14 India (Farnell India Pvt Ltd)" for m in data["exact_matches"])
    assert any(m["seller_name"] == "Semikart India (Anshuman Tech Pvt Ltd)" for m in data["exact_matches"])
    
    # Check potential Indian alternatives are identified separately
    assert data["alternatives_count"] > 0
    alt_pns = [a["part_number"] for a in data["potential_indian_alternatives"]]
    assert "SHAKTI-E-CLASS" in alt_pns


def test_api_seller_search_missing_results(client):
    # Single-source part or non-existent part
    res = client.get("/api/sellers/search/NONEXISTENT-CHIP-99999")
    assert res.status_code == 200
    data = res.json()
    assert data["exact_sellers_count"] == 0
    assert data["sourcing_status"] == "NO_SELLER_FOUND"
    assert "No verified Indian seller listing found" in data["sourcing_status_label"]


def test_api_seller_search_indigenous_manufacturer_direct(client):
    # SHAKTI-E-CLASS should be classified with Indian MFR Direct
    res = client.get("/api/sellers/search/SHAKTI-E-CLASS")
    assert res.status_code == 200
    data = res.json()
    assert data["sourcing_status"] == "INDIAN_MFR_DIRECT"
    assert any(m["seller_classification"] == "VERIFIED_INDIAN_MANUFACTURER" for m in data["exact_matches"])


# -----------------------------------------------------------------------------
# 4. DATA SOURCES STATUS & UNCONFIGURED PROVIDERS
# -----------------------------------------------------------------------------

def test_api_data_sources_status(client):
    res = client.get("/api/sellers/sources/status")
    assert res.status_code == 200
    sources = res.json()
    codes = {s["code"]: s for s in sources}
    
    # Curated local catalogue must be configured and active
    assert "LOCAL_CATALOGUE" in codes
    assert codes["LOCAL_CATALOGUE"]["is_active"] is True
    assert codes["LOCAL_CATALOGUE"]["api_status"] == "CONFIGURED"

    # Mouser and DigiKey should truthfully report NOT_CONFIGURED when keys are absent
    assert "MOUSER_API" in codes
    assert codes["MOUSER_API"]["api_status"] == "NOT_CONFIGURED"
    assert "MOUSER_API_KEY" in codes["MOUSER_API"]["notes"]

    assert "DIGIKEY_API" in codes
    assert codes["DIGIKEY_API"]["api_status"] == "NOT_CONFIGURED"


# -----------------------------------------------------------------------------
# 5. RFQ CREATION, VALIDATION & STATUS TRACKING
# -----------------------------------------------------------------------------

def test_rfq_reference_generation(db):
    ref = generate_rfq_reference(db)
    assert ref.startswith("RFQ-")
    parts = ref.split("-")
    assert len(parts) == 3
    assert len(parts[1]) == 4 # Year


def test_rfq_email_template_builder():
    body = build_rfq_email_template(
        rfq_reference="RFQ-2026-9999",
        company_name="Test Robotics Pvt Ltd",
        contact_person="Rohan Mehta",
        business_email="rohan@test-robotics.in",
        phone="+91-9876543210",
        part_number="STM32F401RET6",
        manufacturer="STMicroelectronics",
        quantity=500,
        delivery_location="Bengaluru, Karnataka",
        delivery_date="2026-12-01",
        seller_name="Element14 India",
        notes="Certificate of Conformance required"
    )
    assert "STM32F401RET6" in body
    assert "500 units" in body
    assert "RFQ-2026-9999" in body
    assert "Certificate of Conformance" in body
    assert "Country of Origin (CoO)" in body


def test_api_rfq_create_valid(client, db):
    seller = db.query(Seller).first()
    payload = {
        "company_name": "Bharat Embedded Systems",
        "contact_person": "Anita Rao",
        "business_email": "anita.rao@bharat-embedded.in",
        "phone": "+91-80-2345-6789",
        "part_number": "STM32F401RET6",
        "manufacturer": "STMicroelectronics",
        "quantity_requested": 150,
        "target_delivery_location": "Electronic City, Bengaluru",
        "target_delivery_date": "2026-12-31",
        "notes": "Testing production build",
        "seller_id": seller.id if seller else None,
        "seller_name": seller.name if seller else "Element14 India"
    }
    res = client.post("/api/rfqs", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["rfq_reference"].startswith("RFQ-")
    assert data["quantity_requested"] == 150
    # Must be DRAFT or READY_TO_SEND, never falsely claim sent!
    assert data["status"] in ["DRAFT", "READY_TO_SEND"]
    assert data["submission_method"] == "MANUAL_EMAIL"
    assert data["generated_email_body"] is not None


def test_api_rfq_validation_errors(client):
    # Invalid zero quantity
    res_zero = client.post("/api/rfqs", json={
        "company_name": "Test Co",
        "contact_person": "Test Person",
        "business_email": "test@company.in",
        "part_number": "TEST-123",
        "manufacturer": "Test Mfr",
        "quantity_requested": 0,
        "target_delivery_location": "Delhi"
    })
    assert res_zero.status_code == 422 or res_zero.status_code == 400

    # Invalid email format
    res_email = client.post("/api/rfqs", json={
        "company_name": "Test Co",
        "contact_person": "Test Person",
        "business_email": "not-an-email",
        "part_number": "TEST-123",
        "manufacturer": "Test Mfr",
        "quantity_requested": 10,
        "target_delivery_location": "Delhi"
    })
    assert res_email.status_code == 400


def test_api_rfq_status_update(client, db):
    # Create an RFQ first
    rfq = db.query(RFQ).first()
    assert rfq is not None

    # Update status to SENT_BY_USER
    res = client.patch(f"/api/rfqs/{rfq.id}/status", json={
        "status": "SENT_BY_USER",
        "notes": "Sent via corporate Outlook email client to commercial desk.",
        "changed_by": "Anita Rao"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SENT_BY_USER"
    
    # Check history is tracked
    assert len(data["status_history"]) > 0
    latest_hist = data["status_history"][-1]
    assert latest_hist["new_status"] == "SENT_BY_USER"


def test_api_rfq_mailto_generation(client, db):
    rfq = db.query(RFQ).first()
    assert rfq is not None

    res = client.get(f"/api/rfqs/{rfq.id}/mailto")
    assert res.status_code == 200
    data = res.json()
    assert "mailto:" in data["mailto_url"]
    assert "subject=" in data["mailto_url"]
    assert data["rfq_reference"] == rfq.rfq_reference


# -----------------------------------------------------------------------------
# 6. SELLER BOOKMARKING / SAVED SELLERS
# -----------------------------------------------------------------------------

def test_api_saved_sellers_workflow(client, db):
    seller = db.query(Seller).first()
    assert seller is not None

    # Save seller
    res_save = client.post(f"/api/sellers/{seller.id}/save", params={"notes": "Key vendor"})
    assert res_save.status_code == 200

    # List saved
    res_list = client.get("/api/sellers/saved")
    assert res_list.status_code == 200
    saved_items = res_list.json()
    assert any(s["seller_id"] == seller.id for s in saved_items)


# -----------------------------------------------------------------------------
# 7. DASHBOARD METRICS REAL DATA VERIFICATION
# -----------------------------------------------------------------------------

def test_api_dashboard_sourcing_metrics(client):
    res = client.get("/api/dashboard/summary")
    assert res.status_code == 200
    data = res.json()

    # Real seller metrics
    assert "bom_components_with_seller_listings" in data
    assert "components_with_no_seller_listing" in data
    assert "rfqs_awaiting_followup" in data
    assert "potential_domestic_alternatives" in data
    assert "sourcing_actions" in data

    assert data["bom_components_with_seller_listings"] > 0
    assert len(data["sourcing_actions"]) > 0
    first_action = data["sourcing_actions"][0]
    assert "sourcing_status" in first_action
    assert "sourcing_status_label" in first_action
