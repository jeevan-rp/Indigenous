from typing import Dict, Any, List
from .hard_constraints import evaluate_hard_constraints

def rank_candidate(
    base_comp: Dict[str, Any],
    candidate_comp: Dict[str, Any],
    weights: Dict[str, float] = None
) -> Dict[str, Any]:
    """
    Ranks a candidate alternative against a base component using explainable weighted heuristic rules.
    Respects strict safety rules:
      - Does not force an Indian candidate if technical hard mismatch occurs.
      - Never counts UNKNOWN specifications as matches.
      - Distinguishes manufacturer origin vs distributor origin.
    """
    if weights is None:
        weights = {
            "technical_fit": 0.40,
            "origin": 0.25,
            "lifecycle": 0.15,
            "redesign_effort": 0.10,
            "completeness": 0.10,
        }

    # Evaluate hard constraints first
    eval_result = evaluate_hard_constraints(base_comp, candidate_comp)
    status = eval_result["status"]
    matches = eval_result["matches_count"]
    mismatches = eval_result["mismatches_count"]
    unknowns = eval_result["unknowns_count"]
    total_checked = matches + mismatches + unknowns

    # 1. Technical Fit Score (0 to 100)
    if total_checked > 0:
        # Matches add full points, unknowns give neutral zero, mismatches penalize heavily
        tech_score = max(0.0, ((matches * 1.0) - (mismatches * 1.5)) / total_checked * 100.0)
    else:
        tech_score = 0.0

    if status == "HARD_MISMATCH":
        tech_score = 0.0

    # 2. Origin Score (0 to 100) & Label
    origin_category = candidate_comp.get("origin_category", "UNKNOWN")
    mfr_country = candidate_comp.get("manufacturer_country")
    dist_country = candidate_comp.get("distributor_country")
    dist_name = candidate_comp.get("distributor_name")

    if origin_category == "VERIFIED_INDIAN":
        origin_score = 100.0
        origin_label = "Verified Indian Manufacturer"
        origin_badge_class = "verified-indian"
    elif origin_category == "INDIAN_SUPPLIER_UNVERIFIED_MFR":
        origin_score = 45.0
        origin_label = f"Indian Distributor ({dist_name or 'Domestic'}), Manufacturer Origin Unverified"
        origin_badge_class = "indian-supplier"
    elif origin_category == "FOREIGN":
        origin_score = 30.0
        origin_label = f"Foreign Manufacturer ({mfr_country or 'Global'})"
        origin_badge_class = "foreign"
    else:
        origin_score = 10.0
        origin_label = "Origin Unknown"
        origin_badge_class = "unknown"

    # 3. Lifecycle Score (0 to 100)
    lifecycle = (candidate_comp.get("lifecycle_status") or "UNKNOWN").upper()
    if lifecycle == "ACTIVE":
        lifecycle_score = 100.0
    elif lifecycle == "NRND": # Not Recommended for New Designs
        lifecycle_score = 40.0
    elif lifecycle in ["EOL", "OBSOLETE"]:
        lifecycle_score = 0.0
    else:
        lifecycle_score = 50.0

    # 4. Redesign Effort
    base_pkg = ((base_comp.get("specifications") or {}).get("package") or "").upper()
    cand_pkg = ((candidate_comp.get("specifications") or {}).get("package") or "").upper()
    
    if base_pkg and cand_pkg and base_pkg == cand_pkg:
        redesign_effort = "MINIMAL"
        redesign_score = 100.0
        redesign_note = "Pin-compatible footprint; drop-in replacement candidate"
    elif not base_pkg or not cand_pkg:
        redesign_effort = "UNKNOWN"
        redesign_score = 40.0
        redesign_note = "Package footprints not fully documented to determine PCB impact"
    else:
        redesign_effort = "MAJOR"
        redesign_score = 20.0
        redesign_note = f"Package variation ({base_pkg} vs {cand_pkg}); requires PCB layout modification"

    # 5. Completeness Score
    completeness_score = float(candidate_comp.get("data_completeness_pct", 50.0))

    # Calculate overall weighted heuristic score
    raw_score = (
        (tech_score * weights["technical_fit"]) +
        (origin_score * weights["origin"]) +
        (lifecycle_score * weights["lifecycle"]) +
        (redesign_score * weights["redesign_effort"]) +
        (completeness_score * weights["completeness"])
    )

    # Hard mismatch penalty: overall score capped at 15% and strictly flagged
    if status == "HARD_MISMATCH":
        final_score = min(raw_score * 0.15, 15.0)
    else:
        final_score = round(raw_score, 1)

    # Build concise human-readable ranking reason
    reasons: List[str] = []
    if status == "HARD_MISMATCH":
        reasons.append(f"Hard constraint violation: {', '.join(eval_result['mismatches'][:2])}")
    else:
        reasons.append(f"{matches} verified specifications match")
        if redesign_effort == "MINIMAL":
            reasons.append("drop-in compatible package")
        if origin_category == "VERIFIED_INDIAN":
            reasons.append(f"verified Indian manufacturer ({candidate_comp.get('manufacturer')})")
        elif origin_category == "INDIAN_SUPPLIER_UNVERIFIED_MFR":
            reasons.append(f"Indian supplier ({dist_name}) with unverified manufacturer origin")
        if lifecycle == "ACTIVE":
            reasons.append("active production lifecycle")
        if unknowns > 0:
            reasons.append(f"{unknowns} parameters require engineering verification")

    ranking_reason = "; ".join(reasons) + "."

    return {
        "candidate_id": candidate_comp.get("id"),
        "part_number": candidate_comp.get("part_number"),
        "manufacturer": candidate_comp.get("manufacturer"),
        "category": candidate_comp.get("category"),
        "compatibility_status": status,
        "heuristic_score": final_score,
        "matches_count": matches,
        "mismatches_count": mismatches,
        "unknowns_count": unknowns,
        "origin_category": origin_category,
        "origin_label": origin_label,
        "origin_badge_class": origin_badge_class,
        "lifecycle_status": lifecycle,
        "redesign_effort": redesign_effort,
        "redesign_note": redesign_note,
        "ranking_reason": ranking_reason,
        "mismatch_details": eval_result["mismatches"],
        "unknown_details": eval_result["unknowns"],
        "comparison_details": eval_result["details"],
        "datasheet_url": candidate_comp.get("datasheet_url"),
        "source_url": candidate_comp.get("source_url"),
        "last_verified_at": candidate_comp.get("last_verified_at"),
        "is_synthetic": candidate_comp.get("is_synthetic", False)
    }
