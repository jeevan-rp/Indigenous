import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  RefreshCw,
  Check,
  Save,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api/client';

export const SettingsPage: React.FC<{ onResetSuccess?: () => void }> = ({ onResetSuccess }) => {
  const [settingsData, setSettingsData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [workspaceName, setWorkspaceName] = useState('');
  const [weightTech, setWeightTech] = useState(0.40);
  const [weightOrigin, setWeightOrigin] = useState(0.25);
  const [weightLife, setWeightLife] = useState(0.15);
  const [weightRedesign, setWeightRedesign] = useState(0.10);
  const [weightAvail, setWeightAvail] = useState(0.10);

  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const sRes = await api.getSettings();
      setSettingsData(sRes);
      setWorkspaceName(sRes.workspace_name);
      setWeightTech(sRes.scoring_weights.weight_technical_fit);
      setWeightOrigin(sRes.scoring_weights.weight_origin_verified_indian);
      setWeightLife(sRes.scoring_weights.weight_lifecycle_active);
      setWeightAvail(sRes.scoring_weights.weight_availability);
      setWeightRedesign(sRes.scoring_weights.weight_redesign_minimal);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setStatusMsg(null);
      await api.updateSettings({
        workspace_name: workspaceName,
        weight_technical_fit: weightTech,
        weight_origin: weightOrigin,
        weight_lifecycle: weightLife,
        weight_availability: weightAvail,
        weight_redesign: weightRedesign
      });
      setStatusMsg('Workspace parameters and scoring weights saved successfully.');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm('Reset entire workspace to baseline synthetic demo dataset? Custom uploaded BOMs will be replaced with baseline test records.')) {
      return;
    }
    try {
      setResetting(true);
      await api.resetDemoWorkspace();
      alert('Workspace reset successfully to clean synthetic demo dataset.');
      await loadSettings();
      if (onResetSuccess) onResetSuccess();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetting(false);
    }
  };

  const weightsSum = (
    parseFloat(String(weightTech)) +
    parseFloat(String(weightOrigin)) +
    parseFloat(String(weightLife)) +
    parseFloat(String(weightRedesign)) +
    parseFloat(String(weightAvail))
  ).toFixed(2);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#18232D] tracking-tight">
            Settings
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#F8F9F8] text-[#65717C] border border-[#DDE2E4]">
            WORKSPACE CONFIGURATION
          </span>
        </div>
        <p className="text-xs text-[#65717C]">
          Configure workspace identity, adjust deterministic ranking weights, and manage demo datasets.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3 bg-[#ECF7F2] border border-[#BCE3D1] rounded-[4px] text-xs text-[#0E6641] flex items-center gap-2 font-mono">
          <Check className="w-4 h-4 text-[#0E6641]" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* SECTION 1: Workspace Organization Title */}
      <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-3">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase text-[#18232D] tracking-wider">
            Workspace Identity
          </h3>
          <p className="text-xs text-[#65717C] mt-0.5">
            Operating organization name displayed across BOM reports and console headers.
          </p>
        </div>

        <div className="max-w-md space-y-2">
          <div>
            <label className="block text-[11px] font-mono text-[#65717C] uppercase mb-1">
              Organization / Workspace Title
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full text-xs p-2 border border-[#DDE2E4] rounded-[4px] font-mono font-medium text-[#18232D] outline-none focus:border-[#087E8B]"
            />
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-3.5 py-1.5 bg-[#18232D] hover:bg-[#253340] text-white text-xs font-mono font-medium rounded-[3px] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Update Workspace Title</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Heuristic Scoring Engine Weight Allocation */}
      <div className="bg-white border border-[#DDE2E4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase text-[#18232D] tracking-wider">
              Alternative Ranking Engine Weights
            </h3>
            <p className="text-xs text-[#65717C] mt-0.5">
              Secondary ranking weights applied after electrical constraint gates pass (Current Sum: {weightsSum})
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] bg-[#F8F9F8] text-[#65717C] border border-[#DDE2E4]">
            Target Sum: 1.00
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-2.5 bg-[#FAFBF9] border border-[#DDE2E4] rounded-[4px] text-xs font-mono space-y-1">
            <span className="font-bold text-[#18232D] block text-[11px]">Technical Fit</span>
            <span className="text-[#8E9BA7] text-[9.5px] block">Matches vs Mismatches</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={weightTech}
              onChange={(e) => setWeightTech(parseFloat(e.target.value) || 0)}
              className="w-full p-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-mono font-bold bg-white text-[#18232D]"
            />
          </div>

          <div className="p-2.5 bg-[#FAFBF9] border border-[#DDE2E4] rounded-[4px] text-xs font-mono space-y-1">
            <span className="font-bold text-[#18232D] block text-[11px]">Verified Indian</span>
            <span className="text-[#8E9BA7] text-[9.5px] block">Domestic Fab / Design</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={weightOrigin}
              onChange={(e) => setWeightOrigin(parseFloat(e.target.value) || 0)}
              className="w-full p-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-mono font-bold bg-white text-[#18232D]"
            />
          </div>

          <div className="p-2.5 bg-[#FAFBF9] border border-[#DDE2E4] rounded-[4px] text-xs font-mono space-y-1">
            <span className="font-bold text-[#18232D] block text-[11px]">Active Lifecycle</span>
            <span className="text-[#8E9BA7] text-[9.5px] block">Active vs NRND / EOL</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={weightLife}
              onChange={(e) => setWeightLife(parseFloat(e.target.value) || 0)}
              className="w-full p-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-mono font-bold bg-white text-[#18232D]"
            />
          </div>

          <div className="p-2.5 bg-[#FAFBF9] border border-[#DDE2E4] rounded-[4px] text-xs font-mono space-y-1">
            <span className="font-bold text-[#18232D] block text-[11px]">Minimal Redesign</span>
            <span className="text-[#8E9BA7] text-[9.5px] block">Pin-to-pin footprint</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={weightRedesign}
              onChange={(e) => setWeightRedesign(parseFloat(e.target.value) || 0)}
              className="w-full p-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-mono font-bold bg-white text-[#18232D]"
            />
          </div>

          <div className="p-2.5 bg-[#FAFBF9] border border-[#DDE2E4] rounded-[4px] text-xs font-mono space-y-1">
            <span className="font-bold text-[#18232D] block text-[11px]">Data Completeness</span>
            <span className="text-[#8E9BA7] text-[9.5px] block">Verified specs factor</span>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={weightAvail}
              onChange={(e) => setWeightAvail(parseFloat(e.target.value) || 0)}
              className="w-full p-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-mono font-bold bg-white text-[#18232D]"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-4 py-1.5 bg-[#087E8B] hover:bg-[#066570] text-white text-xs font-mono font-semibold rounded-[4px] transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Parameters'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: Demo Dataset Reset */}
      <div className="bg-white border border-[#F3C7C4] rounded-[6px] p-4 shadow-[0_1px_2px_rgba(24,35,45,0.03)] space-y-2 bg-[#FCF1F0]/20">
        <span className="text-xs font-mono font-bold uppercase text-[#A82218] block">
          Demo Dataset Reset Workbench
        </span>
        <p className="text-[11px] text-[#65717C] leading-relaxed">
          Restores database to the clean synthetic baseline: 14 semiconductor components across 6 categories, including SHAKTI RISC-V and VEGA-THEJAS-32 records, plus baseline BOM builds.
        </p>
        <button
          onClick={handleResetDemo}
          disabled={resetting}
          className="px-3.5 py-1.5 bg-[#A82218] hover:bg-[#8B1A12] text-white font-mono text-xs font-semibold rounded-[3px] transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
          <span>{resetting ? 'Resetting...' : 'Reset To Synthetic Demo Baseline'}</span>
        </button>
      </div>
    </div>
  );
};
