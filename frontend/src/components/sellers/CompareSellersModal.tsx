import React from 'react';
import { X, Check, ExternalLink, ShieldCheck, Mail, Building2, MapPin } from 'lucide-react';
import { SellerListing } from '../../types';
import { SellerClassificationBadge, AvailabilityBadge } from '../common/Badges';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partNumber: string;
  listings: SellerListing[];
  onOpenRfq: (listing: SellerListing) => void;
  onOpenContact: (listing: SellerListing) => void;
}

export const CompareSellersModal: React.FC<Props> = ({
  isOpen,
  onClose,
  partNumber,
  listings,
  onOpenRfq,
  onOpenContact
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18232D]/50 backdrop-blur-xs">
      <div className="bg-white border border-[#DDE2E4] rounded-[4px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-[#18232D] font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#18232D] text-white flex items-center justify-between">
          <div>
            <div className="text-xs font-mono font-bold tracking-wider uppercase">
              Supplier Comparison Matrix
            </div>
            <div className="text-[11px] text-[#A2B0BC]">
              Part Number: <span className="font-mono text-white">{partNumber}</span> • {listings.length} Supplier(s) Compared
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A2B0BC] hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Matrix Table */}
        <div className="p-5 overflow-auto flex-1">
          {listings.length === 0 ? (
            <div className="p-6 text-center text-[#65717C] text-xs font-mono">
              Select at least one supplier listing to compare.
            </div>
          ) : (
            <div className="border border-[#DDE2E4] rounded-[3px] overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8F9F8] border-b border-[#DDE2E4] text-[10.5px] font-mono text-[#65717C] uppercase">
                    <th className="p-3 w-44">Attribute</th>
                    {listings.map((l, idx) => (
                      <th key={l.id || idx} className="p-3 border-l border-[#DDE2E4] min-w-[200px]">
                        <div className="font-bold text-[#18232D] text-xs">{l.seller_name}</div>
                        <div className="text-[10px] text-[#65717C] font-normal mt-0.5">
                          {l.location_city ? `${l.location_city}, ${l.location_state || 'India'}` : 'India'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEFEF]">
                  <tr>
                    <td className="p-2.5 font-mono text-[#65717C] bg-[#FAFBF9]">Seller Classification</td>
                    {listings.map((l, idx) => (
                      <td key={idx} className="p-2.5 border-l border-[#DDE2E4]">
                        <SellerClassificationBadge classification={l.seller_classification} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-[#65717C] bg-[#FAFBF9]">Unit Price (INR/USD)</td>
                    {listings.map((l, idx) => (
                      <td key={idx} className="p-2.5 border-l border-[#DDE2E4] font-mono font-bold text-[#18232D]">
                        {l.price !== null && l.price !== undefined
                          ? `${l.currency === 'INR' ? '₹' : '$'}${l.price.toFixed(2)}`
                          : <span className="text-[#8E9BA7] font-normal">Quote on Request</span>}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-[#65717C] bg-[#FAFBF9]">Availability / Stock</td>
                    {listings.map((l, idx) => (
                      <td key={idx} className="p-2.5 border-l border-[#DDE2E4]">
                        <AvailabilityBadge status={l.availability_status} quantity={l.stock_quantity} />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-[#65717C] bg-[#FAFBF9]">Minimum Order Qty (MOQ)</td>
                    {listings.map((l, idx) => (
                      <td key={idx} className="p-2.5 border-l border-[#DDE2E4] font-mono">
                        {l.moq ? `${l.moq.toLocaleString()} pcs` : '1 pc'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-[#65717C] bg-[#FAFBF9]">Lead Time</td>
                    {listings.map((l, idx) => (
                      <td key={idx} className="p-2.5 border-l border-[#DDE2E4] font-mono">
                        {l.lead_time_days ? `${l.lead_time_days} business days` : 'Standard Dispatch'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-[#65717C] bg-[#FAFBF9]">Seller SKU</td>
                    {listings.map((l, idx) => (
                      <td key={idx} className="p-2.5 border-l border-[#DDE2E4] font-mono text-[#65717C]">
                        {l.seller_sku || '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono text-[#65717C] bg-[#FAFBF9]">Datasheet Link</td>
                    {listings.map((l, idx) => (
                      <td key={idx} className="p-2.5 border-l border-[#DDE2E4]">
                        {l.datasheet_url ? (
                          <a
                            href={l.datasheet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-[#087E8B] hover:underline"
                          >
                            <span>Datasheet PDF</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-[#8E9BA7] font-mono">Unavailable</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-[#F8F9F8]">
                    <td className="p-3 font-mono text-[#65717C] font-bold">Actions</td>
                    {listings.map((l, idx) => (
                      <td key={idx} className="p-3 border-l border-[#DDE2E4]">
                        <div className="flex flex-col gap-1.5">
                          {l.product_url && (
                            <a
                              href={l.product_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 text-center bg-[#F0F6F7] text-[#087E8B] border border-[#D0E7EA] rounded-[2px] font-mono text-[10.5px] font-semibold hover:bg-[#E2F0F2] inline-flex items-center justify-center gap-1"
                            >
                              <span>View Product</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          <button
                            onClick={() => onOpenRfq(l)}
                            className="px-2.5 py-1 text-center bg-[#087E8B] text-white rounded-[2px] font-mono text-[10.5px] font-semibold hover:bg-[#066570]"
                          >
                            Request Quotation
                          </button>
                          <button
                            onClick={() => onOpenContact(l)}
                            className="px-2.5 py-1 text-center bg-white text-[#18232D] border border-[#DDE2E4] rounded-[2px] font-mono text-[10.5px] hover:bg-[#F8F9F8]"
                          >
                            Contact Seller
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#DDE2E4] bg-[#F8F9F8] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-[#DDE2E4] rounded-[3px] font-mono text-xs text-[#65717C] hover:bg-white"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
