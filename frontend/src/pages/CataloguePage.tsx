import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ExternalLink,
  RefreshCw,
  Save
} from 'lucide-react';
import { api } from '../api/client';
import { ComponentItem, CriticalityLevel } from '../types';
import { OriginBadge, LifecycleBadge } from '../components/common/Badges';

interface Props {
  onSelectAlternative?: (comp: ComponentItem) => void;
  onSimulateOutage?: (comp: ComponentItem) => void;
  initialSearchQuery?: string;
}

export const CataloguePage: React.FC<Props> = ({
  onSelectAlternative,
  onSimulateOutage,
  initialSearchQuery = ''
}) => {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(initialSearchQuery);
  const [category, setCategory] = useState('');
  const [originCategory, setOriginCategory] = useState('');
  const [criticality, setCriticality] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const [minCompleteness, setMinCompleteness] = useState('');

  // Selected Component for detailed inspection drawer
  const [selectedComp, setSelectedComp] = useState<ComponentItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Edit states for user notes & user criticality
  const [editCriticality, setEditCriticality] = useState<CriticalityLevel>('MEDIUM');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const openDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const detailed = await api.getComponent(id);
      setSelectedComp(detailed);
      setEditCriticality(detailed.user_criticality || 'MEDIUM');
      setEditNotes(detailed.user_notes || '');
      setSaveSuccess(false);
    } catch (err: any) {
      alert(`Failed to load component details: ${err.message}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchComponents = async () => {
    try {
      setLoading(true);
      const res = await api.listComponents({
        search: search.trim() || undefined,
        category: category || undefined,
        origin_category: originCategory || undefined,
        lifecycle_status: lifecycle || undefined,
        limit: 100
      });

      let list: ComponentItem[] = res.components || [];
      if (criticality) {
        list = list.filter((c) => (c.user_criticality || '').toUpperCase() === criticality.toUpperCase());
      }
      if (minCompleteness) {
        const minVal = parseInt(minCompleteness, 10);
        if (!isNaN(minVal)) {
          list = list.filter((c) => (c.data_completeness_pct || 0) >= minVal);
        }
      }

      setComponents(list);
      setTotal(res.total || list.length);

      // Default select the first item if none selected
      if (!selectedComp && list.length > 0) {
        openDetail(list[0].id);
      }
    } catch (err: any) {
      console.error('Failed to query component catalogue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComponents();
  }, [category, originCategory, lifecycle, criticality, minCompleteness]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComponents();
  };

  const handleSaveUserEdits = async () => {
    if (!selectedComp) return;
    try {
      setSavingEdit(true);
      const updated = await api.updateComponent(selectedComp.id, {
        user_criticality: editCriticality,
        user_notes: editNotes
      });
      setSelectedComp({ ...selectedComp, ...updated });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      await fetchComponents();
    } catch (err: any) {
      alert(`Failed to update component: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('');
    setOriginCategory('');
    setCriticality('');
    setLifecycle('');
    setMinCompleteness('');
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter Toolbar */}
      <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#18232D] tracking-tight">
                Component Catalogue
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#F8F9F8] text-[#65717C] border border-[#DDE2E4]">
                {total} PARTS REGISTERED
              </span>
            </div>
            <p className="text-xs text-[#65717C] mt-0.5">
              Searchable engineering semiconductor database with verified provenance, lifecycle status, and electrical specifications.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 text-[#8E9BA7] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search part #, manufacturer, description..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAFBF9] border border-[#DDE2E4] rounded-[4px] font-mono text-[#18232D] outline-none focus:border-[#087E8B] placeholder:font-sans placeholder:text-[#8E9BA7]"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#18232D] hover:bg-[#253340] text-white text-xs font-semibold rounded-[4px] transition-colors"
            >
              Filter
            </button>
            {(search || category || originCategory || criticality || lifecycle || minCompleteness) && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-2 py-1.5 text-xs font-mono text-[#65717C] hover:text-[#18232D]"
              >
                Reset
              </button>
            )}
          </form>
        </div>

        {/* Filter controls strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
          <div>
            <label className="block text-[10px] font-mono text-[#65717C] uppercase mb-0.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-1.5 text-xs border border-[#DDE2E4] rounded-[3px] bg-[#FAFBF9] font-mono text-[#18232D]"
            >
              <option value="">All Categories</option>
              <option value="Microcontroller">Microcontroller</option>
              <option value="Voltage Regulator">Voltage Regulator</option>
              <option value="Sensor">Sensor</option>
              <option value="Transceiver">Transceiver</option>
              <option value="Memory">Memory</option>
              <option value="Passive">Passive</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#65717C] uppercase mb-0.5">Origin Provenance</label>
            <select
              value={originCategory}
              onChange={(e) => setOriginCategory(e.target.value)}
              className="w-full p-1.5 text-xs border border-[#DDE2E4] rounded-[3px] bg-[#FAFBF9] font-mono text-[#18232D]"
            >
              <option value="">All Origins</option>
              <option value="VERIFIED_INDIAN">Verified Indian Mfr</option>
              <option value="INDIAN_SUPPLIER_UNVERIFIED_MFR">Indian Supplier (Unverified)</option>
              <option value="FOREIGN">Foreign Mfr</option>
              <option value="UNKNOWN">Origin Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#65717C] uppercase mb-0.5">Criticality</label>
            <select
              value={criticality}
              onChange={(e) => setCriticality(e.target.value)}
              className="w-full p-1.5 text-xs border border-[#DDE2E4] rounded-[3px] bg-[#FAFBF9] font-mono text-[#18232D]"
            >
              <option value="">All Criticality</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#65717C] uppercase mb-0.5">Lifecycle Status</label>
            <select
              value={lifecycle}
              onChange={(e) => setLifecycle(e.target.value)}
              className="w-full p-1.5 text-xs border border-[#DDE2E4] rounded-[3px] bg-[#FAFBF9] font-mono text-[#18232D]"
            >
              <option value="">All Lifecycle</option>
              <option value="ACTIVE">Active</option>
              <option value="NRND">NRND</option>
              <option value="EOL">EOL / Obsolete</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-[#65717C] uppercase mb-0.5">Completeness</label>
            <select
              value={minCompleteness}
              onChange={(e) => setMinCompleteness(e.target.value)}
              className="w-full p-1.5 text-xs border border-[#DDE2E4] rounded-[3px] bg-[#FAFBF9] font-mono text-[#18232D]"
            >
              <option value="">Any Completeness</option>
              <option value="90">≥ 90% Complete</option>
              <option value="75">≥ 75% Complete</option>
              <option value="50">≥ 50% Complete</option>
            </select>
          </div>
        </div>
      </div>

      {/* Two-Column Workbench Layout: Table (7 cols) + Detail Panel (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Parts Table */}
        <div className="lg:col-span-7 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] overflow-hidden flex flex-col">
          <div className="p-3 bg-[#F8F9F8] border-b border-[#DDE2E4] flex items-center justify-between text-xs">
            <span className="font-mono font-bold uppercase text-[#18232D]">
              Catalogue Index ({components.length})
            </span>
            <span className="text-[10.5px] font-mono text-[#65717C]">Click row to inspect</span>
          </div>

          <div className="overflow-x-auto flex-1 max-h-[720px]">
            {loading ? (
              <div className="p-16 text-center font-mono text-xs text-[#65717C] flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 text-[#087E8B] animate-spin" />
                <span>Searching technical specifications...</span>
              </div>
            ) : components.length === 0 ? (
              <div className="p-16 text-center font-mono text-xs text-[#8E9BA7]">
                No electronic components match current filter criteria.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#FAFBF9] border-b border-[#DDE2E4] text-[10.5px] font-mono text-[#65717C] uppercase">
                    <th className="py-2 px-3">Part number</th>
                    <th className="py-2 px-3">Manufacturer</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Origin</th>
                    <th className="py-2 px-3">Lifecycle</th>
                    <th className="py-2 px-2 text-center w-14">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEFEF]">
                  {components.map((comp) => {
                    const isSelected = selectedComp?.id === comp.id;
                    return (
                      <tr
                        key={comp.id}
                        onClick={() => openDetail(comp.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#F0F6F7] border-l-[3px] border-[#087E8B]'
                            : 'hover:bg-[#FAFBF9]'
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-bold text-[#18232D]">
                          {comp.part_number}
                          {comp.specifications?.package && (
                            <div className="text-[10px] text-[#8E9BA7] font-normal">
                              {comp.specifications.package}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-[#18232D] text-[11.5px] font-medium">
                          {comp.manufacturer}
                        </td>
                        <td className="py-2 px-3 text-[#65717C] font-mono text-[11px]">
                          {comp.category}
                        </td>
                        <td className="py-2 px-3">
                          <OriginBadge category={comp.origin_category} compact />
                        </td>
                        <td className="py-2 px-3">
                          <LifecycleBadge status={comp.lifecycle_status} />
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-[10.5px] text-[#65717C]">
                          {comp.data_completeness_pct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detailed Component Panel */}
        <div className="lg:col-span-5 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] overflow-hidden flex flex-col">
          {detailLoading ? (
            <div className="p-16 text-center font-mono text-xs text-[#65717C] flex flex-col items-center justify-center gap-2 my-auto">
              <RefreshCw className="w-5 h-5 text-[#087E8B] animate-spin" />
              <span>Fetching full technical specifications & provenance...</span>
            </div>
          ) : selectedComp ? (
            <div className="flex flex-col h-full max-h-[720px] overflow-y-auto">
              {/* Priority 1: Part Identity & Manufacturer */}
              <div className="p-4 bg-[#FAFBF9] border-b border-[#DDE2E4] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#087E8B] font-bold">
                    SPECIFICATION INSPECTION
                  </span>
                  <div className="flex items-center gap-1.5">
                    {onSelectAlternative && (
                      <button
                        onClick={() => onSelectAlternative(selectedComp)}
                        className="px-2.5 py-1 bg-[#087E8B] hover:bg-[#066570] text-white text-[11px] font-mono font-semibold rounded-[3px] transition-colors"
                      >
                        Alternatives →
                      </button>
                    )}
                    {onSimulateOutage && (
                      <button
                        onClick={() => onSimulateOutage(selectedComp)}
                        className="px-2.5 py-1 bg-[#F8F9F8] hover:bg-[#ECEFEF] text-[#18232D] border border-[#DDE2E4] text-[11px] font-mono font-medium rounded-[3px] transition-colors"
                      >
                        Simulate
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-mono font-bold text-base text-[#18232D]">
                    {selectedComp.part_number}
                  </h3>
                  <div className="text-xs text-[#65717C] font-medium mt-0.5">
                    {selectedComp.manufacturer} • Category: {selectedComp.category}
                  </div>
                </div>

                {selectedComp.description && (
                  <p className="text-[11.5px] text-[#18232D] leading-relaxed bg-white p-2 rounded-[3px] border border-[#ECEFEF]">
                    {selectedComp.description}
                  </p>
                )}
              </div>

              {/* Priority 2: Technical Specifications with Units (Grouped Table) */}
              <div className="p-4 border-b border-[#ECEFEF] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#18232D] uppercase tracking-wider">
                    Electrical & Physical Specifications
                  </span>
                  <span className="text-[10px] font-mono text-[#65717C]">
                    Data Completeness: {selectedComp.data_completeness_pct}%
                  </span>
                </div>

                <div className="border border-[#DDE2E4] rounded-[4px] overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <tbody className="divide-y divide-[#ECEFEF]">
                      <tr className="bg-[#FAFBF9]">
                        <td className="py-1.5 px-3 font-mono text-[11px] text-[#65717C] w-1/2">Package / Footprint</td>
                        <td className="py-1.5 px-3 font-mono font-semibold text-[#18232D]">
                          {selectedComp.specifications?.package || <span className="text-[#8E9BA7] italic">Unknown</span>}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-[#65717C]">Nominal Voltage</td>
                        <td className="py-1.5 px-3 font-mono font-semibold text-[#18232D]">
                          {selectedComp.specifications?.nominal_voltage_v !== null && selectedComp.specifications?.nominal_voltage_v !== undefined
                            ? `${selectedComp.specifications.nominal_voltage_v} V`
                            : <span className="text-[#8E9BA7] italic">Unknown</span>}
                        </td>
                      </tr>
                      <tr className="bg-[#FAFBF9]">
                        <td className="py-1.5 px-3 font-mono text-[11px] text-[#65717C]">Voltage Range (Min / Max)</td>
                        <td className="py-1.5 px-3 font-mono font-semibold text-[#18232D]">
                          {selectedComp.specifications?.min_voltage_v !== undefined && selectedComp.specifications?.max_voltage_v !== undefined
                            ? `${selectedComp.specifications.min_voltage_v} V – ${selectedComp.specifications.max_voltage_v} V`
                            : <span className="text-[#8E9BA7] italic">Unknown</span>}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-[#65717C]">Maximum Current</td>
                        <td className="py-1.5 px-3 font-mono font-semibold text-[#18232D]">
                          {selectedComp.specifications?.max_current_ma
                            ? `${selectedComp.specifications.max_current_ma} mA`
                            : <span className="text-[#8E9BA7] italic">Unknown</span>}
                        </td>
                      </tr>
                      <tr className="bg-[#FAFBF9]">
                        <td className="py-1.5 px-3 font-mono text-[11px] text-[#65717C]">Pin Count</td>
                        <td className="py-1.5 px-3 font-mono font-semibold text-[#18232D]">
                          {selectedComp.specifications?.pin_count || <span className="text-[#8E9BA7] italic">Unknown</span>}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-[#65717C]">Operating Temperature</td>
                        <td className="py-1.5 px-3 font-mono font-semibold text-[#18232D]">
                          {selectedComp.specifications?.operating_temp_min_c !== undefined && selectedComp.specifications?.operating_temp_max_c !== undefined
                            ? `${selectedComp.specifications.operating_temp_min_c}°C to ${selectedComp.specifications.operating_temp_max_c}°C`
                            : <span className="text-[#8E9BA7] italic">Unknown</span>}
                        </td>
                      </tr>
                      {selectedComp.specifications?.clock_speed_mhz && (
                        <tr className="bg-[#FAFBF9]">
                          <td className="py-1.5 px-3 font-mono text-[11px] text-[#65717C]">Clock Frequency</td>
                          <td className="py-1.5 px-3 font-mono font-semibold text-[#18232D]">
                            {selectedComp.specifications.clock_speed_mhz} MHz
                          </td>
                        </tr>
                      )}
                      {selectedComp.specifications?.flash_kb && (
                        <tr>
                          <td className="py-1.5 px-3 font-mono text-[11px] text-[#65717C]">Internal Flash / RAM</td>
                          <td className="py-1.5 px-3 font-mono font-semibold text-[#18232D]">
                            {selectedComp.specifications.flash_kb} KB Flash • {selectedComp.specifications.ram_kb} KB RAM
                          </td>
                        </tr>
                      )}
                      {selectedComp.specifications?.interfaces && selectedComp.specifications.interfaces.length > 0 && (
                        <tr className="bg-[#FAFBF9]">
                          <td className="py-1.5 px-3 font-mono text-[11px] text-[#65717C]">Supported Interfaces</td>
                          <td className="py-1.5 px-3 font-mono font-semibold text-[#18232D]">
                            {selectedComp.specifications.interfaces.join(', ')}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Priority 3 & 4: Provenance, Datasheet, and Origin Evidence */}
              <div className="p-4 border-b border-[#ECEFEF] space-y-2 text-xs">
                <span className="text-[11px] font-mono font-bold text-[#18232D] uppercase tracking-wider block">
                  Origin Evidence & Datasheet Provenance
                </span>

                <div className="p-3 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[4px] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#65717C]">Origin Classification:</span>
                    <OriginBadge category={selectedComp.origin_category} mfrCountry={selectedComp.manufacturer_country} />
                  </div>

                  {selectedComp.design_origin_country && (
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#65717C]">Silicon Design Origin:</span>
                      <span className="font-bold text-[#18232D]">{selectedComp.design_origin_country}</span>
                    </div>
                  )}

                  {selectedComp.distributor_name && (
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-[#65717C]">Distributor Record:</span>
                      <span className="text-[#18232D]">{selectedComp.distributor_name} ({selectedComp.distributor_country})</span>
                    </div>
                  )}

                  {selectedComp.manufacturer_country_evidence_url && (
                    <div className="pt-1 text-[11px] font-mono flex items-center justify-between">
                      <span className="text-[#65717C]">Fab Evidence:</span>
                      <a
                        href={selectedComp.manufacturer_country_evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#087E8B] hover:underline flex items-center gap-1"
                      >
                        <span>Official Citation</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {selectedComp.datasheet_url && (
                    <div className="pt-1 text-[11px] font-mono flex items-center justify-between border-t border-[#ECEFEF]">
                      <span className="text-[#65717C]">Manufacturer Datasheet:</span>
                      <a
                        href={selectedComp.datasheet_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#087E8B] font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Download PDF / Spec Sheet</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Priority 5 & 6: Lifecycle & BOM Usage Occurrences */}
              <div className="p-4 border-b border-[#ECEFEF] space-y-2 text-xs">
                <span className="text-[11px] font-mono font-bold text-[#18232D] uppercase tracking-wider block">
                  Lifecycle & Cross-Assembly Usage
                </span>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 border border-[#ECEFEF] rounded-[3px] bg-[#FAFBF9]">
                    <span className="text-[#65717C] block text-[10px]">Lifecycle State</span>
                    <LifecycleBadge status={selectedComp.lifecycle_status} />
                  </div>
                  <div className="p-2 border border-[#ECEFEF] rounded-[3px] bg-[#FAFBF9]">
                    <span className="text-[#65717C] block text-[10px]">Last Checked</span>
                    <span className="font-semibold text-[#18232D]">
                      {selectedComp.last_verified_at ? new Date(selectedComp.last_verified_at).toLocaleDateString() : 'Active session'}
                    </span>
                  </div>
                </div>

                {selectedComp.bom_occurrences && selectedComp.bom_occurrences.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] font-mono text-[#65717C] uppercase block">
                      Active Assemblies Using This Part ({selectedComp.bom_occurrences.length})
                    </span>
                    <div className="divide-y divide-[#ECEFEF] border border-[#ECEFEF] rounded-[3px]">
                      {selectedComp.bom_occurrences.map((occ, i) => (
                        <div key={i} className="p-2 text-[11px] font-mono flex justify-between bg-white">
                          <span className="font-semibold text-[#18232D]">{occ.bom_name}</span>
                          <span className="text-[#65717C]">{occ.quantity} pcs ({occ.criticality})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Priority 7: User Criticality & Engineering Notes Editor */}
              <div className="p-4 space-y-2 text-xs bg-[#FAFBF9]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#18232D] uppercase tracking-wider">
                    Engineering Audit Notes
                  </span>
                  {saveSuccess && (
                    <span className="text-[10.5px] font-mono text-[#0E6641] font-bold">
                      ✓ Changes Saved
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-mono text-[#65717C] uppercase mb-0.5">
                      Assigned Criticality Rating
                    </label>
                    <select
                      value={editCriticality}
                      onChange={(e) => setEditCriticality(e.target.value as CriticalityLevel)}
                      className="w-full text-xs p-1.5 border border-[#DDE2E4] rounded-[3px] font-mono font-bold bg-white"
                    >
                      <option value="CRITICAL">CRITICAL — Mission-critical path</option>
                      <option value="HIGH">HIGH — Assembly blocked if unavailable</option>
                      <option value="MEDIUM">MEDIUM — Multi-source alternative likely</option>
                      <option value="LOW">LOW — Generic passive or auxiliary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-[#65717C] uppercase mb-0.5">
                      Engineer Justification / Review Notes
                    </label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Add engineering notes, qualification status, or board spin requirements..."
                      className="w-full text-xs p-2 border border-[#DDE2E4] rounded-[3px] bg-white outline-none focus:border-[#087E8B]"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleSaveUserEdits}
                      disabled={savingEdit}
                      className="px-3 py-1.5 bg-[#18232D] hover:bg-[#253340] text-white rounded-[3px] text-xs font-mono font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingEdit ? 'Saving...' : 'Save Audit Metadata'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center font-mono text-xs text-[#8E9BA7] my-auto">
              Select a component to inspect technical parameters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
