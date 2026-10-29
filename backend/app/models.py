import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum
)
from sqlalchemy.orm import relationship
from .database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    users = relationship("User", back_populates="organisation", cascade="all, delete-orphan")
    boms = relationship("BOM", back_populates="organisation", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="organisation", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    org_id = Column(String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="engineer") # admin, engineer, viewer
    hashed_password = Column(String(255), nullable=True) # None in demo mode
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    organisation = relationship("Organisation", back_populates="users")


class Component(Base):
    __tablename__ = "components"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    part_number = Column(String(100), unique=True, nullable=False, index=True)
    manufacturer = Column(String(255), nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True) # Microcontroller, Sensor, Voltage Regulator, etc.
    description = Column(Text, nullable=True)
    
    # Origin Provenance - Strictly distinguish manufacturer vs supplier vs design
    manufacturer_country = Column(String(100), nullable=True) # e.g. "India", "United States", "Germany" or None
    manufacturer_country_confidence = Column(String(50), default="UNKNOWN") # VERIFIED, CLAIMED, UNKNOWN
    manufacturer_country_evidence_url = Column(Text, nullable=True)
    
    distributor_country = Column(String(100), nullable=True) # e.g. "India"
    distributor_name = Column(String(255), nullable=True) # e.g. "Element14 India", "Mouser India"
    
    design_origin_country = Column(String(100), nullable=True)
    
    origin_category = Column(String(50), nullable=False, default="UNKNOWN") 
    # Values: 'VERIFIED_INDIAN', 'INDIAN_SUPPLIER_UNVERIFIED_MFR', 'FOREIGN', 'UNKNOWN'
    
    lifecycle_status = Column(String(50), default="UNKNOWN") # ACTIVE, NRND, EOL, OBSOLETE, UNKNOWN
    datasheet_url = Column(Text, nullable=True)
    source_url = Column(Text, nullable=True)
    source_name = Column(String(100), default="Local Curated Catalogue")
    
    is_synthetic = Column(Boolean, default=False) # Demo data flagged as SYNTHETIC
    data_completeness_pct = Column(Float, default=0.0) # Calculated heuristic completeness
    
    user_criticality = Column(String(50), default="MEDIUM") # Editable by user without overwriting mfr facts
    user_notes = Column(Text, nullable=True)
    
    last_verified_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    specifications = relationship("ComponentSpecification", back_populates="component", uselist=False, cascade="all, delete-orphan")
    sources = relationship("ComponentSource", back_populates="component", cascade="all, delete-orphan")
    bom_items = relationship("BOMItem", back_populates="component")


class ComponentSpecification(Base):
    __tablename__ = "component_specifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    component_id = Column(String(36), ForeignKey("components.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Standard normalized electrical & mechanical values
    min_voltage_v = Column(Float, nullable=True)
    max_voltage_v = Column(Float, nullable=True)
    nominal_voltage_v = Column(Float, nullable=True)
    max_current_ma = Column(Float, nullable=True)
    package = Column(String(100), nullable=True, index=True) # e.g. "LQFP-64", "SOIC-8", "SOT-223"
    pin_count = Column(Integer, nullable=True)
    operating_temp_min_c = Column(Float, nullable=True)
    operating_temp_max_c = Column(Float, nullable=True)
    
    interfaces = Column(JSON, default=list) # e.g. ["I2C", "SPI", "UART"]
    
    # Specific attributes
    clock_speed_mhz = Column(Float, nullable=True)
    flash_kb = Column(Integer, nullable=True)
    ram_kb = Column(Integer, nullable=True)
    
    # Dynamic additional specs as key-value JSON
    custom_specs = Column(JSON, default=dict)

    component = relationship("Component", back_populates="specifications")


class ComponentSource(Base):
    __tablename__ = "component_sources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    component_id = Column(String(36), ForeignKey("components.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String(50), nullable=False) # DATASHEET, MANUFACTURER_CATALOGUE, DISTRIBUTOR, POLICY_DOC
    source_name = Column(String(255), nullable=False)
    source_url = Column(Text, nullable=True)
    retrieved_at = Column(DateTime(timezone=True), default=utc_now)
    confidence_level = Column(String(50), default="MEDIUM") # HIGH, MEDIUM, LOW
    notes = Column(Text, nullable=True)

    component = relationship("Component", back_populates="sources")


