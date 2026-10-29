from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from typing import Dict, Any, List
from ..database import get_db
from ..models import BOM, BOMItem, Component, SellerListing, RFQ
from ..rules.risk_scoring import calculate_component_risk
from ..services.alternative_service import find_alternatives_for_component
from ..services.discovery_service import discover_sellers_for_part

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    # 1. Total BOMs
    total_boms = db.query(BOM).count()

    # 2. Components metrics
    components = db.query(Component).all()
    total_unique_components = len(components)

    verified_indian_count = sum(1 for c in components if c.origin_category == "VERIFIED_INDIAN")
    indian_supplier_count = sum(1 for c in components if c.origin_category == "INDIAN_SUPPLIER_UNVERIFIED_MFR")
    foreign_origin_count = sum(1 for c in components if c.origin_category == "FOREIGN")
    unknown_origin_count = sum(1 for c in components if c.origin_category == "UNKNOWN")
    critical_count = sum(1 for c in components if (c.user_criticality or "").upper() == "CRITICAL")

    # Category distribution
    cat_dist: Dict[str, int] = {}
    for c in components:
        cat = c.category or "Other"
        cat_dist[cat] = cat_dist.get(cat, 0) + 1

    # Multi-BOM and alternative evaluation for each component
    risk_dist = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    with_alternatives = 0
    without_alternatives = 0
    evaluated_components: List[Dict[str, Any]] = []

    # Map BOM items per component
    bom_items_all = db.query(BOMItem).all()
    comp_bom_map = {}
    comp_qty_map = {}
    bom_unique_pns = set()
    for bi in bom_items_all:
        pn = bi.part_number
        bom_unique_pns.add(pn)
        comp_bom_map.setdefault(pn, set()).add(bi.bom_id)
        comp_qty_map[pn] = comp_qty_map.get(pn, 0) + bi.quantity

    with_indian_alternatives = 0
    category_risk_map: Dict[str, Dict[str, int]] = {}

    for comp in components:
        cat = comp.category or "Other"
        if cat not in category_risk_map:
            category_risk_map[cat] = {"total": 0, "critical": 0}
        category_risk_map[cat]["total"] += 1
        is_crit = (comp.user_criticality or "").upper() == "CRITICAL"
        if is_crit:
            category_risk_map[cat]["critical"] += 1

        boms_using = comp_bom_map.get(comp.part_number, set())
        total_qty = comp_qty_map.get(comp.part_number, 0)

        # Quick check of viable alternatives
        alts = find_alternatives_for_component(db, comp.id)
        viable_candidates = alts.get("candidates", [])
        viable_count = len(viable_candidates)

        has_indian_alt = any(c.get("origin_category") == "VERIFIED_INDIAN" for c in viable_candidates)
        if has_indian_alt:
            with_indian_alternatives += 1

        if viable_count > 0:
            with_alternatives += 1
        else:
            without_alternatives += 1

        risk_data = calculate_component_risk(
            comp={
                "user_criticality": comp.user_criticality,
                "lifecycle_status": comp.lifecycle_status,
                "origin_category": comp.origin_category,
                "manufacturer_country": comp.manufacturer_country
            },
            bom_count=len(boms_using),
            total_boms_quantity=total_qty,
            viable_alternatives_count=viable_count
        )

        r_level = risk_data["risk_level"]
        risk_dist[r_level] = risk_dist.get(r_level, 0) + 1

        evaluated_components.append({
            "id": comp.id,
            "part_number": comp.part_number,
            "manufacturer": comp.manufacturer,
            "category": comp.category,
            "origin_category": comp.origin_category,
            "lifecycle_status": comp.lifecycle_status,
            "user_criticality": comp.user_criticality,
            "risk_level": r_level,
            "risk_score": risk_data["risk_score"],
            "viable_alternatives_count": viable_count,
            "has_indian_alternative": has_indian_alt,
            "boms_count": len(boms_using),
            "total_quantity": total_qty,
            "top_candidate": viable_candidates[0]["part_number"] if viable_count > 0 else None,
            "top_candidate_origin": viable_candidates[0]["origin_label"] if viable_count > 0 else None
        })

    # High-priority components: sorted by critical first, then risk score descending
    def sort_key(x):
        is_crit = 1 if (x.get("user_criticality") or "").upper() == "CRITICAL" else 0
        return (is_crit, x["risk_score"])

    evaluated_components.sort(key=sort_key, reverse=True)
    high_priority = evaluated_components[:10]

    # Category risk breakdown list
    category_risk_breakdown = [
        {"category": cat, "total": val["total"], "critical": val["critical"]}
        for cat, val in sorted(category_risk_map.items(), key=lambda item: item[1]["critical"], reverse=True)
    ]

    # Recent BOMs with critical counts
    recent_boms_db = db.query(BOM).order_by(BOM.created_at.desc()).limit(5).all()
    recent_boms = []
    for b in recent_boms_db:
        crit_items_count = db.query(BOMItem).filter(
            BOMItem.bom_id == b.id,
            func.upper(BOMItem.criticality) == "CRITICAL"
        ).count()
        recent_boms.append({
            "id": b.id,
            "name": b.name,
            "filename": b.filename,
            "total_items": b.total_items,
            "total_quantity": b.total_quantity,
            "critical_count": crit_items_count,
            "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None
        })

    # =========================================================================
    # REAL STORED SELLER DISCOVERY & RFQ METRICS
    # =========================================================================
    # Preload all seller listings indexed by normalized part number
    all_listings = db.query(SellerListing).all()
    listings_by_pn = {}
    for l in all_listings:
        norm = l.normalized_part_number
        listings_by_pn.setdefault(norm, []).append(l)

    bom_pns_with_sellers = 0
    bom_pns_without_sellers = 0

    for pn in bom_unique_pns:
        norm_pn = pn.strip().upper()
        exact_lists = [l for l in listings_by_pn.get(norm_pn, []) if l.exact_match]
        if len(exact_lists) > 0:
            bom_pns_with_sellers += 1
        else:
            bom_pns_without_sellers += 1

    # Real RFQs count awaiting follow-up from DB
    rfqs_awaiting_followup = db.query(RFQ).filter(
        RFQ.status.in_(["DRAFT", "READY_TO_SEND", "SENT_BY_USER"])
    ).count()

    # Sourcing actions: highest-priority BOM components and their seller-discovery status
    sourcing_actions = []
    for item in high_priority[:6]:
        pn = item["part_number"]
        norm_pn = pn.strip().upper()
        exact_lists = [l for l in listings_by_pn.get(norm_pn, []) if l.exact_match]
        
        # Sourcing status determination
        if any(l.seller_classification == "VERIFIED_INDIAN_MANUFACTURER" for l in exact_lists):
            s_status = "INDIAN_MFR_DIRECT"
            s_label = "Indian Mfr Direct"
        elif len(exact_lists) > 0:
            s_status = "INDIAN_SELLER_EXACT"
            s_label = f"{len(exact_lists)} Verified Sellers"
        elif item["has_indian_alternative"]:
            s_status = "INDIAN_ALTERNATIVE_AVAILABLE"
            s_label = "Alt Available"
        else:
            s_status = "NO_SELLER_FOUND"
            s_label = "No Seller Found"

        top_seller = exact_lists[0].seller.name if (exact_lists and exact_lists[0].seller) else None

        sourcing_actions.append({
            "component_id": item["id"],
            "part_number": pn,
            "manufacturer": item["manufacturer"],
            "category": item["category"],
            "risk_level": item["risk_level"],
            "risk_score": item["risk_score"],
            "user_criticality": item["user_criticality"],
            "seller_listings_count": len(exact_lists),
            "has_indian_alternative": item["has_indian_alternative"],
            "top_candidate": item["top_candidate"],
            "sourcing_status": s_status,
            "sourcing_status_label": s_label,
            "top_seller_name": top_seller,
            "total_quantity": item["total_quantity"]
        })

    # Data freshness
    oldest_verification = db.query(func.min(Component.last_verified_at)).scalar()
    latest_verification = db.query(func.max(Component.last_verified_at)).scalar()

    return {
        "total_boms": total_boms,
        "total_unique_components": total_unique_components,
        "total_critical_components": critical_count,
        "verified_indian_count": verified_indian_count,
        "indian_supplier_unverified_mfr_count": indian_supplier_count,
        "foreign_origin_count": foreign_origin_count,
        "unknown_origin_count": unknown_origin_count,
        "components_with_alternatives_count": with_alternatives,
        "components_without_alternatives_count": without_alternatives,
        "components_with_indian_alternatives_count": with_indian_alternatives,
        "risk_distribution": risk_dist,
        "category_distribution": cat_dist,
        "category_risk_breakdown": category_risk_breakdown,
        "high_priority_components": high_priority,
        "all_priority_components": evaluated_components,
        "recent_boms": recent_boms,
        
        # New required real stored metrics
        "bom_components_with_seller_listings": bom_pns_with_sellers,
        "components_with_no_seller_listing": bom_pns_without_sellers,
        "rfqs_awaiting_followup": rfqs_awaiting_followup,
        "potential_domestic_alternatives": with_indian_alternatives,
        "sourcing_actions": sourcing_actions,

        "data_freshness": {
            "oldest_verification": oldest_verification.isoformat() if oldest_verification else None,
            "latest_verification": latest_verification.isoformat() if latest_verification else None,
            "is_stale_warning": False,
            "notice": "All metrics calculated dynamically from database."
        }
    }
