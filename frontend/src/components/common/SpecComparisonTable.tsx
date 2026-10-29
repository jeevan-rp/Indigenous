import React from 'react';
import { SpecStatusBadge, CompatibilityBadge, OriginBadge } from './Badges';
import { AlternativeCandidate, ComponentItem } from '../../types';
import { ShieldAlert, ExternalLink, Check, AlertTriangle, X } from 'lucide-react';

interface Props {
  baseComponent: ComponentItem;
  candidate: AlternativeCandidate;
}

export const SpecComparisonTable: React.FC<Props> = ({ baseComponent, candidate }) => {
  const details = candidate.comparison_details || [];
  const matches = candidate.matches_count || 0;
  const mismatches = candidate.mismatches_count || 0;
  const unknowns = candidate.unknowns_count || 0;

  return (
    <div className="bg-white border border-[#DDE2E4] rounded-[6px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] overflow-hidden">
      {/* Comparison Header Ribbon */}
      <div className="p-3.5 bg-[#F8F9F8] border-b border-[#DDE2E4] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#087E8B]">
              Side-by-Side Parameter Audit
            </span>
            <CompatibilityBadge status={candidate.compatibility_status} />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-mono font-bold text-[15px] text-[#18232D]">
              {baseComponent.part_number}
            </span>
            <span className="text-xs text-[#65717C] font-mono">VS</span>
            <span className="font-mono font-bold text-[15px] text-[#087E8B]">
              {candidate.part_number}
            </span>
            <span className="text-xs text-[#65717C]">({candidate.manufacturer})</span>
          </div>
        </div>

        {/* Verification Summary Counters */}
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-[4px] border border-[#DDE2E4] text-xs">
          <div className="text-right pr-3 border-r border-[#ECEFEF]">
            <div className="text-[9.5px] font-mono uppercase text-[#65717C]">Weighted Fit</div>
            <div className="text-lg font-mono font-bold text-[#087E8B]">
              {candidate.heuristic_score}%
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-[#0E6641] font-semibold flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" /> {matches} Matches
            </span>
            <span className={`${mismatches > 0 ? 'text-[#A82218] font-bold' : 'text-[#65717C]'} flex items-center gap-1`}>
              <X className="w-3 h-3 stroke-[3]" /> {mismatches} Mismatches
            </span>
            <span className="text-[#8A5200] font-medium flex items-center gap-1">
              ? {unknowns} Unknown
            </span>
          </div>
        </div>
      </div>

      {/* Prominent Hard Mismatch Alert Banner */}
      {candidate.compatibility_status === 'HARD_MISMATCH' && (
        <div className="p-3.5 bg-[#FCF1F0] border-b border-[#F3C7C4] text-[#A82218] flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#A82218] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold uppercase tracking-wide">
              HARD SPECIFICATION MISMATCH DETECTED
            </span>
            <p className="text-[11.5px] leading-relaxed">
              This candidate violates one or more hard electrical or packaging requirements. It cannot be approved as a drop-in replacement without circuit modification or redesign.
            </p>
            {candidate.mismatch_details && candidate.mismatch_details.length > 0 && (
              <ul className="list-disc list-inside font-mono text-[11px] font-semibold pt-0.5 space-y-0.5">
                {candidate.mismatch_details.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Origin & Provenance Comparison Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#ECEFEF] bg-[#FAFBF9] border-b border-[#DDE2E4] p-3 text-xs">
        <div>
          <span className="text-[10px] font-mono uppercase text-[#65717C] block mb-0.5">
            Original Part Provenance
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-[#18232D]">{baseComponent.part_number}</span>
            <span className="text-[#65717C]">{baseComponent.manufacturer}</span>
            <OriginBadge category={baseComponent.origin_category} mfrCountry={baseComponent.manufacturer_country} compact />
          </div>
        </div>

        <div className="pt-2 md:pt-0 md:pl-4">
          <span className="text-[10px] font-mono uppercase text-[#65717C] block mb-0.5">
            Candidate Part Provenance
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-[#087E8B]">{candidate.part_number}</span>
            <span className="text-[#65717C]">{candidate.manufacturer}</span>
            <OriginBadge category={candidate.origin_category} mfrCountry={candidate.origin_label} compact />
            {candidate.datasheet_url && (
              <a
                href={candidate.datasheet_url}
                target="_blank"
                rel="noreferrer"
                className="text-[#087E8B] hover:underline font-mono text-[11px] inline-flex items-center gap-0.5 ml-auto"
              >
                Datasheet <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Technical Specification Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F8F9F8] border-b border-[#DDE2E4] text-[10.5px] font-mono text-[#65717C] uppercase tracking-wider">
              <th className="py-2 px-3.5 w-1/4">Specification Parameter</th>
              <th className="py-2 px-3.5 w-1/5">Original Part Value</th>
              <th className="py-2 px-3.5 w-1/5">Candidate Part Value</th>
              <th className="py-2 px-3.5 w-24 text-center">Assessment</th>
              <th className="py-2 px-3.5">Engineering Rationale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECEFEF]">
            {details.map((item, idx) => {
              const rowBg =
                item.status === 'MISMATCH'
                  ? 'bg-[#FCF1F0]/40 hover:bg-[#FCF1F0]/60'
                  : item.status === 'UNKNOWN'
                  ? 'bg-[#FFF9E6]/30 hover:bg-[#FFF9E6]/50'
                  : 'hover:bg-[#F9FAF9]';

              return (
                <tr key={idx} className={rowBg}>
                  <td className="py-2 px-3.5 font-medium text-[#18232D]">
                    <span>{item.name}</span>
                    {item.importance === 'CRITICAL' && (
                      <span className="ml-1.5 text-[9.5px] font-mono font-bold text-[#A82218] uppercase px-1 py-0.2 bg-[#FCF1F0] border border-[#F3C7C4] rounded-[2px]">
                        Hard Rule
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3.5 font-mono text-[#18232D]">
                    {item.base_value !== null && item.base_value !== undefined && item.base_value !== '' ? (
                      String(item.base_value)
                    ) : (
                      <span className="text-[#8E9BA7] italic">UNKNOWN</span>
                    )}
                  </td>
                  <td className="py-2 px-3.5 font-mono font-medium text-[#18232D]">
                    {item.candidate_value !== null && item.candidate_value !== undefined && item.candidate_value !== '' ? (
                      String(item.candidate_value)
                    ) : (
                      <span className="text-[#8E9BA7] italic">UNKNOWN</span>
                    )}
                  </td>
                  <td className="py-2 px-3.5 text-center">
                    <SpecStatusBadge status={item.status} />
                  </td>
                  <td className="py-2 px-3.5 text-[#65717C] text-[11px] leading-relaxed">
                    {item.reason}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Redesign Assessment Footer */}
      <div className="p-3 bg-[#F8F9F8] border-t border-[#DDE2E4] text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#18232D]">Estimated Redesign Effort:</span>
          <span className={`px-2 py-0.5 rounded-[3px] font-mono text-[11px] font-bold ${
            candidate.redesign_effort === 'MINIMAL'
              ? 'bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]'
              : candidate.redesign_effort === 'MODERATE'
              ? 'bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]'
              : 'bg-[#FCF1F0] text-[#A82218] border border-[#F3C7C4]'
          }`}>
            {candidate.redesign_effort}
          </span>
          <span className="text-[#65717C] text-[11px]">— {candidate.redesign_note}</span>
        </div>

        <div className="font-mono text-[10.5px] text-[#8E9BA7]">
          Verified against Component DB Schema v1.0
        </div>
      </div>
    </div>
  );
};
