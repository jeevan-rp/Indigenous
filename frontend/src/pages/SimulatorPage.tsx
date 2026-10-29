import React, { useState, useEffect } from 'react';
import {
  PlayCircle,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  Layers,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import { ComponentItem, SimulationResult } from '../types';
import { OriginBadge, CriticalityBadge, CompatibilityBadge } from '../components/common/Badges';
import { PageId } from '../components/layout/Sidebar';

interface Props {
  initialComponentId?: string;
  onNavigate?: (page: PageId, id?: string) => void;
}

export const SimulatorPage: React.FC<Props> = ({ initialComponentId, onNavigate }) => {
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>(initialComponentId || '');
  const [loadingList, setLoadingList] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    const fetchComponents = async () => {
      try {
        setLoadingList(true);
        const res = await api.listComponents({ limit: 100 });
        const list: ComponentItem[] = res.components || [];
        setComponents(list);
        if (!selectedCompId && list.length > 0) {
          // Default to LM1117IMP-3.3 (known multi-BOM sharing) or first
          const defaultC = list.find((c) => c.part_number === 'LM1117IMP-3.3') || list[0];
          setSelectedCompId(defaultC.id);
        }
      } catch (err) {
        console.error('Failed to load components:', err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchComponents();
  }, []);

  useEffect(() => {
    if (selectedCompId) {
      handleRunSimulation(selectedCompId);
    }
  }, [selectedCompId]);

  const handleRunSimulation = async (id: string) => {
    try {
      setSimulating(true);
      setSimResult(null);
      const res = await api.runSimulation(id, 'COMPONENT_UNAVAILABLE');
      setSimResult(res);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Scenario Control Workbench */}
      <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#18232D] tracking-tight">
                Failure scenario
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#FCF1F0] text-[#A82218] border border-[#F3C7C4] font-semibold">
                SCENARIO MODEL
              </span>
            </div>
            <p className="text-xs text-[#65717C] mt-0.5">
              Simulate hypothetical supply chain unavailability and evaluate cascading dependency blast radius across assemblies.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[11px] font-mono font-bold text-[#65717C] uppercase shrink-0">
              Target Component:
            </label>
            <select
              value={selectedCompId}
              onChange={(e) => setSelectedCompId(e.target.value)}
              className="text-xs p-1.5 border border-[#DDE2E4] rounded-[4px] font-mono font-bold text-[#18232D] bg-[#FAFBF9] outline-none focus:border-[#087E8B] max-w-xs"
            >
              {components.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.part_number} — {c.manufacturer} ({c.category})
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedCompId && handleRunSimulation(selectedCompId)}
              disabled={simulating}
              className="px-3.5 py-1.5 bg-[#18232D] hover:bg-[#253340] text-white text-xs font-mono font-semibold rounded-[4px] transition-colors flex items-center gap-1.5 shrink-0"
            >
              {simulating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="w-3.5 h-3.5 text-[#087E8B]" />
                  <span>Run Scenario</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Clear Mandatory Scenario Banner */}
        <div className="p-3 bg-[#FCF1F0] border border-[#F3C7C4] rounded-[4px] text-xs text-[#A82218] flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-[#A82218] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-mono font-bold uppercase tracking-wider block">
              SIMULATED SCENARIO — component assumed unavailable. This is not a live outage.
            </span>
            <p className="text-[11.5px] leading-relaxed text-[#8B1A12]">
              Assumptions: Component lead-time becomes infinite or fabrication ceases immediately. All calculations reflect verified database linkages.
            </p>
          </div>
        </div>
      </div>

      {simulating ? (
        <div className="p-20 bg-white border border-[#DDE2E4] rounded-[6px] text-center font-mono text-xs text-[#65717C] flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#087E8B] animate-spin" />
          <span>Tracing cross-assembly BOM relationships and calculating dependency impact...</span>
        </div>
      ) : simResult ? (
        <div className="space-y-4">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-[#DDE2E4] rounded-[4px] shadow-xs">
              <span className="text-[10px] font-mono text-[#65717C] uppercase block mb-0.5">Affected BOMs</span>
              <span className="text-xl font-mono font-bold text-[#A82218]">
                {simResult.impact.affected_boms_count} Assemblies
              </span>
              <span className="text-[10.5px] font-mono text-[#65717C] block mt-0.5">
                {simResult.impact.is_multi_bom_dependency ? 'Cross-BOM Common Risk' : 'Isolated to Single Build'}
              </span>
            </div>

            <div className="p-3 bg-white border border-[#DDE2E4] rounded-[4px] shadow-xs">
              <span className="text-[10px] font-mono text-[#65717C] uppercase block mb-0.5">End Products</span>
              <span className="text-xl font-mono font-bold text-[#18232D]">
                {simResult.impact.affected_products_count} Systems
              </span>
              <span className="text-[10.5px] font-mono text-[#65717C] block mt-0.5">
                {simResult.impact.total_affected_quantity} Total Units
              </span>
            </div>

            <div className="p-3 bg-white border border-[#DDE2E4] rounded-[4px] shadow-xs">
              <span className="text-[10px] font-mono text-[#65717C] uppercase block mb-0.5">Viable Substitutes</span>
              <span className="text-xl font-mono font-bold text-[#0E6641]">
                {simResult.alternative_readiness.viable_candidates_count} Found
              </span>
              <span className="text-[10.5px] font-mono text-[#65717C] block mt-0.5">
                {simResult.alternative_readiness.hard_mismatches_count} Hard Mismatches Excluded
              </span>
            </div>

            <div className="p-3 bg-white border border-[#DDE2E4] rounded-[4px] shadow-xs">
              <span className="text-[10px] font-mono text-[#65717C] uppercase block mb-0.5">Redesign Effort</span>
              <span className="text-xl font-mono font-bold text-[#087E8B]">
                {simResult.alternative_readiness.estimated_redesign_effort}
              </span>
              <span className="text-[10.5px] font-mono text-[#65717C] block mt-0.5">
                Based on Pin & Package Match
              </span>
            </div>
          </div>

          {/* Connected Node / Dependency Flow Diagram (Using actual database relationships) */}
          <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-3">
            <div className="flex items-center justify-between border-b border-[#ECEFEF] pb-2">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase text-[#18232D] tracking-wider">
                  Verified Dependency Hierarchy Flow
                </h3>
                <p className="text-[11px] text-[#65717C]">
                  Visual tracing derived exclusively from stored BOM relational edges.
                </p>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#FAFBF9] text-[#65717C] border border-[#DDE2E4] rounded-[2px]">
                GRAPH EDGES: VERIFIED
              </span>
            </div>

            {/* Tree / Node Flow Representation */}
            <div className="p-4 bg-[#FAFBF9] border border-[#DDE2E4] rounded-[4px] overflow-x-auto">
              <div className="flex items-center gap-6 min-w-[620px]">
                {/* Node 1: Target Component */}
                <div className="p-3 bg-white border-2 border-[#A82218] rounded-[4px] shadow-xs w-56 shrink-0">
                  <div className="text-[9.5px] font-mono font-bold text-[#A82218] uppercase flex items-center justify-between">
                    <span>ASSUMED UNAVAILABLE</span>
                    <span>IC</span>
                  </div>
                  <div className="font-mono font-bold text-sm text-[#18232D] mt-1">
                    {simResult.component.part_number}
                  </div>
                  <div className="text-[11px] text-[#65717C] truncate">{simResult.component.manufacturer}</div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-[#A82218] font-bold">{simResult.component.user_criticality}</span>
                    <span className="text-[#65717C]">{simResult.component.category}</span>
                  </div>
                </div>

                {/* Arrow connector */}
                <div className="flex flex-col items-center text-[#8E9BA7]">
                  <ArrowRight className="w-5 h-5 text-[#A82218]" />
                  <span className="text-[9px] font-mono">USED IN</span>
                </div>

                {/* Node 2: Affected BOM Assemblies */}
                <div className="space-y-2 flex-1 shrink-0 max-w-xs">
                  {simResult.impact.affected_boms.map((bom, i) => (
                    <div key={i} className="p-2.5 bg-white border border-[#DDE2E4] rounded-[4px] shadow-xs text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#18232D] truncate">{bom.bom_name}</span>
                        <span className="text-[10px] font-semibold text-[#A82218]">{bom.criticality}</span>
                      </div>
                      <div className="text-[10.5px] text-[#65717C] mt-0.5">
                        Required Quantity: <strong>{bom.item_quantity} pcs</strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Arrow connector */}
                <div className="flex flex-col items-center text-[#8E9BA7]">
                  <ArrowRight className="w-5 h-5 text-[#087E8B]" />
                  <span className="text-[9px] font-mono">DEPLOYS</span>
                </div>

                {/* Node 3: Affected Products */}
                <div className="space-y-2 flex-1 shrink-0 max-w-xs">
                  {simResult.impact.affected_products.map((prod, i) => (
                    <div key={i} className="p-2.5 bg-white border border-[#DDE2E4] rounded-[4px] shadow-xs text-xs font-mono">
                      <div className="font-bold text-[#18232D] truncate">{prod.product_name}</div>
                      <div className="text-[10.5px] text-[#087E8B] mt-0.5">
                        System Demand: <strong>{prod.required_quantity} units</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Details: Candidate Readiness & Investigation Steps */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left (7 cols): Substitution Readiness & Technical Mismatches */}
            <div className="lg:col-span-7 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#ECEFEF] pb-2">
                <h3 className="text-xs font-mono font-bold uppercase text-[#18232D] tracking-wider">
                  Substitution Readiness
                </h3>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('alternatives', selectedCompId)}
                    className="text-[11px] font-mono font-semibold text-[#087E8B] hover:underline flex items-center gap-1"
                  >
                    <span>Full Alternative Finder</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {simResult.alternative_readiness.top_candidates.length > 0 ? (
                <div className="space-y-2.5">
                  {simResult.alternative_readiness.top_candidates.map((cand, i) => (
                    <div key={i} className="p-3 border border-[#DDE2E4] rounded-[4px] bg-[#FAFBF9] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#18232D] text-[13px]">{cand.part_number}</span>
                          <span className="text-[#65717C] text-[11px]">{cand.manufacturer}</span>
                        </div>
                        <CompatibilityBadge status={cand.compatibility_status} />
                      </div>

                      <div className="flex items-center gap-3 font-mono text-[11px] text-[#65717C]">
                        <span>Fit: <strong className="text-[#087E8B]">{cand.heuristic_score}%</strong></span>
                        <span>•</span>
                        <span>Redesign: <strong className="text-[#18232D]">{cand.redesign_effort}</strong></span>
                        <span>•</span>
                        <OriginBadge category={cand.origin_category} compact />
                      </div>

                      <p className="text-[11px] text-[#65717C] leading-relaxed">
                        {cand.ranking_reason}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-[#FCF1F0] border border-[#F3C7C4] rounded-[4px] text-xs text-[#A82218] font-mono">
                  No verified viable alternatives exist in the dataset. Sourcing outage would cause a critical single-source assembly line stop.
                </div>
              )}

              {/* Strict Disclaimer: Unknowns and unestimated variables */}
              <div className="p-3 bg-[#FAFBF9] border border-[#DDE2E4] rounded-[4px] space-y-1.5 text-xs font-mono">
                <span className="font-bold text-[#18232D] text-[11px] uppercase block">
                  Unavailable Metrics (Data Gap Audit)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] text-[#65717C]">
                  <div>
                    Lead Time Recovery: <strong className="text-[#8E9BA7]">Not estimated — insufficient data</strong>
                  </div>
                  <div>
                    Spot Inventory Cost: <strong className="text-[#8E9BA7]">Not estimated — insufficient data</strong>
                  </div>
                  <div>
                    Downtime Financial Impact: <strong className="text-[#8E9BA7]">Not estimated — insufficient data</strong>
                  </div>
                  <div>
                    Stock Buffer Hours: <strong className="text-[#8E9BA7]">Not estimated — insufficient data</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right (5 cols): Recommended Engineering Actions & Assumptions */}
            <div className="lg:col-span-5 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] p-4 space-y-3">
              <div className="border-b border-[#ECEFEF] pb-2">
                <h3 className="text-xs font-mono font-bold uppercase text-[#18232D] tracking-wider">
                  Recommended Investigation Steps
                </h3>
                <p className="text-[11px] text-[#65717C]">Engineering checklist before initiating schematic revisions.</p>
              </div>

              <div className="space-y-2">
                {simResult.recommended_actions.map((act, i) => (
                  <div key={i} className="p-2.5 border border-[#ECEFEF] rounded-[4px] bg-[#FAFBF9] flex items-start gap-2 text-xs">
                    <span className="w-4 h-4 rounded-[2px] bg-[#087E8B] text-white flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[#18232D] leading-relaxed">{act}</span>
                  </div>
                ))}
              </div>

              {simResult.data_gaps && simResult.data_gaps.length > 0 && (
                <div className="border-t border-[#ECEFEF] pt-2 space-y-1 text-xs">
                  <span className="font-mono text-[10.5px] font-bold uppercase text-[#8A5200] block">
                    Flagged Information Gaps:
                  </span>
                  <ul className="list-disc list-inside font-mono text-[10.5px] text-[#65717C] space-y-0.5">
                    {simResult.data_gaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
