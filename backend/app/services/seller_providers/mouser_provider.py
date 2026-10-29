import os
import requests
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from .base import BaseSellerProvider, ProviderResult, ProviderListing

class MouserProvider(BaseSellerProvider):
    """
    Adapter for Mouser Electronics Search API.
    Only executes live queries when MOUSER_API_KEY is configured in the environment.
    Classifies Mouser as an international distributor with dedicated shipping & customs clearance into India.
    """
    code = "MOUSER_API"
    name = "Mouser Electronics Search API"
    is_live_api = True

    def __init__(self):
        self.api_key = os.getenv("MOUSER_API_KEY", "").strip()
        self.base_url = "https://api.mouser.com/api/v1/search/partnumber"

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def get_status_info(self) -> Dict[str, Any]:
        configured = self.is_configured()
        return {
            "code": self.code,
            "name": self.name,
            "provider_type": "REST_API",
            "is_active": configured,
            "is_live_api": True,
            "api_status": "CONFIGURED" if configured else "NOT_CONFIGURED",
            "status_message": (
                "Live Mouser API connection active."
                if configured
                else "Live seller search not configured (MOUSER_API_KEY not set). Fallback to curated local dataset."
            ),
            "endpoint_url": self.base_url
        }

    def search_part(self, part_number: str, db_session: Session) -> ProviderResult:
        if not self.is_configured():
            return ProviderResult(
                provider_code=self.code,
                provider_name=self.name,
                is_configured=False,
                status_message="Live seller search not configured (MOUSER_API_KEY not set).",
                listings=[]
            )

        try:
            url = f"{self.base_url}?apiKey={self.api_key}"
            payload = {
                "SearchByPartRequest": {
                    "mouserPartNumber": part_number,
                    "partSearchOptions": "Exact"
                }
            }
            res = requests.post(url, json=payload, timeout=8)
            if res.status_code != 200:
                return ProviderResult(
                    provider_code=self.code,
                    provider_name=self.name,
                    is_configured=True,
                    status_message=f"Mouser API returned HTTP {res.status_code}",
                    listings=[],
                    error=res.text
                )

            data = res.json()
            parts = data.get("SearchResult", {}).get("Parts", [])
            listings: List[ProviderListing] = []

            for p in parts:
                mouser_pn = p.get("ManufacturerPartNumber", "")
                exact = (mouser_pn.strip().upper() == part_number.strip().upper())
                
                # Extract pricing in INR or USD
                price = None
                currency = "INR"
                price_breaks = p.get("PriceBreaks", [])
                if price_breaks:
                    price = float(price_breaks[0].get("Price", "0").replace("₹", "").replace("$", "").replace(",", "").strip())
                    currency = p.get("Currency", "INR")

                listings.append(
                    ProviderListing(
                        part_number=mouser_pn,
                        manufacturer=p.get("Manufacturer", "Unknown"),
                        seller_name="Mouser Electronics India",
                        seller_type="FOREIGN_DISTRIBUTOR_INDIA_SHIPPING",
                        location_city="Bengaluru",
                        location_state="Karnataka",
                        is_verified_indian=False,
                        is_authorised_distributor=True,
                        is_manufacturer=False,
                        match_type="EXACT_MATCH" if exact else "POTENTIAL_ALTERNATIVE",
                        exact_match=exact,
                        seller_classification="FOREIGN_MFR_INDIAN_SELLER",
                        availability_status="IN_STOCK" if int(p.get("AvailabilityInStock", 0) or 0) > 0 else "LEAD_TIME",
                        stock_quantity=int(p.get("AvailabilityInStock", 0) or 0),
                        price=price,
                        currency=currency,
                        moq=int(p.get("Min", 1) or 1),
                        lead_time_days=int(p.get("LeadTimeInDays", 14) or 14),
                        product_url=p.get("ProductDetailUrl"),
                        datasheet_url=p.get("DataSheetUrl"),
                        seller_sku=p.get("MouserPartNumber"),
                        source_name="Mouser Live API",
                        source_url=p.get("ProductDetailUrl"),
                        verification_status="VERIFIED",
                        contacts=[{
                            "contact_type": "OFFICIAL_WEBSITE",
                            "label": "Mouser India Portal",
                            "value": "https://www.mouser.in",
                            "is_verified": True,
                            "is_public": True,
                            "notes": "Direct Indian shipping and customs assistance desk"
                        }],
                        last_checked_at=datetime.now(timezone.utc)
                    )
                )

            return ProviderResult(
                provider_code=self.code,
                provider_name=self.name,
                is_configured=True,
                status_message=f"Retrieved {len(listings)} listings from Mouser Search API.",
                listings=listings
            )
        except Exception as e:
            return ProviderResult(
                provider_code=self.code,
                provider_name=self.name,
                is_configured=True,
                status_message=f"Mouser live API call failed: {str(e)}",
                listings=[],
                error=str(e)
            )
