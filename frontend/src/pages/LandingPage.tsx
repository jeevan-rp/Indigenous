import React from 'react';
import { Upload, ArrowRight, ShieldCheck, CheckCircle2, AlertTriangle, Layers, Cpu, Database } from 'lucide-react';
import { PageId } from '../components/layout/Sidebar';

interface Props {
  onNavigate: (page: PageId) => void;
}

export const LandingPage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-8 sm:p-12 shadow-xl border border-slate-700 relative overflow-hidden">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-900/80 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            Decision-Support for Electronic Manufacturing & Systems Engineering
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Understand critical electronic component dependencies and evaluate potential replacements with transparent technical evidence.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            When a critical semiconductor or microcontroller becomes unavailable, finding a technically compatible drop-in replacement is time-intensive and risky. Our platform analyzes your Bill of Materials, uncovers single-source bottlenecks, checks hard electrical & mechanical constraints, and discovers verified Indian and global alternatives.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm transition-all shadow-lg shadow-teal-950/50"
            >
              <span>Explore Demo Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('boms')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold text-sm transition-all"
            >
              <Upload className="w-4 h-4 text-teal-400" />
              <span>Upload Custom BOM</span>
            </button>
          </div>
        </div>

        {/* Ambient watermark icon */}
        <Cpu className="absolute -right-8 -bottom-8 w-72 h-72 text-teal-500/10 pointer-events-none" />
      </div>

      {/* Mandatory Engineering Safety Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <span className="font-bold">MANDATORY ENGINEERING SAFETY NOTICE:</span>
          {' '}All compatibility scores, migration estimates, and risk flags calculated by this platform are algorithmic heuristic decision-support indicators. Human engineering verification of complete manufacturer datasheets, schematic pinouts, thermal dissipation, and timing margins is strictly required before any alternative component is approved for physical production hardware.
        </div>
      </div>

      {/* 3-Step Workflow Section */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-2xl font-black text-slate-900">
            Three-Step Decision Support Workflow
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Deterministic, explainable rule checks at every phase.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
            <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-800 font-black flex items-center justify-center text-lg mb-4">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Upload Bill of Materials</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Import CSV or XLSX spreadsheets with flexible column mapping. The system validates row integrity, catches malformed quantities, and parses electrical parameters without discarding bad rows.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 font-black flex items-center justify-center text-lg mb-4">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Analyse Dependencies & Risk</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Detect components shared across multiple products, single-source vulnerabilities, lifecycle status (EOL/NRND), and origin uncertainty using transparent heuristic weighting.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-lg mb-4">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Compare Alternatives with Evidence</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Execute category-aware hard constraint checks (voltage, current, package footprint, interfaces). View side-by-side MATCH, MISMATCH, and UNKNOWN badges with verified provenance.
            </p>
          </div>
        </div>
      </div>

      {/* Core Safety & Ethical Data Rules Grid */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-teal-600" />
          Core Safety & Scientific Transparency Rules
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-0.5">1. No Blanket Indigenous Claims</span>
            We never claim that all imported components have Indian substitutes. If no alternative exists, the system states it honestly.
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-0.5">2. Strict Provenance Distinction</span>
            We distinguish manufacturer country, supplier/distributor country, and design origin. Selling an imported IC via an Indian distributor does not make it Indian.
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-0.5">3. Missing Specs Are UNKNOWN</span>
            Missing technical parameters are explicitly shown as UNKNOWN. They are NEVER assumed to match.
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-bold text-slate-900 block mb-0.5">4. No Hallucinations or Inventions</span>
            We never invent specifications, stock availability, or lead times. Demo data is clearly labeled as SYNTHETIC / ILLUSTRATIVE.
          </div>
        </div>
      </div>
    </div>
  );
};
