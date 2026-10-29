import React, { useState, useEffect } from 'react';
import {
  Upload,
  Download,
  AlertTriangle,
  Check,
  Trash2,
  Plus,
  RefreshCw,
  FileSpreadsheet,
  FileCheck,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  X,
  FileText,
  Clock,
  Layers,
  ArrowRight,
  Cpu,
  Info,
  Building2,
  Store
} from 'lucide-react';
import { api } from '../api/client';
import { BOMHeader, BOMAnalysisResult, AnalyzedBOMItem, OriginCategory, CriticalityLevel, ComponentItem } from '../types';
import { CriticalityBadge, OriginBadge, LifecycleBadge, CompatibilityBadge, SourcingStatusBadge } from '../components/common/Badges';
import { StatCard } from '../components/common/StatCard';
import { ComponentSourcingDrawer } from '../components/sellers/ComponentSourcingDrawer';

interface Props {
  onNavigateToAnalysis?: (bomId: string) => void;
  onNavigateToAlternatives?: (compId: string) => void;
  onNavigateToSimulator?: (compId: string) => void;
  onNavigateToSellers?: (partNumber?: string) => void;
  initialBomId?: string;
}

const ANALYSIS_STAGES = [
  'Reading BOM',
  'Normalising part numbers',
  'Matching catalogue records',
  'Checking manufacturer and origin evidence',
  'Evaluating criticality',
  'Searching configured data sources',
  'Finding potential alternatives',
  'Preparing report'
];

