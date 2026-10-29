import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Layers,
  Cpu,
  FileSpreadsheet,
  X,
  FileCheck,
  Filter,
  CheckCircle,
  HelpCircle,
  PlayCircle,
  Database,
  Store,
  Building2
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { StatCard } from '../components/common/StatCard';
import { OriginBadge, CriticalityBadge, LifecycleBadge, CompatibilityBadge, SourcingStatusBadge } from '../components/common/Badges';
import { DashboardSummary, ComponentItem, OriginCategory, CriticalityLevel } from '../types';
import { api } from '../api/client';
import { PageId } from '../components/layout/Sidebar';
import { ComponentSourcingDrawer } from '../components/sellers/ComponentSourcingDrawer';

interface Props {
  onNavigate: (page: PageId, extraId?: string) => void;
}

export const DashboardPage: React.FC<Props> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table Filters
  const [filterCriticality, setFilterCriticality] = useState<string>('ALL');
  const [filterOrigin, setFilterOrigin] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterAltAvailability, setFilterAltAvailability] = useState<string>('ALL');

  // Component Detail Inspection Modal
  const [selectedComp, setSelectedComp] = useState<ComponentItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Sourcing Drawer Modal State
  const [selectedSourcingPart, setSelectedSourcingPart] = useState<{
    partNumber: string;
    manufacturer?: string;
    quantity?: number;
  } | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to semiconductor intelligence service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const openComponentDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const full = await api.getComponent(id);
      setSelectedComp(full);
    } catch (err: any) {
      alert(`Could not load component detail: ${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[380px] space-y-2">
        <RefreshCw className="w-5 h-5 text-[#087E8B] animate-spin" />
        <p className="text-xs font-mono text-[#65717C]">Calculating dependency exposure & semiconductor graphs...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-[#FCF1F0] border border-[#F3C7C4] rounded-[4px] text-xs text-[#A82218] space-y-2">
        <div className="flex items-center gap-2 font-bold uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4 text-[#A82218]" />
          Backend Service Connection Error
        </div>
        <p>{error}</p>
        <button
          onClick={fetchSummary}
          className="px-3 py-1.5 bg-[#A82218] text-white rounded-[3px] font-mono text-xs font-semibold hover:bg-[#8B1A12]"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Handle empty BOM state
  if (data.total_boms === 0 && data.total_unique_components === 0) {
    return (
      <div className="p-12 bg-white border border-[#DDE2E4] rounded-[6px] text-center space-y-4">
        <div className="w-12 h-12 rounded-[4px] bg-[#F8F9F8] border border-[#DDE2E4] text-[#087E8B] flex items-center justify-center mx-auto">
          <Upload className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="font-bold text-base text-[#18232D]">No Bill of Materials Uploaded</h3>
          <p className="text-xs text-[#65717C]">
            Upload an assembly component list (CSV or XLSX) to begin dependency analysis, identify foreign dependencies, and discover Indian alternatives.
          </p>
        </div>
        <button
          onClick={() => onNavigate('boms')}
          className="px-4 py-2 bg-[#087E8B] hover:bg-[#066570] text-white text-xs font-semibold rounded-[4px] transition-colors inline-flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload BOM</span>
        </button>
      </div>
    );
  }

  const latestBom = data.recent_boms && data.recent_boms.length > 0 ? data.recent_boms[0] : null;

  // Chart 1: Component Origin Distribution Data
  const totalComps = Math.max(data.total_unique_components, 1);
  const originChartData = [
    {
      name: 'Verified Indian Mfr',
      categoryKey: 'VERIFIED_INDIAN',
      count: data.verified_indian_count,
      pct: Math.round((data.verified_indian_count / totalComps) * 100),
      color: '#0E6641'
    },
    {
      name: 'Foreign Mfr',
      categoryKey: 'FOREIGN',
      count: data.foreign_origin_count,
      pct: Math.round((data.foreign_origin_count / totalComps) * 100),
      color: '#455360'
    },
    {
      name: 'Indian Supplier (Unverified Mfr)',
      categoryKey: 'INDIAN_SUPPLIER_UNVERIFIED_MFR',
      count: data.indian_supplier_unverified_mfr_count,
      pct: Math.round((data.indian_supplier_unverified_mfr_count / totalComps) * 100),
      color: '#19527D'
    },
    {
      name: 'Origin Unknown',
      categoryKey: 'UNKNOWN',
      count: data.unknown_origin_count,
      pct: Math.round((data.unknown_origin_count / totalComps) * 100),
      color: '#8A5200'
    }
  ];

  // Chart 2: Category Critical Parts Distribution
  const categoryRiskData = (data.category_risk_breakdown || []).slice(0, 6).map((c) => ({
    name: c.category,
    critical: c.critical,
    total: c.total
  }));

  // Chart 3: Indian Alternative Coverage
  const altCoverageData = [
    {
      name: 'Verified Indian Substitute',
      value: data.components_with_indian_alternatives_count || 0,
      color: '#0E6641'
    },
    {
      name: 'Discovered / Other Candidate',
      value: Math.max(0, data.components_with_alternatives_count - (data.components_with_indian_alternatives_count || 0)),
      color: '#19527D'
    },
    {
      name: 'No Verified Candidate',
      value: data.components_without_alternatives_count,
      color: '#A82218'
    }
  ];

  // Chart 4: BOM Risk Distribution
  const riskChartData = [
    { name: 'Critical Risk', count: data.risk_distribution['CRITICAL'] || 0, color: '#A82218' },
    { name: 'High Risk', count: data.risk_distribution['HIGH'] || 0, color: '#8A5200' },
    { name: 'Medium Risk', count: data.risk_distribution['MEDIUM'] || 0, color: '#19527D' },
    { name: 'Low Risk', count: data.risk_distribution['LOW'] || 0, color: '#0E6641' }
  ];

  // Priority Table Items Filtering
  const sourceComponents = data.all_priority_components || data.high_priority_components;
  const filteredComponents = sourceComponents.filter((comp) => {
    if (filterCriticality !== 'ALL') {
      if ((comp.user_criticality || '').toUpperCase() !== filterCriticality) return false;
    }
    if (filterOrigin !== 'ALL') {
      if (comp.origin_category !== filterOrigin) return false;
    }
    if (filterCategory !== 'ALL') {
      if (comp.category !== filterCategory) return false;
    }
    if (filterAltAvailability === 'WITH_INDIAN') {
      if (!comp.has_indian_alternative) return false;
    } else if (filterAltAvailability === 'WITH_ANY') {
      if (comp.viable_alternatives_count === 0) return false;
    } else if (filterAltAvailability === 'NO_ALTS') {
      if (comp.viable_alternatives_count > 0) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#18232D] tracking-tight">
              Component Intelligence
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF] font-semibold">
              DEMO DATASET
            </span>
          </div>
          <p className="text-xs text-[#65717C] mt-0.5">
            Identify critical parts, sourcing risks, and potential Indian alternatives.
          </p>
          {latestBom && (
            <div className="flex items-center gap-3 text-[11px] font-mono text-[#8E9BA7] mt-1.5 flex-wrap">
              <span>Latest BOM Analysed: <strong className="text-[#18232D]">{latestBom.name}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#8E9BA7]" />
                {latestBom.created_at ? new Date(latestBom.created_at).toLocaleString() : 'Active session'}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigate('boms')}
          className="px-4 py-2 bg-[#087E8B] hover:bg-[#066570] text-white text-xs font-semibold rounded-[4px] transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>+ Analyse BOM</span>
        </button>
      </div>

      {/* A. FOUR REAL STORED METRIC STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="BOM Parts with Seller Listings"
          value={data.bom_components_with_seller_listings ?? 0}
          subtext="Verified Indian seller listings available"
          accent="verified"
          tag="SELLERS FOUND"
        />
        <StatCard
          label="Components with No Seller Listing"
          value={data.components_with_no_seller_listing ?? 0}
          subtext="Domestic supplier sourcing gap"
          accent="warning"
          tag="SOURCING GAP"
        />
        <StatCard
          label="RFQs Awaiting Follow-up"
          value={data.rfqs_awaiting_followup ?? 0}
          subtext="Active inquiries requiring action"
          accent="default"
          tag="RFQS"
        />
        <StatCard
          label="Potential Domestic Alternatives"
          value={data.potential_domestic_alternatives ?? (data.components_with_indian_alternatives_count || 0)}
          subtext="Indian-manufactured component substitutes"
          accent="verified"
          tag="INDIAN ALTS"
        />
      </div>

      {/* B. VISUAL CHARTS (First Viewport: 2 Key Analytical Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Component Origin Distribution */}
        <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-[#18232D] tracking-wider">
                Component Origin Distribution
              </h3>
              <p className="text-[11px] text-[#65717C]">
                Click any category bar to filter the component attention table below.
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#65717C]">N = {totalComps}</span>
          </div>

          <div className="space-y-2 pt-1 font-mono text-xs">
            {originChartData.map((item) => {
              const isSelected = filterOrigin === item.categoryKey;
              return (
                <div
                  key={item.categoryKey}
                  onClick={() => setFilterOrigin(isSelected ? 'ALL' : item.categoryKey)}
                  className={`p-2 rounded-[3px] border cursor-pointer transition-colors ${
                    isSelected ? 'border-[#087E8B] bg-[#F0F6F7]' : 'border-[#ECEFEF] hover:bg-[#FAFBF9]'
                  }`}
                >
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-semibold text-[#18232D]">{item.name}</span>
                    <span className="text-[#65717C]">
                      <strong>{item.count}</strong> parts ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#EDF0EE] rounded-[1px] overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart 2: Risk by Component Category */}
        <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-[#18232D] tracking-wider">
                Critical Parts by Category
              </h3>
              <p className="text-[11px] text-[#65717C]">
                Critical components requiring substitution priority per domain.
              </p>
            </div>
            <span className="text-[10px] font-mono text-[#65717C]">Domain Risk</span>
          </div>

          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryRiskData} layout="vertical" margin={{ top: 0, right: 15, left: 10, bottom: 0 }}>
                <XAxis type="number" allowDecimals={false} stroke="#8E9BA7" fontSize={10} font-family="JetBrains Mono" />
                <YAxis dataKey="name" type="category" width={110} stroke="#65717C" fontSize={10} />
                <Tooltip
                  cursor={{ fill: 'rgba(244, 245, 243, 0.6)' }}
                  contentStyle={{ backgroundColor: '#18232D', color: '#fff', borderRadius: '4px', fontSize: '11px', border: 'none' }}
                />
                <Bar dataKey="critical" name="Critical Parts" fill="#A82218" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SOURCING ACTIONS: CRITICAL BOM PARTS & SELLER DISCOVERY */}
      {data.sourcing_actions && data.sourcing_actions.length > 0 && (
        <div className="bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] overflow-hidden flex flex-col">
          <div className="p-3 bg-[#FAFBF9] border-b border-[#DDE2E4] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#087E8B]" />
              <div>
                <h3 className="font-mono font-bold uppercase text-[#18232D] tracking-wider text-xs">
                  Sourcing Actions Desk
                </h3>
                <p className="text-[11px] text-[#65717C]">
                  High-priority BOM components matched against verified Indian seller channels and domestic manufacturers.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('sellers')}
              className="px-2.5 py-1 bg-[#F0F6F7] hover:bg-[#E2F0F2] text-[#087E8B] border border-[#D0E7EA] rounded-[3px] font-mono text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Indian Suppliers Directory</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8F9F8] border-b border-[#DDE2E4] text-[10px] font-mono text-[#65717C] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Part Number</th>
                  <th className="py-2.5 px-3">Manufacturer</th>
                  <th className="py-2.5 px-2 text-center w-14">Criticality</th>
                  <th className="py-2.5 px-3">Indian Sellers Found</th>
                  <th className="py-2.5 px-3">Domestic Alternative</th>
                  <th className="py-2.5 px-3">Sourcing Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEFEF]">
                {data.sourcing_actions.map((act) => (
                  <tr key={act.component_id} className="hover:bg-[#F0F6F7] transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-xs text-[#18232D]">{act.part_number}</div>
                      <div className="text-[10px] font-mono text-[#8E9BA7]">{act.category}</div>
                    </td>
                    <td className="py-2.5 px-3 text-[11.5px] text-[#18232D] font-medium">
                      {act.manufacturer}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <CriticalityBadge level={act.user_criticality as CriticalityLevel} />
                    </td>
                    <td className="py-2.5 px-3">
                      {act.seller_listings_count > 0 ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-bold text-[#0E6641] bg-[#ECF7F2] px-2 py-0.5 rounded-[2px] border border-[#BCE3D1]">
                          <Building2 className="w-3 h-3 text-[#0E6641]" />
                          {act.seller_listings_count} Indian {act.seller_listings_count === 1 ? 'seller' : 'sellers'}
                          {act.top_seller_name ? ` (${act.top_seller_name})` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#8A5200] bg-[#FAFBF9] px-1.5 py-0.5 rounded-[2px] border border-[#F0D5BA]">
                          No seller listing found
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {act.has_indian_alternative ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-bold text-[#087E8B] bg-[#F0F6F7] px-2 py-0.5 rounded-[2px] border border-[#D0E7EA]">
                          <Layers className="w-3 h-3 text-[#087E8B]" />
                          {act.top_candidate || 'Domestic alt available'}
                        </span>
                      ) : (
                        <span className="text-[10.5px] font-mono text-[#8E9BA7]">0 domestic alts</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <SourcingStatusBadge status={act.sourcing_status} />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedSourcingPart({
                          partNumber: act.part_number,
                          manufacturer: act.manufacturer,
                          quantity: act.total_quantity
                        })}
                        className="px-2 py-1 bg-[#087E8B] hover:bg-[#066570] text-white rounded-[3px] text-[10.5px] font-mono font-semibold transition-colors inline-flex items-center gap-1 shadow-xs"
                      >
                        <Store className="w-3 h-3" />
                        <span>View Sellers</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* C. PRIORITY COMPONENT TABLE */}
      <div className="bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] overflow-hidden flex flex-col">
        {/* Table Header & Filters */}
        <div className="p-3.5 bg-[#F8F9F8] border-b border-[#DDE2E4] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase text-[#18232D] tracking-wider">
                Components Requiring Attention
              </h3>
              <p className="text-[11px] text-[#65717C]">
                Ranked by criticality, foreign concentration, and single-source exposure.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono text-[#65717C]">
                Showing {filteredComponents.length} of {sourceComponents.length} components
              </span>
            </div>
          </div>

          {/* Table Filters Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 font-mono">
            <div>
              <label className="block text-[9.5px] text-[#65717C] uppercase mb-0.5">Criticality</label>
              <select
                value={filterCriticality}
                onChange={(e) => setFilterCriticality(e.target.value)}
                className="w-full p-1 text-xs border border-[#DDE2E4] rounded-[3px] bg-white font-medium text-[#18232D]"
              >
                <option value="ALL">All Criticalities</option>
                <option value="CRITICAL">Critical Only</option>
                <option value="HIGH">High Risk</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-[9.5px] text-[#65717C] uppercase mb-0.5">Origin Status</label>
              <select
                value={filterOrigin}
                onChange={(e) => setFilterOrigin(e.target.value)}
                className="w-full p-1 text-xs border border-[#DDE2E4] rounded-[3px] bg-white font-medium text-[#18232D]"
              >
                <option value="ALL">All Origin Statuses</option>
                <option value="VERIFIED_INDIAN">Verified Indian Mfr</option>
                <option value="FOREIGN">Foreign Mfr</option>
                <option value="INDIAN_SUPPLIER_UNVERIFIED_MFR">Indian Supplier (Unverified)</option>
                <option value="UNKNOWN">Origin Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-[9.5px] text-[#65717C] uppercase mb-0.5">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full p-1 text-xs border border-[#DDE2E4] rounded-[3px] bg-white font-medium text-[#18232D]"
              >
                <option value="ALL">All Categories</option>
                <option value="Microcontroller">Microcontroller</option>
                <option value="Voltage Regulator">Voltage Regulator</option>
                <option value="Sensor">Sensor</option>
                <option value="Transceiver">Transceiver</option>
                <option value="Memory">Memory</option>
              </select>
            </div>

            <div>
              <label className="block text-[9.5px] text-[#65717C] uppercase mb-0.5">Alternative Availability</label>
              <select
                value={filterAltAvailability}
                onChange={(e) => setFilterAltAvailability(e.target.value)}
                className="w-full p-1 text-xs border border-[#DDE2E4] rounded-[3px] bg-white font-medium text-[#18232D]"
              >
                <option value="ALL">All Availability</option>
                <option value="WITH_INDIAN">Has Verified Indian Alt</option>
                <option value="WITH_ANY">Has Viable Substitutes</option>
                <option value="NO_ALTS">No Viable Candidate Found</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAFBF9] border-b border-[#DDE2E4] text-[10.5px] font-mono text-[#65717C] uppercase">
                <th className="py-2 px-3.5 w-1/4">Part Number</th>
                <th className="py-2 px-3.5">Component / Category</th>
                <th className="py-2 px-3.5">Manufacturer</th>
                <th className="py-2 px-3.5">Origin Status</th>
                <th className="py-2 px-3.5 text-center">Criticality</th>
                <th className="py-2 px-3.5">Indian Alternatives</th>
                <th className="py-2 px-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEFEF]">
              {filteredComponents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#8E9BA7] font-mono">
                    No components match current filter parameters.
                  </td>
                </tr>
              ) : (
                filteredComponents.map((comp) => (
                  <tr
                    key={comp.id}
                    onClick={() => openComponentDetail(comp.id)}
                    className="hover:bg-[#F0F6F7] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3.5">
                      <span className="font-mono font-bold text-[#18232D] text-[12px] block">
                        {comp.part_number}
                      </span>
                      <span className="text-[10px] text-[#65717C] font-mono">
                        {comp.boms_count} BOMs • {comp.total_quantity} pcs
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#65717C]">
                      {comp.category}
                    </td>
                    <td className="py-2.5 px-3.5 text-[#18232D] font-medium text-[11.5px]">
                      {comp.manufacturer}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <OriginBadge category={comp.origin_category} compact />
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <CriticalityBadge level={comp.user_criticality} />
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]">
                      {comp.has_indian_alternative ? (
                        <span className="text-[#0E6641] font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-[#0E6641]" />
                          <span>{comp.top_candidate}</span>
                        </span>
                      ) : comp.viable_alternatives_count > 0 ? (
                        <span className="text-[#19527D]">
                          {comp.viable_alternatives_count} Foreign Candidate(s)
                        </span>
                      ) : (
                        <span className="text-[#A82218] font-bold">
                          No Candidate Found
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-right space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onNavigate('alternatives', comp.id)}
                        className="px-2 py-0.8 bg-[#F0F6F7] hover:bg-[#E2F0F2] text-[#087E8B] border border-[#D0E7EA] rounded-[3px] text-[10.5px] font-mono font-semibold transition-colors"
                      >
                        Find Alts
                      </button>
                      <button
                        onClick={() => openComponentDetail(comp.id)}
                        className="px-2 py-0.8 bg-[#F8F9F8] hover:bg-[#ECEFEF] text-[#18232D] border border-[#DDE2E4] rounded-[3px] text-[10.5px] font-mono font-medium transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secondary Visualisations Below the Fold */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 3: Indian Alternative Coverage */}
        <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase text-[#18232D] tracking-wider">
              Indian Alternative Coverage
            </h3>
            <span className="text-[10px] font-mono text-[#65717C]">Domestic Substitution Readiness</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-xs">
            {altCoverageData.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-[3px] border border-[#ECEFEF] bg-[#FAFBF9]">
                <span className="text-[10px] text-[#65717C] block truncate">{item.name}</span>
                <span className="text-lg font-bold block mt-0.5" style={{ color: item.color }}>
                  {item.value}
                </span>
                <span className="text-[10px] text-[#8E9BA7]">
                  {Math.round((item.value / totalComps) * 100)}% of parts
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Heuristic Sourcing Risk Overview */}
        <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase text-[#18232D] tracking-wider">
              BOM Risk Overview
            </h3>
            <span className="text-[10px] font-mono text-[#65717C]">Composite Heuristic Vulnerability</span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-xs">
            {riskChartData.map((item, idx) => (
              <div key={idx} className="p-2 rounded-[3px] border border-[#ECEFEF] bg-[#FAFBF9]">
                <span className="text-[10px] text-[#65717C] block truncate">{item.name}</span>
                <span className="text-lg font-bold block mt-0.5" style={{ color: item.color }}>
                  {item.count}
                </span>
                <span className="text-[10px] text-[#8E9BA7]">
                  {Math.round((item.count / totalComps) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* D. RECENT BOM ANALYSES TABLE */}
      <div className="bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] overflow-hidden flex flex-col">
        <div className="p-3 bg-[#F8F9F8] border-b border-[#DDE2E4] flex items-center justify-between text-xs">
          <h3 className="font-mono font-bold uppercase text-[#18232D] tracking-wider">
            Recent BOM Analyses
          </h3>
          <button
            onClick={() => onNavigate('boms')}
            className="text-[10.5px] font-mono text-[#087E8B] hover:underline"
          >
            Manage BOMs →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAFBF9] border-b border-[#DDE2E4] text-[10.5px] font-mono text-[#65717C] uppercase">
                <th className="py-2 px-3.5">BOM Name</th>
                <th className="py-2 px-3.5">Number of Components</th>
                <th className="py-2 px-3.5">Critical Component Count</th>
                <th className="py-2 px-3.5">Analysis Date</th>
                <th className="py-2 px-3.5 text-right">View Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECEFEF]">
              {data.recent_boms.map((b) => (
                <tr key={b.id} className="hover:bg-[#FAFBF9] transition-colors">
                  <td className="py-2.5 px-3.5 font-mono font-bold text-[#18232D]">
                    {b.name}
                  </td>
                  <td className="py-2.5 px-3.5 font-mono text-[#65717C]">
                    {b.total_items} line items ({b.total_quantity} units)
                  </td>
                  <td className="py-2.5 px-3.5 font-mono">
                    <span className="text-[#A82218] font-bold">
                      {b.critical_count !== undefined ? b.critical_count : '—'} Critical
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 font-mono text-[#65717C]">
                    {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Active'}
                  </td>
                  <td className="py-2.5 px-3.5 text-right">
                    <button
                      onClick={() => onNavigate('boms', b.id)}
                      className="px-2.5 py-1 bg-[#F8F9F8] hover:bg-[#ECEFEF] text-[#18232D] border border-[#DDE2E4] rounded-[3px] font-mono text-[11px] font-medium transition-colors"
                    >
                      View BOM →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* COMPONENT DETAIL VIEW MODAL (Section 6 Specification) */}
      {selectedComp && (
        <div className="fixed inset-0 bg-[#18232D]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDE2E4] rounded-[6px] shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header: Part number | Manufacturer | Category | Criticality */}
            <div className="p-3.5 bg-[#F8F9F8] border-b border-[#DDE2E4] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#087E8B] font-bold">
                  Component Detail View
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-base text-[#18232D]">
                    {selectedComp.part_number}
                  </span>
                  <span className="text-[#65717C] text-xs font-medium">| {selectedComp.manufacturer}</span>
                  <span className="text-[#65717C] text-xs font-mono">| {selectedComp.category}</span>
                  <CriticalityBadge level={selectedComp.user_criticality} />
                </div>
              </div>
              <button
                onClick={() => setSelectedComp(null)}
                className="p-1 rounded-[3px] text-[#65717C] hover:text-[#18232D] hover:bg-[#EDF0EE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* SECTION 1 — Technical Specifications */}
              <div>
                <span className="text-[11px] font-mono font-bold text-[#18232D] uppercase tracking-wider block mb-1.5">
                  Section 1 — Technical Specifications
                </span>
                <div className="border border-[#DDE2E4] rounded-[4px] overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FAFBF9] border-b border-[#DDE2E4] text-[10px] font-mono text-[#65717C] uppercase">
                        <th className="py-1.5 px-3">Parameter</th>
                        <th className="py-1.5 px-3">Value & Unit</th>
                        <th className="py-1.5 px-3">Source Provenance</th>
                        <th className="py-1.5 px-3 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECEFEF] font-mono text-[11px]">
                      <tr>
                        <td className="py-1.5 px-3 text-[#65717C]">Package / Footprint</td>
                        <td className="py-1.5 px-3 font-semibold text-[#18232D]">{selectedComp.specifications?.package || 'Unknown'}</td>
                        <td className="py-1.5 px-3 text-[#65717C] text-[10px]">Datasheet Rev 2.1</td>
                        <td className="py-1.5 px-3 text-right text-[#0E6641] font-semibold text-[10px]">Verified</td>
                      </tr>
                      <tr className="bg-[#FAFBF9]">
                        <td className="py-1.5 px-3 text-[#65717C]">Nominal Voltage</td>
                        <td className="py-1.5 px-3 font-semibold text-[#18232D]">
                          {selectedComp.specifications?.nominal_voltage_v ? `${selectedComp.specifications.nominal_voltage_v} V` : 'Unknown'}
                        </td>
                        <td className="py-1.5 px-3 text-[#65717C] text-[10px]">Datasheet Electricals</td>
                        <td className="py-1.5 px-3 text-right text-[#0E6641] font-semibold text-[10px]">Verified</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-[#65717C]">Maximum Current</td>
                        <td className="py-1.5 px-3 font-semibold text-[#18232D]">
                          {selectedComp.specifications?.max_current_ma ? `${selectedComp.specifications.max_current_ma} mA` : 'Unknown'}
                        </td>
                        <td className="py-1.5 px-3 text-[#65717C] text-[10px]">Datasheet Electricals</td>
                        <td className="py-1.5 px-3 text-right text-[#0E6641] font-semibold text-[10px]">Verified</td>
                      </tr>
                      <tr className="bg-[#FAFBF9]">
                        <td className="py-1.5 px-3 text-[#65717C]">Operating Temperature</td>
                        <td className="py-1.5 px-3 font-semibold text-[#18232D]">
                          {selectedComp.specifications?.operating_temp_min_c !== undefined
                            ? `${selectedComp.specifications.operating_temp_min_c}°C to ${selectedComp.specifications?.operating_temp_max_c}°C`
                            : 'Unknown'}
                        </td>
                        <td className="py-1.5 px-3 text-[#65717C] text-[10px]">Thermal Ratings</td>
                        <td className="py-1.5 px-3 text-right text-[#0E6641] font-semibold text-[10px]">Verified</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 2 — Manufacturer and Origin */}
              <div>
                <span className="text-[11px] font-mono font-bold text-[#18232D] uppercase tracking-wider block mb-1.5">
                  Section 2 — Manufacturer and Origin
                </span>
                <div className="p-3 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[4px] space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#65717C]">Manufacturer:</span>
                    <span className="font-bold text-[#18232D]">{selectedComp.manufacturer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#65717C]">Country of Manufacture:</span>
                    <span className="font-bold text-[#18232D]">{selectedComp.manufacturer_country || 'Unknown / Not Disclosed'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#65717C]">Origin Status:</span>
                    <OriginBadge category={selectedComp.origin_category} mfrCountry={selectedComp.manufacturer_country} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#65717C]">Last Checked:</span>
                    <span className="text-[#18232D]">
                      {selectedComp.last_verified_at ? new Date(selectedComp.last_verified_at).toLocaleDateString() : 'Active session'}
                    </span>
                  </div>
                  {selectedComp.datasheet_url && (
                    <div className="pt-1 border-t border-[#ECEFEF] flex justify-between">
                      <span className="text-[#65717C]">Datasheet Citation:</span>
                      <a href={selectedComp.datasheet_url} target="_blank" rel="noreferrer" className="text-[#087E8B] hover:underline flex items-center gap-1 font-semibold">
                        <span>Datasheet Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3 — BOM Usage */}
              <div>
                <span className="text-[11px] font-mono font-bold text-[#18232D] uppercase tracking-wider block mb-1.5">
                  Section 3 — BOM Usage
                </span>
                {selectedComp.bom_occurrences && selectedComp.bom_occurrences.length > 0 ? (
                  <div className="border border-[#ECEFEF] rounded-[4px] divide-y divide-[#ECEFEF] font-mono text-[11px]">
                    {selectedComp.bom_occurrences.map((occ, idx) => (
                      <div key={idx} className="p-2 flex justify-between bg-white">
                        <span className="font-semibold text-[#18232D]">{occ.bom_name}</span>
                        <span className="text-[#65717C]">{occ.quantity} pcs ({occ.criticality})</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[4px] font-mono text-[11px] text-[#65717C]">
                    Active in 1 assembly ({selectedComp.part_number})
                  </div>
                )}
              </div>

              {/* SECTION 4 — Risk Reasons */}
              <div>
                <span className="text-[11px] font-mono font-bold text-[#18232D] uppercase tracking-wider block mb-1.5">
                  Section 4 — Sourcing Risk Reasons
                </span>
                <div className="p-2.5 bg-[#FCF1F0] border border-[#F3C7C4] rounded-[4px] text-xs font-mono space-y-1 text-[#A82218]">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Risk Factors Flagged:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
                    {selectedComp.user_criticality === 'CRITICAL' && (
                      <li>Marked CRITICAL in Bill of Materials</li>
                    )}
                    {selectedComp.origin_category === 'FOREIGN' && (
                      <li>Foreign-manufactured component dependency</li>
                    )}
                    {selectedComp.origin_category === 'UNKNOWN' && (
                      <li>Manufacturer country-of-origin unverified; requires Certificate of Conformance</li>
                    )}
                    {selectedComp.lifecycle_status === 'NRND' && (
                      <li>Lifecycle marked Not Recommended for New Designs</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* SECTION 6 — Actions */}
            <div className="p-3 bg-[#F8F9F8] border-t border-[#DDE2E4] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#8E9BA7]">ID: {selectedComp.id.slice(0, 8)}...</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const id = selectedComp.id;
                    setSelectedComp(null);
                    onNavigate('simulator', id);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-[#F4F5F3] text-[#18232D] border border-[#DDE2E4] rounded-[3px] text-xs font-mono font-medium transition-colors"
                >
                  Simulate Unavailable
                </button>
                <button
                  onClick={() => {
                    const id = selectedComp.id;
                    setSelectedComp(null);
                    onNavigate('alternatives', id);
                  }}
                  className="px-3 py-1.5 bg-[#087E8B] hover:bg-[#066570] text-white rounded-[3px] text-xs font-mono font-semibold transition-colors"
                >
                  Find Indian Sources →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOURCING DRAWER */}
      {selectedSourcingPart && (
        <ComponentSourcingDrawer
          isOpen={!!selectedSourcingPart}
          onClose={() => setSelectedSourcingPart(null)}
          partNumber={selectedSourcingPart.partNumber}
          manufacturer={selectedSourcingPart.manufacturer}
          quantityRequired={selectedSourcingPart.quantity}
          onNavigateToAlternatives={(part) => {
            setSelectedSourcingPart(null);
            onNavigate('alternatives');
          }}
        />
      )}
    </div>
  );
};
