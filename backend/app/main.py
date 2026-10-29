from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .config import settings
from .database import engine, SessionLocal, Base
from .services.seed_data import seed_database
from .routers import (
    health, dashboard, boms, components, alternatives,
    analysis, simulations, reports, settings as settings_router,
    sellers, rfqs
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    # Seed database if not yet populated
    db = SessionLocal()
    try:
        seed_database(db, force_reset=False)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Decision-support platform for electronic manufacturing and engineering teams to identify "
        "component dependencies, evaluate sourcing risks, discover technically compatible alternatives, "
        "and prioritize verified Indian-manufactured components with transparent provenance evidence."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development allow all local frontend ports
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(boms.router, prefix=settings.API_V1_STR)
app.include_router(components.router, prefix=settings.API_V1_STR)
app.include_router(alternatives.router, prefix=settings.API_V1_STR)
app.include_router(analysis.router, prefix=settings.API_V1_STR)
app.include_router(simulations.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(settings_router.router, prefix=settings.API_V1_STR)
app.include_router(sellers.router, prefix=settings.API_V1_STR)
app.include_router(rfqs.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "platform": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "health_check": f"{settings.API_V1_STR}/health",
        "safety_disclaimer": "All calculations are heuristic estimates. Engineering review required."
    }
