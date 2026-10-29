import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  Building2,
  Mail,
  Bookmark,
  BookmarkCheck,
  Layers,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Clock,
  Check,
  Cpu
} from 'lucide-react';
import { api } from '../../api/client';
import { ComponentSellerDiscoveryResponse, SellerListing, SellerContact, RFQ } from '../../types';
import { SellerClassificationBadge, AvailabilityBadge, SourcingStatusBadge } from '../common/Badges';
import { RfqModal } from './RfqModal';
import { ContactSellerModal } from './ContactSellerModal';
import { CompareSellersModal } from './CompareSellersModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partNumber: string;
  manufacturer?: string;
  quantityRequired?: number;
  bomId?: string;
  onNavigateToAlternatives?: (partNumber: string) => void;
}

export const ComponentSourcingDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  partNumber,
  manufacturer,
  quantityRequired,
  bomId,
  onNavigateToAlternatives
}) => {
  const [data, setData] = useState<ComponentSellerDiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [rfqTargetListing, setRfqTargetListing] = useState<SellerListing | null>(null);
  const [contactTargetListing, setContactTargetListing] = useState<SellerListing | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [savedSellerIds, setSavedSellerIds] = useState<Set<string>>(new Set());
  const [savingSellerId, setSavingSellerId] = useState<string | null>(null);

  const loadDiscovery = async () => {
    if (!partNumber) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.searchPartSellers(partNumber, bomId, quantityRequired);
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to search Indian supplier sources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && partNumber) {
      loadDiscovery();
    }
  }, [isOpen, partNumber, bomId]);

  if (!isOpen) return null;

  const handleSaveSeller = async (sellerId: string, sellerName: string) => {
    try {
      setSavingSellerId(sellerId);
      await api.saveSeller(sellerId);
      setSavedSellerIds((prev) => new Set(prev).add(sellerId));
    } catch (err: any) {
      alert(`Could not save seller: ${err.message}`);
    } finally {
      setSavingSellerId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#18232D]/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl border-l border-[#DDE2E4] flex flex-col overflow-hidden text-[#18232D] font-sans">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[#DDE2E4] bg-[#18232D] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono tracking-wider uppercase text-[#087E8B] bg-[#087E8B]/15 px-2 py-0.5 rounded-[2px] border border-[#087E8B]/30 font-bold">
                Indian Sourcing Intelligence
              </span>
              {data && (
                <span className="text-[11px] font-mono text-[#A2B0BC]">
                  {data.exact_sellers_count} exact / {data.alternatives_count} domestic alt(s)
                </span>
              )}
            </div>
            <div className="text-base font-mono font-bold tracking-tight text-white mt-1">
              {partNumber}
            </div>
            <div className="text-xs text-[#A2B0BC]">
              {manufacturer || data?.manufacturer} • {data?.category || 'Electronic Component'}
              {quantityRequired ? ` • BOM Qty: ${quantityRequired.toLocaleString()} units` : ''}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadDiscovery}
              disabled={loading}
              className="text-[#A2B0BC] hover:text-white p-1.5 transition-colors"
              title="Refresh supplier search"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="text-[#A2B0BC] hover:text-white p-1.5 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {loading && (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-6 h-6 text-[#087E8B] animate-spin mx-auto" />
              <div className="text-xs font-mono text-[#65717C]">
                Searching configured Indian manufacturer and distributor registers...
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-[#FCF1F0] border border-[#F3C7C4] text-[#A82218] rounded-[3px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Source Query Error</div>
                <div>{errorMsg}</div>
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              {/* Overall Sourcing Status Banner */}
              <div className="p-3.5 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] uppercase font-mono text-[#65717C] font-bold">
                    Sourcing Availability Status
                  </span>
                  <SourcingStatusBadge status={data.sourcing_status} />
                </div>
                <div className="text-xs text-[#455360] leading-relaxed">
                  {data.sourcing_status_label}
                </div>
                {data.exact_matches.length > 1 && (
                  <div className="pt-2 border-t border-[#ECEFEF] flex justify-end">
                    <button
                      onClick={() => setIsCompareOpen(true)}
                      className="px-2.5 py-1 text-xs font-mono font-semibold text-[#087E8B] bg-[#F0F6F7] hover:bg-[#E2F0F2] border border-[#D0E7EA] rounded-[2px] flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Compare All {data.exact_matches.length} Suppliers Side-by-Side</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Data Sources Status Pill Banner */}
              <div className="p-2.5 bg-white border border-[#DDE2E4] rounded-[3px] space-y-1.5">
                <div className="text-[10.5px] font-mono text-[#65717C] uppercase font-bold flex items-center justify-between">
                  <span>Data Providers Queried</span>
                  <span className="text-[10px] text-[#8E9BA7] font-normal">
                    {new Date(data.search_timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.data_sources_queried.map((ds) => (
                    <span
                      key={ds.code}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-mono border ${
                        ds.api_status === 'CONFIGURED'
                          ? 'bg-[#ECF7F2] text-[#0E6641] border-[#BCE3D1]'
                          : 'bg-[#F8F9F8] text-[#8E9BA7] border-[#DDE2E4]'
                      }`}
                      title={ds.notes || ds.name}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${ds.api_status === 'CONFIGURED' ? 'bg-[#0E6641]' : 'bg-[#8E9BA7]'}`} />
                      <span>{ds.name}</span>
                      {ds.api_status === 'NOT_CONFIGURED' && <span className="text-[9px] text-[#A82218]">(unconfigured)</span>}
                    </span>
                  ))}
                </div>
              </div>

              {/* SECTION 1: Exact Match Indian Seller Listings */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#18232D]">
                    Exact Match Indian Listings ({data.exact_matches.length})
                  </div>
                  <span className="text-[10px] font-mono text-[#65717C]">
                    Exact part variant matches only
                  </span>
                </div>

                {data.exact_matches.length === 0 ? (
                  <div className="p-4 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] text-center space-y-2">
                    <div className="text-[#65717C] font-mono text-xs">
                      No verified Indian seller listing found in the configured sources for MPN: <strong>{partNumber}</strong>.
                    </div>
                    {data.potential_indian_alternatives.length > 0 && (
                      <div className="text-[11.5px] text-[#087E8B]">
                        Consider evaluating the domestic-manufactured alternatives listed below.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.exact_matches.map((listing, idx) => (
                      <div
                        key={listing.id || idx}
                        className="p-4 border border-[#DDE2E4] rounded-[3px] bg-white hover:border-[#087E8B] transition-colors space-y-3 shadow-2xs"
                      >
                        {/* Seller Headline */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[13px] text-[#18232D]">
                                {listing.seller_name}
                              </span>
                              <SellerClassificationBadge classification={listing.seller_classification} compact />
                            </div>
                            <div className="text-[11px] text-[#65717C] mt-0.5 flex items-center gap-2">
                              <span>
                                {listing.location_city ? `${listing.location_city}, ${listing.location_state || 'India'}` : 'India'}
                              </span>
                              {listing.seller_sku && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[#8E9BA7]">SKU: {listing.seller_sku}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono font-bold text-sm text-[#18232D]">
                              {listing.price !== null && listing.price !== undefined ? (
                                `${listing.currency === 'INR' ? '₹' : '$'}${listing.price.toFixed(2)}`
                              ) : (
                                <span className="text-[#8E9BA7] text-xs font-normal">Quote on Request</span>
                              )}
                            </div>
                            <div className="mt-1">
                              <AvailabilityBadge
                                status={listing.availability_status}
                                quantity={listing.stock_quantity}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Order & Lead Time Attributes */}
                        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-[#F8F9F8] border border-[#ECEFEF] rounded-[2px] font-mono text-[11px]">
                          <div>
                            <span className="text-[#8E9BA7] block text-[9.5px] uppercase">MOQ</span>
                            <span className="font-semibold text-[#18232D]">
                              {listing.moq ? `${listing.moq.toLocaleString()} pcs` : '1 pc'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#8E9BA7] block text-[9.5px] uppercase">Lead Time</span>
                            <span className="font-semibold text-[#18232D]">
                              {listing.lead_time_days ? `${listing.lead_time_days} days` : 'Standard'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#8E9BA7] block text-[9.5px] uppercase">Datasheet</span>
                            {listing.datasheet_url ? (
                              <a
                                href={listing.datasheet_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#087E8B] hover:underline inline-flex items-center gap-0.5 font-semibold"
                              >
                                <span>PDF</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-[#8E9BA7]">None</span>
                            )}
                          </div>
                        </div>

                        {/* Provenance and Verification Source */}
                        <div className="flex items-center justify-between text-[10px] font-mono text-[#8E9BA7]">
                          <span>Source: {listing.source_name}</span>
                          {listing.last_checked_at && (
                            <span>Checked: {new Date(listing.last_checked_at).toLocaleDateString()}</span>
                          )}
                        </div>

                        {/* Real Action Buttons */}
                        <div className="pt-2 border-t border-[#ECEFEF] flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {listing.product_url && (
                              <a
                                href={listing.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 text-xs font-mono font-medium text-[#18232D] bg-[#F8F9F8] hover:bg-[#ECEFEF] border border-[#DDE2E4] rounded-[2px] inline-flex items-center gap-1"
                              >
                                <span>View Product</span>
                                <ExternalLink className="w-3 h-3 text-[#65717C]" />
                              </a>
                            )}
                            <button
                              onClick={() => setContactTargetListing(listing)}
                              className="px-2.5 py-1 text-xs font-mono font-medium text-[#18232D] bg-white hover:bg-[#F8F9F8] border border-[#DDE2E4] rounded-[2px]"
                            >
                              Contact Seller
                            </button>
                            <button
                              onClick={() => handleSaveSeller(listing.seller_id, listing.seller_name || 'Seller')}
                              disabled={savedSellerIds.has(listing.seller_id) || savingSellerId === listing.seller_id}
                              className="px-2 py-1 text-xs font-mono text-[#65717C] hover:text-[#18232D] border border-[#DDE2E4] rounded-[2px]"
                              title="Bookmark seller"
                            >
                              {savedSellerIds.has(listing.seller_id) ? (
                                <span className="inline-flex items-center gap-1 text-[#0E6641]">
                                  <BookmarkCheck className="w-3 h-3" />
                                  <span>Saved</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1">
                                  <Bookmark className="w-3 h-3" />
                                  <span>Save</span>
                                </span>
                              )}
                            </button>
                          </div>

                          <button
                            onClick={() => setRfqTargetListing(listing)}
                            className="px-3.5 py-1 text-xs font-mono font-semibold text-white bg-[#087E8B] hover:bg-[#066570] rounded-[2px] flex items-center gap-1"
                          >
                            <span>Request Quotation</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: Domestic-Manufactured Alternatives (Separately tracked) */}
              <div className="space-y-3 pt-3 border-t border-[#ECEFEF]">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#0E6641] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#0E6641]" />
                    <span>Indian-Manufactured Functional Alternatives ({data.potential_indian_alternatives.length})</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#65717C]">
                    Fabricated / Designed in India
                  </span>
                </div>

                {data.potential_indian_alternatives.length === 0 ? (
                  <div className="p-3 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] text-[#65717C] text-[11px]">
                    No verified Indian semiconductor replacement currently in catalogue meeting hard pinout and electrical constraints.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.potential_indian_alternatives.map((alt, idx) => (
                      <div
                        key={alt.candidate_id || idx}
                        className="p-3.5 border border-[#BCE3D1] bg-[#ECF7F2]/40 rounded-[3px] flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#0E6641]">
                              {alt.part_number}
                            </span>
                            <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded-[2px] border border-[#BCE3D1] text-[#0E6641] font-semibold">
                              Score: {alt.heuristic_score.toFixed(0)}/100
                            </span>
                          </div>
                          <div className="text-[11px] text-[#455360]">
                            {alt.manufacturer} • {alt.origin_label}
                          </div>
                          <div className="text-[10.5px] text-[#65717C] font-mono">
                            Available via: <strong>{alt.sample_seller || 'Direct Fab'}</strong> ({alt.sellers_count} seller listings)
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onNavigateToAlternatives && alt.candidate_id && (
                            <button
                              onClick={() => {
                                onClose();
                                onNavigateToAlternatives(alt.candidate_id!);
                              }}
                              className="px-2.5 py-1 text-xs font-mono font-semibold text-[#087E8B] bg-white border border-[#D0E7EA] rounded-[2px] hover:bg-[#F0F6F7]"
                            >
                              Tech Fit
                            </button>
                          )}
                          <button
                            onClick={() => {
                              // Trigger RFQ modal for this alternative
                              setRfqTargetListing({
                                id: '',
                                seller_id: '',
                                seller_name: alt.sample_seller || 'Indian Semiconductor Fab',
                                part_number: alt.part_number,
                                normalized_part_number: alt.part_number,
                                manufacturer: alt.manufacturer,
                                match_type: 'POTENTIAL_ALTERNATIVE',
                                exact_match: false,
                                seller_classification: 'VERIFIED_INDIAN_MANUFACTURER',
                                availability_status: 'IN_STOCK',
                                currency: 'INR',
                                source_name: 'Verified Indian Catalogue',
                                verification_status: 'VERIFIED'
                              });
                            }}
                            className="px-2.5 py-1 text-xs font-mono font-semibold text-white bg-[#0E6641] hover:bg-[#0A4D31] rounded-[2px]"
                          >
                            Quote Alt
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modals */}
        {rfqTargetListing && (
          <RfqModal
            isOpen={Boolean(rfqTargetListing)}
            onClose={() => setRfqTargetListing(null)}
            partNumber={rfqTargetListing.part_number}
            manufacturer={rfqTargetListing.manufacturer}
            defaultQuantity={quantityRequired || 100}
            sellerId={rfqTargetListing.seller_id}
            sellerName={rfqTargetListing.seller_name || 'Component Supplier'}
            bomId={bomId}
          />
        )}

        {contactTargetListing && (
          <ContactSellerModal
            isOpen={Boolean(contactTargetListing)}
            onClose={() => setContactTargetListing(null)}
            sellerName={contactTargetListing.seller_name || 'Component Supplier'}
            sellerLocation={contactTargetListing.location_city ? `${contactTargetListing.location_city}, ${contactTargetListing.location_state || 'India'}` : 'India'}
            isVerifiedIndian={contactTargetListing.seller_classification !== 'FOREIGN_MFR_INDIAN_SELLER'}
            website={contactTargetListing.product_url}
            contacts={contactTargetListing.contacts || []}
            partNumber={contactTargetListing.part_number}
          />
        )}

        {data && (
          <CompareSellersModal
            isOpen={isCompareOpen}
            onClose={() => setIsCompareOpen(false)}
            partNumber={partNumber}
            listings={data.exact_matches}
            onOpenRfq={(listing) => {
              setIsCompareOpen(false);
              setRfqTargetListing(listing);
            }}
            onOpenContact={(listing) => {
              setIsCompareOpen(false);
              setContactTargetListing(listing);
            }}
          />
        )}
      </div>
    </div>
  );
};
