from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Organisation
from ..schemas import SettingsUpdate
from ..services.seed_data import seed_database
from ..config import settings

router = APIRouter(prefix="", tags=["Settings & Data Sources"])

@router.get("/settings")
def get_settings(db: Session = Depends(get_db)):
    org = db.query(Organisation).first()
    return {
        "workspace_name": org.name if org else "Default Workspace",
        "workspace_slug": org.slug if org else "default",
        "scoring_weights": {
            "weight_technical_fit": settings.WEIGHT_TECHNICAL_FIT,
            "weight_origin_verified_indian": settings.WEIGHT_ORIGIN_VERIFIED_INDIAN,
            "weight_lifecycle_active": settings.WEIGHT_LIFECYCLE_ACTIVE,
            "weight_availability": settings.WEIGHT_AVAILABILITY,
            "weight_redesign_minimal": settings.WEIGHT_REDESIGN_MINIMAL
        },
        "environment": settings.ENVIRONMENT
    }

@router.patch("/settings")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    org = db.query(Organisation).first()
    if org and payload.workspace_name:
        org.name = payload.workspace_name
        db.commit()

    if payload.weight_technical_fit is not None:
        settings.WEIGHT_TECHNICAL_FIT = payload.weight_technical_fit
    if payload.weight_origin is not None:
        settings.WEIGHT_ORIGIN_VERIFIED_INDIAN = payload.weight_origin
    if payload.weight_lifecycle is not None:
        settings.WEIGHT_LIFECYCLE_ACTIVE = payload.weight_lifecycle
    if payload.weight_availability is not None:
        settings.WEIGHT_AVAILABILITY = payload.weight_availability
    if payload.weight_redesign is not None:
        settings.WEIGHT_REDESIGN_MINIMAL = payload.weight_redesign

    return {
        "message": "Settings updated successfully",
        "workspace_name": org.name if org else payload.workspace_name,
        "scoring_weights": {
            "weight_technical_fit": settings.WEIGHT_TECHNICAL_FIT,
            "weight_origin_verified_indian": settings.WEIGHT_ORIGIN_VERIFIED_INDIAN,
            "weight_lifecycle_active": settings.WEIGHT_LIFECYCLE_ACTIVE,
            "weight_availability": settings.WEIGHT_AVAILABILITY,
            "weight_redesign_minimal": settings.WEIGHT_REDESIGN_MINIMAL
        }
    }

@router.post("/settings/reset-demo")
def reset_demo_workspace(db: Session = Depends(get_db)):
    """Resets the database to clean high-fidelity synthetic demo dataset."""
    org = seed_database(db, force_reset=True)
    return {
        "message": "Demo workspace successfully reset to synthetic baseline dataset",
        "workspace": org.name
    }

@router.get("/data-sources/status")
def get_data_sources_status():
    """
    Returns data source readiness.
    SECURITY RULE: Never reveals secret API keys or credentials.
    """
    return {
        "sources": [
            {
                "id": "local_curated",
                "name": "Local Curated Electronic Component Catalogue",
                "type": "Internal Curated Database",
                "status": "ACTIVE",
                "is_default": True,
                "coverage": "Microcontrollers, Sensors, Regulators, Transceivers, Memory",
                "terms_compliance": "Verified manufacturer datasheets & synthetic illustrative records"
            },
            {
                "id": "nexar_octopart",
                "name": "Nexar / Octopart Component Inventory API",
                "type": "External Distributor Aggregator",
                "status": "NOT_CONFIGURED",
                "is_default": False,
                "coverage": "Live distributor inventory & pricing",
                "configuration_help": "Set NEXAR_CLIENT_ID and NEXAR_CLIENT_SECRET environment variables"
            },
            {
                "id": "digikey_api",
                "name": "DigiKey Production V3 API",
                "type": "Distributor API",
                "status": "NOT_CONFIGURED",
                "is_default": False,
                "coverage": "Global parts catalogue & lead times",
                "configuration_help": "Set DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET environment variables"
            },
            {
                "id": "ollama_llm",
                "name": "Ollama Local Engineering Explainer LLM",
                "type": "Optional Local Reasoning Model",
                "status": "ACTIVE" if settings.ENABLE_LLM_EXPLAINER else "DISABLED_BY_DEFAULT",
                "is_default": False,
                "coverage": "Natural language summaries of computed results (Zero hallucination rules)",
                "configuration_help": f"Provider: {settings.LLM_PROVIDER}, Endpoint: {settings.LLM_API_BASE}"
            }
        ],
        "active_data_source": "Local Curated Catalogue (Offline-Ready)",
        "synthetic_data_active": True,
        "disclaimer": "Live distributor APIs are not configured. The system operates fully on verified local curated records."
    }
