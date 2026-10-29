from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any
from ..database import get_db
from ..services.alternative_service import find_alternatives_for_component
from ..services.llm_explainer import explain_alternative_result
from ..config import settings

router = APIRouter(prefix="/components", tags=["Alternative Finder"])

@router.get("/{component_id}/alternatives")
def get_alternatives(
    component_id: str,
    db: Session = Depends(get_db)
):
    weights = {
        "technical_fit": settings.WEIGHT_TECHNICAL_FIT,
        "origin": settings.WEIGHT_ORIGIN_VERIFIED_INDIAN,
        "lifecycle": settings.WEIGHT_LIFECYCLE_ACTIVE,
        "redesign_effort": settings.WEIGHT_REDESIGN_MINIMAL,
        "completeness": settings.WEIGHT_AVAILABILITY
    }
    result = find_alternatives_for_component(db, component_id, weights=weights)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.post("/{component_id}/explain")
def get_alternative_explanation(
    component_id: str,
    db: Session = Depends(get_db)
):
    weights = {
        "technical_fit": settings.WEIGHT_TECHNICAL_FIT,
        "origin": settings.WEIGHT_ORIGIN_VERIFIED_INDIAN,
        "lifecycle": settings.WEIGHT_LIFECYCLE_ACTIVE,
        "redesign_effort": settings.WEIGHT_REDESIGN_MINIMAL,
        "completeness": settings.WEIGHT_AVAILABILITY
    }
    result = find_alternatives_for_component(db, component_id, weights=weights)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    explanation = explain_alternative_result(result)
    return explanation
