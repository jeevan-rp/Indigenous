from typing import Dict, Any, List, Tuple
import re

def parse_numeric_with_unit(val_str: Any) -> Tuple[float, str]:
    """Helper to parse strings like '3.3V', '800mA', '5.0 V', '16MHz', etc."""
    if val_str is None:
        return None, ""
    if isinstance(val_str, (int, float)):
        return float(val_str), ""
    
    s = str(val_str).strip()
    match = re.match(r"^([\d.]+)\s*([a-zA-Z%]*)$", s)
    if match:
        try:
            return float(match.group(1)), match.group(2).upper()
        except ValueError:
            return None, ""
    return None, ""

def evaluate_hard_constraints(
    base_comp: Dict[str, Any],
    candidate_comp: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Category-aware hard constraint evaluation.
    Evaluates:
      - Category & Functional compatibility
      - Electrical supply voltage compatibility
      - Max current handling capability
      - Package & Footprint compatibility
      - Interface compatibility
      - Operating temperature compatibility
    
    Returns:
      {
        "status": "COMPATIBLE" | "REVIEW_REQUIRED" | "HARD_MISMATCH",
        "matches_count": int,
        "mismatches_count": int,
        "unknowns_count": int,
        "mismatches": list of str,
        "unknowns": list of str,
        "details": list of dicts (name, base, candidate, status, importance, reason)
      }
    """
    details: List[Dict[str, Any]] = []
    mismatches: List[str] = []
    unknowns: List[str] = []
    has_hard_mismatch = False

    category = (base_comp.get("category") or "").strip().lower()
    cand_category = (candidate_comp.get("category") or "").strip().lower()

    # 1. Category check
    if not category or not cand_category:
        details.append({
            "name": "Component Category",
            "base_value": base_comp.get("category") or "UNKNOWN",
            "candidate_value": candidate_comp.get("category") or "UNKNOWN",
            "status": "UNKNOWN",
            "importance": "CRITICAL",
            "reason": "Missing category specification on one or both components"
        })
        unknowns.append("Category specification unknown")
    elif category == cand_category:
        details.append({
            "name": "Component Category",
            "base_value": base_comp.get("category"),
            "candidate_value": candidate_comp.get("category"),
            "status": "MATCH",
            "importance": "CRITICAL",
            "reason": f"Exact category match: {base_comp.get('category')}"
        })
    else:
        # Cross-category is hard mismatch
        details.append({
            "name": "Component Category",
            "base_value": base_comp.get("category"),
            "candidate_value": candidate_comp.get("category"),
            "status": "MISMATCH",
            "importance": "CRITICAL",
            "reason": f"Category mismatch: {base_comp.get('category')} vs {candidate_comp.get('category')}"
        })
        mismatches.append(f"Category mismatch: cannot substitute {base_comp.get('category')} with {candidate_comp.get('category')}")
        has_hard_mismatch = True

    base_spec = base_comp.get("specifications") or {}
    cand_spec = candidate_comp.get("specifications") or {}

    # 2. Operating Voltage Compatibility
    # Base voltage requirement
    base_nom_v = base_spec.get("nominal_voltage_v")
    base_min_v = base_spec.get("min_voltage_v")
    base_max_v = base_spec.get("max_voltage_v")
    
    cand_nom_v = cand_spec.get("nominal_voltage_v")
    cand_min_v = cand_spec.get("min_voltage_v")
    cand_max_v = cand_spec.get("max_voltage_v")

    # If voltage regulator, output nominal voltage must match exactly for fixed LDOs
    if "regulator" in category:
        if base_nom_v is not None and cand_nom_v is not None:
            if abs(base_nom_v - cand_nom_v) < 0.05:
                details.append({
                    "name": "Output Voltage (Vout)",
                    "base_value": f"{base_nom_v} V",
                    "candidate_value": f"{cand_nom_v} V",
                    "status": "MATCH",
                    "importance": "CRITICAL",
                    "reason": f"Regulator output voltage matches exactly at {base_nom_v}V"
                })
            else:
                details.append({
                    "name": "Output Voltage (Vout)",
                    "base_value": f"{base_nom_v} V",
                    "candidate_value": f"{cand_nom_v} V",
                    "status": "MISMATCH",
                    "importance": "CRITICAL",
                    "reason": f"Output voltage mismatch: {base_nom_v}V vs {cand_nom_v}V"
                })
                mismatches.append(f"Output voltage mismatch: requires {base_nom_v}V, candidate provides {cand_nom_v}V")
                has_hard_mismatch = True
        else:
            details.append({
                "name": "Output Voltage (Vout)",
                "base_value": f"{base_nom_v} V" if base_nom_v is not None else "UNKNOWN",
                "candidate_value": f"{cand_nom_v} V" if cand_nom_v is not None else "UNKNOWN",
                "status": "UNKNOWN",
                "importance": "CRITICAL",
                "reason": "Missing output voltage specification on one or both regulators"
            })
            unknowns.append("Output voltage specification unknown")
    else:
        # General operating voltage check: candidate range must accommodate base operating point or range
        ref_v = base_nom_v if base_nom_v is not None else base_max_v
        if ref_v is not None:
            if cand_min_v is not None and cand_max_v is not None:
                if cand_min_v <= ref_v <= cand_max_v:
                    details.append({
                        "name": "Operating Voltage Range",
                        "base_value": f"{ref_v} V",
                        "candidate_value": f"{cand_min_v}V - {cand_max_v}V",
                        "status": "MATCH",
                        "importance": "CRITICAL",
                        "reason": f"Required {ref_v}V is within candidate range ({cand_min_v}V - {cand_max_v}V)"
                    })
                else:
                    details.append({
                        "name": "Operating Voltage Range",
                        "base_value": f"{ref_v} V",
                        "candidate_value": f"{cand_min_v}V - {cand_max_v}V",
                        "status": "MISMATCH",
                        "importance": "CRITICAL",
                        "reason": f"Required {ref_v}V outside candidate allowable range ({cand_min_v}V - {cand_max_v}V)"
                    })
                    mismatches.append(f"Operating voltage out of bounds: requires {ref_v}V, candidate range is {cand_min_v}V - {cand_max_v}V")
                    has_hard_mismatch = True
            elif cand_nom_v is not None:
                if abs(ref_v - cand_nom_v) < 0.2:
                    details.append({
                        "name": "Operating Voltage",
                        "base_value": f"{ref_v} V",
                        "candidate_value": f"{cand_nom_v} V",
                        "status": "MATCH",
                        "importance": "CRITICAL",
                        "reason": f"Nominal operating voltage matches at {ref_v}V"
                    })
                else:
                    details.append({
                        "name": "Operating Voltage",
                        "base_value": f"{ref_v} V",
                        "candidate_value": f"{cand_nom_v} V",
                        "status": "MISMATCH",
                        "importance": "CRITICAL",
                        "reason": f"Voltage mismatch: {ref_v}V vs {cand_nom_v}V"
                    })
                    mismatches.append(f"Voltage mismatch: requires {ref_v}V, candidate is {cand_nom_v}V")
                    has_hard_mismatch = True
            else:
                details.append({
                    "name": "Operating Voltage",
                    "base_value": f"{ref_v} V",
                    "candidate_value": "UNKNOWN",
                    "status": "UNKNOWN",
                    "importance": "CRITICAL",
                    "reason": "Candidate operating voltage range not documented"
                })
                unknowns.append("Candidate operating voltage specification unknown")
        else:
            details.append({
                "name": "Operating Voltage",
                "base_value": "UNKNOWN",
                "candidate_value": f"{cand_nom_v} V" if cand_nom_v is not None else "UNKNOWN",
                "status": "UNKNOWN",
                "importance": "CRITICAL",
                "reason": "Base component required voltage not specified"
            })
            unknowns.append("Base operating voltage unknown")

    # 3. Current Handling Capability
    base_cur = base_spec.get("max_current_ma")
    cand_cur = cand_spec.get("max_current_ma")
    if base_cur is not None and cand_cur is not None:
        if "regulator" in category or "driver" in category:
            # Candidate must supply AT LEAST the required current
            if cand_cur >= (base_cur * 0.95): # 5% margin tolerance
                details.append({
                    "name": "Current Capacity",
                    "base_value": f"{base_cur} mA",
                    "candidate_value": f"{cand_cur} mA",
                    "status": "MATCH",
                    "importance": "CRITICAL",
                    "reason": f"Candidate max current ({cand_cur}mA) meets or exceeds requirement ({base_cur}mA)"
                })
            else:
                details.append({
                    "name": "Current Capacity",
                    "base_value": f"{base_cur} mA",
                    "candidate_value": f"{cand_cur} mA",
                    "status": "MISMATCH",
                    "importance": "CRITICAL",
                    "reason": f"Insufficient current handling: candidate offers {cand_cur}mA < required {base_cur}mA"
                })
                mismatches.append(f"Insufficient current capacity: {cand_cur}mA < {base_cur}mA required")
                has_hard_mismatch = True
        else:
            # For microcontrollers/sensors, consumption current comparison
            details.append({
                "name": "Current Draw / Capacity",
                "base_value": f"{base_cur} mA",
                "candidate_value": f"{cand_cur} mA",
                "status": "MATCH" if abs(cand_cur - base_cur) <= base_cur * 0.5 else "REVIEW_REQUIRED",
                "importance": "SECONDARY",
                "reason": f"Current specification: base {base_cur}mA, candidate {cand_cur}mA"
            })
    elif base_cur is not None or cand_cur is not None:
        details.append({
            "name": "Current Capacity",
            "base_value": f"{base_cur} mA" if base_cur is not None else "UNKNOWN",
            "candidate_value": f"{cand_cur} mA" if cand_cur is not None else "UNKNOWN",
            "status": "UNKNOWN",
            "importance": "SECONDARY",
            "reason": "Current spec missing on one component"
        })
        unknowns.append("Current specification unknown on one component")

    # 4. Package and Pin Count
    base_pkg = (base_spec.get("package") or "").strip().upper()
    cand_pkg = (cand_spec.get("package") or "").strip().upper()
    base_pins = base_spec.get("pin_count")
    cand_pins = cand_spec.get("pin_count")

    if not base_pkg or not cand_pkg:
        details.append({
            "name": "Physical Package / Footprint",
            "base_value": base_pkg or "UNKNOWN",
            "candidate_value": cand_pkg or "UNKNOWN",
            "status": "UNKNOWN",
            "importance": "CRITICAL",
            "reason": "Package footprint specification missing"
        })
        unknowns.append("Package footprint unknown")
    elif base_pkg == cand_pkg:
        details.append({
            "name": "Physical Package / Footprint",
            "base_value": base_pkg,
            "candidate_value": cand_pkg,
            "status": "MATCH",
            "importance": "CRITICAL",
            "reason": f"Identical package footprint: {base_pkg} (Drop-in pinout candidate)"
        })
    else:
        # Different package
        details.append({
            "name": "Physical Package / Footprint",
            "base_value": base_pkg,
            "candidate_value": cand_pkg,
            "status": "MISMATCH",
            "importance": "CRITICAL",
            "reason": f"Footprint mismatch: {base_pkg} vs {cand_pkg}. Requires PCB layout redesign."
        })
        mismatches.append(f"Footprint mismatch: requires {base_pkg}, candidate is {cand_pkg}")
        has_hard_mismatch = True

    # 5. Interface Compatibility
    base_ifaces = [str(i).strip().upper() for i in (base_spec.get("interfaces") or []) if str(i).strip()]
    cand_ifaces = [str(i).strip().upper() for i in (cand_spec.get("interfaces") or []) if str(i).strip()]

    if base_ifaces:
        if cand_ifaces:
            missing_ifaces = [i for i in base_ifaces if i not in cand_ifaces]
            shared_ifaces = [i for i in base_ifaces if i in cand_ifaces]
            if not missing_ifaces:
                details.append({
                    "name": "Communication Interfaces",
                    "base_value": ", ".join(base_ifaces),
                    "candidate_value": ", ".join(cand_ifaces),
                    "status": "MATCH",
                    "importance": "CRITICAL" if ("communication" in category) else "SECONDARY",
                    "reason": f"All required interfaces supported ({', '.join(base_ifaces)})"
                })
            elif shared_ifaces and "communication" not in category:
                # Partial interface overlap in MCU or Sensor: flags for engineering review rather than disqualifying
                details.append({
                    "name": "Communication Interfaces",
                    "base_value": ", ".join(base_ifaces),
                    "candidate_value": ", ".join(cand_ifaces),
                    "status": "REVIEW_REQUIRED",
                    "importance": "SECONDARY",
                    "reason": f"Core interfaces supported ({', '.join(shared_ifaces)}). Candidate lacks: {', '.join(missing_ifaces)} (verify host schematic doesn't mandate missing bus)."
                })
            else:
                details.append({
                    "name": "Communication Interfaces",
                    "base_value": ", ".join(base_ifaces),
                    "candidate_value": ", ".join(cand_ifaces),
                    "status": "MISMATCH",
                    "importance": "CRITICAL",
                    "reason": f"Interface mismatch: candidate lacks required interface(s): {', '.join(missing_ifaces)}"
                })
                mismatches.append(f"Interface protocol mismatch: {', '.join(missing_ifaces)}")
                has_hard_mismatch = True
        else:
            details.append({
                "name": "Communication Interfaces",
                "base_value": ", ".join(base_ifaces),
                "candidate_value": "UNKNOWN",
                "status": "UNKNOWN",
                "importance": "CRITICAL",
                "reason": "Candidate supported interfaces not specified in database"
            })
            unknowns.append("Candidate supported interfaces unknown")

    # 6. Operating Temperature Range
    base_t_min = base_spec.get("operating_temp_min_c")
    base_t_max = base_spec.get("operating_temp_max_c")
    cand_t_min = cand_spec.get("operating_temp_min_c")
    cand_t_max = cand_spec.get("operating_temp_max_c")

    if base_t_min is not None and base_t_max is not None and cand_t_min is not None and cand_t_max is not None:
        if cand_t_min <= base_t_min and cand_t_max >= base_t_max:
            details.append({
                "name": "Operating Temperature Range",
                "base_value": f"{base_t_min}°C to {base_t_max}°C",
                "candidate_value": f"{cand_t_min}°C to {cand_t_max}°C",
                "status": "MATCH",
                "importance": "SECONDARY",
                "reason": f"Candidate temperature range fully covers required range"
            })
        else:
            details.append({
                "name": "Operating Temperature Range",
                "base_value": f"{base_t_min}°C to {base_t_max}°C",
                "candidate_value": f"{cand_t_min}°C to {cand_t_max}°C",
                "status": "MISMATCH",
                "importance": "SECONDARY",
                "reason": f"Candidate temperature span ({cand_t_min} to {cand_t_max}°C) does not fully satisfy base range ({base_t_min} to {base_t_max}°C)"
            })
            mismatches.append(f"Temperature rating restriction: {cand_t_min}..{cand_t_max}°C vs {base_t_min}..{base_t_max}°C")
    else:
        details.append({
            "name": "Operating Temperature Range",
            "base_value": f"{base_t_min} to {base_t_max}°C" if base_t_min is not None else "UNKNOWN",
            "candidate_value": f"{cand_t_min} to {cand_t_max}°C" if cand_t_min is not None else "UNKNOWN",
            "status": "UNKNOWN",
            "importance": "SECONDARY",
            "reason": "Operating temperature range not fully specified"
        })
        unknowns.append("Operating temperature range specification incomplete")

    # Calculate status counts
    matches_count = sum(1 for d in details if d["status"] == "MATCH")
    mismatches_count = sum(1 for d in details if d["status"] == "MISMATCH")
    unknowns_count = sum(1 for d in details if d["status"] == "UNKNOWN")

    if has_hard_mismatch:
        status = "HARD_MISMATCH"
    elif unknowns_count > 0 and mismatches_count == 0:
        status = "REVIEW_REQUIRED"
    elif mismatches_count > 0:
        status = "REVIEW_REQUIRED"
    else:
        status = "COMPATIBLE"

    return {
        "status": status,
        "matches_count": matches_count,
        "mismatches_count": mismatches_count,
        "unknowns_count": unknowns_count,
        "mismatches": mismatches,
        "unknowns": unknowns,
        "details": details
    }
