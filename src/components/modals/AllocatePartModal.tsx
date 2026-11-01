import React, { useState, useEffect } from 'react';
import { X, Wrench, Package, AlertCircle, ShoppingBag, CheckCircle2 } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';

interface AllocatePartModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWorkOrderId?: string | null;
  initialItemId?: string | null;
  onOpenProcurementModal?: (itemId: string) => void;
}

export default function AllocatePartModal({
  isOpen,
  onClose,
  initialWorkOrderId,
  initialItemId,
  onOpenProcurementModal,
}: AllocatePartModalProps) {
  const { workOrders, inventoryItems, allocatePartToWorkOrder, user, technicians, allocateWorkOrderToTechnician } = useCampus();

  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isChangingTechnician, setIsChangingTechnician] = useState(false);

  useEffect(() => {
    if (initialWorkOrderId) {
      setSelectedWorkOrderId(initialWorkOrderId);
    } else if (workOrders.length > 0 && !selectedWorkOrderId) {
      setSelectedWorkOrderId(workOrders[0].id);
    }
  }, [initialWorkOrderId, workOrders, selectedWorkOrderId]);

  useEffect(() => {
    if (initialItemId) {
      setSelectedItemId(initialItemId);
    } else if (inventoryItems.length > 0 && !selectedItemId) {
      setSelectedItemId(inventoryItems[0].id);
    }
  }, [initialItemId, inventoryItems, selectedItemId]);

  if (!isOpen) return null;

  const currentWorkOrder = workOrders.find((w) => w.id === selectedWorkOrderId);
  const currentItem = inventoryItems.find((i) => i.id === selectedItemId);
  const qtyNumber = Number(quantity) || 0;

  const isStockSufficient = currentItem ? currentItem.currentStock >= qtyNumber : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!currentWorkOrder) {
      setValidationError('Please select a target work order.');
      return;
    }

    if (!currentItem) {
      setValidationError('Please select a catalogue spare part.');
      return;
    }

    if (qtyNumber <= 0) {
      setValidationError('Allocation quantity must be at least 1.');
      return;
    }

    if (currentItem.currentStock < qtyNumber) {
      setValidationError(
        `Insufficient stock! Only ${currentItem.currentStock} ${currentItem.unit} available in store.`
      );
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const res = allocatePartToWorkOrder(currentWorkOrder.id, currentItem.id, qtyNumber);
      setSubmitting(false);
      if (res.success) {
        onClose();
        setQuantity(1);
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
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E7E2DD] bg-[#E6E9FF]">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-pastel-sm">
            <Wrench size={20} className="text-[#6878CA]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-space font-bold text-base text-[#24283B]">Allocate Spare Part</h2>
            <p className="font-jakarta text-[12px] text-[#74788C]">
              Issue workshop inventory directly to active maintenance work orders
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

          {/* Work Order Selector */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
              Select Maintenance Work Order *
            </label>
            <select
              value={selectedWorkOrderId}
              onChange={(e) => {
                setSelectedWorkOrderId(e.target.value);
                setValidationError(null);
              }}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] bg-white transition-all"
            >
              {workOrders.map((wo) => (
                <option key={wo.id} value={wo.id}>
                  [{wo.orderNumber}] {wo.title} ({wo.status.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          {currentWorkOrder && (
            <div className="p-3 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] text-xs font-jakarta space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[#74788C]">Location:</span>
                <span className="font-semibold text-[#24283B]">
                  {currentWorkOrder.buildingName} · {currentWorkOrder.location}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#74788C]">Assigned Engineer:</span>
                {!isChangingTechnician ? (
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[#24283B]">{currentWorkOrder.assignedEngineer}</span>
                    <button
                      type="button"
                      onClick={() => setIsChangingTechnician(true)}
                      className="text-[10px] text-[#C06B33] hover:underline font-bold"
                    >
                      {currentWorkOrder.assignedEngineer === 'Unassigned' ? 'Allocate' : 'Change'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <select
                      onChange={async (e) => {
                        const techId = e.target.value;
                        if (techId) {
                          const tech = technicians.find((t) => t.id === techId);
                          await allocateWorkOrderToTechnician(currentWorkOrder.id, techId, tech?.fullName || tech?.name);
                        }
                        setIsChangingTechnician(false);
                      }}
                      className="text-xs p-1 rounded-lg border border-[#E7E2DD] bg-white font-jakarta"
                      defaultValue=""
                    >
                      <option value="" disabled>Select technician...</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName || t.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsChangingTechnician(false)}
                      className="text-[10px] text-[#74788C] hover:text-[#BA3D6E]"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {currentWorkOrder.partsRequired && currentWorkOrder.partsRequired.length > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-[#E7E2DD]/60">
                  <span className="text-[#74788C]">Required Parts:</span>
                  <span className="font-semibold text-[#C06B33]">
                    {currentWorkOrder.partsRequired.join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Inventory Part Selector */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
              Select Spare Part from Catalogue *
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value);
                setValidationError(null);
              }}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] bg-white transition-all"
            >
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.sku}] {item.name} — Available: {item.currentStock} {item.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Availability Indicator */}
          {currentItem && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between font-jakarta text-xs ${
                currentItem.currentStock === 0
                  ? 'bg-[#F8DCE8] border-[#E8B4C8]'
                  : currentItem.currentStock < qtyNumber
                  ? 'bg-[#FFF2E7] border-[#FFE4CF]'
                  : 'bg-[#E9F9F2] border-[#C5EFE0]'
              }`}
            >
              <div>
                <span className="text-[#74788C] block text-[11px]">Storage Location:</span>
                <span className="font-semibold text-[#24283B]">{currentItem.location}</span>
              </div>
              <div className="text-right">
                <span className="text-[#74788C] block text-[11px]">Store Balance:</span>
                <span
                  className={`font-space font-bold text-sm ${
                    currentItem.currentStock === 0 ? 'text-[#BA3D6E]' : 'text-[#1B6648]'
                  }`}
                >
                  {currentItem.currentStock} {currentItem.unit}
                </span>
              </div>
            </div>
          )}

          {/* If stock is 0, provide 1-click requisition trigger! */}
          {currentItem && currentItem.currentStock === 0 && (
            <div className="p-3.5 rounded-xl bg-[#FFF2E7] border border-[#FFE4CF] flex items-center justify-between">
              <div>
                <p className="font-jakarta font-semibold text-xs text-[#C06B33]">
                  Part is currently out of stock!
                </p>
                <p className="font-jakarta text-[11px] text-[#74788C]">
                  Lead time from {currentItem.supplierName}: {currentItem.leadTimeDays} days
                </p>
              </div>
              {onOpenProcurementModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProcurementModal(currentItem.id);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#24283B] text-white font-jakarta font-semibold text-[11px] hover:bg-[#383E58] transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                  <ShoppingBag size={12} /> Raise Requisition
                </button>
              )}
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
              Quantity to Allocate *
            </label>
            <input
              type="number"
              min="1"
              max={currentItem ? currentItem.currentStock : undefined}
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

          <p className="font-jakarta text-[11px] text-[#74788C] bg-[#FAF7F1] px-3.5 py-2 rounded-xl border border-[#E7E2DD]">
            🔒 Allocating parts will immediately deduct inventory and update the work order status to &quot;In Progress&quot;.
          </p>

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
              disabled={submitting || !isStockSufficient}
              className="flex-1 px-4 py-2.5 rounded-xl font-jakarta font-semibold text-sm text-white hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
              style={{ background: '#24283B' }}
            >
              {submitting ? 'Allocating…' : 'Confirm Allocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
