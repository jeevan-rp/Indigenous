from typing import Dict, Any, List
from sqlalchemy.orm import Session
from ..models import Component, BOMItem, BOM, SimulationRun, generate_uuid
from .alternative_service import find_alternatives_for_component

def run_unavailability_simulation(
    db: Session,
    component_id: str
) -> Dict[str, Any]:
    """
    Simulates a hypothetical component unavailability or supply disruption event.
    SAFETY RULE:
      - Marked explicitly as a HYPOTHETICAL scenario, NOT a measured prediction or operational outage forecast.
      - Uses strictly real stored relationships (affected products, BOMs, quantities).
      - Does NOT fabricate financial losses or arbitrary user impact numbers.
    """
    comp = db.query(Component).filter(Component.id == component_id).first()
    if not comp:
        return {"error": "Component not found"}

    # Find affected BOM items and BOMs
    bom_items = db.query(BOMItem).filter(
        (BOMItem.component_id == comp.id) | (BOMItem.part_number == comp.part_number)
    ).all()

    affected_boms_dict = {}
    affected_products_dict = {}
    total_qty = 0

    for bi in bom_items:
        bom = db.query(BOM).filter(BOM.id == bi.bom_id).first()
        bom_name = bom.name if bom else "Unknown BOM"
        
        if bi.bom_id not in affected_boms_dict:
            affected_boms_dict[bi.bom_id] = {
                "bom_id": bi.bom_id,
                "bom_name": bom_name,
                "item_quantity": bi.quantity,
                "criticality": bi.criticality
            }
        else:
            affected_boms_dict[bi.bom_id]["item_quantity"] += bi.quantity

        prod = bi.product_name or "Host Product"
        affected_products_dict[prod] = affected_products_dict.get(prod, 0) + bi.quantity
        total_qty += bi.quantity

    affected_boms_list = list(affected_boms_dict.values())
    affected_products_list = [
        {"product_name": p, "required_quantity": q} for p, q in affected_products_dict.items()
    ]

    # Find alternatives
    alt_result = find_alternatives_for_component(db, comp.id)
    viable_candidates = alt_result.get("candidates", [])
    hard_mismatches = alt_result.get("excluded_mismatches", [])

    is_multi_bom = len(affected_boms_list) > 1

    # Redesign effort estimation
    redesign_effort = "UNKNOWN"
    redesign_factors = []
    
    if len(viable_candidates) == 0:
        redesign_effort = "MAJOR"
        redesign_factors.append("No pin-compatible or functional alternative exists in the database. Requires architectural redesign or custom part qualification.")
    else:
        top_cand = viable_candidates[0]
        if top_cand["redesign_effort"] == "MINIMAL":
            redesign_effort = "MINIMAL"
            redesign_factors.append(f"Top alternative {top_cand['part_number']} has identical package footprint ({top_cand.get('origin_label')}); minimal PCB modifications expected.")
        elif top_cand["redesign_effort"] == "MODERATE":
            redesign_effort = "MODERATE"
            redesign_factors.append("Alternative requires minor layout tweaks or passive component adjustments.")
        else:
            redesign_effort = "MAJOR"
            redesign_factors.append("Footprint variation between components necessitates new PCB gerber generation and qualification.")

    # Data gaps
    data_gaps = []
    if comp.origin_category == "UNKNOWN":
        data_gaps.append("Component origin is unknown in the current dataset.")
    if comp.lifecycle_status == "UNKNOWN":
        data_gaps.append("Active manufacturer lifecycle status is not verified.")
    if not comp.datasheet_url:
        data_gaps.append("Official datasheet link is not recorded.")

    # Recommended Actions
    actions = []
    if len(viable_candidates) > 0:
        actions.append(f"Initiate bench evaluation of top candidate '{viable_candidates[0]['part_number']}' ({viable_candidates[0]['origin_label']}).")
        actions.append("Order sample quantities from verified distributors to test electrical limits.")
    else:
        actions.append("Investigate global broker stock or initiate engineering redesign for this subsystem.")
    if is_multi_bom:
        actions.append(f"Synchronize cross-functional alerts across all {len(affected_boms_list)} affected product manufacturing lines.")
    actions.append("Conduct mandatory human engineering verification of pinout, timing, and firmware compatibility before ECO release.")

    # Persist simulation run
    sim_run = SimulationRun(
        id=generate_uuid(),
        component_id=comp.id,
        scenario_type="HYPOTHETICAL_COMPONENT_UNAVAILABILITY",
        affected_boms=affected_boms_list,
        affected_products=affected_products_list,
        total_affected_quantity=total_qty,
        criticality=comp.user_criticality or "MEDIUM",
        is_multi_bom_dependency=is_multi_bom,
        candidates_count=len(viable_candidates),
        viable_candidates=viable_candidates[:5],
        hard_mismatches_count=len(hard_mismatches),
        estimated_redesign_effort=redesign_effort,
        redesign_effort_factors=redesign_factors,
        data_gaps=data_gaps,
        recommended_actions=actions
    )
    db.add(sim_run)
    db.commit()

    return {
        "simulation_id": sim_run.id,
        "scenario": {
            "title": f"Hypothetical Outage: {comp.part_number} ({comp.manufacturer})",
            "type": "HYPOTHETICAL_SIMULATION",
            "disclaimer": "This is a decision-support what-if simulation based on stored BOM relationships. It is not an empirical supply forecast."
        },
        "component": {
            "id": comp.id,
            "part_number": comp.part_number,
            "manufacturer": comp.manufacturer,
            "category": comp.category,
            "user_criticality": comp.user_criticality,
            "origin_category": comp.origin_category,
            "lifecycle_status": comp.lifecycle_status,
            "last_verified_at": comp.last_verified_at.isoformat() if comp.last_verified_at else None
        },
        "impact": {
            "affected_boms_count": len(affected_boms_list),
            "affected_products_count": len(affected_products_list),
            "total_affected_quantity": total_qty,
            "is_multi_bom_dependency": is_multi_bom,
            "affected_boms": affected_boms_list,
            "affected_products": affected_products_list
        },
        "alternative_readiness": {
            "viable_candidates_count": len(viable_candidates),
            "top_candidates": viable_candidates[:3],
            "hard_mismatches_count": len(hard_mismatches),
            "estimated_redesign_effort": redesign_effort,
            "redesign_effort_factors": redesign_factors
        },
        "data_gaps": data_gaps,
        "recommended_actions": actions,
        "ran_at": sim_run.ran_at.isoformat()
    }
