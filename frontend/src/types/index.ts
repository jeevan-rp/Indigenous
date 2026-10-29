export type OriginCategory = 
  | 'VERIFIED_INDIAN'
  | 'INDIAN_SUPPLIER_UNVERIFIED_MFR'
  | 'FOREIGN'
  | 'UNKNOWN';

export type LifecycleStatus = 
  | 'ACTIVE'
  | 'NRND'
  | 'EOL'
  | 'OBSOLETE'
  | 'UNKNOWN';

export type CriticalityLevel = 
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export interface ComponentSpecification {
  min_voltage_v?: number | null;
  max_voltage_v?: number | null;
  nominal_voltage_v?: number | null;
  max_current_ma?: number | null;
  package?: string | null;
  pin_count?: number | null;
  operating_temp_min_c?: number | null;
  operating_temp_max_c?: number | null;
  interfaces?: string[];
  clock_speed_mhz?: number | null;
  flash_kb?: number | null;
  ram_kb?: number | null;
  custom_specs?: Record<string, any>;
}

export interface ComponentSource {
  id: string;
  source_type: string;
  source_name: string;
  source_url?: string;
  confidence_level: string;
  retrieved_at?: string;
  notes?: string;
}

export interface ComponentItem {
  id: string;
  part_number: string;
  manufacturer: string;
  category: string;
  description?: string;
  manufacturer_country?: string;
  manufacturer_country_confidence?: string;
  manufacturer_country_evidence_url?: string;
  distributor_country?: string;
  distributor_name?: string;
  design_origin_country?: string;
  origin_category: OriginCategory;
  lifecycle_status: LifecycleStatus;
  datasheet_url?: string;
  source_url?: string;
  source_name: string;
  is_synthetic: boolean;
  data_completeness_pct: number;
  user_criticality: CriticalityLevel;
  user_notes?: string;
  last_verified_at?: string;
  specifications?: ComponentSpecification;
  bom_count?: number;
  boms?: string[];
  bom_occurrences?: Array<{
    bom_id: string;
    bom_name: string;
    product_name: string;
    quantity: number;
    criticality: string;
  }>;
  unknown_fields?: string[];
  sources?: ComponentSource[];
}

export interface BOMItem {
  id: string;
  bom_id: string;
  component_id?: string;
  product_name: string;
  part_number: string;
  manufacturer: string;
  category?: string;
  quantity: number;
  required_voltage?: string;
  required_current?: string;
  package?: string;
  interface?: string;
  criticality: CriticalityLevel;
  notes?: string;
}

export interface BOMHeader {
  id: string;
  name: string;
  description?: string;
  filename: string;
  total_items: number;
  total_quantity: number;
  status: string;
  created_at: string;
  items?: BOMItem[];
}

