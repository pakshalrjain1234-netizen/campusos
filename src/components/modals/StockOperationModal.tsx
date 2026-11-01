import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, Sliders, RotateCcw, Package, AlertCircle } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { InventoryItem, StockTransactionType } from '../../types';

interface StockOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItemId?: string | null;
  initialType?: StockTransactionType;
}

export default function StockOperationModal({
  isOpen,
  onClose,
  initialItemId,
  initialType = 'stock_in',
}: StockOperationModalProps) {
  const { inventoryItems, performStockOperation, user } = useCampus();

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [opType, setOpType] = useState<StockTransactionType>(initialType);
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialItemId) {
      setSelectedItemId(initialItemId);
    } else if (inventoryItems.length > 0 && !selectedItemId) {
      setSelectedItemId(inventoryItems[0].id);
    }
  }, [initialItemId, inventoryItems, selectedItemId]);

  useEffect(() => {
    if (initialType) {
      setOpType(initialType);
    }
  }, [initialType]);

  if (!isOpen) return null;

  const currentItem = inventoryItems.find((i) => i.id === selectedItemId);

  const OP_CONFIG: Record<
    StockTransactionType,
    { label: string; icon: React.ElementType; color: string; bg: string; description: string }
  > = {
    receipt: {
      label: "Goods Receipt",
      icon: ArrowDownRight,
      color: "#1B6648",
      bg: "#D5F3E8",
      description: "Receive new shipment against goods receipt note",
    },
    stock_in: {
      label: 'Stock-In (Receipt)',
      icon: ArrowDownRight,
      color: '#1B6648',
      bg: '#D5F3E8',
      description: 'Receive new stock from vendor delivery or warehouse transfer',
    },
    stock_out: {
      label: 'Stock-Out (Issue)',
      icon: ArrowUpRight,
      color: '#BA3D6E',
      bg: '#F8DCE8',
      description: 'Issue parts for maintenance, replacement, or departmental disposal',
    },
    adjustment: {
      label: 'Audit Adjustment',
      icon: Sliders,
      color: '#6878CA',
      bg: '#E6E9FF',
      description: 'Reconcile stock count following a physical shelf audit or cycle count',
    },
    return: {
      label: 'Return Unused',
      icon: RotateCcw,
      color: '#C06B33',
      bg: '#FFE4CF',
      description: 'Restock surplus or unused parts returned from completed work orders',
    },
    allocation: {
      label: 'Work Order Allocation',
      icon: Package,
      color: '#24283B',
      bg: '#FAF7F1',
      description: 'Reserve parts specifically for a pending work order',
    },
  };

  const activeConfig = OP_CONFIG[opType];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!currentItem) {
      setValidationError('Please select an inventory item.');
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setValidationError('Quantity must be greater than zero.');
      return;
    }

    if ((opType === 'stock_out' || opType === 'allocation') && currentItem.currentStock < qty) {
      setValidationError(
        `Insufficient stock! Only ${currentItem.currentStock} ${currentItem.unit} currently available.`
      );
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      const res = performStockOperation({
        itemId: currentItem.id,
        type: opType,
        quantity: qty,
        reason: reason.trim() || `${activeConfig.label} recorded by ${user.name}`,
        referenceType: 'manual_adjustment',
      });

      setSubmitting(false);
      if (res.success) {
        onClose();
        setQuantity(1);
        setReason('');
        setValidationError(null);
      } else {
        setValidationError(res.message);
      }
    }, 400);
  };

  // Preview projected new stock
  const calculateProjectedStock = (): number => {
    if (!currentItem) return 0;
    const qty = Number(quantity) || 0;
    if (opType === 'stock_in' || opType === 'return') {
      return currentItem.currentStock + qty;
    }
    if (opType === 'stock_out' || opType === 'allocation') {
      return Math.max(0, currentItem.currentStock - qty);
    }
    if (opType === 'adjustment') {
      return qty;
    }
    return currentItem.currentStock;
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
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#E7E2DD]" style={{ background: activeConfig.bg }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-pastel-sm" style={{ background: '#FFFFFF' }}>
            <activeConfig.icon size={20} style={{ color: activeConfig.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-space font-bold text-base text-[#24283B]">Stock Operation</h2>
            <p className="font-jakarta text-[12px] text-[#74788C]">{activeConfig.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#74788C] hover:bg-black/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Operation Selector Tabs */}
        <div className="flex border-b border-[#E7E2DD] p-2 gap-1.5 bg-[#FAF7F1]">
          {(['stock_in', 'stock_out', 'adjustment', 'return'] as StockTransactionType[]).map((type) => {
            const conf = OP_CONFIG[type];
            const isActive = opType === type;
            const Icon = conf.icon;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setOpType(type);
                  setValidationError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl font-jakarta text-[12px] font-semibold transition-all ${
                  isActive
                    ? 'bg-white shadow-pastel-sm text-[#24283B] border border-[#E7E2DD]'
                    : 'text-[#74788C] hover:text-[#24283B] hover:bg-white/60'
                }`}
              >
                <Icon size={14} style={{ color: conf.color }} />
                <span>{conf.label.split(' ')[0]}</span>
              </button>
            );
          })}
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
                setSelectedItemId(e.target.value);
                setValidationError(null);
              }}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] focus:outline-none focus:border-[#C06B33] bg-white transition-all"
            >
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  [{item.sku}] {item.name} — Current: {item.currentStock} {item.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Item Quick Status Card */}
          {currentItem && (
            <div className="p-3.5 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] flex items-center justify-between text-xs font-jakarta">
              <div>
                <span className="text-[#74788C] block text-[11px]">Storage Location:</span>
                <span className="font-semibold text-[#24283B]">{currentItem.location}</span>
              </div>
              <div className="text-right">
                <span className="text-[#74788C] block text-[11px]">Current Available:</span>
                <span className="font-space font-bold text-sm text-[#24283B]">
                  {currentItem.currentStock} {currentItem.unit}
                </span>
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
                {opType === 'adjustment' ? 'Target Stock Count *' : 'Quantity *'}
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
                placeholder="1"
              />
            </div>

            {/* Projected Stock Display */}
            <div>
              <label className="block font-jakarta text-[12px] font-semibold text-[#74788C] mb-1.5">
                Projected New Stock
              </label>
              <div className="w-full px-3.5 py-2.5 rounded-xl bg-[#F6F0E5] border border-[#E7E2DD] font-space font-bold text-sm text-[#24283B] flex items-center justify-between">
                <span>{calculateProjectedStock()}</span>
                <span className="font-jakarta text-[11px] font-normal text-[#74788C]">
                  {currentItem?.unit}
                </span>
              </div>
            </div>
          </div>

          {/* Reason / Reference */}
          <div>
            <label className="block font-jakarta text-[12px] font-semibold text-[#24283B] mb-1.5">
              Reason / Reference Notes
            </label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Replenishment from Vendor PO-9012, or Scheduled inspection replacement"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-sm text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#C06B33] transition-all"
            />
          </div>

          {/* Audit trail metadata note */}
          <div className="px-3.5 py-2.5 rounded-xl bg-[#F2F4FF] border border-[#E6E9FF] text-[11px] font-jakarta text-[#6878CA] flex items-center justify-between">
            <span>Operator: <strong>{user.name}</strong></span>
            <span>Audit: Stored in immutable ledger</span>
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
              {submitting ? 'Recording…' : `Confirm ${activeConfig.label.split(' ')[0]}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
