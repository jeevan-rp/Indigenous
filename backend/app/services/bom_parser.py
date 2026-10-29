import re
import io
import os
import pandas as pd
from typing import Dict, Any, List, Tuple

# Standard column aliases for flexible matching
COLUMN_ALIASES = {
    "product_name": ["product_name", "product", "assembly", "board", "project"],
    "part_number": ["part_number", "part_no", "mpn", "part_#", "component_id", "partnumber"],
    "manufacturer": ["manufacturer", "mfr", "maker", "vendor", "mfg"],
    "quantity": ["quantity", "qty", "count", "amount"],
    "category": ["category", "type", "comp_type", "device_type", "class"],
    "required_voltage": ["required_voltage", "voltage", "operating_voltage", "vcc", "vdd"],
    "required_current": ["required_current", "current", "max_current", "icc"],
    "package": ["package", "footprint", "case", "encapsulation", "pkg"],
    "interface": ["interface", "interfaces", "bus", "protocol"],
    "criticality": ["criticality", "importance", "priority", "critical"],
    "notes": ["notes", "description", "remarks", "comment", "function"]
}

def sanitize_csv_formula(val: Any) -> Any:
    """Protects against formula injection in spreadsheet exports/imports."""
    if isinstance(val, str) and val.startswith(("=", "+", "-", "@", "\t", "\r")):
        return "'" + val
    return val

def normalize_column_name(col: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "", str(col).strip().lower().replace(" ", "_"))
    for canonical, aliases in COLUMN_ALIASES.items():
        if cleaned in aliases:
            return canonical
    return cleaned

def parse_bom_file(
    file_bytes: bytes,
    filename: str
) -> Dict[str, Any]:
    """
    Parses and validates uploaded BOM files (CSV or XLSX).
    Returns preview data, detected column mapping, valid rows, and explicit validation errors.
    Does not silently drop invalid rows.
    """
    errors: List[Dict[str, Any]] = []
    warnings: List[str] = []
    
    # 1. File extension validation
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".csv", ".xlsx", ".xls"]:
        return {
            "success": False,
            "errors": [{"row": 0, "field": "filename", "error": f"Unsupported file format '{ext}'. Expected .csv or .xlsx"}],
            "items": [],
            "preview": []
        }

    # 2. Read into DataFrame
    try:
        if ext == ".csv":
            # Try utf-8 first, fallback to latin-1
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(file_bytes), encoding="latin-1")
        else:
            df = pd.read_excel(io.BytesIO(file_bytes))
    except Exception as e:
        return {
            "success": False,
            "errors": [{"row": 0, "field": "file", "error": f"Failed to parse spreadsheet: {str(e)}"}],
            "items": [],
            "preview": []
        }

    # Empty check
    if df.empty or len(df.columns) == 0:
        return {
            "success": False,
            "errors": [{"row": 0, "field": "file", "error": "Uploaded file is empty"}],
            "items": [],
            "preview": []
        }

    # 3. Normalize column headers
    orig_cols = list(df.columns)
    mapped_cols = {col: normalize_column_name(col) for col in orig_cols}
    known_canonical = set(COLUMN_ALIASES.keys())
    unrecognised_columns = [orig for orig, canon in mapped_cols.items() if canon not in known_canonical]
    df.rename(columns=mapped_cols, inplace=True)

    # Required column presence check
    if "part_number" not in df.columns:
        return {
            "success": False,
            "errors": [{
                "row": 0,
                "field": "headers",
                "error": f"Missing required column 'part_number' (or aliases: {', '.join(COLUMN_ALIASES['part_number'])}). Detected columns: {', '.join(orig_cols)}"
            }],
            "items": [],
            "preview": [],
            "unrecognised_columns": unrecognised_columns,
            "duplicate_part_numbers": []
        }

    valid_items: List[Dict[str, Any]] = []
    seen_part_numbers: set = set()
    duplicate_part_numbers: List[str] = []
    rows_with_missing_fields_count = 0

    for idx, row in df.iterrows():
        row_num = idx + 2 # 1-based, plus header row
        pn_val = str(row.get("part_number") or "").strip()
        
        # Check missing part number
        if not pn_val or pn_val.lower() in ["nan", "none", "null", ""]:
            errors.append({
                "row": row_num,
                "field": "part_number",
                "error": "Empty or invalid part number"
            })
            continue

        # Check duplicate part number within same BOM
        if pn_val in seen_part_numbers:
            if pn_val not in duplicate_part_numbers:
                duplicate_part_numbers.append(pn_val)
            warnings.append(f"Row {row_num}: Duplicate part number '{pn_val}' detected in BOM. Quantities should ideally be consolidated.")
        seen_part_numbers.add(pn_val)

        # Quantity validation
        qty_raw = row.get("quantity")
        qty = 1
        if pd.notna(qty_raw):
            try:
                qty = int(float(qty_raw))
                if qty <= 0:
                    errors.append({
                        "row": row_num,
                        "field": "quantity",
                        "error": f"Quantity must be a positive integer, got '{qty_raw}'"
                    })
                    continue
            except (ValueError, TypeError):
                errors.append({
                    "row": row_num,
                    "field": "quantity",
                    "error": f"Malformed quantity '{qty_raw}'. Must be numeric."
                })
                continue

        # Criticality normalization
        crit_raw = str(row.get("criticality") or "MEDIUM").strip().upper()
        if crit_raw not in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]:
            crit_raw = "MEDIUM"

        # Check if optional specifications are missing
        has_missing = False
        if pd.isna(row.get("manufacturer")) or not str(row.get("manufacturer") or "").strip():
            has_missing = True
        if pd.isna(row.get("category")) or not str(row.get("category") or "").strip():
            has_missing = True
        if pd.isna(row.get("required_voltage")) or not str(row.get("required_voltage") or "").strip():
            has_missing = True
        if pd.isna(row.get("package")) or not str(row.get("package") or "").strip():
            has_missing = True
        if has_missing:
            rows_with_missing_fields_count += 1

        item = {
            "product_name": str(row.get("product_name") or "Host System").strip() if pd.notna(row.get("product_name")) else "Host System",
            "part_number": pn_val,
            "manufacturer": str(row.get("manufacturer") or "Unknown").strip() if pd.notna(row.get("manufacturer")) else "Unknown",
            "category": str(row.get("category") or "").strip() if pd.notna(row.get("category")) else None,
            "quantity": qty,
            "required_voltage": str(row.get("required_voltage") or "").strip() if pd.notna(row.get("required_voltage")) else None,
            "required_current": str(row.get("required_current") or "").strip() if pd.notna(row.get("required_current")) else None,
            "package": str(row.get("package") or "").strip() if pd.notna(row.get("package")) else None,
            "interface": str(row.get("interface") or "").strip() if pd.notna(row.get("interface")) else None,
            "criticality": crit_raw,
            "notes": str(row.get("notes") or "").strip() if pd.notna(row.get("notes")) else None,
        }
        valid_items.append(item)

    is_success = len(errors) == 0

    return {
        "success": is_success,
        "total_rows": len(df),
        "valid_rows_count": len(valid_items),
        "errors": errors,
        "warnings": warnings,
        "duplicate_part_numbers": duplicate_part_numbers,
        "unrecognised_columns": unrecognised_columns,
        "rows_with_missing_fields_count": rows_with_missing_fields_count,
        "items": valid_items,
        "preview": valid_items[:10], # First 10 items for modal preview
        "detected_columns": orig_cols
    }
