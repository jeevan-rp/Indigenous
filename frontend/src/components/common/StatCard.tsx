import React from 'react';

interface Props {
  label: string;
  value: string | number;
  subtext?: string;
  provenance?: string;
  accent?: 'default' | 'critical' | 'warning' | 'verified';
  tag?: string;
}

export const StatCard: React.FC<Props> = ({
  label,
  value,
  subtext,
  provenance,
  accent = 'default',
  tag
}) => {
  const accentBorder = {
    default: 'border-l-[#087E8B]',
    critical: 'border-l-[#A82218]',
    warning: 'border-l-[#8A5200]',
    verified: 'border-l-[#0E6641]'
  }[accent];

  return (
    <div className={`p-3.5 bg-white border border-[#DDE2E4] border-l-[3px] ${accentBorder} rounded-[4px] shadow-[0_1px_2px_rgba(24,35,45,0.03)] flex flex-col justify-between`}>
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[11px] font-medium tracking-wide uppercase text-[#65717C]">
          {label}
        </span>
        {tag && (
          <span className="text-[9.5px] font-mono px-1.5 py-0.2 bg-[#F4F5F3] text-[#65717C] border border-[#DDE2E4] rounded-[2px]">
            {tag}
          </span>
        )}
      </div>

      <div className="my-0.5">
        <span className="text-2xl font-mono font-semibold tracking-tight text-[#18232D]">
          {value}
        </span>
      </div>

      {(subtext || provenance) && (
        <div className="text-[11px] text-[#65717C] leading-tight mt-1 flex items-center justify-between">
          {subtext && <span>{subtext}</span>}
          {provenance && <span className="font-mono text-[10px] text-[#8E9BA7]">{provenance}</span>}
        </div>
      )}
    </div>
  );
};
