import React from 'react';
import { ShieldCheck, Building2, Globe, HelpCircle, Check, AlertTriangle, X } from 'lucide-react';
import { OriginCategory, LifecycleStatus, CriticalityLevel } from '../../types';

export const OriginBadge: React.FC<{
  category: OriginCategory;
  mfrCountry?: string | null;
  distName?: string | null;
  compact?: boolean;
}> = ({ category, mfrCountry, distName, compact = false }) => {
  switch (category) {
    case 'VERIFIED_INDIAN':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]"
          title="Verified Indian Design / Manufacturing Provenance"
        >
          <ShieldCheck className="w-3 h-3 text-[#0E6641] shrink-0" />
          <span>{compact ? 'Verified IN' : 'Verified Indian Mfr'}</span>
        </span>
      );
    case 'INDIAN_SUPPLIER_UNVERIFIED_MFR':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#F0F6FA] text-[#19527D] border border-[#C8DDEC]"
          title={distName ? `Supplier: ${distName} (Manufacturer provenance unverified)` : 'Indian distributor; OEM fab unverified'}
        >
          <Building2 className="w-3 h-3 text-[#19527D] shrink-0" />
          <span>{compact ? 'IN Supplier (Unv.)' : 'Indian Supplier (Mfr Unverified)'}</span>
        </span>
      );
    case 'FOREIGN':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#F4F5F3] text-[#455360] border border-[#DDE2E4]"
          title={mfrCountry ? `Country of Origin: ${mfrCountry}` : 'Foreign Manufacturer'}
        >
          <Globe className="w-3 h-3 text-[#65717C] shrink-0" />
          <span>Foreign Mfr{mfrCountry && !compact ? ` (${mfrCountry})` : ''}</span>
        </span>
      );
    case 'UNKNOWN':
    default:
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[11px] font-medium bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]"
          title="Origin documentation missing / Certificate of Conformance needed"
        >
          <HelpCircle className="w-3 h-3 text-[#8A5200] shrink-0" />
          <span>Origin Unknown</span>
        </span>
      );
  }
};

export const CompatibilityBadge: React.FC<{
  status: 'COMPATIBLE' | 'REVIEW_REQUIRED' | 'HARD_MISMATCH';
}> = ({ status }) => {
  switch (status) {
    case 'COMPATIBLE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]">
          <Check className="w-3 h-3 stroke-[2.5]" />
          <span>COMPATIBLE</span>
        </span>
      );
    case 'REVIEW_REQUIRED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]">
          <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
          <span>REVIEW REQUIRED</span>
        </span>
      );
    case 'HARD_MISMATCH':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold bg-[#FCF1F0] text-[#A82218] border border-[#F3C7C4]">
          <X className="w-3 h-3 stroke-[2.5]" />
          <span>HARD MISMATCH</span>
        </span>
      );
  }
};

export const SpecStatusBadge: React.FC<{
  status: 'MATCH' | 'MISMATCH' | 'UNKNOWN' | 'REVIEW_REQUIRED';
}> = ({ status }) => {
  switch (status) {
    case 'MATCH':
      return (
        <span className="inline-block px-1.5 py-0.5 rounded-[3px] text-[10.5px] font-mono font-semibold bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]">
          MATCH
        </span>
      );
    case 'MISMATCH':
      return (
        <span className="inline-block px-1.5 py-0.5 rounded-[3px] text-[10.5px] font-mono font-semibold bg-[#FCF1F0] text-[#A82218] border border-[#F3C7C4]">
          MISMATCH
        </span>
      );
    case 'UNKNOWN':
      return (
        <span className="inline-block px-1.5 py-0.5 rounded-[3px] text-[10.5px] font-mono font-semibold bg-[#F4F5F3] text-[#65717C] border border-[#DDE2E4]">
          UNKNOWN
        </span>
      );
    case 'REVIEW_REQUIRED':
      return (
        <span className="inline-block px-1.5 py-0.5 rounded-[3px] text-[10.5px] font-mono font-semibold bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]">
          REVIEW
        </span>
      );
  }
};

