import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldAlert,
  AlertTriangle,
  Check,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Info,
  ChevronRight,
  Database,
  SlidersHorizontal,
  X,
  ShieldCheck,
  FileText,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api/client';
import { ComponentItem, AlternativeDiscoveryResponse, AlternativeCandidate } from '../types';
import { OriginBadge, CompatibilityBadge, SpecStatusBadge, LifecycleBadge } from '../components/common/Badges';
import { SpecComparisonTable } from '../components/common/SpecComparisonTable';

interface Props {
  initialComponentId?: string;
}

export const AlternativeFinderPage: React.FC<Props> = ({ initialComponentId }) => {
  const [componentsList, setComponentsList] = useState<ComponentItem[]>([]);
  const [selectedCompId, setSelectedCompId] = useState<string>(initialComponentId || '');
  const [loadingList, setLoadingList] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [discoveryData, setDiscoveryData] = useState<AlternativeDiscoveryResponse | null>(null);

  // Search & filter inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [packageFilter, setPackageFilter] = useState('ALL');

  // Active candidate for side-by-side comparison matrix below
  const [activeCandidate, setActiveCandidate] = useState<AlternativeCandidate | null>(null);

  // Filter tab for candidates: All, Compatible, Hard Mismatches
  const [candidateFilter, setCandidateFilter] = useState<'ALL' | 'COMPATIBLE' | 'REVIEW' | 'MISMATCH'>('ALL');

  // AI / Rule Explanation
  const [explanation, setExplanation] = useState<{ source: string; provider: string; explanation: string } | null>(null);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    const fetchList = async () => {
      try {
        setLoadingList(true);
        const res = await api.listComponents({ limit: 100 });
        const list: ComponentItem[] = res.components || [];
        setComponentsList(list);

        if (!selectedCompId && list.length > 0) {
          const target = list.find((c) => c.part_number === 'STM32F401RET6') || list[0];
          setSelectedCompId(target.id);
        }
      } catch (err) {
        console.error('Failed to load components list:', err);
      } finally {
        setLoadingList(false);
      }
    };
    fetchList();
  }, []);

  useEffect(() => {
    if (selectedCompId) {
      runAlternativeEvaluation(selectedCompId);
    }
  }, [selectedCompId]);

  const runAlternativeEvaluation = async (id: string) => {
    try {
      setEvaluating(true);
      setDiscoveryData(null);
      setActiveCandidate(null);
      setExplanation(null);
      const res = await api.getAlternatives(id);
      setDiscoveryData(res);

      if (res.candidates && res.candidates.length > 0) {
        setActiveCandidate(res.candidates[0]);
      } else if (res.excluded_mismatches && res.excluded_mismatches.length > 0) {
        setActiveCandidate(res.excluded_mismatches[0]);
      }
    } catch (err: any) {
      alert(`Alternative evaluation failed: ${err.message}`);
    } finally {
      setEvaluating(false);
    }
  };

  const handleGenerateExplanation = async () => {
    if (!selectedCompId) return;
    try {
      setExplaining(true);
      const exp = await api.explainAlternatives(selectedCompId);
      setExplanation(exp);
    } catch (err: any) {
      alert(`Explanation error: ${err.message}`);
    } finally {
      setExplaining(false);
    }
  };

  const baseComp = discoveryData?.base_component || componentsList.find((c) => c.id === selectedCompId);

  // Distinct label mapper per prompt Section 5.B
  const getCandidateResultTypeLabel = (cand: AlternativeCandidate, base?: ComponentItem | null) => {
    if (cand.origin_category === 'VERIFIED_INDIAN') {
      if (cand.compatibility_status === 'COMPATIBLE') {
        return 'Verified Indian-manufactured alternative';
      } else if (cand.compatibility_status === 'REVIEW_REQUIRED') {
        return 'Candidate requiring engineering review (Verified Indian Mfr)';
      }
      return 'Potential functional alternative (Indian Mfr, redesign required)';
    }
    if (cand.origin_category === 'INDIAN_SUPPLIER_UNVERIFIED_MFR') {
      if (base && cand.part_number.toUpperCase() === base.part_number.toUpperCase()) {
        return 'Same part available from Indian distributor';
      }
      return 'Foreign alternative available through Indian distributor';
    }
    if (cand.compatibility_status === 'REVIEW_REQUIRED') {
      return 'Candidate requiring engineering review';
    }
    if (cand.compatibility_status === 'HARD_MISMATCH') {
      return 'Hard constraint mismatch';
    }
    return 'Potential functional alternative';
  };

  // Filter candidates based on tab and search
  const allCandidates = [
    ...(discoveryData?.candidates || []),
    ...(discoveryData?.excluded_mismatches || [])
  ];

  const filteredCandidates = allCandidates.filter((c) => {
    if (candidateFilter === 'COMPATIBLE' && c.compatibility_status !== 'COMPATIBLE') return false;
    if (candidateFilter === 'REVIEW' && c.compatibility_status !== 'REVIEW_REQUIRED') return false;
    if (candidateFilter === 'MISMATCH' && c.compatibility_status !== 'HARD_MISMATCH') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPn = c.part_number.toLowerCase().includes(q);
      const matchMfr = c.manufacturer.toLowerCase().includes(q);
      const matchCat = (c.category || '').toLowerCase().includes(q);
      const matchLabel = (c.origin_label || '').toLowerCase().includes(q);
      if (!matchPn && !matchMfr && !matchCat && !matchLabel) return false;
    }

    return true;
  });

  // Check if any verified Indian alternative exists
  const hasVerifiedIndian = (discoveryData?.candidates || []).some(
    (c) => c.origin_category === 'VERIFIED_INDIAN'
  );

  return (
    <div className="space-y-4">
      {/* Header & Component Selector */}
      <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#18232D] tracking-tight">
                Indian Alternatives
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1] font-semibold">
                DOMESTIC SOURCING ENGINE
              </span>
            </div>
            <p className="text-xs text-[#65717C] mt-0.5">
              Find potential domestic sourcing options for components in your BOM.
            </p>
          </div>

          {/* Target Part Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[11px] font-mono font-bold text-[#65717C] uppercase shrink-0">
              Target Component:
            </label>
            <select
              value={selectedCompId}
              onChange={(e) => setSelectedCompId(e.target.value)}
              className="text-xs p-1.5 border border-[#DDE2E4] rounded-[4px] font-mono font-bold text-[#18232D] bg-[#FAFBF9] outline-none focus:border-[#087E8B] max-w-xs"
            >
              {componentsList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.part_number} — {c.manufacturer} ({c.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Part Meta Strip */}
        {baseComp && (
          <div className="p-3 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[4px] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono font-bold text-[13px] text-[#18232D]">{baseComp.part_number}</span>
              <span className="text-[#65717C]">{baseComp.manufacturer}</span>
              <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[2px] bg-white border border-[#DDE2E4] text-[#18232D]">
                {baseComp.category}
              </span>
              <OriginBadge category={baseComp.origin_category} mfrCountry={baseComp.manufacturer_country} compact />
              <LifecycleBadge status={baseComp.lifecycle_status} />
            </div>

            <div className="text-[11px] font-mono text-[#65717C]">
              Review Reason: <strong className="text-[#A82218]">{baseComp.user_criticality} CRITICALITY</strong> • Sourcing vulnerability
            </div>
          </div>
        )}
      </div>

      {/* Evaluating loader */}
      {evaluating ? (
        <div className="p-20 bg-white border border-[#DDE2E4] rounded-[6px] text-center font-mono text-xs text-[#65717C] flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#087E8B] animate-spin" />
          <span>Executing category electrical constraint gates (Voltage, Current, Pinout, Package)...</span>
        </div>
      ) : discoveryData ? (
        <div className="space-y-4">
          {/* Status Message & Explainer Banner */}
          <div className="p-3 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono">
              {discoveryData.has_suitable_alternatives ? (
                <span className="w-2.5 h-2.5 rounded-full bg-[#0E6641] shrink-0" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-[#8A5200] shrink-0" />
              )}
              <span className="font-semibold text-[#18232D]">{discoveryData.message}</span>
              <span className="text-[#8E9BA7]">
                ({discoveryData.candidates_count} viable candidates, {discoveryData.hard_mismatch_count} hard mismatches)
              </span>
            </div>

            <button
              onClick={handleGenerateExplanation}
              disabled={explaining}
              className="px-3 py-1.5 bg-[#F8F9F8] hover:bg-[#ECEFEF] text-[#18232D] border border-[#DDE2E4] rounded-[4px] text-xs font-mono font-medium transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#087E8B]" />
              <span>{explaining ? 'Synthesizing...' : 'Explain Decision Evidence'}</span>
            </button>
          </div>

          {/* Strict Rule: Domestic Alternative Check Warning */}
          {!hasVerifiedIndian && (
            <div className="p-3 bg-[#FFF9E6] border border-[#F2DEAF] rounded-[4px] text-xs text-[#8A5200] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#8A5200] shrink-0 mt-0.5" />
              <div>
                <span className="font-mono font-bold uppercase tracking-wider block">
                  No verified suitable Indian alternative found in the current dataset.
                </span>
                <p className="text-[11.5px] text-[#8A5200] leading-relaxed mt-0.5">
                  The qualification engine rejects unverified or electrically mismatched domestic substitutes. Candidates listed below are foreign alternates or domestic designs with hard constraint violations that require engineering redesign.
                </p>
              </div>
            </div>
          )}

          {/* Explanation Box if generated */}
          {explanation && (
            <div className="p-4 bg-[#18232D] text-[#FAFBF9] border border-[#253340] rounded-[6px] shadow-sm space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono text-[11px] text-[#087E8B]">
                <span className="font-bold flex items-center gap-1.5 text-teal-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  Deterministic Rule Explanation ({explanation.provider})
                </span>
                <span className="text-[#8E9BA7]">Zero Speculative Substitutions</span>
              </div>
              <p className="whitespace-pre-line leading-relaxed text-[#DDE2E4] text-[11.5px] font-mono">
                {explanation.explanation}
              </p>
            </div>
          )}

          {/* Split Layout: Left Panel (Original Constraints) + Main Panel (Ranked Candidates) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Panel (4 cols): Original Component & Required Technical Constraints */}
            <div className="lg:col-span-4 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] overflow-hidden flex flex-col">
              <div className="p-3 bg-[#F8F9F8] border-b border-[#DDE2E4] text-xs">
                <span className="font-mono font-bold uppercase text-[#18232D] tracking-wider block">
                  Original Constraints
                </span>
                <span className="text-[11px] text-[#65717C]">Baseline requirements for drop-in suitability</span>
              </div>

              <div className="p-4 space-y-3 flex-1 overflow-y-auto text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-[#65717C] block">Part Identifier</span>
                  <div className="font-mono font-bold text-sm text-[#18232D]">{baseComp?.part_number}</div>
                  <div className="text-[11px] text-[#65717C]">{baseComp?.manufacturer}</div>
                </div>

                <div className="border-t border-[#ECEFEF] pt-2 space-y-2">
                  <span className="text-[10.5px] font-mono font-bold uppercase text-[#18232D] block">
                    Electrical Boundary Gates
                  </span>

                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="p-2 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[3px] flex justify-between">
                      <span className="text-[#65717C]">Package / Case:</span>
                      <span className="font-bold text-[#18232D]">
                        {baseComp?.specifications?.package || 'Unknown'}
                      </span>
                    </div>

                    <div className="p-2 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[3px] flex justify-between">
                      <span className="text-[#65717C]">Nominal Voltage:</span>
                      <span className="font-bold text-[#18232D]">
                        {baseComp?.specifications?.nominal_voltage_v ? `${baseComp.specifications.nominal_voltage_v} V` : 'Unknown'}
                      </span>
                    </div>

                    <div className="p-2 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[3px] flex justify-between">
                      <span className="text-[#65717C]">Max Current:</span>
                      <span className="font-bold text-[#18232D]">
                        {baseComp?.specifications?.max_current_ma ? `${baseComp.specifications.max_current_ma} mA` : 'Unknown'}
                      </span>
                    </div>

                    <div className="p-2 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[3px] flex justify-between">
                      <span className="text-[#65717C]">Pin Count:</span>
                      <span className="font-bold text-[#18232D]">
                        {baseComp?.specifications?.pin_count || 'Unknown'}
                      </span>
                    </div>

                    <div className="p-2 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[3px] flex justify-between">
                      <span className="text-[#65717C]">Operating Temp:</span>
                      <span className="font-bold text-[#18232D]">
                        {baseComp?.specifications?.operating_temp_min_c !== undefined
                          ? `${baseComp.specifications.operating_temp_min_c}°C to ${baseComp.specifications?.operating_temp_max_c}°C`
                          : 'Unknown'}
                      </span>
                    </div>

                    {baseComp?.specifications?.interfaces && baseComp.specifications.interfaces.length > 0 && (
                      <div className="p-2 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[3px]">
                        <span className="text-[#65717C] block mb-0.5">Required Interfaces:</span>
                        <span className="font-bold text-[#18232D]">
                          {baseComp.specifications.interfaces.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {baseComp?.datasheet_url && (
                  <div className="border-t border-[#ECEFEF] pt-2">
                    <a
                      href={baseComp.datasheet_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#087E8B] hover:underline font-mono text-[11px] inline-flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Original Datasheet Reference</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Main Panel (8 cols): Ranked Candidate Components */}
            <div className="lg:col-span-8 space-y-3">
              {/* Search & Filter Toolbar */}
              <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-3 shadow-[0_1px_2px_rgba(24,35,45,0.03)] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex border border-[#DDE2E4] rounded-[3px] bg-[#F8F9F8] p-0.5 font-mono text-[11px]">
                  <button
                    onClick={() => setCandidateFilter('ALL')}
                    className={`px-2.5 py-0.5 rounded-[2px] transition-colors ${
                      candidateFilter === 'ALL' ? 'bg-white text-[#18232D] font-bold shadow-xs' : 'text-[#65717C]'
                    }`}
                  >
                    All ({allCandidates.length})
                  </button>
                  <button
                    onClick={() => setCandidateFilter('COMPATIBLE')}
                    className={`px-2.5 py-0.5 rounded-[2px] transition-colors ${
                      candidateFilter === 'COMPATIBLE' ? 'bg-white text-[#0E6641] font-bold shadow-xs' : 'text-[#65717C]'
                    }`}
                  >
                    Viable ({discoveryData.candidates_count})
                  </button>
                  <button
                    onClick={() => setCandidateFilter('REVIEW')}
                    className={`px-2.5 py-0.5 rounded-[2px] transition-colors ${
                      candidateFilter === 'REVIEW' ? 'bg-white text-[#8A5200] font-bold shadow-xs' : 'text-[#65717C]'
                    }`}
                  >
                    Review Required
                  </button>
                  <button
                    onClick={() => setCandidateFilter('MISMATCH')}
                    className={`px-2.5 py-0.5 rounded-[2px] transition-colors ${
                      candidateFilter === 'MISMATCH' ? 'bg-white text-[#A82218] font-bold shadow-xs' : 'text-[#65717C]'
                    }`}
                  >
                    Hard Mismatches ({discoveryData.hard_mismatch_count})
                  </button>
                </div>

                {/* Candidate Search */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3 h-3 text-[#8E9BA7] absolute left-2 top-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate MPN, mfr, package..."
                    className="w-full text-xs pl-7 pr-2 py-1 border border-[#DDE2E4] rounded-[3px] font-mono text-[#18232D] outline-none focus:border-[#087E8B]"
                  />
                </div>
              </div>

              {/* Candidate Cards Grid */}
              <div className="space-y-3">
                {filteredCandidates.map((cand, idx) => {
                  const isSelected = activeCandidate?.candidate_id === cand.candidate_id;
                  const isHardMismatch = cand.compatibility_status === 'HARD_MISMATCH';
                  const resultTypeLabel = getCandidateResultTypeLabel(cand, baseComp);

                  return (
                    <div
                      key={cand.candidate_id}
                      onClick={() => setActiveCandidate(cand)}
                      className={`p-4 bg-white border rounded-[6px] cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#087E8B] ring-1 ring-[#087E8B] shadow-sm'
                          : isHardMismatch
                          ? 'border-[#DDE2E4] bg-[#FAFBF9]/80 hover:border-[#F3C7C4]'
                          : 'border-[#DDE2E4] hover:border-[#CBD2D5]'
                      }`}
                    >
                      {/* Top Header of Candidate */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-[#8E9BA7] font-bold">
                            #{idx + 1}
                          </span>
                          <span className="font-mono font-bold text-[14px] text-[#18232D]">
                            {cand.part_number}
                          </span>
                          <span className="text-xs text-[#65717C] font-medium">
                            {cand.manufacturer}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <CompatibilityBadge status={cand.compatibility_status} />
                          <span className="font-mono font-bold text-sm text-[#087E8B] bg-[#F0F6F7] px-2 py-0.5 rounded-[3px] border border-[#D0E7EA]">
                            {cand.heuristic_score}% Match
                          </span>
                        </div>
                      </div>

                      {/* Distinct Result Type Label Badge per Section 5.B */}
                      <div className="mb-2">
                        <span className={`inline-block px-2 py-0.5 rounded-[3px] font-mono text-[10.5px] font-bold ${
                          cand.origin_category === 'VERIFIED_INDIAN'
                            ? 'bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]'
                            : cand.origin_category === 'INDIAN_SUPPLIER_UNVERIFIED_MFR'
                            ? 'bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]'
                            : isHardMismatch
                            ? 'bg-[#FCF1F0] text-[#A82218] border border-[#F3C7C4]'
                            : 'bg-[#F0F6F7] text-[#087E8B] border border-[#D0E7EA]'
                        }`}>
                          {resultTypeLabel}
                        </span>
                      </div>

                      {/* Origin Classification with Evidence */}
                      <div className="flex flex-wrap items-center gap-3 text-xs mb-2">
                        <OriginBadge
                          category={cand.origin_category}
                          mfrCountry={cand.origin_label}
                        />
                        <span className="font-mono text-[11px] text-[#65717C]">
                          Lifecycle: <strong className="text-[#18232D]">{cand.lifecycle_status}</strong>
                        </span>
                        <span className="font-mono text-[11px] text-[#65717C]">
                          Redesign Effort: <strong className="text-[#087E8B]">{cand.redesign_effort}</strong>
                        </span>
                        {cand.datasheet_url && (
                          <a
                            href={cand.datasheet_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-mono text-[11px] text-[#087E8B] hover:underline inline-flex items-center gap-0.5 ml-auto"
                          >
                            Datasheet <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      {/* Explicit Specification Summary: "X fields match, Y mismatch, Z unknown" */}
                      <div className="p-2 bg-[#F8F9F8] border border-[#ECEFEF] rounded-[4px] text-xs font-mono mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[#0E6641] font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            {cand.matches_count} fields match
                          </span>
                          <span className={cand.mismatches_count > 0 ? 'text-[#A82218] font-bold' : 'text-[#65717C]'}>
                            {cand.mismatches_count} mismatch
                          </span>
                          <span className="text-[#8A5200]">
                            {cand.unknowns_count} unknown
                          </span>
                        </div>
                        <span className="text-[10px] text-[#8E9BA7]">
                          Category: {cand.category}
                        </span>
                      </div>

                      {/* Hard Mismatches Highlight if present */}
                      {cand.mismatch_details && cand.mismatch_details.length > 0 && (
                        <div className="p-2 bg-[#FCF1F0] border border-[#F3C7C4] rounded-[3px] text-xs text-[#A82218] mb-2 font-mono">
                          <span className="font-bold uppercase text-[10.5px] block">
                            HARD CONSTRAINT VIOLATIONS:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-[11px] pt-0.5">
                            {cand.mismatch_details.map((m, i) => (
                              <li key={i}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Ranking Rationale */}
                      <div className="text-[11.5px] text-[#65717C] leading-relaxed">
                        <strong className="text-[#18232D] font-mono text-[11px]">Ranking Rationale: </strong>
                        {cand.ranking_reason}
                      </div>
                    </div>
                  );
                })}

                {filteredCandidates.length === 0 && (
                  <div className="p-8 bg-white border border-[#DDE2E4] rounded-[6px] text-center font-mono text-xs text-[#8E9BA7]">
                    No suitable candidate found in available sources matching the active filter.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Technical Comparison Table below candidate list */}
          {activeCandidate && discoveryData.base_component && (
            <div className="pt-2">
              <SpecComparisonTable
                baseComponent={discoveryData.base_component}
                candidate={activeCandidate}
              />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