export interface DashboardSummary {
  total_boms: number;
  total_unique_components: number;
  total_critical_components: number;
  verified_indian_count: number;
  indian_supplier_unverified_mfr_count: number;
  foreign_origin_count: number;
  unknown_origin_count: number;
  components_with_alternatives_count: number;
  components_without_alternatives_count: number;
  components_with_indian_alternatives_count?: number;
  risk_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  category_risk_breakdown?: Array<{
    category: string;
    total: number;
    critical: number;
  }>;
  high_priority_components: Array<{
    id: string;
    part_number: string;
    manufacturer: string;
    category: string;
    origin_category: OriginCategory;
    lifecycle_status: LifecycleStatus;
    user_criticality: CriticalityLevel;
    risk_level: string;
    risk_score: number;
    viable_alternatives_count: number;
    has_indian_alternative?: boolean;
    boms_count: number;
    total_quantity: number;
    top_candidate?: string;
    top_candidate_origin?: string;
  }>;
  all_priority_components?: Array<{
    id: string;
    part_number: string;
    manufacturer: string;
    category: string;
    origin_category: OriginCategory;
    lifecycle_status: LifecycleStatus;
    user_criticality: CriticalityLevel;
    risk_level: string;
    risk_score: number;
    viable_alternatives_count: number;
    has_indian_alternative?: boolean;
    boms_count: number;
    total_quantity: number;
    top_candidate?: string;
    top_candidate_origin?: string;
  }>;
  recent_boms: Array<{
    id: string;
    name: string;
    filename: string;
    total_items: number;
    total_quantity: number;
    critical_count?: number;
    status: string;
    created_at?: string;
  }>;
  bom_components_with_seller_listings?: number;
  components_with_no_seller_listing?: number;
  rfqs_awaiting_followup?: number;
  potential_domestic_alternatives?: number;
  sourcing_actions?: Array<{
    component_id: string;
    part_number: string;
    manufacturer: string;
    category: string;
    risk_level: string;
    risk_score: number;
    user_criticality: string;
    seller_listings_count: number;
    has_indian_alternative: boolean;
    top_candidate?: string;
    sourcing_status: string;
    sourcing_status_label: string;
    top_seller_name?: string;
    total_quantity: number;
  }>;
  data_freshness: {
    oldest_verification?: string;
    latest_verification?: string;
    is_stale_warning: boolean;
    notice: string;
  };
}

export interface AlternativeCandidate {
  candidate_id: string;
  part_number: string;
  manufacturer: string;
  category: string;
  compatibility_status: 'COMPATIBLE' | 'REVIEW_REQUIRED' | 'HARD_MISMATCH';
  heuristic_score: number;
  matches_count: number;
  mismatches_count: number;
  unknowns_count: number;
  origin_category: OriginCategory;
  origin_label: string;
  origin_badge_class: string;
  lifecycle_status: string;
  redesign_effort: 'MINIMAL' | 'MODERATE' | 'MAJOR' | 'UNKNOWN';
  redesign_note: string;
  ranking_reason: string;
  mismatch_details: string[];
  unknown_details: string[];
  comparison_details: Array<{
    name: string;
    base_value: any;
    candidate_value: any;
    status: 'MATCH' | 'MISMATCH' | 'UNKNOWN' | 'REVIEW_REQUIRED';
    importance: string;
    reason: string;
  }>;
  datasheet_url?: string;
  source_url?: string;
  last_verified_at?: string;
  is_synthetic: boolean;
}

export interface AlternativeDiscoveryResponse {
  base_component: ComponentItem;
  has_suitable_alternatives: boolean;
  message: string;
  candidates_count: number;
  hard_mismatch_count: number;
  candidates: AlternativeCandidate[];
  excluded_mismatches: AlternativeCandidate[];
}

export interface SimulationResult {
  simulation_id: string;
  scenario: {
    title: string;
    type: string;
    disclaimer: string;
  };
  component: {
    id?: string;
    part_number: string;
    manufacturer: string;
    category?: string;
    origin_category?: OriginCategory;
    user_criticality: string;
    lifecycle_status?: string;
    last_verified_at?: string;
  };
  impact: {
    affected_boms_count: number;
    affected_products_count: number;
    total_affected_quantity: number;
    is_multi_bom_dependency: boolean;
    affected_boms: Array<{
      bom_id: string;
      bom_name: string;
      item_quantity: number;
      criticality: string;
    }>;
    affected_products: Array<{
      product_name: string;
      required_quantity: number;
    }>;
  };
  alternative_readiness: {
    viable_candidates_count: number;
    top_candidates: AlternativeCandidate[];
    hard_mismatches_count: number;
    estimated_redesign_effort: string;
    redesign_effort_factors: string[];
  };
  data_gaps: string[];
  recommended_actions: string[];
  ran_at?: string;
}

