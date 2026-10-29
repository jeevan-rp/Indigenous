import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Indigenous Component Dependency & Alternative Intelligence Platform"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./indigenous_platform.db")
    
    # Feature flags
    ENABLE_SEMANTIC_SEARCH: bool = os.getenv("ENABLE_SEMANTIC_SEARCH", "false").lower() == "true"
    ENABLE_LLM_EXPLAINER: bool = os.getenv("ENABLE_LLM_EXPLAINER", "false").lower() == "true"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama") # ollama, openai, or mock
    LLM_API_BASE: Optional[str] = os.getenv("LLM_API_BASE", "http://localhost:11434")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "llama3")
    
    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 10
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    
    # Scoring weights (configurable via settings API)
    WEIGHT_TECHNICAL_FIT: float = 0.40
    WEIGHT_ORIGIN_VERIFIED_INDIAN: float = 0.25
    WEIGHT_LIFECYCLE_ACTIVE: float = 0.15
    WEIGHT_AVAILABILITY: float = 0.10
    WEIGHT_REDESIGN_MINIMAL: float = 0.10

    class Config:
        case_sensitive = True

settings = Settings()
