from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import Seller, SellerListing, SellerContact, SavedSeller, DataSource, Organisation, generate_uuid
from ..schemas import (
    SellerResponse, SellerListingSchema, ComponentSellerDiscoveryResponse,
    DataSourceStatusResponse, SellerContactSchema
)
from ..services.discovery_service import (
    discover_sellers_for_part, get_all_provider_statuses
)

router = APIRouter(prefix="/sellers", tags=["Indian Seller Discovery"])

@router.get("", response_model=List[SellerResponse])
def list_sellers(
    seller_type: Optional[str] = Query(None, description="Filter by seller category"),
    verified_only: bool = Query(False, description="Filter only verified Indian entities"),
    db: Session = Depends(get_db)
):
    query = db.query(Seller)
    if seller_type:
        query = query.filter(Seller.seller_type == seller_type)
    if verified_only:
        query = query.filter(Seller.is_verified_indian == True)
        
    sellers = query.order_by(Seller.name.asc()).all()
    saved_ids = set(s.seller_id for s in db.query(SavedSeller).all())

    results = []
    for s in sellers:
        listings_count = db.query(SellerListing).filter(SellerListing.seller_id == s.id).count()
        results.append(
            SellerResponse(
                id=s.id,
                name=s.name,
                slug=s.slug,
                legal_name=s.legal_name,
                seller_type=s.seller_type,
                is_verified_indian=s.is_verified_indian,
                is_authorised_distributor=s.is_authorised_distributor,
                is_manufacturer=s.is_manufacturer,
                website=s.website,
                location_city=s.location_city,
                location_state=s.location_state,
                country=s.country,
                gstin=s.gstin,
                description=s.description,
                verification_notes=s.verification_notes,
                logo_url=s.logo_url,
                created_at=s.created_at,
                contacts=[
                    SellerContactSchema(
                        id=c.id,
                        seller_id=c.seller_id,
                        contact_type=c.contact_type,
                        label=c.label,
                        value=c.value,
                        is_verified=c.is_verified,
                        is_public=c.is_public,
                        notes=c.notes
                    )
                    for c in s.contacts
                ],
                listings_count=listings_count,
                is_saved=(s.id in saved_ids)
            )
        )
    return results


@router.get("/sources/status", response_model=List[DataSourceStatusResponse])
def get_sources_status(db: Session = Depends(get_db)):
    """
    Returns active, configured, and unconfigured state of all supplier search providers.
    """
    return get_all_provider_statuses(db)


@router.get("/saved")
def list_saved_sellers(db: Session = Depends(get_db)):
    """
    Returns bookmarked/saved suppliers.
    """
    saved = db.query(SavedSeller).all()
    res = []
    for entry in saved:
        s = entry.seller
        if s:
            res.append({
                "saved_id": entry.id,
                "seller_id": s.id,
                "name": s.name,
                "seller_type": s.seller_type,
                "city": s.location_city,
                "state": s.location_state,
                "website": s.website,
                "saved_at": entry.saved_at,
                "notes": entry.notes
            })
    return res


@router.post("/{seller_id}/save")
def save_seller(
    seller_id: str,
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Bookmarks a seller for future procurement and BOM workflows.
    """
    seller = db.query(Seller).filter(Seller.id == seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
        
    org = db.query(Organisation).first()
    org_id = org.id if org else generate_uuid()

    existing = db.query(SavedSeller).filter_by(org_id=org_id, seller_id=seller_id).first()
    if existing:
        return {"message": "Seller is already bookmarked", "saved_id": existing.id}

    saved = SavedSeller(
        id=generate_uuid(),
        org_id=org_id,
        seller_id=seller_id,
        notes=notes or "Saved from Indian Seller Discovery",
    )
    db.add(saved)
    db.commit()
    return {"message": f"Saved {seller.name} to organisation bookmarks", "saved_id": saved.id}


@router.delete("/saved/{seller_id}")
def remove_saved_seller(seller_id: str, db: Session = Depends(get_db)):
    saved = db.query(SavedSeller).filter(
        (SavedSeller.seller_id == seller_id) | (SavedSeller.id == seller_id)
    ).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Saved bookmark not found")
    db.delete(saved)
    db.commit()
    return {"message": "Seller bookmark removed successfully"}


@router.get("/search/{part_number}", response_model=ComponentSellerDiscoveryResponse)
def search_sellers_for_part(
    part_number: str,
    bom_id: Optional[str] = Query(None),
    quantity: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Discovers Indian sellers for an exact component part number,
    and identifies domestic-manufactured alternatives separately.
    """
    if not part_number or not part_number.strip():
        raise HTTPException(status_code=400, detail="Part number must be provided")

    result = discover_sellers_for_part(
        db=db,
        part_number=part_number.strip(),
        bom_id=bom_id,
        quantity_required=quantity
    )
    return result


@router.get("/{seller_id}", response_model=SellerResponse)
def get_seller(seller_id: str, db: Session = Depends(get_db)):
    seller = db.query(Seller).filter(Seller.id == seller_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Seller not found")
        
    listings_count = db.query(SellerListing).filter(SellerListing.seller_id == seller.id).count()
    is_saved = db.query(SavedSeller).filter_by(seller_id=seller.id).first() is not None

    return SellerResponse(
        id=seller.id,
        name=seller.name,
        slug=seller.slug,
        legal_name=seller.legal_name,
        seller_type=seller.seller_type,
        is_verified_indian=seller.is_verified_indian,
        is_authorised_distributor=seller.is_authorised_distributor,
        is_manufacturer=seller.is_manufacturer,
        website=seller.website,
        location_city=seller.location_city,
        location_state=seller.location_state,
        country=seller.country,
        gstin=seller.gstin,
        description=seller.description,
        verification_notes=seller.verification_notes,
        logo_url=seller.logo_url,
        created_at=seller.created_at,
        contacts=[
            SellerContactSchema(
                id=c.id,
                seller_id=c.seller_id,
                contact_type=c.contact_type,
                label=c.label,
                value=c.value,
                is_verified=c.is_verified,
                is_public=c.is_public,
                notes=c.notes
            )
            for c in seller.contacts
        ],
        listings_count=listings_count,
        is_saved=is_saved
    )
