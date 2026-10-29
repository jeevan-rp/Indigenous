from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ComponentSpecSchema(BaseModel):
    min_voltage_v: Optional[float] = None
    max_voltage_v: Optional[float] = None
    nominal_voltage_v: Optional[float] = None
    max_current_ma: Optional[float] = None
    package: Optional[str] = None
    pin_count: Optional[int] = None
    operating_temp_min_c: Optional[float] = None
    operating_temp_max_c: Optional[float] = None
    interfaces: List[str] = Field(default_factory=list)
    clock_speed_mhz: Optional[float] = None
    flash_kb: Optional[int] = None
    ram_kb: Optional[int] = None
    custom_specs: Dict[str, Any] = Field(default_factory=dict)

class ComponentBase(BaseModel):
    part_number: str
    manufacturer: str
    category: str
    description: Optional[str] = None
    manufacturer_country: Optional[str] = None
    manufacturer_country_confidence: str = "UNKNOWN"
    manufacturer_country_evidence_url: Optional[str] = None
    distributor_country: Optional[str] = None
    distributor_name: Optional[str] = None
    design_origin_country: Optional[str] = None
    origin_category: str = "UNKNOWN"
    lifecycle_status: str = "UNKNOWN"
    datasheet_url: Optional[str] = None
    source_url: Optional[str] = None
    source_name: str = "Local Curated Catalogue"
    is_synthetic: bool = False
    user_criticality: str = "MEDIUM"
    user_notes: Optional[str] = None

class ComponentCreate(ComponentBase):
    specifications: Optional[ComponentSpecSchema] = None

class ComponentUpdate(BaseModel):
    user_criticality: Optional[str] = None
    user_notes: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    lifecycle_status: Optional[str] = None

class ComponentResponse(ComponentBase):
    id: str
    data_completeness_pct: float
    last_verified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    specifications: Optional[ComponentSpecSchema] = None
    bom_count: int = 0
    boms: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True

class BOMItemCreate(BaseModel):
    product_name: str = "Host System"
    part_number: str
    manufacturer: str
    category: Optional[str] = None
    quantity: int = 1
    required_voltage: Optional[str] = None
    required_current: Optional[str] = None
    package: Optional[str] = None
    interface: Optional[str] = None
    criticality: str = "MEDIUM"
    notes: Optional[str] = None

