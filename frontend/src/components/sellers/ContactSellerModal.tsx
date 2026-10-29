import React, { useState } from 'react';
import { X, Mail, Phone, ExternalLink, Building2, MapPin, Copy, Check, ShieldCheck, AlertCircle } from 'lucide-react';
import { SellerContact } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sellerName: string;
  sellerLocation?: string;
  isVerifiedIndian?: boolean;
  website?: string;
  contacts: SellerContact[];
  partNumber?: string;
}

export const ContactSellerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sellerName,
  sellerLocation,
  isVerifiedIndian = true,
  website,
  contacts,
  partNumber
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18232D]/50 backdrop-blur-xs">
      <div className="bg-white border border-[#DDE2E4] rounded-[4px] shadow-2xl w-full max-w-lg overflow-hidden text-[#18232D] font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#18232D] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#087E8B]" />
            <div>
              <div className="text-xs font-mono font-bold tracking-wider uppercase">
                Verified Seller Contact Details
              </div>
              <div className="text-[11px] text-[#A2B0BC]">
                {sellerName}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A2B0BC] hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Supplier Header Info */}
          <div className="p-3 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[13px] text-[#18232D]">{sellerName}</span>
              {isVerifiedIndian && (
                <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-[#0E6641] bg-[#ECF7F2] border border-[#BCE3D1] px-1.5 py-0.5 rounded-[2px]">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Verified Indian Entity</span>
                </span>
              )}
            </div>
            {sellerLocation && (
              <div className="flex items-center gap-1 text-[11px] text-[#65717C]">
                <MapPin className="w-3.5 h-3.5" />
                <span>{sellerLocation}</span>
              </div>
            )}
            {website && (
              <div className="pt-1">
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-[#087E8B] hover:underline"
                >
                  <span>Official Website ({new URL(website).hostname})</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Genuine Contact Routes */}
          <div>
            <div className="text-[11px] font-mono text-[#65717C] uppercase font-bold mb-2">
              Published Business Contact Desks
            </div>

            {contacts && contacts.length > 0 ? (
              <div className="space-y-2">
                {contacts.map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className="p-3 border border-[#DDE2E4] rounded-[3px] bg-white flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {c.contact_type === 'EMAIL' && <Mail className="w-3.5 h-3.5 text-[#087E8B]" />}
                        {c.contact_type === 'PHONE' && <Phone className="w-3.5 h-3.5 text-[#087E8B]" />}
                        {(c.contact_type === 'CONTACT_PAGE' || c.contact_type === 'RFQ_LINK' || c.contact_type === 'OFFICIAL_WEBSITE') && (
                          <ExternalLink className="w-3.5 h-3.5 text-[#087E8B]" />
                        )}
                        <span className="font-mono text-[11px] font-bold text-[#18232D]">{c.label}</span>
                      </div>
                      <div className="font-mono text-[11px] text-[#455360] truncate">{c.value}</div>
                      {c.notes && (
                        <div className="text-[10px] text-[#8E9BA7] italic">{c.notes}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {c.contact_type === 'EMAIL' && (
                        <a
                          href={`mailto:${c.value}${partNumber ? `?subject=${encodeURIComponent(`Inquiry for ${partNumber}`)}` : ''}`}
                          className="px-2 py-1 bg-[#F0F6F7] text-[#087E8B] border border-[#D0E7EA] rounded-[2px] font-mono text-[10.5px] font-semibold hover:bg-[#E2F0F2]"
                        >
                          Send Email
                        </a>
                      )}
                      {c.contact_type === 'PHONE' && (
                        <a
                          href={`tel:${c.value.replace(/[^0-9+]/g, '')}`}
                          className="px-2 py-1 bg-[#F0F6F7] text-[#087E8B] border border-[#D0E7EA] rounded-[2px] font-mono text-[10.5px] font-semibold hover:bg-[#E2F0F2]"
                        >
                          Call
                        </a>
                      )}
                      {(c.contact_type === 'CONTACT_PAGE' || c.contact_type === 'RFQ_LINK' || c.contact_type === 'OFFICIAL_WEBSITE') && (
                        <a
                          href={c.value}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-[#F0F6F7] text-[#087E8B] border border-[#D0E7EA] rounded-[2px] font-mono text-[10.5px] font-semibold hover:bg-[#E2F0F2] inline-flex items-center gap-1"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleCopy(c.value, idx)}
                        className="p-1 border border-[#DDE2E4] rounded-[2px] text-[#65717C] hover:text-[#18232D] hover:bg-[#F8F9F8]"
                        title="Copy contact"
                      >
                        {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-[#0E6641]" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] text-center text-[#65717C]">
                No direct phone or email published. Please use the official corporate portal above.
              </div>
            )}
          </div>

          {/* Scientific Honesty Notice */}
          <div className="p-2.5 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] text-[10.5px] text-[#65717C] leading-normal flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#8E9BA7] shrink-0 mt-0.5" />
            <span>
              All listed channels are verified business desks. We do not provide simulated live chat widgets to ensure corporate correspondence integrity.
            </span>
          </div>

          {/* Close Action */}
          <div className="pt-2 border-t border-[#ECEFEF] flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-[#DDE2E4] rounded-[3px] font-mono text-xs text-[#65717C] hover:bg-[#F8F9F8]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
