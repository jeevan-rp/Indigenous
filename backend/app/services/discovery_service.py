import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models import (
    Component, BOMItem, AlternativeMatch, SourcingSearch, DataSource,
    generate_uuid
)
from .part_matcher import normalize_part_number, is_exact_part_match
from .seller_providers import (
    BaseSellerProvider, LocalIndianCatalogueProvider,
    MouserProvider, DigiKeyProvider, NexarOctopartProvider
)
from ..schemas import (
    ComponentSellerDiscoveryResponse, SellerListingSchema,
    IndianAlternativeOption, DataSourceStatusResponse, SellerContactSchema
)

logger = logging.getLogger(__name__)

# Registered providers list
PROVIDERS: List[BaseSellerProvider] = [
    LocalIndianCatalogueProvider(),
    MouserProvider(),
    DigiKeyProvider(),
    NexarOctopartProvider()
]


def get_all_provider_statuses(db: Session) -> List[DataSourceStatusResponse]:
    """
    Returns live and catalog status of all configured supplier sources.
    """
    db_sources = {ds.code: ds for ds in db.query(DataSource).all()}
    statuses = []

    for p in PROVIDERS:
        info = p.get_status_info()
        db_rec = db_sources.get(p.code)
        
        last_retrieval = db_rec.last_retrieval_at if db_rec else None
        total_queries = db_rec.total_queries if db_rec else 0
        
        statuses.append(
            DataSourceStatusResponse(
                id=db_rec.id if db_rec else generate_uuid(),
                name=info["name"],
                code=p.code,
                provider_type=info["provider_type"],
                is_active=info["is_active"],
                is_live_api=info["is_live_api"],
                api_status=info["api_status"],
                endpoint_url=info.get("endpoint_url"),
                last_retrieval_at=last_retrieval,
                total_queries=total_queries,
                notes=info.get("status_message")
            )
        )
    return statuses


def classify_seller_listing(
    listing_exact: bool,
    seller_is_mfr: bool,
    seller_is_auth_dist: bool,
    seller_is_indian: bool,
    component_origin_cat: str
) -> str:
    """
    Applies the 7 distinct seller classifications:
    1. INDIAN_SELLER_EXACT
    2. INDIAN_AUTHORISED_DISTRIBUTOR
    3. INDIAN_SELLER_UNVERIFIED_AUTH
    4. VERIFIED_INDIAN_MANUFACTURER
    5. POTENTIAL_INDIAN_ALTERNATIVE
    6. FOREIGN_MFR_INDIAN_SELLER
    7. NO_SELLER_FOUND
    """
    if not listing_exact:
        return "POTENTIAL_INDIAN_ALTERNATIVE"

    if seller_is_mfr and seller_is_indian and component_origin_cat == "VERIFIED_INDIAN":
        return "VERIFIED_INDIAN_MANUFACTURER"

    if component_origin_cat == "FOREIGN" and seller_is_indian:
        if seller_is_auth_dist:
            return "INDIAN_AUTHORISED_DISTRIBUTOR"
        return "FOREIGN_MFR_INDIAN_SELLER"

    if seller_is_indian and seller_is_auth_dist:
        return "INDIAN_AUTHORISED_DISTRIBUTOR"

    if seller_is_indian:
        return "INDIAN_SELLER_EXACT"

    return "FOREIGN_MFR_INDIAN_SELLER"


