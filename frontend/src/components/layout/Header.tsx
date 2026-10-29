import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Search,
  RefreshCw,
  Database,
  User,
  ChevronDown,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { PageId } from './Sidebar';
import { api } from '../../api/client';
import { ComponentItem } from '../../types';

interface Props {
  currentPage: PageId;
  workspaceName: string;
  onNavigate: (page: PageId, extraId?: string) => void;
  onToggleMobileNav: () => void;
  onResetDemo: () => void;
  isResetting: boolean;
}

export const Header: React.FC<Props> = ({
  currentPage,
  workspaceName,
  onNavigate,
  onToggleMobileNav,
  onResetDemo,
  isResetting
}) => {
  const pageMeta: Record<PageId, { num: string; title: string; breadcrumb: string }> = {
    dashboard: { num: '01', title: 'Component Intelligence', breadcrumb: 'CONSOLE / DASHBOARD' },
    boms: { num: '02', title: 'BOM Analysis', breadcrumb: 'CONSOLE / BOM ANALYSIS' },
    sellers: { num: '03', title: 'Indian Seller Discovery & Contact', breadcrumb: 'CONSOLE / INDIAN SELLERS' },
    catalogue: { num: '04', title: 'Component Catalogue', breadcrumb: 'CONSOLE / CATALOGUE' },
    alternatives: { num: '05', title: 'Indian Alternatives', breadcrumb: 'CONSOLE / INDIAN ALTERNATIVES' },
    reports: { num: '06', title: 'Engineering Reports', breadcrumb: 'CONSOLE / AUDIT REPORTS' },
    'data-sources': { num: '07', title: 'Data Sources', breadcrumb: 'CONSOLE / DATA SOURCES' },
    settings: { num: '08', title: 'Settings', breadcrumb: 'CONSOLE / SETTINGS' },
    simulator: { num: '09', title: 'Failure Scenario Simulator', breadcrumb: 'CONSOLE / SIMULATION' },
    risk: { num: '10', title: 'Sourcing Risk & Dependency Assessment', breadcrumb: 'CONSOLE / RISK ASSESSMENT' },
  };

  const current = pageMeta[currentPage] || { num: '01', title: 'Engineering Workspace', breadcrumb: 'CONSOLE' };

  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ComponentItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // User menu dropdown
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.listComponents({ search: searchQuery.trim(), limit: 6 });
        setSearchResults(res.components || []);
        setIsDropdownOpen(true);
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectComponent = (comp: ComponentItem) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    onNavigate('alternatives', comp.id);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsDropdownOpen(false);
    onNavigate('catalogue', searchQuery.trim());
  };

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-[#DDE2E4] px-4 sm:px-6 flex items-center justify-between gap-3">
      {/* Left: Mobile Trigger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileNav}
          className="p-1.5 rounded-[4px] text-[#65717C] hover:bg-[#F4F5F3] lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10.5px] font-mono font-medium text-[#65717C] uppercase tracking-wider">
            <span>{current.breadcrumb}</span>
            <span className="text-[#DDE2E4]">/</span>
            <span className="text-[#087E8B]">{current.num}</span>
          </div>
          <h1 className="text-[14px] sm:text-[15px] font-semibold text-[#18232D] leading-none truncate mt-0.5">
            {current.title}
          </h1>
        </div>
      </div>

      {/* Center: Global Component Search (Working!) */}
      <div className="hidden md:block flex-1 max-w-md mx-2 relative" ref={searchRef}>
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-3.5 h-3.5 text-[#8E9BA7] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setIsDropdownOpen(true)}
            placeholder="Search part number, manufacturer, or spec..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-[#F8F9F8] hover:bg-[#F4F5F3] focus:bg-white text-[#18232D] border border-[#DDE2E4] focus:border-[#087E8B] rounded-[4px] font-mono outline-none transition-colors placeholder:font-sans placeholder:text-[#8E9BA7]"
          />
          {isSearching && (
            <RefreshCw className="w-3 h-3 text-[#087E8B] animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
          )}
        </form>

        {/* Search Results Autocomplete Dropdown */}
        {isDropdownOpen && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#DDE2E4] rounded-[4px] shadow-lg overflow-hidden z-50">
            <div className="px-3 py-1.5 bg-[#F8F9F8] border-b border-[#ECEFEF] text-[10.5px] font-mono text-[#65717C] flex justify-between">
              <span>MATCHING COMPONENTS ({searchResults.length})</span>
              <span>JUMP TO ALTERNATIVES</span>
            </div>
            <div className="divide-y divide-[#ECEFEF] max-h-64 overflow-y-auto">
              {searchResults.map((comp) => (
                <div
                  key={comp.id}
                  onClick={() => handleSelectComponent(comp)}
                  className="px-3 py-2 hover:bg-[#F0F6F7] cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div>
                    <span className="font-mono font-bold text-[#18232D]">{comp.part_number}</span>
                    <span className="text-[11px] text-[#65717C] ml-2">{comp.manufacturer}</span>
                    <span className="text-[10px] text-[#8E9BA7] ml-2 font-mono">[{comp.category}]</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]">
                    {comp.origin_category === 'VERIFIED_INDIAN' ? 'Verified Indian' : comp.origin_category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Workspace, Data Source Status, Demo Reset & User */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Data Source Indicator */}
        <button
          onClick={() => onNavigate('settings')}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono text-[#18232D] bg-[#F8F9F8] hover:bg-[#ECEFEF] border border-[#DDE2E4] rounded-[4px] transition-colors"
          title="Inspect connected data sources & provider status"
        >
          <Database className="w-3 h-3 text-[#087E8B]" />
          <span>Feeds: <strong className="text-[#0E6641]">Active</strong></span>
        </button>

        {/* Workspace Indicator */}
        <div
          className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#18232D] bg-[#F8F9F8] border border-[#DDE2E4] rounded-[4px]"
          title="Active engineering workspace"
        >
          <span className="w-2 h-2 rounded-full bg-[#087E8B]" />
          <span className="truncate max-w-[170px]">{workspaceName}</span>
        </div>

        {/* Reset Demo Quick Action */}
        <button
          onClick={onResetDemo}
          disabled={isResetting}
          title="Reset database to synthetic baseline demo data"
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#18232D] bg-white hover:bg-[#F4F5F3] border border-[#DDE2E4] rounded-[4px] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 text-[#65717C] ${isResetting ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Reset Demo</span>
        </button>

        {/* User / Engineer Profile Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-1.5 p-1 pl-2 text-xs rounded-[4px] border border-[#DDE2E4] hover:bg-[#F8F9F8] text-[#18232D] transition-colors"
          >
            <div className="w-5 h-5 rounded-[2px] bg-[#18232D] text-white flex items-center justify-center font-mono text-[10px] font-bold">
              VS
            </div>
            <span className="hidden md:inline font-medium text-[11.5px]">V. Sharma</span>
            <ChevronDown className="w-3 h-3 text-[#65717C]" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-1 w-56 bg-white border border-[#DDE2E4] rounded-[4px] shadow-lg py-1 z-50 text-xs">
              <div className="px-3 py-2 border-b border-[#ECEFEF]">
                <div className="font-semibold text-[#18232D]">Vikram Sharma</div>
                <div className="text-[11px] text-[#65717C]">Lead Systems Engineer</div>
                <div className="text-[10px] font-mono text-[#8E9BA7] mt-0.5 truncate">{workspaceName}</div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate('settings');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F4F5F3] text-[#18232D] flex items-center justify-between"
                >
                  <span>Data Sources & Parameters</span>
                  <span className="font-mono text-[10px] text-[#8E9BA7]">07</span>
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate('reports');
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#F4F5F3] text-[#18232D] flex items-center justify-between"
                >
                  <span>Audit Reports</span>
                  <span className="font-mono text-[10px] text-[#8E9BA7]">06</span>
                </button>
              </div>

              <div className="border-t border-[#ECEFEF] pt-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onResetDemo();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FCF1F0] text-[#A82218] font-medium"
                >
                  Reset Demo Dataset
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
