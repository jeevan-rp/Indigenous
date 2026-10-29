from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..models import Component, AlternativeMatch, generate_uuid
from ..rules.ranking import rank_candidate
from ..rules.hard_constraints import evaluate_hard_constraints

def serialize_component(comp: Component) -> Dict[str, Any]:
    specs = {}
    if comp.specifications:
        s = comp.specifications
        specs = {
            "min_voltage_v": s.min_voltage_v,
            "max_voltage_v": s.max_voltage_v,
            "nominal_voltage_v": s.nominal_voltage_v,
            "max_current_ma": s.max_current_ma,
            "package": s.package,
            "pin_count": s.pin_count,
            "operating_temp_min_c": s.operating_temp_min_c,
            "operating_temp_max_c": s.operating_temp_max_c,
            "interfaces": s.interfaces or [],
            "clock_speed_mhz": s.clock_speed_mhz,
            "flash_kb": s.flash_kb,
            "ram_kb": s.ram_kb,
            "custom_specs": s.custom_specs or {}
        }
    return {
        "id": comp.id,
        "part_number": comp.part_number,
        "manufacturer": comp.manufacturer,
        "category": comp.category,
        "description": comp.description,
        "manufacturer_country": comp.manufacturer_country,
        "manufacturer_country_confidence": comp.manufacturer_country_confidence,
        "manufacturer_country_evidence_url": comp.manufacturer_country_evidence_url,
        "distributor_country": comp.distributor_country,
        "distributor_name": comp.distributor_name,
        "design_origin_country": comp.design_origin_country,
        "origin_category": comp.origin_category,
        "lifecycle_status": comp.lifecycle_status,
        "datasheet_url": comp.datasheet_url,
        "source_url": comp.source_url,
        "source_name": comp.source_name,
        "is_synthetic": comp.is_synthetic,
        "data_completeness_pct": comp.data_completeness_pct,
        "user_criticality": comp.user_criticality,
        "user_notes": comp.user_notes,
        "last_verified_at": comp.last_verified_at.isoformat() if comp.last_verified_at else None,
        "specifications": specs
    }

def find_alternatives_for_component(
    db: Session,
    component_id: str,
    weights: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """
    Finds and ranks candidate alternatives for a given component.
    Strictly follows safety guidelines:
      - Does not fabricate alternatives.
      - Discloses UNKNOWN fields.
      - Never ranks hard-mismatched Indian parts above viable candidates.
      - Displays message when 0 suitable candidates exist.
    """
    base_comp_obj = db.query(Component).filter(Component.id == component_id).first()
    if not base_comp_obj:
        return {"error": "Component not found", "candidates": []}

    base_comp = serialize_component(base_comp_obj)

    # Fetch potential candidates in the same or related category (excluding self)
    category = base_comp.get("category")
    query = db.query(Component).filter(Component.id != component_id)
    if category:
        query = query.filter(Component.category.ilike(f"%{category}%"))

    candidates_raw = query.all()

    viable_candidates = []
    hard_mismatch_candidates = []

    for cand_obj in candidates_raw:
        cand_dict = serialize_component(cand_obj)
        ranking = rank_candidate(base_comp, cand_dict, weights)
        
        # Persist or update match in database
        existing_match = db.query(AlternativeMatch).filter_by(
            base_component_id=base_comp_obj.id,
            candidate_component_id=cand_obj.id
        ).first()

        if not existing_match:
            new_match = AlternativeMatch(
                id=generate_uuid(),
                base_component_id=base_comp_obj.id,
                candidate_component_id=cand_obj.id,
                compatibility_status=ranking["compatibility_status"],
                heuristic_score=ranking["heuristic_score"],
                matching_specs_count=ranking["matches_count"],
                mismatching_specs_count=ranking["mismatches_count"],
                unknown_specs_count=ranking["unknowns_count"],
                ranking_reason=ranking["ranking_reason"],
                comparison_details=ranking["comparison_details"],
                mismatch_details=ranking["mismatch_details"],
                unknown_details=ranking["unknown_details"]
            )
            db.add(new_match)
        else:
            existing_match.compatibility_status = ranking["compatibility_status"]
            existing_match.heuristic_score = ranking["heuristic_score"]
            existing_match.matching_specs_count = ranking["matches_count"]
            existing_match.mismatching_specs_count = ranking["mismatches_count"]
            existing_match.unknown_specs_count = ranking["unknowns_count"]
            existing_match.ranking_reason = ranking["ranking_reason"]
            existing_match.comparison_details = ranking["comparison_details"]
            existing_match.mismatch_details = ranking["mismatch_details"]
            existing_match.unknown_details = ranking["unknown_details"]

        if ranking["compatibility_status"] in ["COMPATIBLE", "REVIEW_REQUIRED"]:
            viable_candidates.append(ranking)
        else:
            hard_mismatch_candidates.append(ranking)

    db.commit()

    # Sort viable candidates by heuristic score descending
    viable_candidates.sort(key=lambda x: x["heuristic_score"], reverse=True)
    hard_mismatch_candidates.sort(key=lambda x: x["heuristic_score"], reverse=True)

    has_suitable = len(viable_candidates) > 0
    message = (
        f"Found {len(viable_candidates)} candidate alternatives for {base_comp['part_number']}."
        if has_suitable
        else "No verified suitable alternative found in the current dataset."
    )

    return {
        "base_component": base_comp,
        "has_suitable_alternatives": has_suitable,
        "message": message,
        "candidates_count": len(viable_candidates),
        "hard_mismatch_count": len(hard_mismatch_candidates),
        "candidates": viable_candidates,
        "excluded_mismatches": hard_mismatch_candidates
    }
