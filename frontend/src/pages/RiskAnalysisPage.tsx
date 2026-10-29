import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { api } from '../api/client';
import { BOMHeader } from '../types';
import { PageId } from '../components/layout/Sidebar';

export const RiskAnalysisPage: React.FC<{
  onSimulate?: (componentId: string) => void;
  onNavigate?: (page: PageId, id?: string) => void;
}> = ({ onSimulate, onNavigate }) => {
  const [boms, setBoms] = useState<BOMHeader[]>([]);
  const [selectedBomId, setSelectedBomId] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  useEffect(() => {
    const loadBomsList = async () => {
      try {
        const list = await api.listBoms();
        setBoms(list);
        if (list.length > 0) {
          setSelectedBomId(list[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadBomsList();
  }, []);

  useEffect(() => {
    if (selectedBomId) {
      runAnalysis(selectedBomId);
    }
  }, [selectedBomId]);

  const runAnalysis = async (bomId: string) => {
    try {
      setLoading(true);
      setSelectedItem(null);
      const res = await api.analyzeBom(bomId);
      setAnalysisData(res);
      if (res.items_analyzed && res.items_analyzed.length > 0) {
        setSelectedItem(res.items_analyzed[0]);
      }
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Selector */}
      <div className="p-4 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#18232D] tracking-tight">
              Sourcing Risk & Dependency Assessment
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#F8F9F8] text-[#65717C] border border-[#DDE2E4]">
              HEURISTIC EVALUATION
            </span>
          </div>
          <p className="text-xs text-[#65717C] mt-0.5">
            Evaluates single-source concentration, cross-BOM sharing, and lifecycle vulnerabilities across assemblies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] font-mono font-bold text-[#65717C] uppercase">
            Target Assembly:
          </label>
          <select
            value={selectedBomId}
            onChange={(e) => setSelectedBomId(e.target.value)}
            className="text-xs p-1.5 border border-[#DDE2E4] rounded-[4px] bg-[#FAFBF9] font-mono font-bold text-[#18232D]"
          >
            {boms.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.total_items} items)
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-20 bg-white border border-[#DDE2E4] rounded-[6px] text-center font-mono text-xs text-[#65717C] flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#087E8B] animate-spin" />
          <span>Tracing cross-product BOM dependencies and computing risk metrics...</span>
        </div>
      ) : analysisData ? (
        <div className="space-y-4">
          {/* Risk Level Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-[#DDE2E4] border-l-[3px] border-l-[#A82218] rounded-[4px]">
              <span className="text-[10px] font-mono font-bold text-[#A82218] uppercase block">Critical Risk</span>
              <span className="text-2xl font-mono font-bold text-[#A82218] mt-0.5 block">
                {analysisData.risk_summary.CRITICAL || 0}
              </span>
              <span className="text-[10.5px] font-mono text-[#65717C]">Single-source / EOL parts</span>
            </div>

            <div className="p-3 bg-white border border-[#DDE2E4] border-l-[3px] border-l-[#8A5200] rounded-[4px]">
              <span className="text-[10px] font-mono font-bold text-[#8A5200] uppercase block">High Risk</span>
              <span className="text-2xl font-mono font-bold text-[#8A5200] mt-0.5 block">
                {analysisData.risk_summary.HIGH || 0}
              </span>
              <span className="text-[10.5px] font-mono text-[#65717C]">Cross-BOM common parts</span>
            </div>

            <div className="p-3 bg-white border border-[#DDE2E4] border-l-[3px] border-l-[#19527D] rounded-[4px]">
              <span className="text-[10px] font-mono font-bold text-[#19527D] uppercase block">Medium Risk</span>
              <span className="text-2xl font-mono font-bold text-[#19527D] mt-0.5 block">
                {analysisData.risk_summary.MEDIUM || 0}
              </span>
              <span className="text-[10.5px] font-mono text-[#65717C]">Multi-source available</span>
            </div>

            <div className="p-3 bg-white border border-[#DDE2E4] border-l-[3px] border-l-[#0E6641] rounded-[4px]">
              <span className="text-[10px] font-mono font-bold text-[#0E6641] uppercase block">Low Risk</span>
              <span className="text-2xl font-mono font-bold text-[#0E6641] mt-0.5 block">
                {analysisData.risk_summary.LOW || 0}
              </span>
              <span className="text-[10.5px] font-mono text-[#65717C]">Standard passives/auxiliary</span>
            </div>
          </div>

          {/* Analyzed Components Table & Drilldown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Table (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] overflow-hidden flex flex-col">
              <div className="p-3 bg-[#F8F9F8] border-b border-[#DDE2E4] text-xs font-mono font-bold text-[#18232D] uppercase tracking-wider">
                Assembly Component Vulnerability Breakdown
              </div>

              <div className="overflow-x-auto flex-1 max-h-[600px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAFBF9] border-b border-[#DDE2E4] text-[10.5px] font-mono text-[#65717C] uppercase">
                      <th className="py-2 px-3">Component</th>
                      <th className="py-2 px-3 text-center">Score</th>
                      <th className="py-2 px-3">Sharing</th>
                      <th className="py-2 px-3">Alternatives</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEFEF]">
                    {analysisData.items_analyzed.map((item: any) => (
                      <tr
                        key={item.bom_item_id}
                        onClick={() => setSelectedItem(item)}
                        className={`cursor-pointer transition-colors ${
                          selectedItem?.bom_item_id === item.bom_item_id
                            ? 'bg-[#F0F6F7] border-l-[3px] border-[#087E8B]'
                            : 'hover:bg-[#FAFBF9]'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-[#18232D]">{item.part_number}</div>
                          <div className="text-[11px] text-[#65717C]">{item.manufacturer} • {item.category}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded-[2px] font-mono text-[10.5px] font-bold ${
                              item.risk_score >= 75
                                ? 'bg-[#FCF1F0] text-[#A82218] border border-[#F3C7C4]'
                                : item.risk_score >= 50
                                ? 'bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]'
                                : 'bg-[#F0F6F7] text-[#087E8B] border border-[#D0E7EA]'
                            }`}
                          >
                            {item.risk_score}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {item.is_multi_bom ? (
                            <span className="text-[#8A5200] font-bold">
                              {item.bom_sharing_count} BOMs ({item.total_shared_quantity} pcs)
                            </span>
                          ) : (
                            <span className="text-[#65717C]">Single Assembly</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          {item.viable_alternatives_count > 0 ? (
                            <span className="text-[#0E6641] font-semibold">
                              {item.viable_alternatives_count} Viable Alts
                            </span>
                          ) : (
                            <span className="text-[#A82218] font-bold">
                              0 (Single Source)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          {item.component_id && (
                            <button
                              onClick={() => {
                                if (onSimulate) onSimulate(item.component_id);
                                else if (onNavigate) onNavigate('simulator', item.component_id);
                              }}
                              className="px-2 py-0.8 rounded-[3px] bg-[#F8F9F8] hover:bg-[#ECEFEF] text-[#18232D] border border-[#DDE2E4] font-mono text-[10.5px] font-medium"
                            >
                              Simulate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Drilldown (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] p-4 space-y-3">
              {selectedItem ? (
                <>
                  <div className="border-b border-[#ECEFEF] pb-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#087E8B] block">
                      Factor Evidence Audit
                    </span>
                    <h4 className="font-mono font-bold text-sm text-[#18232D] mt-0.5">
                      {selectedItem.part_number}
                    </h4>
                    <p className="text-xs text-[#65717C]">{selectedItem.manufacturer}</p>
                    <div className="mt-1 flex items-center justify-between text-xs font-mono">
                      <span className="text-[#65717C]">Composite Vulnerability:</span>
                      <span className="font-bold text-[#A82218]">
                        {selectedItem.risk_score} / 100
                      </span>
                    </div>
                  </div>

                  {/* Factor Details */}
                  <div className="space-y-1.5">
                    <span className="text-[10.5px] font-mono uppercase text-[#65717C] block">Contributing Drivers:</span>
                    {selectedItem.risk_factors?.map((f: any, idx: number) => (
                      <div key={idx} className="p-2 rounded-[3px] bg-[#FAFBF9] border border-[#ECEFEF] text-xs font-mono">
                        <div className="flex items-center justify-between font-bold text-[#18232D]">
                          <span>{f.factor}</span>
                          <span className="text-[#087E8B] text-[10.5px]">{f.impact}</span>
                        </div>
                        <p className="text-[11px] text-[#65717C] mt-0.5 leading-snug">
                          {f.details}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Unknown Data Factors */}
                  {selectedItem.unknown_data_factors && selectedItem.unknown_data_factors.length > 0 && (
                    <div className="p-2.5 rounded-[3px] bg-[#FFF9E6] border border-[#F2DEAF] text-xs font-mono text-[#8A5200]">
                      <span className="font-bold flex items-center gap-1 mb-0.5">
                        <HelpCircle className="w-3.5 h-3.5 text-[#8A5200]" />
                        Information Gaps:
                      </span>
                      <ul className="list-disc list-inside text-[10.5px] space-y-0.5">
                        {selectedItem.unknown_data_factors.map((u: string, idx: number) => (
                          <li key={idx}>{u}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-[#8E9BA7] py-12 text-xs font-mono">
                  Select a component from the list to inspect risk reasons.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
