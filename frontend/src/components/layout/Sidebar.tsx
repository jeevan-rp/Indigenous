import React from 'react';
import {
  X,
  Database,
  Cpu,
  Layers,
  Search,
  AlertTriangle,
  PlayCircle,
  FileText,
  SlidersHorizontal,
  Store
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'boms'
  | 'sellers'
  | 'catalogue'
  | 'alternatives'
  | 'reports'
  | 'data-sources'
  | 'settings'
  | 'simulator'
  | 'risk';

interface Props {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  isOpenMobile: boolean;
  onToggleMobile: () => void;
}

export const Sidebar: React.FC<Props> = ({
  currentPage,
  onSelectPage,
  isOpenMobile,
  onToggleMobile
}) => {
  const navItems: Array<{ id: PageId; num: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', num: '01', label: 'Dashboard', icon: Layers },
    { id: 'boms', num: '02', label: 'BOM Analysis', icon: Database },
    { id: 'sellers', num: '03', label: 'Indian Sellers', icon: Store },
    { id: 'catalogue', num: '04', label: 'Component Catalogue', icon: Cpu },
    { id: 'alternatives', num: '05', label: 'Indian Alternatives', icon: Search },
    { id: 'reports', num: '06', label: 'Reports', icon: FileText },
    { id: 'data-sources', num: '07', label: 'Data Sources', icon: Database },
    { id: 'settings', num: '08', label: 'Settings', icon: SlidersHorizontal },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-[#18232D]/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onToggleMobile}
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[232px] bg-white border-r border-[#DDE2E4] flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0 shadow-lg' : '-translate-x-full'
        }`}
      >
        {/* Wordmark Header */}
        <div className="h-14 px-4 border-b border-[#DDE2E4] flex items-center justify-between bg-white shrink-0">
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => onSelectPage('dashboard')}
          >
            {/* Abstract Circuit / Node SVG Mark */}
            <div className="w-7 h-7 rounded-[4px] bg-[#18232D] flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="7" y="7" width="10" height="10" rx="1.5" stroke="#087E8B" strokeWidth="1.8" />
                <circle cx="12" cy="12" r="2" fill="#087E8B" />
                <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="#DDE2E4" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="4" cy="4" r="1.5" fill="#65717C" />
                <circle cx="20" cy="20" r="1.5" fill="#65717C" />
              </svg>
            </div>
            <div>
              <div className="text-[12.5px] font-bold tracking-[0.14em] text-[#18232D] leading-none uppercase font-mono">
                INDIGENOUS
              </div>
              <div className="text-[9.5px] font-medium tracking-[0.06em] text-[#65717C] uppercase mt-0.5">
                COMPONENT INTELLIGENCE
              </div>
            </div>
          </div>

          <button
            className="lg:hidden text-[#65717C] hover:text-[#18232D] p-1"
            onClick={onToggleMobile}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Console Environment Status Tag */}
        <div className="px-4 py-2 border-b border-[#ECEFEF] bg-[#F8F9F8] flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-[#65717C]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#087E8B]" />
            EDA CONSOLE
          </span>
          <span className="text-[9.5px] font-mono px-1 py-0.2 bg-white text-[#8A5200] border border-[#F2DEAF] rounded-[2px] font-semibold">
            DEMO DATA
          </span>
        </div>

        {/* Numbered Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            // Map risk page to boms or keep active when on risk
            const isActive = currentPage === item.id || (item.id === 'boms' && currentPage === 'risk');
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectPage(item.id);
                  if (isOpenMobile) onToggleMobile();
                }}
                className={`w-full flex items-center text-left text-[12px] font-medium transition-colors border-l-[3px] py-2 px-3.5 ${
                  isActive
                    ? 'border-[#087E8B] bg-[#F0F6F7] text-[#18232D] font-semibold'
                    : 'border-transparent text-[#65717C] hover:text-[#18232D] hover:bg-[#F8F9F8]'
                }`}
              >
                <span className={`font-mono text-[10.5px] mr-2.5 ${isActive ? 'text-[#087E8B] font-bold' : 'text-[#8E9BA7]'}`}>
                  {item.num}
                </span>
                <Icon className={`w-3.5 h-3.5 mr-2 shrink-0 ${isActive ? 'text-[#087E8B]' : 'text-[#8E9BA7]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Provenance & Engineering Workbench Info */}
        <div className="p-3 border-t border-[#DDE2E4] bg-[#F8F9F8] shrink-0 text-[10.5px] text-[#65717C] space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-[#8E9BA7] text-[10px]">
            <span>SYSTEM RULE</span>
            <span className="text-[#087E8B] font-semibold">ISO/IEC 25010</span>
          </div>
          <p className="text-[10px] leading-relaxed text-[#65717C]">
            Deterministic electrical matching with zero speculative substitutions.
          </p>
        </div>
      </aside>
    </>
  );
};
