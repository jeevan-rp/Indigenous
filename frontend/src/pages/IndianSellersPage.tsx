import React, { useState, useEffect } from 'react';
import {
  Search,
  Building2,
  ShieldCheck,
  FileText,
  Mail,
  Phone,
  ExternalLink,
  MapPin,
  Bookmark,
  BookmarkCheck,
  Layers,
  Filter,
  Check,
  AlertTriangle,
  Clock,
  RefreshCw,
  Copy,
  ChevronRight,
  Plus,
  X
} from 'lucide-react';
import { api } from '../api/client';
import {
  Seller,
  SellerListing,
  ComponentSellerDiscoveryResponse,
  RFQ,
  DataSourceStatus
} from '../types';
import {
  SellerClassificationBadge,
  AvailabilityBadge,
  SourcingStatusBadge
} from '../components/common/Badges';
import { RfqModal } from '../components/sellers/RfqModal';
import { ContactSellerModal } from '../components/sellers/ContactSellerModal';
import { CompareSellersModal } from '../components/sellers/CompareSellersModal';

interface Props {
  initialPartNumber?: string;
  initialBomId?: string;
  onNavigateToAlternatives?: (compId: string) => void;
  onNavigateToBoms?: (bomId?: string) => void;
}

export const IndianSellersPage: React.FC<Props> = ({
  initialPartNumber,
  initialBomId,
  onNavigateToAlternatives,
  onNavigateToBoms
}) => {
  // Navigation tabs: 'discovery' | 'directory' | 'rfqs'
  const [activeTab, setActiveTab] = useState<'discovery' | 'directory' | 'rfqs'>(
    initialPartNumber ? 'discovery' : 'discovery'
  );

  // Discovery State
  const [searchPart, setSearchPart] = useState(initialPartNumber || 'STM32F401RET6');
  const [discoveryData, setDiscoveryData] = useState<ComponentSellerDiscoveryResponse | null>(null);
  const [searching, setSearching] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  // Directory State
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryFilter, setDirectoryFilter] = useState<'ALL' | 'MANUFACTURERS' | 'AUTH_DISTRIBUTORS' | 'DISTRIBUTORS' | 'SAVED'>('ALL');
  const [directorySearch, setDirectorySearch] = useState('');

  // RFQ Tracking State
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [rfqsLoading, setRfqsLoading] = useState(false);
  const [rfqStatusFilter, setRfqStatusFilter] = useState<string>('ALL');
  const [updatingRfqId, setUpdatingRfqId] = useState<string | null>(null);
  const [newStatusValue, setNewStatusValue] = useState<string>('SENT_BY_USER');
  const [statusUpdateNotes, setStatusUpdateNotes] = useState<string>('');

  // Modals state
  const [rfqTargetListing, setRfqTargetListing] = useState<SellerListing | null>(null);
  const [contactTargetListing, setContactTargetListing] = useState<SellerListing | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [savedSellerIds, setSavedSellerIds] = useState<Set<string>>(new Set());
  const [selectedRfqDetail, setSelectedRfqDetail] = useState<RFQ | null>(null);

  // Common pre-filled sample searches
  const sampleParts = ['STM32F401RET6', 'SHAKTI-E-CLASS', 'LM1117IMP-3.3', 'SCL-1117-3.3', 'ESP32-WROOM-32E', 'CUSTOM-FPGA-99'];

  const executeDiscovery = async (pn: string) => {
    if (!pn.trim()) return;
    try {
      setSearching(true);
      setDiscoveryError(null);
      const res = await api.searchPartSellers(pn.trim(), initialBomId);
      setDiscoveryData(res);
    } catch (err: any) {
      setDiscoveryError(err.message || 'Failed to search Indian sellers for this part.');
    } finally {
      setSearching(false);
    }
  };

  const loadDirectory = async () => {
    try {
      setDirectoryLoading(true);
      const res = await api.listSellers();
      setSellers(res);
      const saved = new Set(res.filter(s => s.is_saved).map(s => s.id));
      setSavedSellerIds(saved);
    } catch (err: any) {
      console.warn('Could not load sellers directory:', err);
    } finally {
      setDirectoryLoading(false);
    }
  };

  const loadRfqs = async () => {
    try {
      setRfqsLoading(true);
      const res = await api.listRfqs();
      setRfqs(res);
    } catch (err: any) {
      console.warn('Could not load RFQs:', err);
    } finally {
      setRfqsLoading(false);
    }
  };

  useEffect(() => {
    if (initialPartNumber) {
      setSearchPart(initialPartNumber);
      executeDiscovery(initialPartNumber);
    } else {
      executeDiscovery(searchPart);
    }
    loadDirectory();
    loadRfqs();
  }, [initialPartNumber]);

  const handleToggleSaveSeller = async (sellerId: string, currentSaved: boolean) => {
    try {
      if (currentSaved) {
        await api.removeSavedSeller(sellerId);
        setSavedSellerIds(prev => {
          const next = new Set(prev);
          next.delete(sellerId);
          return next;
        });
      } else {
        await api.saveSeller(sellerId);
        setSavedSellerIds(prev => new Set(prev).add(sellerId));
      }
      loadDirectory();
    } catch (err: any) {
      alert(`Could not update saved status: ${err.message}`);
    }
  };

  const handleUpdateRfqStatus = async (rfqId: string) => {
    try {
      await api.updateRfqStatus(rfqId, {
        status: newStatusValue,
        notes: statusUpdateNotes || undefined,
        changed_by: 'Lead Systems Engineer'
      });
      setUpdatingRfqId(null);
      setStatusUpdateNotes('');
      loadRfqs();
    } catch (err: any) {
      alert(`Failed to update RFQ status: ${err.message}`);
    }
  };

  // Directory filter logic
  const filteredSellers = sellers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(directorySearch.toLowerCase()) ||
      (s.location_city && s.location_city.toLowerCase().includes(directorySearch.toLowerCase())) ||
      (s.location_state && s.location_state.toLowerCase().includes(directorySearch.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (directoryFilter === 'MANUFACTURERS') return s.seller_type === 'INDIAN_MANUFACTURER' || s.is_manufacturer;
    if (directoryFilter === 'AUTH_DISTRIBUTORS') return s.seller_type === 'INDIAN_AUTHORISED_DISTRIBUTOR' || s.is_authorised_distributor;
    if (directoryFilter === 'DISTRIBUTORS') return s.seller_type === 'INDIAN_DISTRIBUTOR';
    if (directoryFilter === 'SAVED') return savedSellerIds.has(s.id);
    return true;
  });

  // RFQ filter logic
  const filteredRfqs = rfqs.filter(r => {
    if (rfqStatusFilter === 'ALL') return true;
    return r.status === rfqStatusFilter;
  });

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="bg-white border border-[#DDE2E4] rounded-[4px] p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono tracking-wider uppercase text-[#087E8B] bg-[#087E8B]/10 px-2 py-0.5 rounded-[2px] font-bold border border-[#087E8B]/20">
                Supply Chain & Procurement Desk
              </span>
              <span className="text-[10.5px] font-mono text-[#65717C]">
                Verified Indian Registers
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#18232D] mt-1 font-mono">
              Indian Sellers & Supplier Discovery
            </h1>
            <p className="text-xs text-[#65717C] mt-0.5">
              Discover verified Indian semiconductor manufacturers, authorized distributors, and direct component listings with formal RFQ generation.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2.5 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] text-center min-w-[90px]">
              <div className="text-[10px] font-mono uppercase text-[#65717C]">Active Sellers</div>
              <div className="text-base font-bold font-mono text-[#18232D]">{sellers.length}</div>
            </div>
            <div className="p-2.5 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] text-center min-w-[90px]">
              <div className="text-[10px] font-mono uppercase text-[#65717C]">Tracked RFQs</div>
              <div className="text-base font-bold font-mono text-[#087E8B]">{rfqs.length}</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-[#ECEFEF] mt-5 pt-1">
          <button
            onClick={() => setActiveTab('discovery')}
            className={`px-4 py-2 font-mono text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'discovery'
                ? 'border-[#087E8B] text-[#087E8B] bg-[#F0F6F7]/50'
                : 'border-transparent text-[#65717C] hover:text-[#18232D]'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Component Sourcing & Discovery</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('directory');
              loadDirectory();
            }}
            className={`px-4 py-2 font-mono text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'directory'
                ? 'border-[#087E8B] text-[#087E8B] bg-[#F0F6F7]/50'
                : 'border-transparent text-[#65717C] hover:text-[#18232D]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Indian Suppliers Directory ({sellers.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('rfqs');
              loadRfqs();
            }}
            className={`px-4 py-2 font-mono text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'rfqs'
                ? 'border-[#087E8B] text-[#087E8B] bg-[#F0F6F7]/50'
                : 'border-transparent text-[#65717C] hover:text-[#18232D]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>RFQ Tracking Desk ({rfqs.length})</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: COMPONENT SOURCING & DISCOVERY                                */}
      {/* ===================================================================== */}
      {activeTab === 'discovery' && (
        <div className="space-y-4">
          {/* Part Number Search Box */}
          <div className="bg-white border border-[#DDE2E4] rounded-[4px] p-4 shadow-2xs space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeDiscovery(searchPart);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#8E9BA7] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchPart}
                  onChange={(e) => setSearchPart(e.target.value)}
                  placeholder="Enter exact manufacturer part number (e.g. STM32F401RET6, SHAKTI-E-CLASS, LM1117IMP-3.3)..."
                  className="w-full text-xs font-mono font-medium pl-9 pr-3 py-2 border border-[#DDE2E4] rounded-[3px] text-[#18232D] outline-none focus:border-[#087E8B] bg-white"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-5 py-2 bg-[#087E8B] hover:bg-[#066570] text-white font-mono font-semibold text-xs rounded-[3px] flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                {searching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>Discover Sellers</span>
              </button>
            </form>

            {/* Quick sample chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="text-[#65717C]">Quick Test MPNs:</span>
              {sampleParts.map((pn) => (
                <button
                  key={pn}
                  onClick={() => {
                    setSearchPart(pn);
                    executeDiscovery(pn);
                  }}
                  className={`px-2 py-0.5 rounded-[2px] border transition-colors ${
                    searchPart.toUpperCase() === pn
                      ? 'bg-[#18232D] text-white border-[#18232D]'
                      : 'bg-[#F8F9F8] text-[#18232D] border-[#DDE2E4] hover:bg-white'
                  }`}
                >
                  {pn}
                </button>
              ))}
            </div>
          </div>

          {/* Error Banner */}
          {discoveryError && (
            <div className="p-4 bg-[#FCF1F0] border border-[#F3C7C4] text-[#A82218] rounded-[3px] text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Discovery Query Failed</div>
                <div>{discoveryError}</div>
              </div>
            </div>
          )}

          {/* Results View */}
          {discoveryData && (
            <div className="space-y-4">
              {/* Header Overview Card */}
              <div className="bg-white border border-[#DDE2E4] rounded-[4px] p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base text-[#18232D]">
                      {discoveryData.part_number}
                    </span>
                    <SourcingStatusBadge status={discoveryData.sourcing_status} />
                  </div>
                  <div className="text-xs text-[#65717C] mt-0.5">
                    Manufacturer: <strong>{discoveryData.manufacturer}</strong> • Category: {discoveryData.category}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {discoveryData.exact_matches.length > 1 && (
                    <button
                      onClick={() => setIsCompareOpen(true)}
                      className="px-3 py-1.5 bg-[#F0F6F7] hover:bg-[#E2F0F2] text-[#087E8B] border border-[#D0E7EA] rounded-[3px] font-mono font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Compare Sellers ({discoveryData.exact_matches.length})</span>
                    </button>
                  )}
                  {onNavigateToBoms && initialBomId && (
                    <button
                      onClick={() => onNavigateToBoms(initialBomId)}
                      className="px-3 py-1.5 bg-white hover:bg-[#F8F9F8] text-[#65717C] border border-[#DDE2E4] rounded-[3px] font-mono text-xs"
                    >
                      Return to BOM
                    </button>
                  )}
                </div>
              </div>

              {/* Data Sources Queried Pill Ribbon */}
              <div className="bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10.5px] text-[#65717C] uppercase font-bold">
                  <span>Provider Search & Adapter Status</span>
                  <span>{new Date(discoveryData.search_timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {discoveryData.data_sources_queried.map((ds) => (
                    <div
                      key={ds.code}
                      className={`px-2.5 py-1 rounded-[2px] font-mono text-[10.5px] border flex items-center gap-1.5 ${
                        ds.api_status === 'CONFIGURED'
                          ? 'bg-white border-[#BCE3D1] text-[#0E6641]'
                          : 'bg-white border-[#DDE2E4] text-[#8E9BA7]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${ds.api_status === 'CONFIGURED' ? 'bg-[#0E6641]' : 'bg-[#8E9BA7]'}`} />
                      <span className="font-semibold">{ds.name}</span>
                      <span className="text-[9.5px]">
                        ({ds.api_status === 'CONFIGURED' ? 'Active' : 'Not configured — local fallback'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: Exact Indian Seller Listings */}
              <div className="bg-white border border-[#DDE2E4] rounded-[4px] p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#ECEFEF] pb-3">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#18232D]">
                      Exact Component Indian Seller Listings ({discoveryData.exact_matches.length})
                    </h3>
                    <p className="text-[11px] text-[#65717C]">
                      Sellers offering the verified exact manufacturer part number without pinout or voltage variation.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#087E8B] font-bold">
                    {discoveryData.exact_sellers_count} verified
                  </span>
                </div>

                {discoveryData.exact_matches.length === 0 ? (
                  <div className="p-6 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] text-center space-y-2">
                    <div className="font-mono text-xs text-[#18232D] font-bold">
                      No verified Indian seller listing found in configured sources.
                    </div>
                    <div className="text-xs text-[#65717C] max-w-md mx-auto">
                      Neither the curated register nor connected distributors currently list verified inventory for MPN <strong>{discoveryData.part_number}</strong>.
                    </div>
                    {discoveryData.potential_indian_alternatives.length > 0 && (
                      <div className="pt-2 text-xs font-mono text-[#087E8B]">
                        {discoveryData.potential_indian_alternatives.length} domestic alternative(s) available below.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {discoveryData.exact_matches.map((listing, idx) => (
                      <div
                        key={listing.id || idx}
                        className="p-4 border border-[#DDE2E4] rounded-[3px] bg-white hover:border-[#087E8B] transition-colors space-y-3 flex flex-col justify-between"
                      >
                        <div>
                          {/* Supplier title */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-bold text-sm text-[#18232D]">
                                {listing.seller_name}
                              </div>
                              <div className="text-[11px] text-[#65717C] flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                <span>{listing.location_city ? `${listing.location_city}, ${listing.location_state || 'India'}` : 'India'}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-sm text-[#18232D]">
                                {listing.price !== null && listing.price !== undefined ? (
                                  `${listing.currency === 'INR' ? '₹' : '$'}${listing.price.toFixed(2)}`
                                ) : (
                                  <span className="text-xs text-[#8E9BA7] font-normal">Quote on Request</span>
                                )}
                              </div>
                              <div className="mt-0.5">
                                <AvailabilityBadge status={listing.availability_status} quantity={listing.stock_quantity} />
                              </div>
                            </div>
                          </div>

                          {/* Classification badge */}
                          <div className="mt-2">
                            <SellerClassificationBadge classification={listing.seller_classification} />
                          </div>

                          {/* Attributes table */}
                          <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-[#F8F9F8] border border-[#ECEFEF] rounded-[2px] font-mono text-[10.5px] mt-3">
                            <div>
                              <span className="text-[#8E9BA7] block text-[9px] uppercase">MOQ</span>
                              <span className="font-semibold text-[#18232D]">{listing.moq ? `${listing.moq} pcs` : '1 pc'}</span>
                            </div>
                            <div>
                              <span className="text-[#8E9BA7] block text-[9px] uppercase">Lead Time</span>
                              <span className="font-semibold text-[#18232D]">{listing.lead_time_days ? `${listing.lead_time_days}d` : 'Stock'}</span>
                            </div>
                            <div>
                              <span className="text-[#8E9BA7] block text-[9px] uppercase">Datasheet</span>
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
                                <span className="text-[#8E9BA7]">—</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-3 border-t border-[#ECEFEF] flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1">
                            {listing.product_url && (
                              <a
                                href={listing.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 text-xs font-mono font-medium text-[#18232D] bg-[#F8F9F8] hover:bg-[#ECEFEF] border border-[#DDE2E4] rounded-[2px] inline-flex items-center gap-1"
                              >
                                <span>Product</span>
                                <ExternalLink className="w-2.5 h-2.5 text-[#65717C]" />
                              </a>
                            )}
                            <button
                              onClick={() => setContactTargetListing(listing)}
                              className="px-2 py-1 text-xs font-mono font-medium text-[#18232D] bg-white hover:bg-[#F8F9F8] border border-[#DDE2E4] rounded-[2px]"
                            >
                              Contact
                            </button>
                            <button
                              onClick={() => handleToggleSaveSeller(listing.seller_id, savedSellerIds.has(listing.seller_id))}
                              className="p-1 border border-[#DDE2E4] rounded-[2px] text-[#65717C] hover:text-[#18232D]"
                              title="Bookmark seller"
                            >
                              {savedSellerIds.has(listing.seller_id) ? (
                                <BookmarkCheck className="w-3.5 h-3.5 text-[#0E6641]" />
                              ) : (
                                <Bookmark className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <button
                            onClick={() => setRfqTargetListing(listing)}
                            className="px-3 py-1 text-xs font-mono font-semibold text-white bg-[#087E8B] hover:bg-[#066570] rounded-[2px] flex items-center gap-1"
                          >
                            <span>Request Quotation</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: Indian-Manufactured Alternatives (Separately distinguished) */}
              <div className="bg-white border border-[#DDE2E4] rounded-[4px] p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#ECEFEF] pb-3">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0E6641] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#0E6641]" />
                      <span>Potential Indian-Manufactured Functional Alternatives ({discoveryData.potential_indian_alternatives.length})</span>
                    </h3>
                    <p className="text-[11px] text-[#65717C]">
                      Indigenous semiconductors designed or fabricated in India that serve as compatible replacements.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-[#0E6641] font-bold">
                    Domestic Silicon
                  </span>
                </div>

                {discoveryData.potential_indian_alternatives.length === 0 ? (
                  <div className="p-4 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] text-center text-xs text-[#65717C] font-mono">
                    No verified Indian-manufactured alternative found in current semiconductor catalogue for this part.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {discoveryData.potential_indian_alternatives.map((alt, idx) => (
                      <div
                        key={alt.candidate_id || idx}
                        className="p-3.5 border border-[#BCE3D1] bg-[#ECF7F2]/40 rounded-[3px] space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-sm text-[#0E6641]">
                              {alt.part_number}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-white px-1.5 py-0.5 rounded-[2px] border border-[#BCE3D1] text-[#0E6641]">
                              Fit Score: {alt.heuristic_score.toFixed(0)}/100
                            </span>
                          </div>
                          <div className="text-xs text-[#455360] font-medium">
                            {alt.manufacturer} • {alt.origin_label}
                          </div>
                          <div className="text-[10.5px] font-mono text-[#65717C]">
                            Sellers: <strong>{alt.sample_seller}</strong> ({alt.sellers_count} listing{alt.sellers_count === 1 ? '' : 's'})
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#BCE3D1]/50 flex items-center justify-between">
                          {alt.datasheet_url ? (
                            <a
                              href={alt.datasheet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10.5px] font-mono text-[#087E8B] hover:underline inline-flex items-center gap-1"
                            >
                              <span>Datasheet PDF</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : <span className="text-[10px] text-[#8E9BA7] font-mono">Datasheet Unavailable</span>}

                          <button
                            onClick={() => {
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
                            className="px-3 py-1 bg-[#0E6641] hover:bg-[#0A4D31] text-white rounded-[2px] font-mono font-semibold text-xs"
                          >
                            Request Quotation
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: INDIAN SUPPLIERS DIRECTORY                                    */}
      {/* ===================================================================== */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Filters and search */}
          <div className="bg-white border border-[#DDE2E4] rounded-[4px] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
              <button
                onClick={() => setDirectoryFilter('ALL')}
                className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                  directoryFilter === 'ALL'
                    ? 'bg-[#18232D] text-white font-bold'
                    : 'bg-[#F8F9F8] text-[#65717C] hover:bg-white border border-[#DDE2E4]'
                }`}
              >
                All Entities ({sellers.length})
              </button>
              <button
                onClick={() => setDirectoryFilter('MANUFACTURERS')}
                className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                  directoryFilter === 'MANUFACTURERS'
                    ? 'bg-[#0E6641] text-white font-bold'
                    : 'bg-[#F8F9F8] text-[#0E6641] hover:bg-white border border-[#BCE3D1]'
                }`}
              >
                Manufacturers
              </button>
              <button
                onClick={() => setDirectoryFilter('AUTH_DISTRIBUTORS')}
                className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                  directoryFilter === 'AUTH_DISTRIBUTORS'
                    ? 'bg-[#19527D] text-white font-bold'
                    : 'bg-[#F8F9F8] text-[#19527D] hover:bg-white border border-[#C8DDEC]'
                }`}
              >
                Authorised Distributors
              </button>
              <button
                onClick={() => setDirectoryFilter('DISTRIBUTORS')}
                className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                  directoryFilter === 'DISTRIBUTORS'
                    ? 'bg-[#087E8B] text-white font-bold'
                    : 'bg-[#F8F9F8] text-[#087E8B] hover:bg-white border border-[#B9E4EA]'
                }`}
              >
                Distributors
              </button>
              <button
                onClick={() => setDirectoryFilter('SAVED')}
                className={`px-2.5 py-1 rounded-[2px] transition-colors ${
                  directoryFilter === 'SAVED'
                    ? 'bg-[#8A5200] text-white font-bold'
                    : 'bg-[#F8F9F8] text-[#8A5200] hover:bg-white border border-[#F2DEAF]'
                }`}
              >
                Bookmarked ({savedSellerIds.size})
              </button>
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[#8E9BA7] absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                placeholder="Search supplier, city, state..."
                className="w-full text-xs font-mono pl-8 pr-2.5 py-1.5 border border-[#DDE2E4] rounded-[3px] outline-none focus:border-[#087E8B] bg-white"
              />
            </div>
          </div>

          {/* Directory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSellers.map((seller) => (
              <div
                key={seller.id}
                className="bg-white border border-[#DDE2E4] rounded-[4px] p-4 shadow-2xs hover:border-[#087E8B] transition-colors flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-[#18232D] leading-tight">
                      {seller.name}
                    </h3>
                    <button
                      onClick={() => handleToggleSaveSeller(seller.id, savedSellerIds.has(seller.id))}
                      className="text-[#65717C] hover:text-[#18232D] p-0.5"
                      title={savedSellerIds.has(seller.id) ? 'Remove bookmark' : 'Bookmark supplier'}
                    >
                      {savedSellerIds.has(seller.id) ? (
                        <BookmarkCheck className="w-4 h-4 text-[#0E6641]" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <SellerClassificationBadge classification={seller.seller_type} compact />
                    {seller.gstin && (
                      <span className="text-[9.5px] font-mono text-[#8E9BA7] border border-[#ECEFEF] px-1 py-0.2 rounded-[2px]">
                        GSTIN Verified
                      </span>
                    )}
                  </div>

                  {seller.description && (
                    <p className="text-xs text-[#65717C] line-clamp-2 leading-relaxed">
                      {seller.description}
                    </p>
                  )}

                  <div className="text-[11px] text-[#455360] flex items-center gap-1.5 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#8E9BA7] shrink-0" />
                    <span>{seller.location_city ? `${seller.location_city}, ${seller.location_state || 'India'}` : 'India'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#ECEFEF] space-y-2">
                  {seller.website && (
                    <a
                      href={seller.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-mono text-[#087E8B] hover:underline inline-flex items-center gap-1"
                    >
                      <span>{new URL(seller.website).hostname}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setContactTargetListing({
                          id: '',
                          seller_id: seller.id,
                          seller_name: seller.name,
                          part_number: searchPart,
                          normalized_part_number: searchPart,
                          manufacturer: '',
                          match_type: 'EXACT_MATCH',
                          exact_match: true,
                          seller_classification: seller.seller_type as any,
                          availability_status: 'IN_STOCK',
                          currency: 'INR',
                          source_name: 'Directory',
                          verification_status: 'VERIFIED',
                          location_city: seller.location_city,
                          location_state: seller.location_state,
                          product_url: seller.website,
                          contacts: seller.contacts
                        });
                      }}
                      className="w-full py-1 text-center bg-[#F8F9F8] hover:bg-[#ECEFEF] border border-[#DDE2E4] rounded-[2px] font-mono text-xs text-[#18232D]"
                    >
                      View Contacts ({seller.contacts?.length || 0})
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: RFQ TRACKING DESK                                             */}
      {/* ===================================================================== */}
      {activeTab === 'rfqs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white border border-[#DDE2E4] rounded-[4px] p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
              <span className="text-[#65717C] mr-1">Status:</span>
              {['ALL', 'DRAFT', 'READY_TO_SEND', 'SENT_BY_USER', 'SUBMITTED_VIA_INTEGRATION', 'RESPONSE_RECEIVED', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setRfqStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-[2px] text-[10.5px] transition-colors ${
                    rfqStatusFilter === st
                      ? 'bg-[#18232D] text-white font-bold'
                      : 'bg-[#F8F9F8] text-[#65717C] hover:bg-white border border-[#DDE2E4]'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <button
              onClick={loadRfqs}
              disabled={rfqsLoading}
              className="px-3 py-1 border border-[#DDE2E4] rounded-[2px] font-mono text-xs text-[#65717C] hover:bg-[#F8F9F8] flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rfqsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Desk</span>
            </button>
          </div>

          {/* RFQ List Table */}
          <div className="bg-white border border-[#DDE2E4] rounded-[4px] shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8F9F8] border-b border-[#DDE2E4] text-[10.5px] font-mono text-[#65717C] uppercase">
                  <th className="py-2.5 px-3">RFQ Reference</th>
                  <th className="py-2.5 px-3">Component / Part</th>
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-2 text-center">Qty</th>
                  <th className="py-2.5 px-3">Created</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEFEF]">
                {filteredRfqs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#8E9BA7] font-mono">
                      No quotation requests matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredRfqs.map((rfq) => (
                    <tr key={rfq.id} className="hover:bg-[#F0F6F7]/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#087E8B]">
                        {rfq.rfq_reference}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        <div className="font-bold text-[#18232D]">{rfq.part_number}</div>
                        <div className="text-[10px] text-[#65717C]">{rfq.manufacturer}</div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[#18232D]">
                        {rfq.seller_name}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold">
                        {rfq.quantity_requested.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#65717C]">
                        {new Date(rfq.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[2px] font-mono text-[10px] font-bold border ${
                            rfq.status === 'SENT_BY_USER' || rfq.status === 'SUBMITTED_VIA_INTEGRATION'
                              ? 'bg-[#ECF7F2] text-[#0E6641] border-[#BCE3D1]'
                              : rfq.status === 'RESPONSE_RECEIVED'
                              ? 'bg-[#E8F6F8] text-[#087E8B] border-[#B9E4EA]'
                              : rfq.status === 'CLOSED'
                              ? 'bg-[#F8F9F8] text-[#65717C] border-[#DDE2E4]'
                              : 'bg-[#FFF9E6] text-[#8A5200] border-[#F2DEAF]'
                          }`}
                        >
                          {rfq.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5">
                        <button
                          onClick={() => setSelectedRfqDetail(rfq)}
                          className="px-2 py-1 bg-white border border-[#DDE2E4] text-[#18232D] rounded-[2px] font-mono text-[10.5px] hover:bg-[#F8F9F8]"
                        >
                          View Email
                        </button>
                        <button
                          onClick={() => {
                            setUpdatingRfqId(rfq.id);
                            setNewStatusValue(rfq.status);
                            setStatusUpdateNotes('');
                          }}
                          className="px-2 py-1 bg-[#087E8B] text-white rounded-[2px] font-mono font-semibold text-[10.5px] hover:bg-[#066570]"
                        >
                          Update Status
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* RFQ Detail / Template Viewer Modal */}
      {selectedRfqDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18232D]/50 backdrop-blur-xs">
          <div className="bg-white border border-[#DDE2E4] rounded-[4px] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-[#18232D] font-sans">
            <div className="px-5 py-3.5 bg-[#18232D] text-white flex items-center justify-between">
              <div>
                <div className="text-xs font-mono font-bold tracking-wider uppercase">
                  RFQ Dossier: {selectedRfqDetail.rfq_reference}
                </div>
                <div className="text-[11px] text-[#A2B0BC]">
                  {selectedRfqDetail.part_number} • {selectedRfqDetail.seller_name}
                </div>
              </div>
              <button
                onClick={() => setSelectedRfqDetail(null)}
                className="text-[#A2B0BC] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] font-mono text-[11px]">
                <div>
                  <span className="text-[#65717C] block text-[9.5px] uppercase">Tracking Status</span>
                  <span className="font-bold text-[#18232D]">{selectedRfqDetail.status}</span>
                </div>
                <div>
                  <span className="text-[#65717C] block text-[9.5px] uppercase">Destination</span>
                  <span className="font-bold text-[#18232D]">{selectedRfqDetail.target_delivery_location}</span>
                </div>
                <div>
                  <span className="text-[#65717C] block text-[9.5px] uppercase">Target Date</span>
                  <span className="font-bold text-[#18232D]">{selectedRfqDetail.target_delivery_date || 'ASAP'}</span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-mono text-[#65717C] uppercase font-bold mb-1">
                  Generated Professional RFQ Email Body
                </div>
                <pre className="p-3.5 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] text-[11px] font-mono whitespace-pre-wrap leading-relaxed">
                  {selectedRfqDetail.generated_email_body}
                </pre>
              </div>

              {/* Status History */}
              {selectedRfqDetail.status_history && selectedRfqDetail.status_history.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono text-[#65717C] uppercase font-bold mb-1.5">
                    Lifecycle Audit History
                  </div>
                  <div className="space-y-1.5 font-mono text-[10.5px]">
                    {selectedRfqDetail.status_history.map((h, i) => (
                      <div key={h.id || i} className="p-2 border border-[#ECEFEF] bg-white rounded-[2px] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[#087E8B]">{h.new_status}</span>
                          {h.notes && <span className="text-[#65717C] ml-2">— {h.notes}</span>}
                        </div>
                        <span className="text-[#8E9BA7]">{new Date(h.changed_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-[#ECEFEF] bg-[#F8F9F8] flex justify-between items-center">
              <a
                href={`mailto:${selectedRfqDetail.seller_contact_email || ''}?subject=${encodeURIComponent(
                  `Request for Quotation: ${selectedRfqDetail.part_number} (Qty: ${selectedRfqDetail.quantity_requested}) - Ref: ${selectedRfqDetail.rfq_reference}`
                )}&body=${encodeURIComponent(selectedRfqDetail.generated_email_body || '')}`}
                className="px-3.5 py-1.5 bg-[#087E8B] hover:bg-[#066570] text-white rounded-[2px] font-mono font-semibold text-xs flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Open in Email Client</span>
              </a>
              <button
                onClick={() => setSelectedRfqDetail(null)}
                className="px-3.5 py-1.5 border border-[#DDE2E4] rounded-[2px] font-mono text-xs text-[#65717C] hover:bg-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update RFQ Status Modal */}
      {updatingRfqId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18232D]/50 backdrop-blur-xs">
          <div className="bg-white border border-[#DDE2E4] rounded-[4px] shadow-2xl w-full max-w-md p-5 space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between border-b border-[#ECEFEF] pb-3">
              <h3 className="font-mono font-bold text-sm text-[#18232D] uppercase">
                Update Operational RFQ Status
              </h3>
              <button onClick={() => setUpdatingRfqId(null)} className="text-[#65717C]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-[#65717C] uppercase mb-1">New Lifecycle Status</label>
                <select
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-mono font-bold text-[#18232D] outline-none focus:border-[#087E8B] bg-white"
                >
                  <option value="DRAFT">DRAFT (Saved as draft)</option>
                  <option value="READY_TO_SEND">READY TO SEND (Verified & prepped)</option>
                  <option value="SENT_BY_USER">SENT BY USER (Transmitted via email/phone)</option>
                  <option value="SUBMITTED_VIA_INTEGRATION">SUBMITTED VIA INTEGRATION (Automated EDI/API)</option>
                  <option value="RESPONSE_RECEIVED">RESPONSE RECEIVED (Commercial quote in hand)</option>
                  <option value="CLOSED">CLOSED (Completed or archived)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#65717C] uppercase mb-1">Action Notes / Quotation Terms</label>
                <textarea
                  rows={3}
                  value={statusUpdateNotes}
                  onChange={(e) => setStatusUpdateNotes(e.target.value)}
                  placeholder="Record quote response, promised delivery date, or follow-up remarks..."
                  className="w-full px-2.5 py-1.5 border border-[#DDE2E4] rounded-[3px] text-xs outline-none focus:border-[#087E8B] bg-white resize-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[#ECEFEF] flex justify-end gap-2">
              <button
                onClick={() => setUpdatingRfqId(null)}
                className="px-3 py-1.5 border border-[#DDE2E4] rounded-[2px] font-mono text-xs text-[#65717C]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateRfqStatus(updatingRfqId)}
                className="px-4 py-1.5 bg-[#087E8B] hover:bg-[#066570] text-white rounded-[2px] font-mono font-semibold text-xs"
              >
                Save Status Transition
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RFQ & Contact Modals */}
      {rfqTargetListing && (
        <RfqModal
          isOpen={Boolean(rfqTargetListing)}
          onClose={() => {
            setRfqTargetListing(null);
            loadRfqs();
          }}
          partNumber={rfqTargetListing.part_number}
          manufacturer={rfqTargetListing.manufacturer}
          sellerId={rfqTargetListing.seller_id}
          sellerName={rfqTargetListing.seller_name || 'Component Supplier'}
          onRfqCreated={() => loadRfqs()}
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

      {discoveryData && (
        <CompareSellersModal
          isOpen={isCompareOpen}
          onClose={() => setIsCompareOpen(false)}
          partNumber={discoveryData.part_number}
          listings={discoveryData.exact_matches}
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
  );
};
