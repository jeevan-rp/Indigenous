from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..database import get_db
from ..config import settings

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
def health_check(db: Session = Depends(get_db)):
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "project": settings.PROJECT_NAME,
        "database": db_status,
        "version": "1.0.0",
        "features": {
            "semantic_search": settings.ENABLE_SEMANTIC_SEARCH,
            "llm_explainer": settings.ENABLE_LLM_EXPLAINER,
            "llm_provider": settings.LLM_PROVIDER
        }
    }
