from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from .base import BaseSellerProvider, ProviderResult, ProviderListing
from ..part_matcher import normalize_part_number, is_exact_part_match
from ...models import Seller, SellerListing, SellerContact, DataSource

class LocalIndianCatalogueProvider(BaseSellerProvider):
    """
    Curated repository of verified Indian electronics sellers, manufacturers,
    and authorised distributors. Always active and configured without third-party API dependencies.
    """
    code = "LOCAL_CATALOGUE"
    name = "Curated Indian Supplier Catalogue"
    is_live_api = False

    def is_configured(self) -> bool:
        return True

    def get_status_info(self) -> Dict[str, Any]:
        return {
            "code": self.code,
            "name": self.name,
            "provider_type": "LOCAL",
            "is_active": True,
            "is_live_api": False,
            "api_status": "CONFIGURED",
            "status_message": "Local verified catalogue active with direct manufacturer & distributor registers.",
            "endpoint_url": None
        }

    def search_part(self, part_number: str, db_session: Session) -> ProviderResult:
        norm_query = normalize_part_number(part_number)
        
        # Query listings where normalized part number matches
        listings_query = (
            db_session.query(SellerListing)
            .join(Seller, SellerListing.seller_id == Seller.id)
            .filter(
                (SellerListing.normalized_part_number == norm_query) |
                (SellerListing.part_number.ilike(part_number.strip()))
            )
            .all()
        )
        
        provider_listings: List[ProviderListing] = []
        for l in listings_query:
            seller = l.seller
            contacts_list = []
            if seller and seller.contacts:
                for c in seller.contacts:
                    contacts_list.append({
                        "id": c.id,
                        "seller_id": c.seller_id,
                        "contact_type": c.contact_type,
                        "label": c.label,
                        "value": c.value,
                        "is_verified": c.is_verified,
                        "is_public": c.is_public,
                        "notes": c.notes
                    })

            # Exact match check
            exact = is_exact_part_match(part_number, l.part_number)
            match_type = "EXACT_MATCH" if exact else "POTENTIAL_ALTERNATIVE"

            provider_listings.append(
                ProviderListing(
                    part_number=l.part_number,
                    manufacturer=l.manufacturer,
                    seller_name=seller.name if seller else "Unknown Seller",
                    seller_type=seller.seller_type if seller else "INDIAN_DISTRIBUTOR",
                    location_city=seller.location_city if seller else None,
                    location_state=seller.location_state if seller else None,
                    is_verified_indian=seller.is_verified_indian if seller else True,
                    is_authorised_distributor=seller.is_authorised_distributor if seller else False,
                    is_manufacturer=seller.is_manufacturer if seller else False,
                    match_type=match_type,
                    exact_match=exact,
                    seller_classification=l.seller_classification,
                    availability_status=l.availability_status or "UNKNOWN",
                    stock_quantity=l.stock_quantity,
                    price=l.price,
                    currency=l.currency or "INR",
                    moq=l.moq,
                    lead_time_days=l.lead_time_days,
                    product_url=l.product_url,
                    datasheet_url=l.datasheet_url,
                    seller_sku=l.seller_sku,
                    source_name=l.source_name or "Local Curated Catalogue",
                    source_url=l.source_url,
                    verification_status=l.verification_status or "VERIFIED",
                    contacts=contacts_list,
                    last_checked_at=l.last_checked_at or datetime.now(timezone.utc)
                )
            )

        return ProviderResult(
            provider_code=self.code,
            provider_name=self.name,
            is_configured=True,
            status_message="Search completed against local curated Indian electronics catalogue.",
            listings=provider_listings
        )
