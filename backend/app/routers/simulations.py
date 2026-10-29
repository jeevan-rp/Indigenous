from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import SimulationRun, Component
from ..schemas import SimulationRequest
from ..services.simulation_service import run_unavailability_simulation

router = APIRouter(prefix="/simulations", tags=["Simulations"])

@router.post("")
def execute_simulation(payload: SimulationRequest, db: Session = Depends(get_db)):
    result = run_unavailability_simulation(db, payload.component_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.get("/{simulation_id}")
def get_simulation(simulation_id: str, db: Session = Depends(get_db)):
    sim = db.query(SimulationRun).filter(SimulationRun.id == simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation run not found")

    comp = db.query(Component).filter(Component.id == sim.component_id).first()
    return {
        "simulation_id": sim.id,
        "scenario": {
            "title": f"Hypothetical Outage: {comp.part_number if comp else 'Component'}",
            "type": sim.scenario_type,
            "disclaimer": "This is a hypothetical decision-support scenario, not a measured prediction."
        },
        "component": {
            "id": comp.id if comp else None,
            "part_number": comp.part_number if comp else "Unknown",
            "manufacturer": comp.manufacturer if comp else "Unknown",
            "category": comp.category if comp else "Unknown",
            "origin_category": comp.origin_category if comp else "UNKNOWN",
            "user_criticality": sim.criticality
        },
        "impact": {
            "affected_boms_count": len(sim.affected_boms or []),
            "affected_products_count": len(sim.affected_products or []),
            "total_affected_quantity": sim.total_affected_quantity,
            "is_multi_bom_dependency": sim.is_multi_bom_dependency,
            "affected_boms": sim.affected_boms,
            "affected_products": sim.affected_products
        },
        "alternative_readiness": {
            "viable_candidates_count": sim.candidates_count,
            "top_candidates": sim.viable_candidates,
            "hard_mismatches_count": sim.hard_mismatches_count,
            "estimated_redesign_effort": sim.estimated_redesign_effort,
            "redesign_effort_factors": sim.redesign_effort_factors
        },
        "data_gaps": sim.data_gaps,
        "recommended_actions": sim.recommended_actions,
        "ran_at": sim.ran_at.isoformat() if sim.ran_at else None
    }

@router.get("")
def list_simulations(limit: int = 10, db: Session = Depends(get_db)):
    sims = db.query(SimulationRun).order_by(SimulationRun.ran_at.desc()).limit(limit).all()
    results = []
    for s in sims:
        comp = db.query(Component).filter(Component.id == s.component_id).first()
        results.append({
            "id": s.id,
            "component_id": s.component_id,
            "part_number": comp.part_number if comp else "Unknown",
            "manufacturer": comp.manufacturer if comp else "Unknown",
            "criticality": s.criticality,
            "total_affected_quantity": s.total_affected_quantity,
            "candidates_count": s.candidates_count,
            "ran_at": s.ran_at.isoformat() if s.ran_at else None
        })
    return results