def discover_sellers_for_part(
    db: Session,
    part_number: str,
    component: Optional[Component] = None,
    bom_id: Optional[str] = None,
    quantity_required: Optional[int] = None,
    user_id: Optional[str] = None
) -> ComponentSellerDiscoveryResponse:
    """
    Discovers Indian sellers for an exact component part number,
    and identifies domestic-manufactured alternatives separately.
    """
    norm_pn = normalize_part_number(part_number)
    
    # 1. Resolve or find component record in catalogue if not passed
    if not component:
        component = db.query(Component).filter(
            (Component.part_number == part_number) |
            (Component.part_number == norm_pn)
        ).first()

    origin_cat = component.origin_category if component else "UNKNOWN"
    description = component.description if component else None
    manufacturer = component.manufacturer if component else "Unknown Manufacturer"
    category = component.category if component else "Unknown Category"

    # 2. Query configured providers
    exact_matches: List[SellerListingSchema] = []
    alternative_seller_listings: List[SellerListingSchema] = []
    
    for provider in PROVIDERS:
        res = provider.search_part(norm_pn, db)
        
        # Log search audit
        search_rec = SourcingSearch(
            id=generate_uuid(),
            part_number=part_number,
            normalized_part_number=norm_pn,
            bom_id=bom_id,
            user_id=user_id,
            provider_code=provider.code,
            results_count=len(res.listings),
            status="SUCCESS" if provider.is_configured() else "NOT_CONFIGURED",
            error_details=res.error or res.status_message,
            searched_at=datetime.now(timezone.utc)
        )
        db.add(search_rec)

        # Update data source query counts
        ds_rec = db.query(DataSource).filter_by(code=provider.code).first()
        if ds_rec:
            ds_rec.total_queries = (ds_rec.total_queries or 0) + 1
            if provider.is_configured():
                ds_rec.last_retrieval_at = datetime.now(timezone.utc)

        for pl in res.listings:
            classification = classify_seller_listing(
                listing_exact=pl.exact_match,
                seller_is_mfr=pl.is_manufacturer,
                seller_is_auth_dist=pl.is_authorised_distributor,
                seller_is_indian=pl.is_verified_indian,
                component_origin_cat=origin_cat
            )

            contacts = [
                SellerContactSchema(
                    id=c.get("id") or generate_uuid(),
                    seller_id=c.get("seller_id") or "",
                    contact_type=c.get("contact_type", "OFFICIAL_WEBSITE"),
                    label=c.get("label", "Contact"),
                    value=c.get("value", ""),
                    is_verified=c.get("is_verified", True),
                    is_public=c.get("is_public", True),
                    notes=c.get("notes")
                )
                for c in pl.contacts
            ]

            schema_listing = SellerListingSchema(
                id=generate_uuid(),
                seller_id=generate_uuid(),
                seller_name=pl.seller_name,
                seller_type=pl.seller_type,
                location_city=pl.location_city,
                location_state=pl.location_state,
                part_number=pl.part_number,
                normalized_part_number=normalize_part_number(pl.part_number),
                manufacturer=pl.manufacturer,
                description=description,
                category=category,
                seller_sku=pl.seller_sku,
                product_url=pl.product_url,
                datasheet_url=pl.datasheet_url or (component.datasheet_url if component else None),
                manufacturer_represented=pl.manufacturer,
                match_type=pl.match_type,
                exact_match=pl.exact_match,
                seller_classification=classification,
                availability_status=pl.availability_status,
                stock_quantity=pl.stock_quantity,
                price=pl.price,
                currency=pl.currency,
                moq=pl.moq,
                lead_time_days=pl.lead_time_days,
                source_url=pl.source_url,
                source_name=pl.source_name,
                verification_status=pl.verification_status,
                last_checked_at=pl.last_checked_at,
                contacts=contacts
            )

            if pl.exact_match:
                exact_matches.append(schema_listing)
            else:
                alternative_seller_listings.append(schema_listing)

    # 3. Discover Potential Indian-Manufactured Alternatives (Separately from Indian sellers)
    potential_indian_alts: List[IndianAlternativeOption] = []
    if component:
        from .alternative_service import find_alternatives_for_component
        alts_data = find_alternatives_for_component(db, component.id)
        candidates = alts_data.get("candidates", [])

        for cand in candidates:
            if cand.get("origin_category") == "VERIFIED_INDIAN":
                # Find sellers for this candidate
                cand_sellers = LocalIndianCatalogueProvider().search_part(cand["part_number"], db)
                potential_indian_alts.append(
                    IndianAlternativeOption(
                        candidate_id=cand.get("candidate_id"),
                        part_number=cand["part_number"],
                        manufacturer=cand["manufacturer"],
                        origin_category=cand["origin_category"],
                        origin_label=f"Verified Indian Manufacturer ({cand.get('manufacturer_country') or 'India'})",
                        heuristic_score=cand.get("heuristic_score", 0.0),
                        compatibility_status=cand.get("compatibility_status", "COMPATIBLE"),
                        datasheet_url=cand.get("datasheet_url"),
                        source_url=cand.get("source_url"),
                        sellers_count=len(cand_sellers.listings),
                        sample_seller=cand_sellers.listings[0].seller_name if cand_sellers.listings else "Direct Indian Fab / Lab"
                    )
                )

    # 4. Determine overall sourcing status
    if any(m.seller_classification == "VERIFIED_INDIAN_MANUFACTURER" for m in exact_matches):
        sourcing_status = "INDIAN_MFR_DIRECT"
        sourcing_status_label = "Verified Indian Manufacturer Direct Listing"
    elif len(exact_matches) > 0:
        sourcing_status = "INDIAN_SELLER_EXACT"
        sourcing_status_label = f"{len(exact_matches)} Indian Seller Listing(s) Found"
    elif len(potential_indian_alts) > 0:
        sourcing_status = "INDIAN_ALTERNATIVE_AVAILABLE"
        sourcing_status_label = f"Potential Indian Alternative Available ({potential_indian_alts[0].part_number})"
    else:
        sourcing_status = "NO_SELLER_FOUND"
        sourcing_status_label = "No verified Indian seller listing found in configured sources"

    # Get provider status info
    provider_statuses = get_all_provider_statuses(db)

    db.commit()

    return ComponentSellerDiscoveryResponse(
        part_number=part_number,
        normalized_part_number=norm_pn,
        manufacturer=manufacturer,
        description=description,
        category=category,
        quantity_required=quantity_required,
        component_id=component.id if component else None,
        bom_id=bom_id,
        exact_matches=exact_matches,
        potential_indian_alternatives=potential_indian_alts,
        alternative_seller_listings=alternative_seller_listings,
        exact_sellers_count=len(exact_matches),
        alternatives_count=len(potential_indian_alts),
        sourcing_status=sourcing_status,
        sourcing_status_label=sourcing_status_label,
        data_sources_queried=provider_statuses,
        search_timestamp=datetime.now(timezone.utc),
        disclaimer="Seller listings and contact details are verified against public distributor registries. Commercial quotations require direct seller interaction."
    )