export interface AnalyzedBOMItem {
  bom_item_id: string;
  component_id?: string | null;
  product_name: string;
  reference_designator?: string;
  part_number: string;
  description?: string | null;
  manufacturer: string;
  category: string;
  quantity: number;
  package?: string | null;
  required_voltage?: string | null;
  criticality: CriticalityLevel;
  origin_category: OriginCategory;
  manufacturer_country?: string | null;
  origin_confidence?: string;
  origin_evidence_url?: string | null;
  distributor_name?: string | null;
  datasheet_url?: string | null;
  source_url?: string | null;
  lifecycle_status: LifecycleStatus;
  risk_level: string;
  risk_score: number;
  risk_factors: string[];
  unknown_data_factors: string[];
  suggested_actions: string[];
  is_critical: boolean;
  why_critical: string;
  why_sourcing_concern: string;
  country_evidence_summary: string;
  missing_information: string[];
  has_missing_specs: boolean;
  recommended_action: string;
  indian_sourcing_options: Array<{
    candidate_id: string;
    part_number: string;
    manufacturer: string;
    origin_category: OriginCategory;
    origin_label: string;
    heuristic_score: number;
    compatibility_status: string;
    datasheet_url?: string;
    source_url?: string;
  }>;
  // Indian Seller Discovery fields
  indian_seller_listings_count: number;
  indian_seller_listings?: Array<{
    seller_name: string;
    seller_type: string;
    location_city?: string;
    location_state?: string;
    availability_status: string;
    price?: number;
    currency: string;
    moq?: number;
    lead_time_days?: number;
    product_url?: string;
    seller_classification: string;
  }>;
  potential_indian_alternatives_count: number;
  potential_indian_alternatives?: Array<{
    candidate_id?: string;
    part_number: string;
    manufacturer: string;
    origin_label: string;
    compatibility_status: string;
    sellers_count: number;
    sample_seller?: string;
  }>;
  sourcing_status: string;
  sourcing_status_label: string;
  is_multi_bom: boolean;
  bom_sharing_count: number;
  total_shared_quantity: number;
  viable_alternatives_count: number;
  top_alternative?: {
    part_number: string;
    manufacturer: string;
    origin_label: string;
    heuristic_score: number;
    compatibility_status: string;
    ranking_reason: string;
  } | null;
}

export interface BOMAnalysisResult {
  bom_id: string;
  bom_name: string;
  filename: string;
  total_items: number;
  summary_metrics: {
    total_items: number;
    unique_components: number;
    critical_components: number;
    verified_foreign_components: number;
    unknown_origin_components: number;
    components_with_potential_indian_alternatives: number;
    components_requiring_verification: number;
    components_with_seller_listings?: number;
    components_with_no_seller_listing?: number;
    potential_domestic_alternatives?: number;
    rfqs_awaiting_followup?: number;
  };
  risk_summary: Record<string, number>;
  items_analyzed: AnalyzedBOMItem[];
  disclaimer: string;
}

// =============================================================================
// INDIAN SELLER & RFQ TYPES
// =============================================================================

export interface SellerContact {
  id: string;
  seller_id: string;
  contact_type: 'EMAIL' | 'PHONE' | 'CONTACT_PAGE' | 'RFQ_LINK' | 'OFFICIAL_WEBSITE';
  label: string;
  value: string;
  is_verified: boolean;
  is_public: boolean;
  notes?: string;
}

export interface SellerListing {
  id: string;
  seller_id: string;
  seller_name?: string;
  seller_type?: string;
  location_city?: string;
  location_state?: string;
  part_number: string;
  normalized_part_number: string;
  manufacturer: string;
  description?: string;
  category?: string;
  seller_sku?: string;
  product_url?: string;
  datasheet_url?: string;
  manufacturer_represented?: string;
  match_type: 'EXACT_MATCH' | 'POTENTIAL_ALTERNATIVE';
  exact_match: boolean;
  seller_classification:
    | 'INDIAN_SELLER_EXACT'
    | 'INDIAN_AUTHORISED_DISTRIBUTOR'
    | 'INDIAN_SELLER_UNVERIFIED_AUTH'
    | 'VERIFIED_INDIAN_MANUFACTURER'
    | 'POTENTIAL_INDIAN_ALTERNATIVE'
    | 'FOREIGN_MFR_INDIAN_SELLER'
    | 'NO_SELLER_FOUND';
  availability_status: 'IN_STOCK' | 'LEAD_TIME' | 'ON_REQUEST' | 'UNKNOWN';
  stock_quantity?: number | null;
  price?: number | null;
  currency: string;
  moq?: number | null;
  lead_time_days?: number | null;
  source_url?: string;
  source_name: string;
  verification_status: 'VERIFIED' | 'CLAIMED' | 'UNVERIFIED';
  last_checked_at?: string;
  contacts?: SellerContact[];
}