class BOM(Base):
    __tablename__ = "boms"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    org_id = Column(String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    filename = Column(String(255), nullable=False)
    total_items = Column(Integer, default=0)
    total_quantity = Column(Integer, default=0)
    status = Column(String(50), default="ANALYZED") # UPLOADED, PARSED, ANALYZED, FAILED
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    organisation = relationship("Organisation", back_populates="boms")
    items = relationship("BOMItem", back_populates="bom", cascade="all, delete-orphan")
    risk_assessments = relationship("RiskAssessment", back_populates="bom", cascade="all, delete-orphan")


class BOMItem(Base):
    __tablename__ = "bom_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bom_id = Column(String(36), ForeignKey("boms.id", ondelete="CASCADE"), nullable=False)
    component_id = Column(String(36), ForeignKey("components.id", ondelete="SET NULL"), nullable=True)
    
    product_name = Column(String(255), nullable=False, default="Default Product")
    part_number = Column(String(100), nullable=False, index=True)
    manufacturer = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    quantity = Column(Integer, nullable=False, default=1)
    
    required_voltage = Column(String(50), nullable=True)
    required_current = Column(String(50), nullable=True)
    package = Column(String(100), nullable=True)
    interface = Column(String(100), nullable=True)
    criticality = Column(String(50), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

    bom = relationship("BOM", back_populates="items")
    component = relationship("Component", back_populates="bom_items")


class AlternativeMatch(Base):
    __tablename__ = "alternative_matches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    base_component_id = Column(String(36), ForeignKey("components.id", ondelete="CASCADE"), nullable=False)
    candidate_component_id = Column(String(36), ForeignKey("components.id", ondelete="CASCADE"), nullable=False)
    
    compatibility_status = Column(String(50), nullable=False) # COMPATIBLE, REVIEW_REQUIRED, HARD_MISMATCH
    heuristic_score = Column(Float, nullable=False, default=0.0) # 0.0 to 100.0
    
    matching_specs_count = Column(Integer, default=0)
    mismatching_specs_count = Column(Integer, default=0)
    unknown_specs_count = Column(Integer, default=0)
    
    ranking_reason = Column(Text, nullable=True)
    comparison_details = Column(JSON, default=list) # List of dicts per spec: name, base_val, cand_val, status, note
    mismatch_details = Column(JSON, default=list) # List of critical mismatch strings
    unknown_details = Column(JSON, default=list) # List of unknown spec strings
    
    evaluated_at = Column(DateTime(timezone=True), default=utc_now)

    base_component = relationship("Component", foreign_keys=[base_component_id])
    candidate_component = relationship("Component", foreign_keys=[candidate_component_id])


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bom_id = Column(String(36), ForeignKey("boms.id", ondelete="CASCADE"), nullable=False)
    component_id = Column(String(36), ForeignKey("components.id", ondelete="CASCADE"), nullable=False)
    
    risk_level = Column(String(50), nullable=False) # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Float, nullable=False) # 0 to 100
    
    risk_reasons = Column(JSON, default=list) # Structured reasons
    evidence_summary = Column(JSON, default=dict) # Evidence & sources
    unknown_data_factors = Column(JSON, default=list) # Missing facts affecting score
    suggested_actions = Column(JSON, default=list) # Next engineering actions
    
    assessed_at = Column(DateTime(timezone=True), default=utc_now)

    bom = relationship("BOM", back_populates="risk_assessments")
    component = relationship("Component")


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    component_id = Column(String(36), ForeignKey("components.id", ondelete="CASCADE"), nullable=False)
    scenario_type = Column(String(100), default="COMPONENT_UNAVAILABLE") # Hypothetical scenario
    
    affected_boms = Column(JSON, default=list) # IDs and names of affected BOMs
    affected_products = Column(JSON, default=list) # Names and affected units
    total_affected_quantity = Column(Integer, default=0)
    
    criticality = Column(String(50), default="MEDIUM")
    is_multi_bom_dependency = Column(Boolean, default=False)
    
    candidates_count = Column(Integer, default=0)
    viable_candidates = Column(JSON, default=list)
    hard_mismatches_count = Column(Integer, default=0)
    
    estimated_redesign_effort = Column(String(50), default="UNKNOWN") # MINIMAL, MODERATE, MAJOR, UNKNOWN (heuristic)
    redesign_effort_factors = Column(JSON, default=list)
    
    data_gaps = Column(JSON, default=list)
    recommended_actions = Column(JSON, default=list)
    
    ran_at = Column(DateTime(timezone=True), default=utc_now)

    component = relationship("Component")


class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    org_id = Column(String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    bom_id = Column(String(36), ForeignKey("boms.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False) # PDF or CSV
    file_path = Column(String(500), nullable=False)
    summary_data = Column(JSON, default=dict)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

    organisation = relationship("Organisation", back_populates="reports")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=True)
    action = Column(String(100), nullable=False) # UPLOAD_BOM, EDIT_COMPONENT, RUN_SIMULATION, EXPORT_REPORT
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    details = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=utc_now)


# ==============================================================================
# INDIAN SELLER DISCOVERY & RFQ MODULE ENTITIES
# ==============================================================================

class Seller(Base):
    """
    Electronics seller, manufacturer, or authorised distributor operating in India.
    Strictly distinguishes Indian manufacturers from Indian distributors of foreign components.
    """
    __tablename__ = "sellers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    legal_name = Column(String(255), nullable=True)
    
    # Seller classification
    # 'INDIAN_MANUFACTURER', 'INDIAN_AUTHORISED_DISTRIBUTOR', 'INDIAN_DISTRIBUTOR', 'FOREIGN_DISTRIBUTOR_INDIA_SHIPPING'
    seller_type = Column(String(60), nullable=False, default="INDIAN_DISTRIBUTOR")
    is_verified_indian = Column(Boolean, default=True) # Located/registered in India
    is_authorised_distributor = Column(Boolean, default=False)
    is_manufacturer = Column(Boolean, default=False)
    
    website = Column(String(500), nullable=True)
    location_city = Column(String(100), nullable=True) # e.g. Bengaluru, Mohali, Chennai, Pune
    location_state = Column(String(100), nullable=True) # e.g. Karnataka, Punjab, Tamil Nadu
    country = Column(String(100), default="India")
    gstin = Column(String(50), nullable=True) # Official Indian GST Identification Number if verified
    
    description = Column(Text, nullable=True)
    verification_notes = Column(Text, nullable=True)
    logo_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    contacts = relationship("SellerContact", back_populates="seller", cascade="all, delete-orphan")
    listings = relationship("SellerListing", back_populates="seller", cascade="all, delete-orphan")
    rfqs = relationship("RFQ", back_populates="seller")
    saved_entries = relationship("SavedSeller", back_populates="seller", cascade="all, delete-orphan")


class SellerContact(Base):
    """
    Verified public business contact options for a seller.
    Never stores personal unverified data; stores published business desks.
    """
    __tablename__ = "seller_contacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    seller_id = Column(String(36), ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False)
    
    # EMAIL, PHONE, CONTACT_PAGE, RFQ_LINK, OFFICIAL_WEBSITE
    contact_type = Column(String(50), nullable=False)
    label = Column(String(100), nullable=False) # e.g. "Commercial Sales Desk", "Procurement Portal"
    value = Column(String(500), nullable=False) # Email, phone, or URL
    is_verified = Column(Boolean, default=True)
    is_public = Column(Boolean, default=True)
    notes = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

    seller = relationship("Seller", back_populates="contacts")


class DataSource(Base):
    """
    Configured component catalogue and live supplier search providers.
    Tracks active status, credentials configuration, and retrieval timestamps.
    """
    __tablename__ = "data_sources"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False) # e.g. "Curated Indian Supplier Catalogue"
    code = Column(String(50), unique=True, nullable=False, index=True) # LOCAL_CATALOGUE, MOUSER_API, DIGIKEY_API, etc.
    provider_type = Column(String(50), nullable=False) # LOCAL, REST_API, REGISTER
    
    is_active = Column(Boolean, default=True)
    is_live_api = Column(Boolean, default=False)
    
    # 'CONFIGURED', 'NOT_CONFIGURED', 'LOCAL_CATALOGUE', 'RATE_LIMITED'
    api_status = Column(String(50), default="CONFIGURED")
    endpoint_url = Column(String(500), nullable=True)
    
    last_retrieval_at = Column(DateTime(timezone=True), nullable=True)
    total_queries = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)

    listings = relationship("SellerListing", back_populates="data_source")


class SellerListing(Base):
    """
    Product listing for a specific electronic component from a seller.
    Strictly preserves exact manufacturer part-number matches, suffixes, and provenance.
    """
    __tablename__ = "seller_listings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    seller_id = Column(String(36), ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False)
    component_id = Column(String(36), ForeignKey("components.id", ondelete="SET NULL"), nullable=True)
    data_source_id = Column(String(36), ForeignKey("data_sources.id", ondelete="SET NULL"), nullable=True)
    
    part_number = Column(String(100), nullable=False, index=True)
    normalized_part_number = Column(String(100), nullable=False, index=True)
    manufacturer = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)
    
    # Seller's own SKU or catalog identifier
    seller_sku = Column(String(100), nullable=True)
    product_url = Column(Text, nullable=True)
    datasheet_url = Column(Text, nullable=True)
    manufacturer_represented = Column(String(255), nullable=True)
    
    # Matching classification
    # EXACT_MATCH, POTENTIAL_ALTERNATIVE, FUNCTIONAL_EQUIVALENT
    match_type = Column(String(50), default="EXACT_MATCH", nullable=False)
    exact_match = Column(Boolean, default=True)
    
    # Seller classification category (1-7):
    # 'INDIAN_SELLER_EXACT', 'INDIAN_AUTHORISED_DISTRIBUTOR', 'INDIAN_SELLER_UNVERIFIED_AUTH',
    # 'VERIFIED_INDIAN_MANUFACTURER', 'POTENTIAL_INDIAN_ALTERNATIVE', 'FOREIGN_MFR_INDIAN_SELLER', 'NO_SELLER_FOUND'
    seller_classification = Column(String(60), default="INDIAN_SELLER_EXACT", nullable=False)
    
    # Availability & Pricing (Only populated when verified from authentic sources)
    # IN_STOCK, LEAD_TIME, ON_REQUEST, UNKNOWN
    availability_status = Column(String(50), default="UNKNOWN")
    stock_quantity = Column(Integer, nullable=True)
    price = Column(Float, nullable=True)
    currency = Column(String(10), default="INR")
    moq = Column(Integer, nullable=True) # Minimum Order Quantity
    lead_time_days = Column(Integer, nullable=True)
    
    # Provenance tracking
    source_url = Column(Text, nullable=True)
    source_name = Column(String(100), default="Local Curated Catalogue")
    verification_status = Column(String(50), default="VERIFIED") # VERIFIED, CLAIMED, UNVERIFIED
    
    last_checked_at = Column(DateTime(timezone=True), default=utc_now)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    seller = relationship("Seller", back_populates="listings")
    component = relationship("Component")
    data_source = relationship("DataSource", back_populates="listings")


