from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Dict, Any, List
from ..database import get_db
from ..models import BOM, BOMItem, Component, RiskAssessment, RFQ, generate_uuid
from ..rules.risk_scoring import calculate_component_risk
from ..services.alternative_service import find_alternatives_for_component
from ..services.discovery_service import discover_sellers_for_part

router = APIRouter(prefix="/analysis", tags=["Dependency & Risk Analysis"])

@router.post("/{bom_id}")
@router.get("/{bom_id}")
def analyze_bom_dependencies(bom_id: str, db: Session = Depends(get_db)):
    bom = db.query(BOM).filter(BOM.id == bom_id).first()
    if not bom:
        raise HTTPException(status_code=404, detail="BOM not found")

    items = db.query(BOMItem).filter(BOMItem.bom_id == bom_id).all()
    if not items:
        return {
            "bom_id": bom.id,
            "bom_name": bom.name,
            "total_items": 0,
            "items_analyzed": [],
            "overall_risk_summary": {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        }

    # Preload global BOM items to determine cross-BOM sharing
    all_bom_items = db.query(BOMItem).all()
    global_part_boms = {}
    global_part_qty = {}
    for bi in all_bom_items:
        global_part_boms.setdefault(bi.part_number, set()).add(bi.bom_id)
        global_part_qty[bi.part_number] = global_part_qty.get(bi.part_number, 0) + bi.quantity

    items_analyzed = []
    risk_summary = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}

    for item in items:
        # Match with catalogue component
        comp = db.query(Component).filter(
            (Component.id == item.component_id) | (Component.part_number.ilike(item.part_number))
        ).first()

        bom_sharing_count = len(global_part_boms.get(item.part_number, set()))
        total_shared_qty = global_part_qty.get(item.part_number, item.quantity)

        # Viable alternatives check
        viable_alternatives = []
        alt_count = 0
        comp_id_val = None

        if comp:
            comp_id_val = comp.id
            alts = find_alternatives_for_component(db, comp.id)
            viable_alternatives = alts.get("candidates", [])
            alt_count = len(viable_alternatives)

        # Calculate heuristic risk
        risk_result = calculate_component_risk(
            comp={
                "user_criticality": item.criticality or (comp.user_criticality if comp else "MEDIUM"),
                "lifecycle_status": comp.lifecycle_status if comp else "UNKNOWN",
                "origin_category": comp.origin_category if comp else "UNKNOWN",
                "manufacturer_country": comp.manufacturer_country if comp else None
            },
            bom_count=bom_sharing_count,
            total_boms_quantity=total_shared_qty,
            viable_alternatives_count=alt_count
        )

        r_level = risk_result["risk_level"]
        risk_summary[r_level] = risk_summary.get(r_level, 0) + 1

        # Persist risk assessment if comp exists
        if comp:
            ra = db.query(RiskAssessment).filter_by(
                bom_id=bom.id,
                component_id=comp.id
            ).first()

            if not ra:
                ra = RiskAssessment(
                    id=generate_uuid(),
                    bom_id=bom.id,
                    component_id=comp.id,
                    risk_level=r_level,
                    risk_score=risk_result["risk_score"],
                    risk_reasons=risk_result["risk_factors"],
                    evidence_summary={"disclaimer": risk_result["disclaimer"]},
                    unknown_data_factors=risk_result["unknown_data_factors"],
                    suggested_actions=risk_result["suggested_actions"],
                    assessed_at=datetime.now(timezone.utc)
                )
                db.add(ra)
            else:
                ra.risk_level = r_level
                ra.risk_score = risk_result["risk_score"]
                ra.risk_reasons = risk_result["risk_factors"]
                ra.unknown_data_factors = risk_result["unknown_data_factors"]
                ra.suggested_actions = risk_result["suggested_actions"]
                ra.assessed_at = datetime.now(timezone.utc)

        top_cand = viable_alternatives[0] if viable_alternatives else None

        # Build explainable critical and sourcing factors
        is_crit = (item.criticality in ["CRITICAL", "HIGH"]) or (r_level == "CRITICAL")
        
        # Why is it critical?
        why_critical_reasons = []
        if item.criticality in ["CRITICAL", "HIGH"]:
            why_critical_reasons.append(f"Designated {item.criticality} priority in Bill of Materials")
        if bom_sharing_count > 1:
            why_critical_reasons.append(f"Shared across {bom_sharing_count} assemblies ({total_shared_qty} total units required)")
        if comp and comp.category in ["Microcontroller", "Processor", "FPGA"]:
            why_critical_reasons.append("Core system compute component; failure halts entire system architecture")
        if not why_critical_reasons:
            why_critical_reasons.append("Standard bill-of-materials line item")
        why_critical_text = "; ".join(why_critical_reasons)

        # Why is it a sourcing concern?
        why_sourcing_reasons = []
        orig_cat = comp.origin_category if comp else "UNKNOWN"
        if orig_cat == "FOREIGN":
            mfr_c = comp.manufacturer_country or "Overseas"
            why_sourcing_reasons.append(f"100% foreign manufacturer dependency ({mfr_c})")
        elif orig_cat == "INDIAN_SUPPLIER_UNVERIFIED_MFR":
            dist = comp.distributor_name or "Domestic distributor"
            why_sourcing_reasons.append(f"Distributed locally by {dist}, but true wafer/packaging country is unverified")
        elif orig_cat == "UNKNOWN":
            why_sourcing_reasons.append("Manufacturer country of origin unverified in trusted registers")

        if alt_count == 0:
            why_sourcing_reasons.append("Zero viable drop-in or functional alternatives in catalogue")
        elif top_cand and top_cand.get("compatibility_status") == "REVIEW_REQUIRED":
            why_sourcing_reasons.append(f"Nearest candidate ({top_cand['part_number']}) requires engineering design review")

        if comp and comp.lifecycle_status in ["EOL", "OBSOLETE", "NRND"]:
            why_sourcing_reasons.append(f"Component lifecycle is {comp.lifecycle_status}")

        if not why_sourcing_reasons:
            why_sourcing_reasons.append("Multi-sourced with active lifecycle")
        why_sourcing_text = "; ".join(why_sourcing_reasons)

        # Missing information
        missing_info = []
        if not comp:
            missing_info.append("Not linked in local component catalogue")
        else:
            if not comp.manufacturer_country:
                missing_info.append("Manufacturer manufacturing country undocumented")
            if not comp.datasheet_url:
                missing_info.append("Official datasheet link missing")
            if not comp.specifications or not comp.specifications.package:
                missing_info.append("Package footprint unverified")
            if not comp.specifications or comp.specifications.nominal_voltage_v is None:
                missing_info.append("Nominal operating voltage unverified")
        if not item.required_voltage:
            missing_info.append("Target operating voltage omitted from BOM")
        if not item.package:
            missing_info.append("Target footprint package omitted from BOM")

        # Country of manufacture evidence summary
        if comp and comp.manufacturer_country:
            conf = comp.manufacturer_country_confidence or "CLAIMED"
            country_evidence = f"{comp.manufacturer_country} ({conf.title()} via {comp.source_name or 'registry'})"
        elif comp and comp.origin_category == "INDIAN_SUPPLIER_UNVERIFIED_MFR":
            country_evidence = f"Distributed by {comp.distributor_name or 'Indian vendor'}; manufacturer country unverified"
        else:
            country_evidence = "Unknown origin; no government or manufacturer filing linked"

        # Recommended action
        if alt_count > 0:
            rec_action = f"Evaluate Indian alternative {top_cand['part_number']} ({top_cand['manufacturer']})"
        elif orig_cat == "FOREIGN":
            rec_action = "Initiate domestic semiconductor sourcing R&D or buffer safety stock"
        elif orig_cat in ["UNKNOWN", "INDIAN_SUPPLIER_UNVERIFIED_MFR"]:
            rec_action = "Request certificate of origin (CoO) from vendor/distributor"
        else:
            rec_action = "Monitor supply-chain lifecycle and maintain multi-source agreements"

        # Indian sourcing options
        indian_sourcing_options = []
        for cand in viable_alternatives[:3]:
            indian_sourcing_options.append({
                "candidate_id": cand.get("candidate_id"),
                "part_number": cand.get("part_number"),
                "manufacturer": cand.get("manufacturer"),
                "origin_category": cand.get("origin_category"),
                "origin_label": cand.get("origin_label"),
                "heuristic_score": cand.get("heuristic_score"),
                "compatibility_status": cand.get("compatibility_status"),
                "datasheet_url": cand.get("datasheet_url"),
                "source_url": cand.get("source_url")
            })

        # =====================================================================
        # INDIAN SELLER DISCOVERY FOR EXACT COMPONENT & POTENTIAL ALTERNATIVES
        # =====================================================================
        discovery_res = discover_sellers_for_part(
            db=db,
            part_number=item.part_number,
            component=comp,
            bom_id=bom.id,
            quantity_required=item.quantity
        )

        seller_listings_summary = []
        for exact_s in discovery_res.exact_matches:
            seller_listings_summary.append({
                "seller_name": exact_s.seller_name,
                "seller_type": exact_s.seller_type,
                "location_city": exact_s.location_city,
                "location_state": exact_s.location_state,
                "availability_status": exact_s.availability_status,
                "price": exact_s.price,
                "currency": exact_s.currency,
                "moq": exact_s.moq,
                "lead_time_days": exact_s.lead_time_days,
                "product_url": exact_s.product_url,
                "seller_classification": exact_s.seller_classification
            })

        alt_summary = []
        for alt_opt in discovery_res.potential_indian_alternatives:
            alt_summary.append({
                "candidate_id": alt_opt.candidate_id,
                "part_number": alt_opt.part_number,
                "manufacturer": alt_opt.manufacturer,
                "origin_label": alt_opt.origin_label,
                "compatibility_status": alt_opt.compatibility_status,
                "sellers_count": alt_opt.sellers_count,
                "sample_seller": alt_opt.sample_seller
            })

        items_analyzed.append({
            "bom_item_id": item.id,
            "component_id": comp_id_val,
            "product_name": item.product_name,
            "reference_designator": item.product_name,
            "part_number": item.part_number,
            "description": comp.description if comp else (item.notes or "BOM Component Line Item"),
            "manufacturer": item.manufacturer,
            "category": item.category or (comp.category if comp else "Unknown"),
            "quantity": item.quantity,
            "package": item.package or (comp.specifications.package if comp and comp.specifications else None),
            "required_voltage": item.required_voltage,
            "criticality": item.criticality,
            "origin_category": orig_cat,
            "manufacturer_country": comp.manufacturer_country if comp else None,
            "origin_confidence": comp.manufacturer_country_confidence if comp else "UNKNOWN",
            "origin_evidence_url": comp.manufacturer_country_evidence_url if comp else None,
            "distributor_name": comp.distributor_name if comp else None,
            "datasheet_url": comp.datasheet_url if comp else None,
            "source_url": comp.source_url if comp else None,
            "lifecycle_status": comp.lifecycle_status if comp else "UNKNOWN",
            "risk_level": r_level,
            "risk_score": risk_result["risk_score"],
            "risk_factors": risk_result["risk_factors"],
            "unknown_data_factors": risk_result["unknown_data_factors"],
            "suggested_actions": risk_result["suggested_actions"],
            "is_critical": is_crit,
            "why_critical": why_critical_text,
            "why_sourcing_concern": why_sourcing_text,
            "country_evidence_summary": country_evidence,
            "missing_information": missing_info,
            "has_missing_specs": len(missing_info) > 0,
            "recommended_action": rec_action,
            "indian_sourcing_options": indian_sourcing_options,
            
            # Indian Seller Discovery fields
            "indian_seller_listings_count": discovery_res.exact_sellers_count,
            "indian_seller_listings": seller_listings_summary,
            "potential_indian_alternatives_count": discovery_res.alternatives_count,
            "potential_indian_alternatives": alt_summary,
            "sourcing_status": discovery_res.sourcing_status,
            "sourcing_status_label": discovery_res.sourcing_status_label,
            
            "is_multi_bom": bom_sharing_count > 1,
            "bom_sharing_count": bom_sharing_count,
            "total_shared_quantity": total_shared_qty,
            "viable_alternatives_count": alt_count,
            "top_alternative": {
                "part_number": top_cand["part_number"],
                "manufacturer": top_cand["manufacturer"],
                "origin_label": top_cand["origin_label"],
                "heuristic_score": top_cand["heuristic_score"],
                "compatibility_status": top_cand["compatibility_status"],
                "ranking_reason": top_cand["ranking_reason"]
            } if top_cand else None
        })

    db.commit()

    # Sort analyzed items by risk score descending
    items_analyzed.sort(key=lambda x: x["risk_score"], reverse=True)

    # Compute comprehensive summary metrics
    unique_pns = set(it["part_number"].upper() for it in items_analyzed)
    crit_count = sum(1 for it in items_analyzed if it["is_critical"])
    foreign_count = sum(1 for it in items_analyzed if it["origin_category"] == "FOREIGN")
    unknown_origin_count = sum(1 for it in items_analyzed if it["origin_category"] in ["UNKNOWN", "INDIAN_SUPPLIER_UNVERIFIED_MFR"])
    with_alts_count = sum(1 for it in items_analyzed if it["viable_alternatives_count"] > 0)
    needing_verification_count = sum(1 for it in items_analyzed if it["has_missing_specs"] or it["origin_category"] == "UNKNOWN" or (it["top_alternative"] and it["top_alternative"]["compatibility_status"] == "REVIEW_REQUIRED"))

    # Seller & RFQ Discovery metrics
    with_seller_listings = sum(1 for it in items_analyzed if it["indian_seller_listings_count"] > 0)
    without_seller_listings = sum(1 for it in items_analyzed if it["indian_seller_listings_count"] == 0)
    with_domestic_alts = sum(1 for it in items_analyzed if it["potential_indian_alternatives_count"] > 0)
    
    # Real RFQs count awaiting follow-up from DB
    rfqs_awaiting = db.query(RFQ).filter(
        RFQ.status.in_(["DRAFT", "READY_TO_SEND", "SENT_BY_USER"])
    ).count()

    summary_metrics = {
        "total_items": len(items),
        "unique_components": len(unique_pns),
        "critical_components": crit_count,
        "verified_foreign_components": foreign_count,
        "unknown_origin_components": unknown_origin_count,
        "components_with_potential_indian_alternatives": with_alts_count,
        "components_requiring_verification": needing_verification_count,
        # Real Sourcing & RFQ metrics
        "components_with_seller_listings": with_seller_listings,
        "components_with_no_seller_listing": without_seller_listings,
        "potential_domestic_alternatives": with_domestic_alts,
        "rfqs_awaiting_followup": rfqs_awaiting
    }

    return {
        "bom_id": bom.id,
        "bom_name": bom.name,
        "filename": bom.filename,
        "total_items": len(items),
        "summary_metrics": summary_metrics,
        "risk_summary": risk_summary,
        "items_analyzed": items_analyzed,
        "disclaimer": "Heuristic decision-support analysis. Engineering sign-off required prior to production change."
    }