export const BomUploadPage: React.FC<Props> = ({
  onNavigateToAlternatives,
  onNavigateToSimulator,
  initialBomId
}) => {
  const [boms, setBoms] = useState<BOMHeader[]>([]);
  const [selectedBomId, setSelectedBomId] = useState<string>(initialBomId || '');
  const [loadingBoms, setLoadingBoms] = useState(true);

  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<BOMAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStageIdx, setAnalysisStageIdx] = useState<number>(0);

  // Active view tab: 'components' | 'critical' | 'upload'
  const [viewTab, setViewTab] = useState<'components' | 'critical' | 'upload'>('components');

  // Filters for All Components table
  const [tableFilter, setTableFilter] = useState<
    | 'ALL'
    | 'SELLER_AVAILABLE'
    | 'NO_SELLER'
    | 'VERIFIED_INDIAN_MFR'
    | 'INDIAN_DISTRIBUTOR'
    | 'WITH_ALTS'
    | 'ORIGIN_UNKNOWN'
    | 'CRITICAL'
    | 'FOREIGN'
  >('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Sourcing drawer state
  const [selectedSourcingItem, setSelectedSourcingItem] = useState<AnalyzedBOMItem | null>(null);

  // Upload modal / drawer
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTab, setUploadTab] = useState<'file' | 'manual'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bomName, setBomName] = useState('');
  const [bomDesc, setBomDesc] = useState('');
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Manual BOM entry state
  const [manualRows, setManualRows] = useState<Array<{
    reference_designator: string;
    part_number: string;
    manufacturer: string;
    category: string;
    quantity: number;
    required_voltage: string;
    package: string;
    criticality: string;
  }>>([
    { reference_designator: 'U1', part_number: 'STM32F401RET6', manufacturer: 'STMicroelectronics', category: 'Microcontroller', quantity: 1, required_voltage: '3.3V', package: 'LQFP-64', criticality: 'CRITICAL' },
    { reference_designator: 'U2', part_number: 'LM1117IMP-3.3', manufacturer: 'Texas Instruments', category: 'Voltage Regulator', quantity: 2, required_voltage: '3.3V', package: 'SOT-223', criticality: 'HIGH' }
  ]);
  const [manualBomName, setManualBomName] = useState('Power & Compute Subsystem');
  const [savingManual, setSavingManual] = useState(false);

  // Component detail drawer
  const [selectedDetailItem, setSelectedDetailItem] = useState<AnalyzedBOMItem | null>(null);
  const [loadingDetailComp, setLoadingDetailComp] = useState(false);
  const [fullCompRecord, setFullCompRecord] = useState<ComponentItem | null>(null);

  // Load registered BOMs
  const loadBoms = async (targetSelectId?: string) => {
    try {
      setLoadingBoms(true);
      const res = await api.listBoms();
      setBoms(res);
      const sel = targetSelectId || (res.length > 0 ? (selectedBomId && res.some(b => b.id === selectedBomId) ? selectedBomId : res[0].id) : '');
      if (sel) {
        setSelectedBomId(sel);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to query registered BOMs');
    } finally {
      setLoadingBoms(false);
    }
  };

  useEffect(() => {
    loadBoms(initialBomId);
  }, [initialBomId]);

  // Run analysis when selectedBomId changes
  useEffect(() => {
    if (selectedBomId) {
      runAnalysis(selectedBomId);
    } else {
      setAnalysisResult(null);
    }
  }, [selectedBomId]);

  const runAnalysis = async (bomId: string) => {
    try {
      setAnalyzing(true);
      setAnalysisStageIdx(0);

      // Multi-stage progress visual simulation matched with API execution
      const stageInterval = setInterval(() => {
        setAnalysisStageIdx((prev) => (prev < ANALYSIS_STAGES.length - 1 ? prev + 1 : prev));
      }, 220);

      const res = await api.analyzeBom(bomId);
      clearInterval(stageInterval);
      setAnalysisStageIdx(ANALYSIS_STAGES.length - 1);
      setAnalysisResult(res);
    } catch (err: any) {
      setErrorMsg(`Analysis failed: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  // Inspect component detail
  const handleOpenDetail = async (item: AnalyzedBOMItem) => {
    setSelectedDetailItem(item);
    setFullCompRecord(null);
    if (item.component_id) {
      try {
        setLoadingDetailComp(true);
        const comp = await api.getComponent(item.component_id);
        setFullCompRecord(comp);
      } catch (err) {
        console.warn('Could not load full catalogue record:', err);
      } finally {
        setLoadingDetailComp(false);
      }
    }
  };

  // Handle file selection for upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setBomName(file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').toUpperCase());
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        setValidating(true);
        const fd = new FormData();
        fd.append('file', file);
        const preview = await api.previewBomUpload(fd);
        setPreviewResult(preview);
      } catch (err: any) {
        setErrorMsg(err.message || 'Validation error while parsing spreadsheet');
        setPreviewResult(null);
      } finally {
        setValidating(false);
      }
    }
  };

  // Confirm and upload BOM
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;
    try {
      setUploading(true);
      setErrorMsg(null);
      const fd = new FormData();
      fd.append('file', selectedFile);
      if (bomName) fd.append('name', bomName);
      if (bomDesc) fd.append('description', bomDesc);

      const created = await api.uploadBom(fd);
      setSuccessMsg(`Successfully imported and mapped '${created.name}' (${created.total_items} line items).`);
      setSelectedFile(null);
      setPreviewResult(null);
      setShowUploadModal(false);
      await loadBoms(created.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'BOM upload and mapping failed');
    } finally {
      setUploading(false);
    }
  };

  // Save manual BOM
  const handleSaveManual = async () => {
    const valid = manualRows.filter((r) => r.part_number.trim());
    if (valid.length === 0) {
      alert('Enter at least one valid part number.');
      return;
    }
    try {
      setSavingManual(true);
      const headers = ['reference_designator', 'part_number', 'manufacturer', 'category', 'quantity', 'required_voltage', 'package', 'criticality'];
      const csvLines = [headers.join(',')];
      valid.forEach((r) => {
        csvLines.push([
          `"${r.reference_designator}"`,
          `"${r.part_number}"`,
          `"${r.manufacturer}"`,
          `"${r.category}"`,
          r.quantity,
          `"${r.required_voltage}"`,
          `"${r.package}"`,
          `"${r.criticality}"`
        ].join(','));
      });
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
      const file = new File([blob], `${manualBomName.replace(/\s+/g, '_')}.csv`, { type: 'text/csv' });
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', manualBomName);
      fd.append('description', 'Manually compiled Bill of Materials assembly');

      const created = await api.uploadBom(fd);
      setSuccessMsg(`BOM '${created.name}' created (${created.total_items} items).`);
      setShowUploadModal(false);
      await loadBoms(created.id);
    } catch (err: any) {
      alert(`Manual compile failed: ${err.message}`);
    } finally {
      setSavingManual(false);
    }
  };

  // Delete BOM
  const handleDeleteBom = async (id: string) => {
    if (!confirm('Remove this Bill of Materials assembly from the workspace?')) return;
    try {
      await api.deleteBom(id);
      await loadBoms();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Download Report
  const handleDownloadReport = async (type: 'PDF' | 'CSV') => {
    if (!selectedBomId) return;
    try {
      const rep = await api.generateReport(selectedBomId, type);
      const downloadUrl = api.getReportDownloadUrl(rep.id);
      window.open(downloadUrl, '_blank');
    } catch (err: any) {
      alert(`Report download failed: ${err.message}`);
    }
  };

  // Filter items
  const items = analysisResult?.items_analyzed || [];
  const uniqueCategories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));

  const filteredItems = items.filter((item) => {
    // Quick search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPn = item.part_number.toLowerCase().includes(q);
      const matchMfr = item.manufacturer.toLowerCase().includes(q);
      const matchCat = (item.category || '').toLowerCase().includes(q);
      const matchDesc = (item.description || item.product_name || '').toLowerCase().includes(q);
      if (!matchPn && !matchMfr && !matchCat && !matchDesc) return false;
    }

    // Category filter
    if (selectedCategoryFilter !== 'ALL' && item.category !== selectedCategoryFilter) {
      return false;
    }

    if (tableFilter === 'CRITICAL') return item.is_critical;
    if (tableFilter === 'SELLER_AVAILABLE') return (item.indian_seller_listings_count || 0) > 0;
    if (tableFilter === 'NO_SELLER') return (item.indian_seller_listings_count || 0) === 0;
    if (tableFilter === 'VERIFIED_INDIAN_MFR') return item.origin_category === 'VERIFIED_INDIAN';
    if (tableFilter === 'INDIAN_DISTRIBUTOR') return item.origin_category === 'INDIAN_SUPPLIER_UNVERIFIED_MFR' || (item.indian_seller_listings_count || 0) > 0;
    if (tableFilter === 'WITH_ALTS') return (item.potential_indian_alternatives_count || 0) > 0 || (item.viable_alternatives_count || 0) > 0;
    if (tableFilter === 'ORIGIN_UNKNOWN') return item.origin_category === 'UNKNOWN';
    if (tableFilter === 'FOREIGN') return item.origin_category === 'FOREIGN';
    return true;
  });

  const criticalItems = items.filter((item) => item.is_critical);
  const summary = analysisResult?.summary_metrics;

  return (
    <div className="space-y-4">
      {/* PAGE HEADER */}
      <div className="p-4 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#18232D] tracking-tight">
              BOM Analysis
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1] font-semibold">
              CORE WORKFLOW
            </span>
          </div>
          <p className="text-xs text-[#65717C] mt-0.5">
            Upload your component list to identify critical parts and sourcing risks.
          </p>
        </div>

        {/* Header Controls: Assembly Switcher, Upload BOM, Download Template */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* BOM Assembly Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[#65717C] uppercase font-bold">Assembly:</span>
            <select
              value={selectedBomId}
              onChange={(e) => setSelectedBomId(e.target.value)}
              className="text-xs p-1.5 border border-[#DDE2E4] rounded-[4px] font-mono font-bold text-[#18232D] bg-[#FAFBF9] outline-none focus:border-[#087E8B] max-w-[220px]"
            >
              {boms.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.total_items} items)
                </option>
              ))}
            </select>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => {
              setShowUploadModal(true);
              setPreviewResult(null);
              setSelectedFile(null);
            }}
            className="px-3 py-1.5 bg-[#087E8B] hover:bg-[#066570] text-white rounded-[4px] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>+ Upload BOM</span>
          </button>

          {/* Download Sample Template */}
          <a
            href={api.getSampleBomTemplateUrl()}
            target="_blank"
            rel="noreferrer"
            download="sample_bom_template.csv"
            className="px-3 py-1.5 bg-[#F8F9F8] hover:bg-[#ECEFEF] text-[#18232D] border border-[#DDE2E4] rounded-[4px] text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
            title="Download CSV sample format with reference headers"
          >
            <Download className="w-3.5 h-3.5 text-[#087E8B]" />
            <span>Sample Template</span>
          </a>

          {/* Export Report Actions */}
          {selectedBomId && (
            <div className="flex border border-[#DDE2E4] rounded-[4px] bg-[#F8F9F8] p-0.5">
              <button
                onClick={() => handleDownloadReport('PDF')}
                className="px-2 py-1 text-[11px] font-mono font-semibold text-[#18232D] hover:bg-white rounded-[3px] transition-colors"
                title="Download formal engineering PDF compliance report"
              >
                PDF Report
              </button>
              <button
                onClick={() => handleDownloadReport('CSV')}
                className="px-2 py-1 text-[11px] font-mono font-semibold text-[#65717C] hover:text-[#18232D] hover:bg-white rounded-[3px] transition-colors"
                title="Download CSV export"
              >
                CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3 bg-[#ECF7F2] border border-[#BCE3D1] rounded-[4px] text-xs text-[#0E6641] flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono">
            <Check className="w-4 h-4 text-[#0E6641]" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[#0E6641] hover:underline font-mono text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-[#FCF1F0] border border-[#F3C7C4] rounded-[4px] text-xs text-[#A82218] flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono">
            <AlertTriangle className="w-4 h-4 text-[#A82218]" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-[#A82218] hover:underline font-mono text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* ANALYSIS IN PROGRESS MODAL / OVERLAY */}
      {analyzing && (
        <div className="p-6 bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-[#ECEFEF] pb-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#087E8B] animate-spin" />
              <span className="font-mono text-xs font-bold text-[#18232D] uppercase tracking-wider">
                ANALYSIS PROGRESS — RESOLVING DEPENDENCIES & SOURCING
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#65717C]">
              Step {analysisStageIdx + 1} of {ANALYSIS_STAGES.length}
            </span>
          </div>

          {/* 8 Explicit Analysis Stages */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {ANALYSIS_STAGES.map((stage, idx) => {
              const isDone = idx < analysisStageIdx;
              const isCurrent = idx === analysisStageIdx;
              return (
                <div
                  key={stage}
                  className={`p-2.5 rounded-[4px] border font-mono text-xs flex items-center gap-2 transition-all ${
                    isDone
                      ? 'bg-[#ECF7F2] border-[#BCE3D1] text-[#0E6641]'
                      : isCurrent
                      ? 'bg-[#F0F6F7] border-[#087E8B] text-[#087E8B] font-bold shadow-xs'
                      : 'bg-[#FAFBF9] border-[#ECEFEF] text-[#8E9BA7]'
                  }`}
                >
                  <span className="text-[10px] w-4 h-4 rounded-full flex items-center justify-center shrink-0 border border-current font-bold">
                    {isDone ? '✓' : idx + 1}
                  </span>
                  <span className="truncate">{stage}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4.D: ANALYSIS RESULTS SUMMARY (7 COMPACT METRICS) */}
      {!analyzing && summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <div className="p-3 bg-white border border-[#DDE2E4] rounded-[4px] shadow-[0_1px_2px_rgba(24,35,45,0.02)]">
            <span className="text-[10px] font-mono font-bold text-[#65717C] uppercase block truncate">
              Total BOM Items
            </span>
            <span className="text-xl font-mono font-bold text-[#18232D] mt-0.5 block">
              {summary.total_items}
            </span>
            <span className="text-[10px] font-mono text-[#8E9BA7]">Registered lines</span>
          </div>

          <div className="p-3 bg-white border border-[#DDE2E4] rounded-[4px] shadow-[0_1px_2px_rgba(24,35,45,0.02)]">
            <span className="text-[10px] font-mono font-bold text-[#65717C] uppercase block truncate">
              Unique Parts
            </span>
            <span className="text-xl font-mono font-bold text-[#18232D] mt-0.5 block">
              {summary.unique_components}
            </span>
            <span className="text-[10px] font-mono text-[#8E9BA7]">Distinct MPNs</span>
          </div>

          <div className="p-3 bg-white border border-[#DDE2E4] border-l-[3px] border-l-[#A82218] rounded-[4px] shadow-[0_1px_2px_rgba(24,35,45,0.02)]">
            <span className="text-[10px] font-mono font-bold text-[#A82218] uppercase block truncate">
              Critical Parts
            </span>
            <span className="text-xl font-mono font-bold text-[#A82218] mt-0.5 block">
              {summary.critical_components}
            </span>
            <span className="text-[10px] font-mono text-[#65717C]">Priority items</span>
          </div>

          <div className="p-3 bg-white border border-[#DDE2E4] border-l-[3px] border-l-[#8A5200] rounded-[4px] shadow-[0_1px_2px_rgba(24,35,45,0.02)]">
            <span className="text-[10px] font-mono font-bold text-[#8A5200] uppercase block truncate">
              Foreign Mfrs
            </span>
            <span className="text-xl font-mono font-bold text-[#8A5200] mt-0.5 block">
              {summary.verified_foreign_components}
            </span>
            <span className="text-[10px] font-mono text-[#65717C]">Overseas fabs</span>
          </div>

          <div className="p-3 bg-white border border-[#DDE2E4] rounded-[4px] shadow-[0_1px_2px_rgba(24,35,45,0.02)]">
            <span className="text-[10px] font-mono font-bold text-[#19527D] uppercase block truncate">
              Unknown Origin
            </span>
            <span className="text-xl font-mono font-bold text-[#19527D] mt-0.5 block">
              {summary.unknown_origin_components}
            </span>
            <span className="text-[10px] font-mono text-[#65717C]">Unverified source</span>
          </div>

          <div className="p-3 bg-white border border-[#DDE2E4] border-l-[3px] border-l-[#0E6641] rounded-[4px] shadow-[0_1px_2px_rgba(24,35,45,0.02)]">
            <span className="text-[10px] font-mono font-bold text-[#0E6641] uppercase block truncate">
              Indian Alts
            </span>
            <span className="text-xl font-mono font-bold text-[#0E6641] mt-0.5 block">
              {summary.components_with_potential_indian_alternatives}
            </span>
            <span className="text-[10px] font-mono text-[#0E6641]">Candidates found</span>
          </div>

          <div className="p-3 bg-white border border-[#DDE2E4] rounded-[4px] shadow-[0_1px_2px_rgba(24,35,45,0.02)]">
            <span className="text-[10px] font-mono font-bold text-[#65717C] uppercase block truncate">
              Needs Review
            </span>
            <span className="text-xl font-mono font-bold text-[#18232D] mt-0.5 block">
              {summary.components_requiring_verification}
            </span>
            <span className="text-[10px] font-mono text-[#8E9BA7]">Missing data/review</span>
          </div>
        </div>
      )}

      {/* VIEW TABS: [ All Components Table ] vs [ Critical Components Report ] */}
      <div className="flex items-center justify-between border-b border-[#DDE2E4] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewTab('components')}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-[4px] transition-colors ${
              viewTab === 'components'
                ? 'bg-[#087E8B] text-white shadow-xs'
                : 'bg-white text-[#65717C] hover:text-[#18232D] border border-[#DDE2E4]'
            }`}
          >
            All Components ({items.length})
          </button>
          <button
            onClick={() => setViewTab('critical')}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-[4px] transition-colors flex items-center gap-1.5 ${
              viewTab === 'critical'
                ? 'bg-[#A82218] text-white shadow-xs'
                : 'bg-white text-[#A82218] hover:bg-[#FCF1F0] border border-[#F3C7C4]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Critical Components ({criticalItems.length})</span>
          </button>
        </div>

        {/* Re-Analyse & Delete BOM */}
        {selectedBomId && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => runAnalysis(selectedBomId)}
              disabled={analyzing}
              className="px-2.5 py-1 bg-[#F8F9F8] hover:bg-[#ECEFEF] text-[#18232D] border border-[#DDE2E4] rounded-[3px] text-xs font-mono font-medium transition-colors flex items-center gap-1"
              title="Re-run heuristic scoring, origin checks, and alternative finder"
            >
              <RefreshCw className={`w-3 h-3 text-[#087E8B] ${analyzing ? 'animate-spin' : ''}`} />
              <span>Re-Analyse</span>
            </button>
            <button
              onClick={() => handleDeleteBom(selectedBomId)}
              className="p-1 rounded-[3px] text-[#65717C] hover:text-[#A82218] border border-transparent hover:border-[#F3C7C4] hover:bg-[#FCF1F0]"
              title="Remove BOM"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* VIEW TAB 1: ALL COMPONENTS TABLE */}
      {viewTab === 'components' && (
        <div className="bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] overflow-hidden flex flex-col">
          {/* Table Filters Toolbar */}
          <div className="p-3 bg-[#FAFBF9] border-b border-[#DDE2E4] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
              <span className="text-[#65717C] font-bold uppercase text-[10px] mr-1">Filter:</span>
              <button
                onClick={() => setTableFilter('ALL')}
                className={`px-2 py-0.5 rounded-[2px] transition-colors ${
                  tableFilter === 'ALL' ? 'bg-[#18232D] text-white font-bold' : 'bg-white border border-[#DDE2E4] text-[#65717C]'
                }`}
              >
                All ({items.length})
              </button>
              <button
                onClick={() => setTableFilter('SELLER_AVAILABLE')}
                className={`px-2 py-0.5 rounded-[2px] transition-colors ${
                  tableFilter === 'SELLER_AVAILABLE' ? 'bg-[#0E6641] text-white font-bold' : 'bg-white border border-[#BCE3D1] text-[#0E6641]'
                }`}
              >
                Seller Listings ({items.filter(i => (i.indian_seller_listings_count || 0) > 0).length})
              </button>
              <button
                onClick={() => setTableFilter('NO_SELLER')}
                className={`px-2 py-0.5 rounded-[2px] transition-colors ${
                  tableFilter === 'NO_SELLER' ? 'bg-[#8A5200] text-white font-bold' : 'bg-white border border-[#F0D5BA] text-[#8A5200]'
                }`}
              >
                No Seller Found ({items.filter(i => (i.indian_seller_listings_count || 0) === 0).length})
              </button>
              <button
                onClick={() => setTableFilter('VERIFIED_INDIAN_MFR')}
                className={`px-2 py-0.5 rounded-[2px] transition-colors ${
                  tableFilter === 'VERIFIED_INDIAN_MFR' ? 'bg-[#0E6641] text-white font-bold' : 'bg-white border border-[#BCE3D1] text-[#0E6641]'
                }`}
              >
                Verified Indian Mfr ({items.filter(i => i.origin_category === 'VERIFIED_INDIAN').length})
              </button>
              <button
                onClick={() => setTableFilter('INDIAN_DISTRIBUTOR')}
                className={`px-2 py-0.5 rounded-[2px] transition-colors ${
                  tableFilter === 'INDIAN_DISTRIBUTOR' ? 'bg-[#19527D] text-white font-bold' : 'bg-white border border-[#BFD9EA] text-[#19527D]'
                }`}
              >
                Indian Distributor / Seller ({items.filter(i => i.origin_category === 'INDIAN_SUPPLIER_UNVERIFIED_MFR' || (i.indian_seller_listings_count || 0) > 0).length})
              </button>
              <button
                onClick={() => setTableFilter('WITH_ALTS')}
                className={`px-2 py-0.5 rounded-[2px] transition-colors ${
                  tableFilter === 'WITH_ALTS' ? 'bg-[#087E8B] text-white font-bold' : 'bg-white border border-[#D0E7EA] text-[#087E8B]'
                }`}
              >
                Domestic Alts Available ({items.filter(i => (i.potential_indian_alternatives_count || 0) > 0 || (i.viable_alternatives_count || 0) > 0).length})
              </button>
              <button
                onClick={() => setTableFilter('ORIGIN_UNKNOWN')}
                className={`px-2 py-0.5 rounded-[2px] transition-colors ${
                  tableFilter === 'ORIGIN_UNKNOWN' ? 'bg-[#55606B] text-white font-bold' : 'bg-white border border-[#DDE2E4] text-[#55606B]'
                }`}
              >
                Origin Unknown ({items.filter(i => i.origin_category === 'UNKNOWN').length})
              </button>
              <button
                onClick={() => setTableFilter('CRITICAL')}
                className={`px-2 py-0.5 rounded-[2px] transition-colors ${
                  tableFilter === 'CRITICAL' ? 'bg-[#A82218] text-white font-bold' : 'bg-white border border-[#DDE2E4] text-[#A82218]'
                }`}
              >
                Critical ({criticalItems.length})
              </button>
            </div>

            {/* Controls: Category Dropdown & Quick Search */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <span className="text-[#65717C] uppercase font-bold text-[10px]">Category:</span>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="text-xs py-1 px-2 border border-[#DDE2E4] rounded-[4px] font-mono text-[#18232D] bg-white outline-none focus:border-[#087E8B]"
                >
                  <option value="ALL">All Categories ({uniqueCategories.length})</option>
                  {uniqueCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-[#8E9BA7] absolute left-2 top-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search part, mfr, category..."
                  className="w-full text-xs pl-7 pr-2 py-1 border border-[#DDE2E4] rounded-[4px] font-mono text-[#18232D] outline-none focus:border-[#087E8B] bg-white"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8F9F8] border-b border-[#DDE2E4] text-[10px] font-mono text-[#65717C] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Part Number</th>
                  <th className="py-2.5 px-3">Component Description</th>
                  <th className="py-2.5 px-3">Manufacturer</th>
                  <th className="py-2.5 px-2 text-center w-12">BOM Qty</th>
                  <th className="py-2.5 px-3">Mfr Origin Status</th>
                  <th className="py-2.5 px-3">Indian Seller Listings</th>
                  <th className="py-2.5 px-3">Potential Indian Alternatives</th>
                  <th className="py-2.5 px-3">Sourcing Status</th>
                  <th className="py-2.5 px-3 text-right min-w-[150px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEFEF]">
                {filteredItems.map((item, idx) => (
                  <tr
                    key={item.bom_item_id}
                    onClick={() => handleOpenDetail(item)}
                    className="hover:bg-[#F0F6F7] cursor-pointer transition-colors"
                  >
                    {/* 1. Part Number */}
                    <td className="py-2.5 px-3">
                      <div className="font-mono font-bold text-[#18232D] text-xs">
                        {item.part_number}
                      </div>
                      <div className="text-[10px] font-mono text-[#8E9BA7] flex items-center gap-1.5 mt-0.5">
                        <span>{item.reference_designator || `Ref L${idx + 1}`}</span>
                        {item.package && <span>• {item.package}</span>}
                      </div>
                    </td>

                    {/* 2. Component Description */}
                    <td className="py-2.5 px-3 max-w-[200px]">
                      <div className="text-[11.5px] text-[#18232D] truncate" title={item.description || item.product_name || item.category || 'Component'}>
                        {item.description || item.product_name || (item.category ? `${item.category}${item.package ? ` (${item.package})` : ''}` : 'Electronic Component')}
                      </div>
                      <div className="text-[10px] font-mono text-[#65717C]">
                        {item.category || 'Standard IC'}
                        {item.required_voltage ? ` • ${item.required_voltage}` : ''}
                      </div>
                    </td>

                    {/* 3. Manufacturer */}
                    <td className="py-2.5 px-3 text-[#18232D] font-medium text-[11.5px]">
                      {item.manufacturer}
                    </td>

                    {/* 4. BOM Quantity */}
                    <td className="py-2.5 px-2 text-center font-mono font-bold text-xs text-[#18232D]">
                      {item.quantity}
                    </td>

                    {/* 5. Manufacturer Origin Status */}
                    <td className="py-2.5 px-3">
                      <OriginBadge
                        category={item.origin_category}
                        mfrCountry={item.manufacturer_country}
                        compact
                      />
                    </td>

                    {/* 6. Indian Seller Listings Found */}
                    <td className="py-2.5 px-3">
                      {(item.indian_seller_listings_count || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-bold text-[#0E6641] bg-[#ECF7F2] px-2 py-0.5 rounded-[2px] border border-[#BCE3D1]">
                          <Building2 className="w-3 h-3 text-[#0E6641]" />
                          {item.indian_seller_listings_count} Indian {item.indian_seller_listings_count === 1 ? 'seller' : 'sellers'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#8E9BA7] bg-[#FAFBF9] px-1.5 py-0.5 rounded-[2px] border border-[#DDE2E4]">
                          No seller listing found
                        </span>
                      )}
                    </td>

                    {/* 7. Potential Indian Alternatives */}
                    <td className="py-2.5 px-3">
                      {(item.potential_indian_alternatives_count || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] font-bold text-[#087E8B] bg-[#F0F6F7] px-2 py-0.5 rounded-[2px] border border-[#D0E7EA]">
                          <Layers className="w-3 h-3 text-[#087E8B]" />
                          {item.potential_indian_alternatives_count} domestic {item.potential_indian_alternatives_count === 1 ? 'alt' : 'alts'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#8E9BA7] bg-[#FAFBF9] px-1.5 py-0.5 rounded-[2px] border border-[#DDE2E4]">
                          0 Indian alts
                        </span>
                      )}
                    </td>

                    {/* 8. Sourcing Status */}
                    <td className="py-2.5 px-3">
                      <SourcingStatusBadge
                        status={item.sourcing_status || (item.indian_seller_listings_count > 0 ? 'SELLER_FOUND' : 'NO_SELLER_FOUND')}
                      />
                    </td>

                    {/* 9. Actions */}
                    <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedSourcingItem(item)}
                        className="px-2 py-1 bg-[#087E8B] hover:bg-[#066570] text-white rounded-[3px] text-[10.5px] font-mono font-semibold transition-colors inline-flex items-center gap-1 shadow-xs"
                        title="View Indian sellers, contacts, and request RFQ"
                      >
                        <Store className="w-3 h-3" />
                        <span>View Sellers</span>
                      </button>
                      <button
                        onClick={() => handleOpenDetail(item)}
                        className="px-1.5 py-1 bg-white hover:bg-[#FAFBF9] text-[#65717C] border border-[#DDE2E4] rounded-[3px] text-[10.5px] font-mono transition-colors"
                        title="Inspect technical specifications and origin evidence"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center font-mono text-xs text-[#8E9BA7]">
                      No components match the active filter or search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: CRITICAL COMPONENTS DEDICATED REPORT VIEW */}
      {viewTab === 'critical' && (
        <div className="space-y-3">
          <div className="p-3 bg-[#FCF1F0] border border-[#F3C7C4] rounded-[4px] text-xs text-[#A82218] flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono">
              <ShieldAlert className="w-4 h-4 text-[#A82218]" />
              <span>
                <strong>CRITICAL COMPONENTS AUDIT:</strong> Showing {criticalItems.length} components requiring priority domestic alternative qualification.
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#A82218]">
              Criticality derived from uploaded BOM specifications and system heuristic rules.
            </span>
          </div>

          <div className="space-y-3">
            {criticalItems.map((crit, idx) => (
              <div
                key={crit.bom_item_id}
                className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-3"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ECEFEF] pb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-[#A82218] bg-[#FCF1F0] px-1.5 py-0.5 rounded-[2px] border border-[#F3C7C4]">
                      CRITICAL #{idx + 1}
                    </span>
                    <span className="font-mono font-bold text-sm text-[#18232D]">
                      {crit.part_number}
                    </span>
                    <span className="text-xs text-[#65717C]">
                      {crit.manufacturer} ({crit.category})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <OriginBadge category={crit.origin_category} mfrCountry={crit.manufacturer_country} />
                    {crit.component_id && onNavigateToAlternatives && (
                      <button
                        onClick={() => onNavigateToAlternatives(crit.component_id!)}
                        className="px-2.5 py-1 bg-[#087E8B] hover:bg-[#066570] text-white rounded-[3px] font-mono text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <span>Find Indian Sourcing</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2-Column Structured Audit Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Left Column: Why Critical & Sourcing Concern */}
                  <div className="space-y-2 p-3 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[4px]">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#A82218] block">Why It Is Critical:</span>
                      <p className="text-[11.5px] text-[#18232D] mt-0.5 font-sans leading-normal">
                        {crit.why_critical}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#ECEFEF]">
                      <span className="text-[10px] font-bold uppercase text-[#8A5200] block">Why Sourcing Is A Concern:</span>
                      <p className="text-[11.5px] text-[#18232D] mt-0.5 font-sans leading-normal">
                        {crit.why_sourcing_concern}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#ECEFEF]">
                      <span className="text-[10px] font-bold uppercase text-[#65717C] block">Country-of-Manufacture Evidence:</span>
                      <p className="text-[11px] text-[#18232D] mt-0.5">
                        {crit.country_evidence_summary}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Sourcing Options, Missing Info, Next Action */}
                  <div className="space-y-2 p-3 bg-[#FAFBF9] border border-[#ECEFEF] rounded-[4px]">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-[#0E6641] block">Indian Sourcing Options:</span>
                      {crit.indian_sourcing_options && crit.indian_sourcing_options.length > 0 ? (
                        <div className="mt-1 space-y-1">
                          {crit.indian_sourcing_options.map((opt) => (
                            <div key={opt.candidate_id} className="p-1.5 bg-white border border-[#DDE2E4] rounded-[3px] flex items-center justify-between text-[11px]">
                              <div>
                                <span className="font-bold text-[#18232D]">{opt.part_number}</span>
                                <span className="text-[#65717C] ml-1.5">({opt.manufacturer})</span>
                              </div>
                              <span className="text-[10px] text-[#0E6641] font-semibold">
                                {opt.heuristic_score}% match
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#65717C] mt-0.5 italic">
                          No verified Indian manufacturer candidate in local catalogue.
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#ECEFEF]">
                      <span className="text-[10px] font-bold uppercase text-[#65717C] block">Missing Information:</span>
                      {crit.missing_information && crit.missing_information.length > 0 ? (
                        <ul className="list-disc list-inside text-[11px] text-[#8A5200] mt-0.5 space-y-0.5">
                          {crit.missing_information.map((m, i) => (
                            <li key={i}>{m}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[11px] text-[#0E6641]">All essential electrical specifications registered.</span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#ECEFEF]">
                      <span className="text-[10px] font-bold uppercase text-[#087E8B] block">Recommended Next Action:</span>
                      <p className="text-[11.5px] text-[#087E8B] font-bold mt-0.5">
                        {crit.recommended_action}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPONENT DETAIL MODAL / DRAWER */}
      {selectedDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18232D]/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#DDE2E4] rounded-[6px] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-lg animate-in fade-in-50">
            {/* Header */}
            <div className="p-4 bg-[#F8F9F8] border-b border-[#DDE2E4] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono font-bold text-base text-[#18232D]">
                    {selectedDetailItem.part_number}
                  </h3>
                  <CriticalityBadge level={selectedDetailItem.criticality} />
                </div>
                <div className="text-xs text-[#65717C] mt-0.5">
                  {selectedDetailItem.manufacturer} • {selectedDetailItem.category}
                </div>
              </div>
              <button
                onClick={() => setSelectedDetailItem(null)}
                className="p-1 rounded-[3px] text-[#65717C] hover:text-[#18232D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4 space-y-4 overflow-y-auto text-xs">
              {/* SECTION 1: Technical Specifications */}
              <div className="space-y-1.5">
                <span className="font-mono font-bold uppercase text-[10.5px] text-[#18232D] block">
                  SECTION 1 — Technical Specifications
                </span>
                <div className="overflow-x-auto border border-[#DDE2E4] rounded-[4px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAFBF9] border-b border-[#DDE2E4] font-mono text-[10px] text-[#65717C] uppercase">
                        <th className="py-1.5 px-3">Parameter</th>
                        <th className="py-1.5 px-3">Value</th>
                        <th className="py-1.5 px-3">Unit</th>
                        <th className="py-1.5 px-3">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECEFEF] font-mono text-[11px]">
                      <tr>
                        <td className="py-1.5 px-3 text-[#65717C]">Package Footprint</td>
                        <td className="py-1.5 px-3 font-bold">{selectedDetailItem.package || 'Unspecified'}</td>
                        <td className="py-1.5 px-3 text-[#8E9BA7]">—</td>
                        <td className="py-1.5 px-3 text-[#0E6641]">{selectedDetailItem.package ? 'Verified' : 'Pending'}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-[#65717C]">Operating Voltage</td>
                        <td className="py-1.5 px-3 font-bold">{selectedDetailItem.required_voltage || (fullCompRecord?.specifications?.nominal_voltage_v ? `${fullCompRecord.specifications.nominal_voltage_v}` : 'Unspecified')}</td>
                        <td className="py-1.5 px-3 text-[#8E9BA7]">V</td>
                        <td className="py-1.5 px-3 text-[#0E6641]">Nominal</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 px-3 text-[#65717C]">Lifecycle Status</td>
                        <td className="py-1.5 px-3 font-bold">{selectedDetailItem.lifecycle_status}</td>
                        <td className="py-1.5 px-3 text-[#8E9BA7]">—</td>
                        <td className="py-1.5 px-3 text-[#18232D]">Catalogue</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION 2: Manufacturer & Origin Evidence */}
              <div className="space-y-1.5">
                <span className="font-mono font-bold uppercase text-[10.5px] text-[#18232D] block">
                  SECTION 2 — Manufacturer & Origin Provenance
                </span>
                <div className="p-3 bg-[#FAFBF9] border border-[#DDE2E4] rounded-[4px] space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#65717C]">Manufacturer:</span>
                    <span className="font-bold text-[#18232D]">{selectedDetailItem.manufacturer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#65717C]">Country of Manufacture:</span>
                    <span className="font-bold text-[#18232D]">{selectedDetailItem.manufacturer_country || 'Unknown / Unspecified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#65717C]">Origin Evidence:</span>
                    <span className="text-[#18232D]">{selectedDetailItem.country_evidence_summary}</span>
                  </div>
                  {selectedDetailItem.datasheet_url && (
                    <div className="pt-1">
                      <a
                        href={selectedDetailItem.datasheet_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#087E8B] hover:underline flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Official Datasheet Reference</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: BOM Usage */}
              <div className="space-y-1.5">
                <span className="font-mono font-bold uppercase text-[10.5px] text-[#18232D] block">
                  SECTION 3 — BOM Usage
                </span>
                <div className="p-2.5 bg-[#FAFBF9] border border-[#DDE2E4] rounded-[4px] font-mono text-[11px] flex justify-between">
                  <span>Assembly: <strong>{analysisResult?.bom_name}</strong></span>
                  <span>Quantity: <strong>{selectedDetailItem.quantity} units</strong></span>
                </div>
              </div>

              {/* SECTION 4: Risk Reasons */}
              <div className="space-y-1.5">
                <span className="font-mono font-bold uppercase text-[10.5px] text-[#A82218] block">
                  SECTION 4 — Sourcing Risk Reasons
                </span>
                <div className="p-3 bg-[#FCF1F0] border border-[#F3C7C4] rounded-[4px] text-xs text-[#A82218] space-y-1">
                  <div><strong>Criticality:</strong> {selectedDetailItem.why_critical}</div>
                  <div><strong>Sourcing Concern:</strong> {selectedDetailItem.why_sourcing_concern}</div>
                </div>
              </div>

              {/* SECTION 5: Alternatives */}
              <div className="space-y-1.5">
                <span className="font-mono font-bold uppercase text-[10.5px] text-[#0E6641] block">
                  SECTION 5 — Candidate Alternatives
                </span>
                {selectedDetailItem.indian_sourcing_options && selectedDetailItem.indian_sourcing_options.length > 0 ? (
                  <div className="space-y-1 font-mono text-xs">
                    {selectedDetailItem.indian_sourcing_options.map((cand) => (
                      <div key={cand.candidate_id} className="p-2 bg-[#FAFBF9] border border-[#DDE2E4] rounded-[3px] flex items-center justify-between">
                        <div>
                          <span className="font-bold text-[#18232D]">{cand.part_number}</span>
                          <span className="text-[#65717C] ml-1">({cand.manufacturer})</span>
                        </div>
                        <span className="text-[#0E6641] font-bold">{cand.heuristic_score}% match</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#65717C] font-mono italic">No candidate alternatives registered in catalogue.</p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-3 bg-[#F8F9F8] border-t border-[#DDE2E4] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#65717C]">Heuristic decision support record</span>
              <div className="flex items-center gap-2">
                {selectedDetailItem.component_id && onNavigateToAlternatives && (
                  <button
                    onClick={() => {
                      onNavigateToAlternatives(selectedDetailItem.component_id!);
                      setSelectedDetailItem(null);
                    }}
                    className="px-3 py-1.5 bg-[#087E8B] hover:bg-[#066570] text-white rounded-[3px] text-xs font-semibold flex items-center gap-1"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Find Indian Sources</span>
                  </button>
                )}
                {selectedDetailItem.component_id && onNavigateToSimulator && (
                  <button
                    onClick={() => {
                      onNavigateToSimulator(selectedDetailItem.component_id!);
                      setSelectedDetailItem(null);
                    }}
                    className="px-3 py-1.5 bg-white border border-[#DDE2E4] hover:bg-[#FAFBF9] text-[#18232D] rounded-[3px] text-xs font-medium"
                  >
                    Simulate Unavailable
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD & PREVIEW MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18232D]/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#DDE2E4] rounded-[6px] max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-lg">
            {/* Modal Header */}
            <div className="p-4 bg-[#F8F9F8] border-b border-[#DDE2E4] flex items-center justify-between">
              <div>
                <h3 className="font-mono font-bold text-sm text-[#18232D] uppercase tracking-wider">
                  Upload Bill of Materials (BOM)
                </h3>
                <p className="text-xs text-[#65717C] mt-0.5">
                  Import your parts spreadsheet for validation and dependency analysis.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-[3px] text-[#65717C] hover:text-[#18232D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto text-xs">
              {/* Tab Selector: Spreadsheet vs Manual Entry */}
              <div className="flex border border-[#DDE2E4] rounded-[4px] bg-[#F8F9F8] p-0.5 w-fit">
                <button
                  onClick={() => setUploadTab('file')}
                  className={`px-3 py-1 text-xs font-mono font-medium rounded-[3px] transition-colors ${
                    uploadTab === 'file' ? 'bg-white text-[#18232D] font-bold shadow-xs' : 'text-[#65717C]'
                  }`}
                >
                  Spreadsheet (.CSV / .XLSX)
                </button>
                <button
                  onClick={() => setUploadTab('manual')}
                  className={`px-3 py-1 text-xs font-mono font-medium rounded-[3px] transition-colors ${
                    uploadTab === 'manual' ? 'bg-white text-[#18232D] font-bold shadow-xs' : 'text-[#65717C]'
                  }`}
                >
                  Manual Entry
                </button>
              </div>

              {uploadTab === 'file' ? (
                <div className="space-y-4">
                  {/* Dropzone */}
                  <div className="border-2 border-dashed border-[#DDE2E4] hover:border-[#087E8B] rounded-[4px] p-6 text-center bg-[#FAFBF9] transition-colors">
                    <input
                      type="file"
                      id="modal-bom-file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="modal-bom-file" className="cursor-pointer block space-y-2">
                      <Upload className="w-7 h-7 text-[#087E8B] mx-auto" />
                      <div className="text-xs text-[#18232D]">
                        <span className="font-semibold text-[#087E8B] hover:underline">Click to browse</span> or drag and drop BOM file
                      </div>
                      <div className="text-[11px] font-mono text-[#8E9BA7]">
                        Supported formats: .CSV, .XLSX, .XLS • Maximum size: 10 MB
                      </div>
                      <div className="text-[10.5px] font-mono text-[#65717C] pt-1">
                        Expected columns: reference_designator, part_number, manufacturer, description, quantity, category, voltage, current, package, criticality
                      </div>
                    </label>

                    {selectedFile && (
                      <div className="mt-3 p-2 bg-white border border-[#DDE2E4] rounded-[4px] inline-flex items-center gap-2 font-mono text-xs text-[#18232D]">
                        <FileSpreadsheet className="w-4 h-4 text-[#087E8B]" />
                        <span className="font-bold">{selectedFile.name}</span>
                        <span className="text-[#65717C]">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}
                  </div>

                  {validating && (
                    <div className="p-3 text-center font-mono text-xs text-[#65717C] flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 text-[#087E8B] animate-spin" />
                      <span>Validating spreadsheet rows and inspecting headers...</span>
                    </div>
                  )}

                  {/* PREVIEW AND VALIDATION REPORT */}
                  {previewResult && (
                    <div className="space-y-3 p-3 bg-[#FAFBF9] border border-[#DDE2E4] rounded-[4px]">
                      <div className="flex items-center justify-between border-b border-[#ECEFEF] pb-2">
                        <span className="font-mono text-xs font-bold text-[#18232D]">
                          PREVIEW & VALIDATION SUMMARY
                        </span>
                        <span className={`px-2 py-0.5 rounded-[2px] font-mono text-[10px] font-bold ${
                          previewResult.success ? 'bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]' : 'bg-[#FCF1F0] text-[#A82218] border border-[#F3C7C4]'
                        }`}>
                          {previewResult.success ? 'VALIDATION PASSED' : 'CORRECTIONS REQUIRED'}
                        </span>
                      </div>

                      {/* Validation Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div className="p-2 bg-white border border-[#DDE2E4] rounded-[3px]">
                          <span className="text-[#65717C] text-[10px] block">TOTAL ROWS:</span>
                          <span className="font-bold text-[#18232D]">{previewResult.total_rows}</span>
                        </div>
                        <div className="p-2 bg-white border border-[#DDE2E4] rounded-[3px]">
                          <span className="text-[#0E6641] text-[10px] block">VALID ROWS:</span>
                          <span className="font-bold text-[#0E6641]">{previewResult.valid_rows_count}</span>
                        </div>
                        <div className="p-2 bg-white border border-[#DDE2E4] rounded-[3px]">
                          <span className="text-[#8A5200] text-[10px] block">MISSING FIELDS:</span>
                          <span className="font-bold text-[#8A5200]">{previewResult.rows_with_missing_fields_count || 0}</span>
                        </div>
                        <div className="p-2 bg-white border border-[#DDE2E4] rounded-[3px]">
                          <span className="text-[#65717C] text-[10px] block">DUPLICATE MPNS:</span>
                          <span className="font-bold text-[#18232D]">{(previewResult.duplicate_part_numbers || []).length}</span>
                        </div>
                      </div>

                      {/* Unrecognised columns callout if any */}
                      {previewResult.unrecognised_columns && previewResult.unrecognised_columns.length > 0 && (
                        <div className="p-2 bg-[#FFF9E6] border border-[#F2DEAF] rounded-[3px] text-[11px] font-mono text-[#8A5200]">
                          <strong>Unrecognised Columns:</strong> {previewResult.unrecognised_columns.join(', ')} (safely preserved in raw notes)
                        </div>
                      )}

                      {/* Preview Table */}
                      {previewResult.items && previewResult.items.length > 0 && (
                        <div className="overflow-x-auto border border-[#DDE2E4] rounded-[3px]">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#F8F9F8] border-b border-[#DDE2E4] font-mono text-[10px] text-[#65717C] uppercase">
                                <th className="p-1.5">Part Number</th>
                                <th className="p-1.5">Manufacturer</th>
                                <th className="p-1.5">Category</th>
                                <th className="p-1.5">Qty</th>
                                <th className="p-1.5">Voltage</th>
                                <th className="p-1.5">Criticality</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ECEFEF] font-mono text-[11px]">
                              {previewResult.items.slice(0, 5).map((row: any, i: number) => (
                                <tr key={i}>
                                  <td className="p-1.5 font-bold text-[#18232D]">{row.part_number}</td>
                                  <td className="p-1.5 text-[#18232D]">{row.manufacturer}</td>
                                  <td className="p-1.5 text-[#65717C]">{row.category || '—'}</td>
                                  <td className="p-1.5">{row.quantity}</td>
                                  <td className="p-1.5">{row.required_voltage || '—'}</td>
                                  <td className="p-1.5">
                                    <CriticalityBadge level={row.criticality} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Name input */}
                      <div className="pt-1">
                        <label className="block text-[10.5px] font-mono uppercase text-[#65717C] mb-1">
                          Assembly Name
                        </label>
                        <input
                          type="text"
                          value={bomName}
                          onChange={(e) => setBomName(e.target.value)}
                          placeholder="e.g. Flight Controller Rev C"
                          className="w-full text-xs p-1.5 border border-[#DDE2E4] rounded-[3px] font-mono text-[#18232D]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Manual Entry Form */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#18232D]">
                      Direct Bill of Materials Line Items
                    </span>
                    <button
                      onClick={() => setManualRows([
                        ...manualRows,
                        { reference_designator: `U${manualRows.length + 1}`, part_number: '', manufacturer: '', category: 'Passive', quantity: 1, required_voltage: '3.3V', package: '0805', criticality: 'MEDIUM' }
                      ])}
                      className="px-2 py-1 bg-[#F8F9F8] hover:bg-[#ECEFEF] text-[#18232D] border border-[#DDE2E4] rounded-[3px] text-xs font-mono font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-[#087E8B]" />
                      <span>Add Row</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-[#DDE2E4] rounded-[4px]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F8F9F8] border-b border-[#DDE2E4] font-mono text-[10px] text-[#65717C] uppercase">
                          <th className="p-1.5">Ref</th>
                          <th className="p-1.5">Part Number</th>
                          <th className="p-1.5">Manufacturer</th>
                          <th className="p-1.5">Category</th>
                          <th className="p-1.5 w-16">Qty</th>
                          <th className="p-1.5">Voltage</th>
                          <th className="p-1.5">Criticality</th>
                          <th className="p-1.5 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ECEFEF]">
                        {manualRows.map((r, idx) => (
                          <tr key={idx}>
                            <td className="p-1">
                              <input
                                type="text"
                                value={r.reference_designator}
                                onChange={(e) => {
                                  const updated = [...manualRows];
                                  updated[idx].reference_designator = e.target.value;
                                  setManualRows(updated);
                                }}
                                className="w-12 text-xs p-1 border border-[#DDE2E4] rounded font-mono"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={r.part_number}
                                onChange={(e) => {
                                  const updated = [...manualRows];
                                  updated[idx].part_number = e.target.value;
                                  setManualRows(updated);
                                }}
                                placeholder="Part number"
                                className="w-full text-xs p-1 border border-[#DDE2E4] rounded font-mono"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={r.manufacturer}
                                onChange={(e) => {
                                  const updated = [...manualRows];
                                  updated[idx].manufacturer = e.target.value;
                                  setManualRows(updated);
                                }}
                                placeholder="Manufacturer"
                                className="w-full text-xs p-1 border border-[#DDE2E4] rounded"
                              />
                            </td>
                            <td className="p-1">
                              <select
                                value={r.category}
                                onChange={(e) => {
                                  const updated = [...manualRows];
                                  updated[idx].category = e.target.value;
                                  setManualRows(updated);
                                }}
                                className="w-full text-xs p-1 border border-[#DDE2E4] rounded font-mono"
                              >
                                <option value="Microcontroller">Microcontroller</option>
                                <option value="Voltage Regulator">Voltage Regulator</option>
                                <option value="Sensor">Sensor</option>
                                <option value="Transceiver">Transceiver</option>
                                <option value="Passive">Passive</option>
                              </select>
                            </td>
                            <td className="p-1">
                              <input
                                type="number"
                                min="1"
                                value={r.quantity}
                                onChange={(e) => {
                                  const updated = [...manualRows];
                                  updated[idx].quantity = parseInt(e.target.value) || 1;
                                  setManualRows(updated);
                                }}
                                className="w-14 text-xs p-1 border border-[#DDE2E4] rounded font-mono"
                              />
                            </td>
                            <td className="p-1">
                              <input
                                type="text"
                                value={r.required_voltage}
                                onChange={(e) => {
                                  const updated = [...manualRows];
                                  updated[idx].required_voltage = e.target.value;
                                  setManualRows(updated);
                                }}
                                className="w-16 text-xs p-1 border border-[#DDE2E4] rounded font-mono"
                              />
                            </td>
                            <td className="p-1">
                              <select
                                value={r.criticality}
                                onChange={(e) => {
                                  const updated = [...manualRows];
                                  updated[idx].criticality = e.target.value;
                                  setManualRows(updated);
                                }}
                                className="w-full text-xs p-1 border border-[#DDE2E4] rounded font-mono"
                              >
                                <option value="CRITICAL">CRITICAL</option>
                                <option value="HIGH">HIGH</option>
                                <option value="MEDIUM">MEDIUM</option>
                                <option value="LOW">LOW</option>
                              </select>
                            </td>
                            <td className="p-1 text-center">
                              <button
                                onClick={() => setManualRows(manualRows.filter((_, i) => i !== idx))}
                                disabled={manualRows.length === 1}
                                className="text-[#65717C] hover:text-[#A82218]"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3 bg-[#F8F9F8] border-t border-[#DDE2E4] flex items-center justify-between">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-3 py-1.5 bg-white border border-[#DDE2E4] hover:bg-[#FAFBF9] text-[#18232D] rounded-[4px] text-xs font-mono"
              >
                Cancel
              </button>

              {uploadTab === 'file' ? (
                <button
                  onClick={handleConfirmUpload}
                  disabled={uploading || !previewResult || !previewResult.success}
                  className="px-4 py-1.5 bg-[#087E8B] hover:bg-[#066570] text-white text-xs font-semibold rounded-[4px] transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing & Mapping...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Confirm and Analyse BOM ({previewResult?.items?.length || 0} Line Items)</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSaveManual}
                  disabled={savingManual}
                  className="px-4 py-1.5 bg-[#087E8B] hover:bg-[#066570] text-white text-xs font-semibold rounded-[4px] transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  {savingManual ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Compiling...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Confirm and Analyse BOM</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMPONENT SOURCING DRAWER */}
      {selectedSourcingItem && (
        <ComponentSourcingDrawer
          isOpen={!!selectedSourcingItem}
          onClose={() => setSelectedSourcingItem(null)}
          partNumber={selectedSourcingItem.part_number}
          manufacturer={selectedSourcingItem.manufacturer}
          quantityRequired={selectedSourcingItem.quantity}
          bomId={selectedBomId}
          onNavigateToAlternatives={(part) => {
            setSelectedSourcingItem(null);
            if (selectedSourcingItem.component_id && onNavigateToAlternatives) {
              onNavigateToAlternatives(selectedSourcingItem.component_id);
            }
          }}
        />
      )}
    </div>
  );
};