class SourcingSearch(Base):
    """
    Audit log of sourcing searches run for components.
    """
    __tablename__ = "sourcing_searches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    part_number = Column(String(100), nullable=False, index=True)
    normalized_part_number = Column(String(100), nullable=False)
    bom_id = Column(String(36), nullable=True)
    user_id = Column(String(36), nullable=True)
    provider_code = Column(String(50), nullable=False)
    results_count = Column(Integer, default=0)
    status = Column(String(50), default="SUCCESS") # SUCCESS, NOT_CONFIGURED, FAILED
    error_details = Column(Text, nullable=True)
    searched_at = Column(DateTime(timezone=True), default=utc_now)


class RFQ(Base):
    """
    Request for Quotation saved and tracked in the platform.
    """
    __tablename__ = "rfqs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rfq_reference = Column(String(50), unique=True, nullable=False, index=True) # RFQ-2026-XXXX
    org_id = Column(String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), nullable=True)
    bom_id = Column(String(36), ForeignKey("boms.id", ondelete="SET NULL"), nullable=True)
    seller_id = Column(String(36), ForeignKey("sellers.id", ondelete="SET NULL"), nullable=True)
    
    seller_name = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=False)
    business_email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    
    part_number = Column(String(100), nullable=False, index=True)
    manufacturer = Column(String(255), nullable=False)
    quantity_requested = Column(Integer, nullable=False, default=1)
    target_delivery_location = Column(String(255), nullable=False)
    target_delivery_date = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    
    # Status: DRAFT, READY_TO_SEND, SENT_BY_USER, SUBMITTED_VIA_INTEGRATION, RESPONSE_RECEIVED, CLOSED
    status = Column(String(50), default="DRAFT", nullable=False)
    submission_method = Column(String(50), default="MANUAL_EMAIL", nullable=False) # DRAFT, MANUAL_EMAIL, INTEGRATION
    
    seller_contact_email = Column(String(255), nullable=True)
    generated_email_body = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    seller = relationship("Seller", back_populates="rfqs")
    bom = relationship("BOM")
    items = relationship("RFQItem", back_populates="rfq", cascade="all, delete-orphan")
    status_history = relationship("RFQStatusHistory", back_populates="rfq", cascade="all, delete-orphan")


class RFQItem(Base):
    """
    Individual component line item within an RFQ.
    """
    __tablename__ = "rfq_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    part_number = Column(String(100), nullable=False)
    manufacturer = Column(String(255), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    target_unit_price = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    rfq = relationship("RFQ", back_populates="items")


class RFQStatusHistory(Base):
    """
    Audit log of status updates for an RFQ.
    """
    __tablename__ = "rfq_status_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by = Column(String(255), default="User")
    notes = Column(Text, nullable=True)
    changed_at = Column(DateTime(timezone=True), default=utc_now)

    rfq = relationship("RFQ", back_populates="status_history")


class SavedSeller(Base):
    """
    Bookmarked or preferred seller for an organisation.
    """
    __tablename__ = "saved_sellers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    org_id = Column(String(36), ForeignKey("organisations.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), nullable=True)
    seller_id = Column(String(36), ForeignKey("sellers.id", ondelete="CASCADE"), nullable=False)
    notes = Column(Text, nullable=True)
    saved_at = Column(DateTime(timezone=True), default=utc_now)

    seller = relationship("Seller", back_populates="saved_entries")