export const CriticalityBadge: React.FC<{ level: CriticalityLevel | string }> = ({ level }) => {
  const norm = (level || 'MEDIUM').toUpperCase();
  switch (norm) {
    case 'CRITICAL':
      return (
        <span className="inline-block px-2 py-0.5 text-[10.5px] font-mono font-bold rounded-[4px] bg-[#FCF1F0] text-[#A82218] border border-[#F3C7C4]">
          CRITICAL
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-block px-2 py-0.5 text-[10.5px] font-mono font-semibold rounded-[4px] bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]">
          HIGH
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-block px-2 py-0.5 text-[10.5px] font-mono font-medium rounded-[4px] bg-[#F0F6FA] text-[#19527D] border border-[#C8DDEC]">
          MEDIUM
        </span>
      );
    case 'LOW':
    default:
      return (
        <span className="inline-block px-2 py-0.5 text-[10.5px] font-mono font-normal rounded-[4px] bg-[#F8F9F8] text-[#65717C] border border-[#DDE2E4]">
          LOW
        </span>
      );
  }
};

export const LifecycleBadge: React.FC<{ status: LifecycleStatus | string }> = ({ status }) => {
  const s = (status || 'UNKNOWN').toUpperCase();
  switch (s) {
    case 'ACTIVE':
      return (
        <span className="inline-block px-2 py-0.5 text-[10.5px] font-mono font-medium rounded-[4px] bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]">
          ACTIVE
        </span>
      );
    case 'NRND':
      return (
        <span
          className="inline-block px-2 py-0.5 text-[10.5px] font-mono font-medium rounded-[4px] bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]"
          title="Not Recommended for New Designs"
        >
          NRND
        </span>
      );
    case 'EOL':
    case 'OBSOLETE':
      return (
        <span
          className="inline-block px-2 py-0.5 text-[10.5px] font-mono font-bold rounded-[4px] bg-[#FCF1F0] text-[#A82218] border border-[#F3C7C4]"
          title="End of Life / Obsolete"
        >
          EOL
        </span>
      );
    case 'UNKNOWN':
    default:
      return (
        <span className="inline-block px-2 py-0.5 text-[10.5px] font-mono font-normal rounded-[4px] bg-[#F4F5F3] text-[#65717C] border border-[#DDE2E4]">
          UNKNOWN
        </span>
      );
  }
};

export const SourcingStatusBadge: React.FC<{
  status: string;
  compact?: boolean;
}> = ({ status, compact = false }) => {
  switch (status) {
    case 'INDIAN_MFR_DIRECT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10.5px] font-medium bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]">
          <ShieldCheck className="w-3 h-3 text-[#0E6641] shrink-0" />
          <span>{compact ? 'IN Mfr Direct' : 'Verified Indian Mfr Direct'}</span>
        </span>
      );
    case 'INDIAN_SELLER_EXACT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10.5px] font-medium bg-[#E8F6F8] text-[#087E8B] border border-[#B9E4EA]">
          <Building2 className="w-3 h-3 text-[#087E8B] shrink-0" />
          <span>{compact ? 'IN Seller' : 'Indian Seller Listed'}</span>
        </span>
      );
    case 'INDIAN_ALTERNATIVE_AVAILABLE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10.5px] font-medium bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]">
          <Check className="w-3 h-3 text-[#8A5200] shrink-0" />
          <span>{compact ? 'IN Alt Avail' : 'Indian Alt Available'}</span>
        </span>
      );
    case 'NO_SELLER_FOUND':
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10.5px] font-mono bg-[#F8F9F8] text-[#65717C] border border-[#DDE2E4]">
          <span>{compact ? 'No Listing' : 'No Verified Listing'}</span>
        </span>
      );
  }
};

