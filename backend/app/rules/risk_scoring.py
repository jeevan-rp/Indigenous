from typing import Dict, Any, List

def calculate_component_risk(
    comp: Dict[str, Any],
    bom_count: int,
    total_boms_quantity: int,
    viable_alternatives_count: int
) -> Dict[str, Any]:
    """
    Computes a transparent heuristic supply chain and dependency risk score (0-100).
    Factors:
      1. User-assigned criticality (e.g. CRITICAL/HIGH in critical systems)
      2. Multi-BOM dependency concentration (used across multiple products/BOMs)
      3. Sourcing concentration / Alternative availability (0 viable alternatives = high risk)
      4. Component lifecycle status (EOL/OBSOLETE/NRND = elevated risk)
      5. Origin transparency / Data uncertainty (UNKNOWN origin = uncertainty factor)
      6. Data completeness gap
    
    Safety Rules:
      - Does NOT label foreign components as automatically risky.
      - Does NOT label Indian components as automatically safe.
      - Explicitly explains each risk point and lists unknown factors.
    """
    score = 0.0
    factors: List[Dict[str, Any]] = []
    unknown_factors: List[str] = []
    actions: List[str] = []

    # 1. User Criticality (0 to 30 points)
    crit = (comp.get("user_criticality") or "MEDIUM").upper()
    if crit == "CRITICAL":
        pts = 30.0
        factors.append({"factor": "User-Designated Criticality", "impact": "High (+30 pts)", "details": "Component is marked as mission-critical to the host system operation."})
        actions.append("Prioritize multi-vendor qualification and emergency buffer inventory.")
    elif crit == "HIGH":
        pts = 20.0
        factors.append({"factor": "User-Designated Criticality", "impact": "Moderate (+20 pts)", "details": "Component failure significantly degrades product functionality."})
    elif crit == "MEDIUM":
        pts = 10.0
        factors.append({"factor": "User-Designated Criticality", "impact": "Low (+10 pts)", "details": "Standard system component with moderate operational impact."})
    else: # LOW
        pts = 5.0
        factors.append({"factor": "User-Designated Criticality", "impact": "Minimal (+5 pts)", "details": "Non-critical auxiliary component."})
    score += pts

    # 2. Sourcing Concentration / Viable Alternatives (0 to 30 points)
    if viable_alternatives_count == 0:
        pts = 30.0
        factors.append({"factor": "Single-Source Vulnerability", "impact": "Severe (+30 pts)", "details": "No verified pin-compatible or functional alternatives found in current catalogue."})
        actions.append("Initiate custom replacement qualification or PCB redesign contingency.")
    elif viable_alternatives_count == 1:
        pts = 15.0
        factors.append({"factor": "Limited Sourcing Redundancy", "impact": "Moderate (+15 pts)", "details": "Only 1 viable alternative identified. Dual-sourcing boundary is tight."})
        actions.append("Validate samples of the 1 identified alternative with lab testing.")
    else:
        pts = 5.0
        factors.append({"factor": "Alternative Availability", "impact": "Low (+5 pts)", "details": f"{viable_alternatives_count} viable or review-stage alternatives available in catalogue."})
    score += pts

    # 3. Multi-BOM Cross-Product Exposure (0 to 20 points)
    if bom_count > 1:
        pts = min(20.0, 10.0 + (bom_count * 3.0))
        factors.append({"factor": "Cross-BOM Commonality Exposure", "impact": f"High (+{int(pts)} pts)", "details": f"Component is shared across {bom_count} distinct BOMs/products (Total volume: {total_boms_quantity} units). An outage cascades across multiple product lines."})
        actions.append(f"Consolidate procurement forecasts across all {bom_count} dependent product lines.")
    else:
        pts = 5.0
        factors.append({"factor": "Product Scope", "impact": "Isolated (+5 pts)", "details": "Component is utilized in only 1 product BOM."})
    score += pts

    # 4. Lifecycle Evidence (0 to 15 points)
    lifecycle = (comp.get("lifecycle_status") or "UNKNOWN").upper()
    if lifecycle in ["EOL", "OBSOLETE"]:
        pts = 15.0
        factors.append({"factor": "Lifecycle Status", "impact": "Critical (+15 pts)", "details": f"Component is officially designated as {lifecycle}. Supply discontinuation is imminent or active."})
        actions.append("Immediate migration required: initiate lifetime buy or engineering change order (ECO).")
    elif lifecycle == "NRND":
        pts = 10.0
        factors.append({"factor": "Lifecycle Status", "impact": "Warning (+10 pts)", "details": "Component is Not Recommended for New Designs (NRND). Production phase-out likely within 12-24 months."})
        actions.append("Design out in upcoming hardware revision.")
    elif lifecycle == "UNKNOWN":
        pts = 8.0
        factors.append({"factor": "Lifecycle Uncertainty", "impact": "Uncertain (+8 pts)", "details": "Manufacturer lifecycle phase is not documented in available datasheets."})
        unknown_factors.append("Component lifecycle status is unknown.")
        actions.append("Contact manufacturer rep to confirm active production timeline.")
    else: # ACTIVE
        pts = 0.0
        factors.append({"factor": "Lifecycle Status", "impact": "Healthy (0 pts)", "details": "Component is in active mass production."})
    score += pts

    # 5. Origin Uncertainty (0 to 10 points)
    origin_category = comp.get("origin_category", "UNKNOWN")
    if origin_category == "UNKNOWN":
        pts = 8.0
        factors.append({"factor": "Origin Transparency Gap", "impact": "Uncertain (+8 pts)", "details": "Manufacturer country and fabrication origin are unknown in source data."})
        unknown_factors.append("Country of manufacture is unverified.")
        actions.append("Request Certificate of Conformance (CoC) from supplier to establish country of origin.")
    elif origin_category == "INDIAN_SUPPLIER_UNVERIFIED_MFR":
        pts = 4.0
        factors.append({"factor": "Distributor vs Manufacturer Provenance", "impact": "Minor (+4 pts)", "details": "Procured through Indian distributor, but underlying fabrication fab/country remains unverified."})
        unknown_factors.append("Manufacturer fabrication location unverified despite domestic distributor.")
    else:
        # Verified Indian or Verified Foreign
        pts = 0.0
        mfr_country = comp.get("manufacturer_country", "Global")
        factors.append({"factor": "Origin Provenance", "impact": "Verified (0 pts)", "details": f"Manufacturer country verified as {mfr_country} with recorded evidence."})
    score += pts

    final_score = min(100.0, round(score, 1))

    if final_score >= 80.0:
        level = "CRITICAL"
    elif final_score >= 60.0:
        level = "HIGH"
    elif final_score >= 35.0:
        level = "MEDIUM"
    else:
        level = "LOW"

    return {
        "risk_level": level,
        "risk_score": final_score,
        "risk_factors": factors,
        "unknown_data_factors": unknown_factors,
        "suggested_actions": actions,
        "is_multi_bom": bom_count > 1,
        "bom_count": bom_count,
        "total_quantity": total_boms_quantity,
        "viable_alternatives_count": viable_alternatives_count,
        "disclaimer": "Heuristic estimate based on current catalogue data; requires engineering review."
    }
