import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, Mail, AlertTriangle, FileText, Send, Building, MapPin, Calendar } from 'lucide-react';
import { api } from '../../api/client';
import { RFQ } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partNumber: string;
  manufacturer: string;
  defaultQuantity?: number;
  sellerId?: string;
  sellerName?: string;
  bomId?: string;
  onRfqCreated?: (rfq: RFQ) => void;
}

export const RfqModal: React.FC<Props> = ({
  isOpen,
  onClose,
  partNumber,
  manufacturer,
  defaultQuantity = 1,
  sellerId,
  sellerName = 'Component Supplier',
  bomId,
  onRfqCreated
}) => {
  // Form state
  const [companyName, setCompanyName] = useState('Bharat Industrial & Embedded Systems');
  const [contactPerson, setContactPerson] = useState('Vikram Sharma');
  const [businessEmail, setBusinessEmail] = useState('lead.engineer@bharat-embedded.in');
  const [phone, setPhone] = useState('+91-80-2841-0000');
  const [quantity, setQuantity] = useState<number>(defaultQuantity > 0 ? defaultQuantity : 100);
  const [deliveryLocation, setDeliveryLocation] = useState('Bengaluru Electronic City Tech Park, Phase 1');
  const [deliveryDate, setDeliveryDate] = useState('2026-12-15');
  const [notes, setNotes] = useState('Standard tape/reel packaging preferred. Include Certificate of Conformance (CoC) and CoO.');
  
  // Step: 'form' | 'review' | 'confirmed'
  const [step, setStep] = useState<'form' | 'review' | 'confirmed'>('form');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdRfq, setCreatedRfq] = useState<RFQ | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setErrorMsg('Quantity must be greater than zero.');
      return;
    }
    if (!businessEmail.includes('@') || !businessEmail.includes('.')) {
      setErrorMsg('Please enter a valid corporate email address.');
      return;
    }
    setErrorMsg(null);
    setStep('review');
  };

  const handleConfirmSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await api.createRfq({
        company_name: companyName,
        contact_person: contactPerson,
        business_email: businessEmail,
        phone: phone || undefined,
        part_number: partNumber,
        manufacturer: manufacturer,
        quantity_requested: quantity,
        target_delivery_location: deliveryLocation,
        target_delivery_date: deliveryDate || undefined,
        notes: notes || undefined,
        seller_id: sellerId,
        seller_name: sellerName,
        bom_id: bomId
      });
      setCreatedRfq(res);
      setStep('confirmed');
      if (onRfqCreated) {
        onRfqCreated(res);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate quotation request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyMessage = () => {
    if (createdRfq?.generated_email_body) {
      navigator.clipboard.writeText(createdRfq.generated_email_body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const mailtoHref = createdRfq?.seller_contact_email
    ? `mailto:${createdRfq.seller_contact_email}?subject=${encodeURIComponent(
        `Request for Quotation: ${createdRfq.part_number} (Qty: ${createdRfq.quantity_requested}) - Ref: ${createdRfq.rfq_reference}`
      )}&body=${encodeURIComponent(createdRfq.generated_email_body || '')}`
    : `mailto:?subject=${encodeURIComponent(
        `Request for Quotation: ${createdRfq?.part_number} (Qty: ${createdRfq?.quantity_requested}) - Ref: ${createdRfq?.rfq_reference}`
      )}&body=${encodeURIComponent(createdRfq?.generated_email_body || '')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#18232D]/50 backdrop-blur-xs">
      <div className="bg-white border border-[#DDE2E4] rounded-[4px] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-[#18232D] font-sans">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#18232D] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[2px] bg-[#087E8B] flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold tracking-wider uppercase">
                {step === 'confirmed' ? 'RFQ Reference Generated' : 'Request for Quotation (RFQ)'}
              </div>
              <div className="text-[11px] text-[#A2B0BC]">
                {partNumber} • {manufacturer}
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

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-[#FCF1F0] border border-[#F3C7C4] text-[#A82218] rounded-[3px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {step === 'form' && (
            <form onSubmit={handleReview} className="space-y-4">
              {/* Target Seller Banner */}
              <div className="p-3 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] flex items-center justify-between">
                <div>
                  <div className="text-[10.5px] uppercase font-mono text-[#65717C]">Target Supplier</div>
                  <div className="font-bold text-[12.5px] text-[#18232D]">{sellerName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10.5px] uppercase font-mono text-[#65717C]">Part Number</div>
                  <div className="font-mono font-bold text-[#087E8B]">{partNumber}</div>
                </div>
              </div>

              {/* Company & Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#65717C] uppercase mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-medium focus:border-[#087E8B] outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#65717C] uppercase mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-medium focus:border-[#087E8B] outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#65717C] uppercase mb-1">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-mono focus:border-[#087E8B] outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#65717C] uppercase mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-mono focus:border-[#087E8B] outline-none bg-white"
                  />
                </div>
              </div>

              {/* Quantity & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-[#ECEFEF]">
                <div>
                  <label className="block text-[11px] font-mono text-[#65717C] uppercase mb-1">Quantity Required *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-mono font-bold text-[#18232D] focus:border-[#087E8B] outline-none bg-white"
                  />
                  <span className="text-[10px] text-[#8E9BA7]">Prefilled from BOM item</span>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-[#65717C] uppercase mb-1">Delivery Destination *</label>
                  <input
                    type="text"
                    required
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-[#DDE2E4] rounded-[3px] text-xs focus:border-[#087E8B] outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#65717C] uppercase mb-1">Target Delivery Schedule</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full sm:w-1/2 px-2.5 py-1.5 border border-[#DDE2E4] rounded-[3px] text-xs font-mono focus:border-[#087E8B] outline-none bg-white"
                />
              </div>

              {/* Technical / Sourcing Notes */}
              <div>
                <label className="block text-[11px] font-mono text-[#65717C] uppercase mb-1">Technical Notes / Requirements</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Packaging specifications (tray/tape/reel), compliance documents, etc."
                  className="w-full px-2.5 py-1.5 border border-[#DDE2E4] rounded-[3px] text-xs focus:border-[#087E8B] outline-none bg-white resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-[#ECEFEF] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 border border-[#DDE2E4] rounded-[3px] font-mono text-xs text-[#65717C] hover:bg-[#F8F9F8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#087E8B] hover:bg-[#066570] text-white rounded-[3px] font-mono font-semibold text-xs flex items-center gap-1.5"
                >
                  <span>Review Quotation Request</span>
                </button>
              </div>
            </form>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#F0F6F7] border border-[#D0E7EA] rounded-[3px] text-[#087E8B] text-[11.5px] leading-relaxed">
                <strong>Review Details Before Saving:</strong> Please inspect the commercial line items and contact coordinates. Upon confirmation, a unique tracking reference will be generated and saved in PostgreSQL.
              </div>

              <div className="border border-[#DDE2E4] rounded-[3px] p-4 bg-white space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-[#ECEFEF] pb-2">
                  <span className="text-[#65717C]">Target Supplier:</span>
                  <span className="font-bold text-[#18232D]">{sellerName}</span>
                </div>
                <div className="flex justify-between border-b border-[#ECEFEF] pb-2">
                  <span className="text-[#65717C]">Component Part Number:</span>
                  <span className="font-bold text-[#087E8B]">{partNumber}</span>
                </div>
                <div className="flex justify-between border-b border-[#ECEFEF] pb-2">
                  <span className="text-[#65717C]">Manufacturer:</span>
                  <span>{manufacturer}</span>
                </div>
                <div className="flex justify-between border-b border-[#ECEFEF] pb-2">
                  <span className="text-[#65717C]">Required Quantity:</span>
                  <span className="font-bold text-[#18232D]">{quantity.toLocaleString()} units</span>
                </div>
                <div className="flex justify-between border-b border-[#ECEFEF] pb-2">
                  <span className="text-[#65717C]">Delivery Location:</span>
                  <span className="text-right">{deliveryLocation}</span>
                </div>
                <div className="flex justify-between border-b border-[#ECEFEF] pb-2">
                  <span className="text-[#65717C]">Target Date:</span>
                  <span>{deliveryDate || 'ASAP'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#65717C]">Sender Corporate Contact:</span>
                  <span className="text-right font-medium">{contactPerson} ({businessEmail})</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#ECEFEF] flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  className="px-3.5 py-1.5 border border-[#DDE2E4] rounded-[3px] font-mono text-xs text-[#65717C] hover:bg-[#F8F9F8]"
                >
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                  className="px-4 py-1.5 bg-[#087E8B] hover:bg-[#066570] text-white rounded-[3px] font-mono font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Generating Reference...' : 'Confirm & Save RFQ'}
                </button>
              </div>
            </div>
          )}

          {step === 'confirmed' && createdRfq && (
            <div className="space-y-4">
              {/* Status Header Badge */}
              <div className="p-4 bg-[#ECF7F2] border border-[#BCE3D1] rounded-[3px] flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0E6641] text-white flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <div className="text-xs font-mono font-bold text-[#0E6641] uppercase tracking-wide">
                    RFQ Reference: {createdRfq.rfq_reference}
                  </div>
                  <div className="text-[11.5px] text-[#18232D] mt-0.5">
                    Saved as <span className="font-mono font-bold bg-white px-1.5 py-0.5 border border-[#BCE3D1] rounded-[2px]">{createdRfq.status}</span> in platform database.
                  </div>
                </div>
              </div>

              {/* Truthful Transmission Notice */}
              <div className="p-3 bg-[#FFF9E6] border border-[#F2DEAF] rounded-[3px] text-xs text-[#8A5200] leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Manual Dispatch Notice:</span>
                </div>
                <div>
                  No automated ERP/EDI submission configured for {sellerName}. Use the copyable professional RFQ message below or the <strong>mailto link</strong> to transmit directly from your corporate email client. Once sent, update the tracking status on the RFQ Tracking page.
                </div>
              </div>

              {/* Copyable Message Box */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-[#65717C] uppercase font-bold">Formal RFQ Message Template</span>
                  <button
                    onClick={handleCopyMessage}
                    className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-[#087E8B] hover:underline"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#0E6641]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Template'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#F8F9F8] border border-[#DDE2E4] rounded-[3px] text-[11px] font-mono text-[#18232D] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {createdRfq.generated_email_body}
                </pre>
              </div>

              {/* Dispatch Action Buttons */}
              <div className="pt-3 border-t border-[#ECEFEF] flex flex-wrap justify-between items-center gap-2">
                <a
                  href={mailtoHref}
                  className="px-4 py-1.5 bg-[#087E8B] hover:bg-[#066570] text-white rounded-[3px] font-mono font-semibold text-xs inline-flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Open in Mail Client (mailto:)</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 border border-[#DDE2E4] rounded-[3px] font-mono text-xs text-[#65717C] hover:bg-[#F8F9F8]"
                >
                  Done / Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