export interface Seller {
  id: string;
  name: string;
  slug: string;
  legal_name?: string;
  seller_type: string;
  is_verified_indian: boolean;
  is_authorised_distributor: boolean;
  is_manufacturer: boolean;
  website?: string;
  location_city?: string;
  location_state?: string;
  country: string;
  gstin?: string;
  description?: string;
  verification_notes?: string;
  logo_url?: string;
  created_at?: string;
  contacts: SellerContact[];
  listings_count: number;
  is_saved: boolean;
}

export interface DataSourceStatus {
  id: string;
  name: string;
  code: string;
  provider_type: string;
  is_active: boolean;
  is_live_api: boolean;
  api_status: 'CONFIGURED' | 'NOT_CONFIGURED' | 'LOCAL_CATALOGUE' | 'RATE_LIMITED';
  endpoint_url?: string;
  last_retrieval_at?: string;
  total_queries: number;
  notes?: string;
}

export interface IndianAlternativeOption {
  candidate_id?: string;
  part_number: string;
  manufacturer: string;
  origin_category: string;
  origin_label: string;
  heuristic_score: number;
  compatibility_status: string;
  datasheet_url?: string;
  source_url?: string;
  sellers_count: number;
  sample_seller?: string;
}

export interface ComponentSellerDiscoveryResponse {
  part_number: string;
  normalized_part_number: string;
  manufacturer?: string;
  description?: string;
  category?: string;
  quantity_required?: number;
  component_id?: string;
  bom_id?: string;
  exact_matches: SellerListing[];
  potential_indian_alternatives: IndianAlternativeOption[];
  alternative_seller_listings: SellerListing[];
  exact_sellers_count: number;
  alternatives_count: number;
  sourcing_status: string;
  sourcing_status_label: string;
  data_sources_queried: DataSourceStatus[];
  search_timestamp: string;
  disclaimer: string;
}

export interface RFQStatusHistory {
  id: string;
  previous_status?: string | null;
  new_status: string;
  changed_by: string;
  notes?: string;
  changed_at: string;
}

export interface RFQ {
  id: string;
  rfq_reference: string;
  org_id: string;
  bom_id?: string | null;
  seller_id?: string | null;
  seller_name: string;
  company_name: string;
  contact_person: string;
  business_email: string;
  phone?: string | null;
  part_number: string;
  manufacturer: string;
  quantity_requested: number;
  target_delivery_location: string;
  target_delivery_date?: string | null;
  notes?: string | null;
  status:
    | 'DRAFT'
    | 'READY_TO_SEND'
    | 'SENT_BY_USER'
    | 'SUBMITTED_VIA_INTEGRATION'
    | 'RESPONSE_RECEIVED'
    | 'CLOSED';
  submission_method: string;
  seller_contact_email?: string | null;
  generated_email_body?: string | null;
  created_at: string;
  updated_at: string;
  status_history: RFQStatusHistory[];
}

export interface RFQCreatePayload {
  company_name: string;
  contact_person: string;
  business_email: string;
  phone?: string;
  part_number: string;
  manufacturer: string;
  quantity_requested: number;
  target_delivery_location: string;
  target_delivery_date?: string;
  notes?: string;
  seller_id?: string;
  seller_name?: string;
  bom_id?: string;
}