class BOMItemResponse(BaseModel):
    id: str
    bom_id: str
    component_id: Optional[str] = None
    product_name: str
    part_number: str
    manufacturer: str
    category: Optional[str] = None
    quantity: int
    required_voltage: Optional[str] = None
    required_current: Optional[str] = None
    package: Optional[str] = None
    interface: Optional[str] = None
    criticality: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class BOMResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    filename: str
    total_items: int
    total_quantity: int
    status: str
    created_at: datetime
    items: List[BOMItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

class DashboardSummaryResponse(BaseModel):
    total_boms: int
    total_unique_components: int
    total_critical_components: int
    verified_indian_count: int
    indian_supplier_unverified_mfr_count: int
    foreign_origin_count: int
    unknown_origin_count: int
    components_with_alternatives_count: int
    components_without_alternatives_count: int
    risk_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    high_priority_components: List[Dict[str, Any]]
    recent_boms: List[Dict[str, Any]]
    data_freshness: Dict[str, Any]

class SimulationRequest(BaseModel):
    component_id: str
    scenario_type: str = "COMPONENT_UNAVAILABLE"

class SettingsUpdate(BaseModel):
    workspace_name: Optional[str] = None
    weight_technical_fit: Optional[float] = None
    weight_origin: Optional[float] = None
    weight_lifecycle: Optional[float] = None
    weight_availability: Optional[float] = None
    weight_redesign: Optional[float] = None


# ==============================================================================
# SELLER & RFQ SCHEMAS
# ==============================================================================

class SellerContactSchema(BaseModel):
    id: str
    seller_id: str
    contact_type: str
    label: str
    value: str
    is_verified: bool = True
    is_public: bool = True
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class SellerListingSchema(BaseModel):
    id: str
    seller_id: str
    seller_name: Optional[str] = None
    seller_type: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    part_number: str
    normalized_part_number: str
    manufacturer: str
    description: Optional[str] = None
    category: Optional[str] = None
    seller_sku: Optional[str] = None
    product_url: Optional[str] = None
    datasheet_url: Optional[str] = None
    manufacturer_represented: Optional[str] = None
    match_type: str = "EXACT_MATCH"
    exact_match: bool = True
    seller_classification: str = "INDIAN_SELLER_EXACT"
    availability_status: str = "UNKNOWN"
    stock_quantity: Optional[int] = None
    price: Optional[float] = None
    currency: str = "INR"
    moq: Optional[int] = None
    lead_time_days: Optional[int] = None
    source_url: Optional[str] = None
    source_name: str = "Local Curated Catalogue"
    verification_status: str = "VERIFIED"
    last_checked_at: Optional[datetime] = None
    contacts: List[SellerContactSchema] = Field(default_factory=list)

    class Config:
        from_attributes = True


class SellerResponse(BaseModel):
    id: str
    name: str
    slug: str
    legal_name: Optional[str] = None
    seller_type: str
    is_verified_indian: bool = True
    is_authorised_distributor: bool = False
    is_manufacturer: bool = False
    website: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    country: str = "India"
    gstin: Optional[str] = None
    description: Optional[str] = None
    verification_notes: Optional[str] = None
    logo_url: Optional[str] = None
    created_at: Optional[datetime] = None
    contacts: List[SellerContactSchema] = Field(default_factory=list)
    listings_count: int = 0
    is_saved: bool = False

    class Config:
        from_attributes = True


class DataSourceStatusResponse(BaseModel):
    id: str
    name: str
    code: str
    provider_type: str
    is_active: bool
    is_live_api: bool
    api_status: str
    endpoint_url: Optional[str] = None
    last_retrieval_at: Optional[datetime] = None
    total_queries: int
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class IndianAlternativeOption(BaseModel):
    candidate_id: Optional[str] = None
    part_number: str
    manufacturer: str
    origin_category: str
    origin_label: str
    heuristic_score: float
    compatibility_status: str
    datasheet_url: Optional[str] = None
    source_url: Optional[str] = None
    sellers_count: int = 0
    sample_seller: Optional[str] = None


class ComponentSellerDiscoveryResponse(BaseModel):
    part_number: str
    normalized_part_number: str
    manufacturer: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    quantity_required: Optional[int] = None
    component_id: Optional[str] = None
    bom_id: Optional[str] = None
    
    # Matching breakdown
    exact_matches: List[SellerListingSchema] = Field(default_factory=list)
    potential_indian_alternatives: List[IndianAlternativeOption] = Field(default_factory=list)
    alternative_seller_listings: List[SellerListingSchema] = Field(default_factory=list)
    
    # Counts
    exact_sellers_count: int = 0
    alternatives_count: int = 0
    
    # Overall discovery status
    sourcing_status: str # 'INDIAN_MFR_DIRECT', 'INDIAN_SELLER_EXACT', 'INDIAN_ALTERNATIVE_AVAILABLE', 'NO_SELLER_FOUND', 'ORIGIN_UNKNOWN'
    sourcing_status_label: str
    
    # Data source status
    data_sources_queried: List[DataSourceStatusResponse] = Field(default_factory=list)
    search_timestamp: datetime
    disclaimer: str


class RFQCreate(BaseModel):
    company_name: str
    contact_person: str
    business_email: str
    phone: Optional[str] = None
    part_number: str
    manufacturer: str
    quantity_requested: int = Field(gt=0, description="Quantity must be greater than 0")
    target_delivery_location: str
    target_delivery_date: Optional[str] = None
    notes: Optional[str] = None
    seller_id: Optional[str] = None
    seller_name: Optional[str] = None
    bom_id: Optional[str] = None


class RFQStatusUpdate(BaseModel):
    status: str # DRAFT, READY_TO_SEND, SENT_BY_USER, SUBMITTED_VIA_INTEGRATION, RESPONSE_RECEIVED, CLOSED
    notes: Optional[str] = None
    changed_by: Optional[str] = "User"


class RFQStatusHistoryResponse(BaseModel):
    id: str
    previous_status: Optional[str] = None
    new_status: str
    changed_by: str
    notes: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True


class RFQResponse(BaseModel):
    id: str
    rfq_reference: str
    org_id: str
    bom_id: Optional[str] = None
    seller_id: Optional[str] = None
    seller_name: str
    company_name: str
    contact_person: str
    business_email: str
    phone: Optional[str] = None
    part_number: str
    manufacturer: str
    quantity_requested: int
    target_delivery_location: str
    target_delivery_date: Optional[str] = None
    notes: Optional[str] = None
    status: str
    submission_method: str
    seller_contact_email: Optional[str] = None
    generated_email_body: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    status_history: List[RFQStatusHistoryResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

