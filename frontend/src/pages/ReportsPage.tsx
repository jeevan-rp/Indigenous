import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  Check,
  Clock,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';
import { api } from '../api/client';
import { BOMHeader } from '../types';

export const ReportsPage: React.FC = () => {
  const [boms, setBoms] = useState<BOMHeader[]>([]);
  const [selectedBomId, setSelectedBomId] = useState<string>('');
  const [reportType, setReportType] = useState<'PDF' | 'CSV'>('PDF');
  const [generating, setGenerating] = useState(false);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [lastGenerated, setLastGenerated] = useState<any | null>(null);

  const loadReports = async () => {
    try {
      const list = await api.listReports();
      setRecentReports(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const blist = await api.listBoms();
        setBoms(blist);
        await loadReports();
      } catch (err) {
        console.error(err);
      }
    };
    init();
  }, []);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setLastGenerated(null);
      const res = await api.generateReport(selectedBomId || undefined, reportType);
      setLastGenerated(res);
      await loadReports();
    } catch (err: any) {
      alert(`Report compilation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#18232D] tracking-tight">
              Reports
            </h2>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#F8F9F8] text-[#65717C] border border-[#DDE2E4]">
              FORMAL AUDIT DOCUMENTATION
            </span>
          </div>
          <p className="text-xs text-[#65717C] mt-0.5">
            Generates downloadable technical dependency audits with verified manufacturer citations, timestamps, explicit UNKNOWN labels, and formula-injection defenses.
          </p>
        </div>

        {/* Generator Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1 text-xs">
          <div className="sm:col-span-5">
            <label className="block text-[10px] font-mono text-[#65717C] uppercase mb-1">
              Target Scope / BOM
            </label>
            <select
              value={selectedBomId}
              onChange={(e) => setSelectedBomId(e.target.value)}
              className="w-full text-xs p-2 border border-[#DDE2E4] rounded-[4px] font-mono text-[#18232D] bg-[#FAFBF9] outline-none focus:border-[#087E8B]"
            >
              <option value="">Entire Component Catalogue (All Parts)</option>
              {boms.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.total_items} line items)
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[10px] font-mono text-[#65717C] uppercase mb-1">
              Output Specification
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportType('PDF')}
                className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-[4px] border transition-colors flex items-center justify-center gap-1.5 ${
                  reportType === 'PDF'
                    ? 'bg-[#18232D] text-white border-[#18232D]'
                    : 'bg-[#FAFBF9] text-[#65717C] border-[#DDE2E4] hover:bg-[#F4F5F3]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#087E8B]" />
                <span>PDF Document</span>
              </button>

              <button
                type="button"
                onClick={() => setReportType('CSV')}
                className={`flex-1 py-1.5 text-xs font-mono font-medium rounded-[4px] border transition-colors flex items-center justify-center gap-1.5 ${
                  reportType === 'CSV'
                    ? 'bg-[#18232D] text-white border-[#18232D]'
                    : 'bg-[#FAFBF9] text-[#65717C] border-[#DDE2E4] hover:bg-[#F4F5F3]'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#0E6641]" />
                <span>CSV Audit File</span>
              </button>
            </div>
          </div>

          <div className="sm:col-span-3 flex items-end">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-2 bg-[#087E8B] hover:bg-[#066570] text-white font-mono text-xs font-semibold rounded-[4px] transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Compiling...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Compile Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instant Download Banner if generated */}
        {lastGenerated && (
          <div className="p-3 bg-[#ECF7F2] border border-[#BCE3D1] rounded-[4px] flex items-center justify-between text-xs text-[#0E6641] font-mono">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#0E6641]" />
              <span>
                Report compiled: <strong>{lastGenerated.title}</strong> ({lastGenerated.report_type})
              </span>
            </div>
            <a
              href={`http://127.0.0.1:8000${lastGenerated.download_url}`}
              target="_blank"
              rel="noreferrer"
              download
              className="px-3 py-1 bg-[#0E6641] hover:bg-[#0B5033] text-white font-semibold rounded-[3px] flex items-center gap-1 shadow-xs"
            >
              <Download className="w-3 h-3" />
              <span>Download File</span>
            </a>
          </div>
        )}
      </div>

      {/* Governance & Disclaimer Ribbon */}
      <div className="p-3 bg-white border border-[#DDE2E4] rounded-[6px] text-xs flex items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2 text-[#65717C]">
          <ShieldCheck className="w-4 h-4 text-[#087E8B] shrink-0" />
          <span>
            Compliance Policy: Reports contain full provenance timestamps, explicit UNKNOWN labels for incomplete fields, and formula-safe CSV encoding.
          </span>
        </div>
        <span className="text-[10.5px] text-[#8E9BA7] shrink-0">ISO/IEC 25010</span>
      </div>

      {/* Functional Reports Archive Table */}
      <div className="bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] overflow-hidden flex flex-col">
        <div className="p-3 bg-[#F8F9F8] border-b border-[#DDE2E4] flex items-center justify-between text-xs">
          <h3 className="font-mono font-bold uppercase text-[#18232D] tracking-wider">
            Archive Reports ({recentReports.length})
          </h3>
          <span className="text-[10.5px] font-mono text-[#65717C]">Downloadable verified documents</span>
        </div>

        <div className="overflow-x-auto">
          {recentReports.length === 0 ? (
            <div className="p-16 text-center font-mono text-xs text-[#8E9BA7]">
              No archived reports compiled yet. Use the compiler controls above to generate compliance documentation.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAFBF9] border-b border-[#DDE2E4] text-[10.5px] font-mono text-[#65717C] uppercase">
                  <th className="py-2 px-3.5 w-1/3">Report name</th>
                  <th className="py-2 px-3.5">BOM / Product Scope</th>
                  <th className="py-2 px-3.5">Created date</th>
                  <th className="py-2 px-3.5">Components flagged</th>
                  <th className="py-2 px-3.5">Data status</th>
                  <th className="py-2 px-3.5 text-right">Download action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ECEFEF]">
                {recentReports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FAFBF9] transition-colors">
                    <td className="py-2.5 px-3.5">
                      <div className="font-mono font-bold text-[#18232D] flex items-center gap-2">
                        <span>{r.title}</span>
                        <span className={`px-1.5 py-0.2 rounded-[2px] text-[9.5px] font-mono font-bold ${
                          r.report_type === 'PDF'
                            ? 'bg-[#FCF1F0] text-[#A82218] border border-[#F3C7C4]'
                            : 'bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]'
                        }`}>
                          {r.report_type}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#18232D] font-mono text-[11px]">
                      {r.bom_id ? 'Assembly Scoped' : 'Global Catalogue Scope'}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-[#65717C]">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px]">
                      {r.summary_data ? (
                        <span className="text-[#18232D]">
                          {r.summary_data.critical_count} Critical • {r.summary_data.verified_indian_count} Indian Mfr
                        </span>
                      ) : (
                        <span className="text-[#8E9BA7]">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="inline-block px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]">
                        Verified
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <a
                        href={`http://127.0.0.1:8000${r.download_url}`}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="px-2.5 py-1 bg-[#F8F9F8] hover:bg-[#ECEFEF] text-[#18232D] border border-[#DDE2E4] rounded-[3px] font-mono text-[11px] font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <Download className="w-3 h-3 text-[#087E8B]" />
                        <span>Download</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
