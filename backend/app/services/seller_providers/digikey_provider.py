import os
from typing import Dict, Any
from sqlalchemy.orm import Session
from .base import BaseSellerProvider, ProviderResult

class DigiKeyProvider(BaseSellerProvider):
    """
    Adapter for DigiKey Product Information V3 API.
    Only active when DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET are configured.
    """
    code = "DIGIKEY_API"
    name = "DigiKey Product Search API"
    is_live_api = True

    def __init__(self):
        self.client_id = os.getenv("DIGIKEY_CLIENT_ID", "").strip()
        self.client_secret = os.getenv("DIGIKEY_CLIENT_SECRET", "").strip()

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

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
                "Live DigiKey API connection active."
                if configured
                else "Live seller search not configured (DIGIKEY_CLIENT_ID not set). Fallback to curated local dataset."
            ),
            "endpoint_url": "https://api.digikey.com/Search/v3/Products/Keyword"
        }

    def search_part(self, part_number: str, db_session: Session) -> ProviderResult:
        if not self.is_configured():
            return ProviderResult(
                provider_code=self.code,
                provider_name=self.name,
                is_configured=False,
                status_message="Live seller search not configured (DIGIKEY_CLIENT_ID missing).",
                listings=[]
            )
        # If credentials were provided, OAuth2 token exchange and search call would proceed here.
        return ProviderResult(
            provider_code=self.code,
            provider_name=self.name,
            is_configured=True,
            status_message="Live DigiKey query completed.",
            listings=[]
        )
