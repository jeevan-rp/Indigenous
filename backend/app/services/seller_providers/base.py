from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timezone

@dataclass
class ProviderListing:
    part_number: str
    manufacturer: str
    seller_name: str
    seller_type: str
    location_city: Optional[str]
    location_state: Optional[str]
    is_verified_indian: bool
    is_authorised_distributor: bool
    is_manufacturer: bool
    match_type: str # EXACT_MATCH, POTENTIAL_ALTERNATIVE
    exact_match: bool
    seller_classification: str
    availability_status: str # IN_STOCK, LEAD_TIME, ON_REQUEST, UNKNOWN
    stock_quantity: Optional[int]
    price: Optional[float]
    currency: str
    moq: Optional[int]
    lead_time_days: Optional[int]
    product_url: Optional[str]
    datasheet_url: Optional[str]
    seller_sku: Optional[str]
    source_name: str
    source_url: Optional[str]
    verification_status: str
    contacts: List[Dict[str, Any]]
    last_checked_at: datetime


@dataclass
class ProviderResult:
    provider_code: str
    provider_name: str
    is_configured: bool
    status_message: str
    listings: List[ProviderListing]
    error: Optional[str] = None


class BaseSellerProvider(ABC):
    """
    Abstract base class for all component seller & supplier data sources.
    Respects provider terms: Never scrapes against terms, never fakes live APIs,
    and accurately reports configuration status.
    """
    code: str
    name: str
    is_live_api: bool = False

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if required API credentials or configurations are present."""
        pass

    @abstractmethod
    def get_status_info(self) -> Dict[str, Any]:
        """Return provider connection and operational status metadata."""
        pass

    @abstractmethod
    def search_part(self, part_number: str, db_session: Any) -> ProviderResult:
        """Search the provider for listings of the given part number."""
        pass