export const SellerClassificationBadge: React.FC<{
  classification: string;
  compact?: boolean;
}> = ({ classification, compact = false }) => {
  switch (classification) {
    case 'VERIFIED_INDIAN_MANUFACTURER':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10.5px] font-semibold bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]">
          <ShieldCheck className="w-3 h-3 text-[#0E6641] shrink-0" />
          <span>{compact ? 'Verified Mfr' : 'Verified Indian Manufacturer'}</span>
        </span>
      );
    case 'INDIAN_AUTHORISED_DISTRIBUTOR':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10.5px] font-medium bg-[#F0F6FA] text-[#19527D] border border-[#C8DDEC]">
          <Building2 className="w-3 h-3 text-[#19527D] shrink-0" />
          <span>{compact ? 'Auth Dist (IN)' : 'Indian Authorised Distributor'}</span>
        </span>
      );
    case 'INDIAN_SELLER_EXACT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10.5px] font-medium bg-[#E8F6F8] text-[#087E8B] border border-[#B9E4EA]">
          <Building2 className="w-3 h-3 text-[#087E8B] shrink-0" />
          <span>{compact ? 'IN Seller' : 'Indian Seller (Exact Part)'}</span>
        </span>
      );
    case 'FOREIGN_MFR_INDIAN_SELLER':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10.5px] font-medium bg-[#F4F5F3] text-[#455360] border border-[#DDE2E4]">
          <Globe className="w-3 h-3 text-[#65717C] shrink-0" />
          <span>{compact ? 'Foreign (IN Stock)' : 'Foreign Component (Sold in India)'}</span>
        </span>
      );
    case 'POTENTIAL_INDIAN_ALTERNATIVE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10.5px] font-medium bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]">
          <AlertTriangle className="w-3 h-3 text-[#8A5200] shrink-0" />
          <span>{compact ? 'IN Substitute' : 'Potential Indian Functional Alternative'}</span>
        </span>
      );
    case 'INDIAN_SELLER_UNVERIFIED_AUTH':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10.5px] font-medium bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]">
          <HelpCircle className="w-3 h-3 text-[#8A5200] shrink-0" />
          <span>{compact ? 'IN Seller (Unv Auth)' : 'Indian Seller (Authorisation Unknown)'}</span>
        </span>
      );
    case 'NO_SELLER_FOUND':
    default:
      return (
        <span className="inline-block px-2 py-0.5 rounded-[3px] text-[10.5px] font-mono bg-[#F8F9F8] text-[#8E9BA7] border border-[#DDE2E4]">
          No Verified Seller Found
        </span>
      );
  }
};

export const AvailabilityBadge: React.FC<{
  status: string;
  quantity?: number | null;
}> = ({ status, quantity }) => {
  switch (status) {
    case 'IN_STOCK':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[10.5px] font-mono font-medium bg-[#ECF7F2] text-[#0E6641] border border-[#BCE3D1]">
          <Check className="w-3 h-3" />
          <span>In Stock{quantity ? ` (${quantity.toLocaleString()})` : ''}</span>
        </span>
      );
    case 'LEAD_TIME':
      return (
        <span className="inline-block px-1.5 py-0.5 rounded-[3px] text-[10.5px] font-mono font-medium bg-[#F0F6FA] text-[#19527D] border border-[#C8DDEC]">
          Lead Time / Factory Order
        </span>
      );
    case 'ON_REQUEST':
      return (
        <span className="inline-block px-1.5 py-0.5 rounded-[3px] text-[10.5px] font-mono font-medium bg-[#FFF9E6] text-[#8A5200] border border-[#F2DEAF]">
          Quote on Request
        </span>
      );
    case 'UNKNOWN':
    default:
      return (
        <span className="inline-block px-1.5 py-0.5 rounded-[3px] text-[10.5px] font-mono text-[#8E9BA7] bg-[#F8F9F8] border border-[#DDE2E4]">
          Unknown
        </span>
      );
  }
};

