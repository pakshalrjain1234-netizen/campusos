import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Sparkles, AlertCircle, Building2, Clock, Mail } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { ProcurementUrgency } from '../../types';

interface CreateProcurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItemId?: string | null;
  suggestedQty?: number;
  defaultReason?: string;
}

export default function CreateProcurementModal({
  isOpen,
  onClose,
  initialItemId,
  suggestedQty,
  defaultReason,
}: CreateProcurementModalProps) {
  const { inventoryItems, createProcurement, user } = useCampus();

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [urgency, setUrgency] = useState<ProcurementUrgency>('medium');
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialItemId) {
      setSelectedItemId(initialItemId);
      const it = inventoryItems.find((i) => i.id === initialItemId);
      if (it) {
        const defaultQty = suggestedQty || Math.max(it.maxThreshold - it.currentStock, it.minThreshold);
        setQuantity(defaultQty);
        setUrgency(it.currentStock === 0 ? 'urgent' : it.currentStock <= it.minThreshold / 2 ? 'high' : 'medium');
        if (defaultReason) {
          setReason(defaultReason);
        } else {
          setReason(
            `Automated replenishment requisition: Current stock (${it.currentStock} ${it.unit}) is below safety threshold (${it.minThreshold} ${it.unit}).`
          );
        }
      }
    } else if (inventoryItems.length > 0 && !selectedItemId) {
      const it = inventoryItems[0];
      setSelectedItemId(it.id);
      setQuantity(Math.max(it.maxThreshold - it.currentStock, it.minThreshold));
    }
  }, [initialItemId, suggestedQty, defaultReason, inventoryItems, selectedItemId]);

  if (!isOpen) return null;

  const currentItem = inventoryItems.find((i) => i.id === selectedItemId);
  const qtyNumber = Number(quantity) || 0;
  const estimatedTotal = currentItem ? currentItem.unitCost * qtyNumber : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!currentItem) {
      setValidationError('Please select an item to procure.');
      return;
    }

    if (qtyNumber <= 0) {
      setValidationError('Order quantity must be at least 1 unit.');
      return;
    }

    if (!reason.trim()) {
      setValidationError('Please provide a business or operational justification for this order.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const res = createProcurement({
        itemId: currentItem.id,
        quantity: qtyNumber,
        reason: reason.trim(),
        urgency,
      });

      setSubmitting(false);
      if (res.success) {
        onClose();
        setReason('');
        setValidationError(null);
      } else {
        setValidationError(res.message);
      }
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(36, 40, 59, 0.55)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-[0_32px_64px_-8px_rgba(36,40,59,0.25)] border border-[#E7E2DD] overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E7E2DD] bg-[#FFF2E7]">
          <div className="w-10 h-10 rounded-xl bg-[#FFE4CF] flex items-center justify-center shadow-pastel-sm">
            <ShoppingBag size={20} className="text-[#C06B33]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-space font-bold text-base text-[#24283B]">New Procurement Requisition</h2>
            <p className="font-jakarta text-[12px] text-[#74788C]">
              Intelligent threshold-triggered purchase order request
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#74788C] hover:bg-black/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {validationError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F8DCE8] text-[#BA3D6E] font-jakarta text-xs">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Item Selector */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
              Select Catalogue Item *
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedItemId(id);
                const it = inventoryItems.find((i) => i.id === id);
                if (it) {
                  setQuantity(Math.max(it.maxThreshold - it.currentStock, it.minThreshold));
                  setUrgency(it.currentStock === 0 ? 'urgent' : it.currentStock <= it.minThreshold / 2 ? 'high' : 'medium');
                }
                setValidationError(null);
              }}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] bg-white transition-all"
            >
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.sku}] {item.name} — Current: {item.currentStock} / Min: {item.minThreshold} {item.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Item Quick Overview */}
          {currentItem && (
            <div className="p-3.5 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] space-y-2">
              <div className="flex items-center justify-between text-xs font-jakarta">
                <span className="text-[#74788C]">Current Available:</span>
                <span className="font-space font-bold text-[#24283B]">
                  {currentItem.currentStock} {currentItem.unit}
                  {currentItem.currentStock === 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F8DCE8] text-[#BA3D6E]">
                      OUT OF STOCK
                    </span>
                  )}
                  {currentItem.currentStock > 0 && currentItem.currentStock <= currentItem.minThreshold && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFE4CF] text-[#C06B33]">
                      BELOW MIN BUFFER
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-jakarta">
                <span className="text-[#74788C]">Approved Supplier:</span>
                <span className="font-semibold text-[#24283B] flex items-center gap-1">
                  <Building2 size={12} className="text-[#74788C]" />
                  {currentItem.supplierName}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-jakarta">
                <span className="text-[#74788C]">Contact & Lead Time:</span>
                <span className="text-[#74788C] flex items-center gap-2">
                  <span className="flex items-center gap-1"><Mail size={11} /> {currentItem.supplierContact}</span>
                  <span className="flex items-center gap-1 font-semibold text-[#24283B]">
                    <Clock size={11} /> {currentItem.leadTimeDays} days
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Quantity & Urgency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
                Requisition Quantity *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                  setQuantity(val);
                  setValidationError(null);
                }}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] transition-all"
              />
            </div>
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
                Priority / Urgency *
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as ProcurementUrgency)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] bg-white transition-all"
              >
                <option value="urgent">Urgent — Immediate Work Order Block</option>
                <option value="high">High — Depleted Safety Buffer</option>
                <option value="medium">Medium — Standard Cycle Reorder</option>
                <option value="normal">Normal — General Reserve Stock</option>
              </select>
            </div>
          </div>

          {/* Pricing Estimation Card */}
          {currentItem && (
            <div className="p-3.5 rounded-xl bg-[#E9F9F2] border border-[#C5EFE0] flex items-center justify-between">
              <div>
                <span className="font-jakarta text-[11px] text-[#2E8B67] block">Estimated Cost Calculation</span>
                <span className="font-jakarta text-xs text-[#74788C]">
                  ₹{currentItem.unitCost.toLocaleString('en-IN')} × {qtyNumber} {currentItem.unit}
                </span>
              </div>
              <div className="text-right">
                <span className="font-space font-bold text-lg text-[#1B6648]">
                  ₹{estimatedTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          {/* Justification / Reason */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
              Procurement Justification & Operational Notes *
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="e.g. Critical bearing replacement for CNC Lathe 4 in Mechanical Block; prevents student workshop downtime."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#C06B33] transition-all resize-none"
            />
          </div>

          {/* Rule engine transparent badge */}
          <div className="px-3.5 py-2.5 rounded-xl bg-[#F2F4FF] border border-[#E6E9FF] text-[11px] font-jakarta text-[#6878CA] flex items-center gap-2">
            <Sparkles size={14} className="flex-shrink-0 text-[#6878CA]" />
            <span>
              <strong>Rule Engine:</strong> Automatic approval route will be assigned to Operations Management.
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta font-semibold text-sm text-[#74788C] hover:bg-[#F6F0E5] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl font-jakarta font-semibold text-sm text-white hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              style={{ background: '#24283B' }}
            >
              {submitting ? 'Submitting Requisition…' : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
