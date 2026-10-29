import pytest
from app.rules.hard_constraints import evaluate_hard_constraints
from app.rules.ranking import rank_candidate
from app.rules.risk_scoring import calculate_component_risk
from app.services.bom_parser import sanitize_csv_formula, parse_bom_file

def test_hard_mismatch_detected_for_voltage_regulator():
    """Output voltage mismatch must be flagged as a hard mismatch, not ignored."""
    base_comp = {
        "category": "Voltage Regulator",
        "specifications": {
            "nominal_voltage_v": 3.3,
            "max_current_ma": 800.0,
            "package": "SOT-223"
        }
    }
    candidate_comp = {
        "category": "Voltage Regulator",
        "specifications": {
            "nominal_voltage_v": 5.0, # Mismatch: 5V vs 3.3V!
            "max_current_ma": 1000.0,
            "package": "SOT-223"
        }
    }
    result = evaluate_hard_constraints(base_comp, candidate_comp)
    assert result["status"] == "HARD_MISMATCH"
    assert any("Output voltage mismatch" in m for m in result["mismatches"])

def test_hard_mismatch_for_package_variation():
    """Package footprint mismatch must be flagged as a hard constraint violation."""
    base_comp = {
        "category": "Microcontroller",
        "specifications": {
            "nominal_voltage_v": 3.3,
            "min_voltage_v": 1.8,
            "max_voltage_v": 3.6,
            "package": "LQFP-64"
        }
    }
    candidate_comp = {
        "category": "Microcontroller",
        "specifications": {
            "nominal_voltage_v": 3.3,
            "min_voltage_v": 1.8,
            "max_voltage_v": 3.6,
            "package": "QFN-32" # Footprint mismatch!
        }
    }
    result = evaluate_hard_constraints(base_comp, candidate_comp)
    assert result["status"] == "HARD_MISMATCH"
    assert any("Footprint mismatch" in m for m in result["mismatches"])

def test_unknown_specifications_never_counted_as_matches():
    """SAFETY RULE 7: Missing specifications must be shown as UNKNOWN, not as matches."""
    base_comp = {
        "category": "Sensor",
        "specifications": {
            "nominal_voltage_v": 3.3,
            "package": "SOIC-8",
            "interfaces": ["I2C"]
        }
    }
    candidate_comp = {
        "category": "Sensor",
        "specifications": {
            "nominal_voltage_v": None, # Unknown
            "package": "SOIC-8",
            "interfaces": [] # Unknown
        }
    }
    result = evaluate_hard_constraints(base_comp, candidate_comp)
    # UNKNOWN fields must be strictly categorized
    assert result["unknowns_count"] > 0
    statuses = [d["status"] for d in result["details"]]
    assert "UNKNOWN" in statuses
    # The unknown operating voltage must not be recorded as MATCH
    volt_check = next(d for d in result["details"] if "Voltage" in d["name"])
    assert volt_check["status"] == "UNKNOWN"

def test_origin_unknown_distinguished():
    """SAFETY RULE 2: Origin unknown must remain UNKNOWN and not be fabricated."""
    base_comp = {
        "category": "Sensor",
        "specifications": {"package": "SOT-23"}
    }
    candidate_comp = {
        "part_number": "UNKNOWN-01",
        "manufacturer": "Unknown Labs",
        "category": "Sensor",
        "origin_category": "UNKNOWN",
        "manufacturer_country": None,
        "distributor_name": None,
        "lifecycle_status": "UNKNOWN",
        "specifications": {"package": "SOT-23"}
    }
    ranking = rank_candidate(base_comp, candidate_comp)
    assert ranking["origin_category"] == "UNKNOWN"
    assert ranking["origin_label"] == "Origin Unknown"
    assert ranking["origin_badge_class"] == "unknown"

def test_indian_candidate_not_forced_when_hard_mismatch():
    """SAFETY RULE: Do not force an Indian candidate into the result when it fails technical requirements."""
    base_comp = {
        "category": "Voltage Regulator",
        "specifications": {"nominal_voltage_v": 3.3, "package": "SOT-223"}
    }
    indian_candidate_wrong_voltage = {
        "part_number": "IND-REG-5V",
        "manufacturer": "Indian Power Semi",
        "category": "Voltage Regulator",
        "origin_category": "VERIFIED_INDIAN",
        "lifecycle_status": "ACTIVE",
        "specifications": {"nominal_voltage_v": 5.0, "package": "SOT-223"} # Wrong voltage!
    }
    ranking = rank_candidate(base_comp, indian_candidate_wrong_voltage)
    assert ranking["compatibility_status"] == "HARD_MISMATCH"
    # Even though it's Indian, score is capped and penalized heavily
    assert ranking["heuristic_score"] <= 15.0

def test_csv_formula_injection_sanitization():
    """Protects spreadsheet applications from CSV formula injection."""
    assert sanitize_csv_formula("=cmd|'/C calc'!A0") == "'=cmd|'/C calc'!A0"
    assert sanitize_csv_formula("+12345") == "'+12345"
    assert sanitize_csv_formula("-9999") == "'-9999"
    assert sanitize_csv_formula("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert sanitize_csv_formula("STM32F401RET6") == "STM32F401RET6"

def test_risk_score_transparent_breakdown():
    """Risk score must provide transparent human-readable factors and disclaimer."""
    comp = {
        "user_criticality": "CRITICAL",
        "lifecycle_status": "NRND",
        "origin_category": "UNKNOWN",
        "manufacturer_country": None
    }
    risk = calculate_component_risk(
        comp=comp,
        bom_count=3,
        total_boms_quantity=500,
        viable_alternatives_count=0
    )
    assert risk["risk_level"] in ["HIGH", "CRITICAL"]
    assert risk["risk_score"] >= 75.0
    assert len(risk["risk_factors"]) > 0
    assert "disclaimer" in risk
    assert any("Single-Source" in f["factor"] for f in risk["risk_factors"])
