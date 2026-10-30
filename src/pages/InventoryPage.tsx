import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Sliders,
  CheckCircle2,
  Clock,
  Building2,
  ShoppingBag,
  Sparkles,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  History,
  RotateCcw,
  Check,
  Truck,
  ExternalLink,
  Wrench
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { InventoryItem, StockTransactionType, ProcurementStatus } from '../types';
import StockOperationModal from '../components/modals/StockOperationModal';
import CreateProcurementModal from '../components/modals/CreateProcurementModal';
import AllocatePartModal from '../components/modals/AllocatePartModal';

type InventoryTab = 'overview' | 'catalogue' | 'procurement' | 'audit_trail';

export default function InventoryPage() {
  const {
    inventoryItems,
    stockTransactions,
    procurementRequests,
    workOrders,
    approveProcurement,
    rejectProcurement,
    orderProcurement,
    receiveProcurementStock,
    user
  } = useCampus();

  const [activeTab, setActiveTab] = useState<InventoryTab>('overview');

  // Modal States
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalItemId, setStockModalItemId] = useState<string | null>(null);
  const [stockModalType, setStockModalType] = useState<StockTransactionType>('stock_in');

  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
  const [procurementModalItemId, setProcurementModalItemId] = useState<string | null>(null);
  const [procurementSuggestedQty, setProcurementSuggestedQty] = useState<number | undefined>();
  const [procurementDefaultReason, setProcurementDefaultReason] = useState<string | undefined>();

  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [allocateModalItemId, setAllocateModalItemId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [procurementFilterStatus, setProcurementFilterStatus] = useState<string>('all');
  const [auditFilterType, setAuditFilterType] = useState<string>('all');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(inventoryItems.map((i) => i.category));
    return ['all', ...Array.from(set)];
  }, [inventoryItems]);

  // Overall KPI Metrics
  const metrics = useMemo(() => {
    const totalItems = inventoryItems.length;
    const availableStock = inventoryItems.reduce((acc, i) => acc + i.currentStock, 0);
    const lowStockCount = inventoryItems.filter((i) => i.status === 'low_stock').length;
    const outOfStockCount = inventoryItems.filter((i) => i.status === 'out_of_stock').length;
    const totalValuation = inventoryItems.reduce((acc, i) => acc + i.currentStock * i.unitCost, 0);
    const totalAllocated = inventoryItems.reduce((acc, i) => acc + (i.allocatedQuantity || 0), 0);
    const pendingProcurements = procurementRequests.filter((p) => p.status === 'pending_approval').length;

    return {
      totalItems,
      availableStock,
      lowStockCount,
      outOfStockCount,
      totalValuation,
      totalAllocated,
      pendingProcurements,
    };
  }, [inventoryItems, procurementRequests]);

  // Rule-based Reorder Suggestions (Intelligent Decision Support)
  const reorderSuggestions = useMemo(() => {
    return inventoryItems
      .filter((i) => i.currentStock <= i.minThreshold)
      .map((item) => {
        const recommendedQty = Math.max(item.maxThreshold - item.currentStock, item.minThreshold);
        const estimatedCost = recommendedQty * item.unitCost;

        // Check if item blocks any active work orders
        const blockingWorkOrders = workOrders.filter((wo) => {
          if (wo.status === 'completed') return false;
          const matchesPart = (wo.partsRequired || []).some(
            (p) =>
              p.toLowerCase().includes(item.name.toLowerCase()) ||
              item.name.toLowerCase().includes(p.toLowerCase()) ||
              p.toLowerCase().includes(item.sku.toLowerCase())
          );
          const matchesEquipment = (item.compatibleEquipment || []).some((eq) =>
            wo.title.toLowerCase().includes(eq.toLowerCase().split(' (')[0])
          );
          return matchesPart || matchesEquipment;
        });

        const isBlocking = blockingWorkOrders.length > 0;
        const isOutOfStock = item.currentStock === 0;

        let ruleExplanation = '';
        if (isBlocking && isOutOfStock) {
          ruleExplanation = `Critical: Stock is 0 · Directly blocking ${blockingWorkOrders[0].orderNumber} (${blockingWorkOrders[0].title})`;
        } else if (isOutOfStock) {
          ruleExplanation = `High: Stock is 0 (below min ${item.minThreshold} ${item.unit}) · Immediate operational disruption risk`;
        } else if (isBlocking) {
          ruleExplanation = `Elevated: Stock (${item.currentStock}) < Min threshold (${item.minThreshold}) · Required by ${blockingWorkOrders[0].orderNumber}`;
        } else {
          ruleExplanation = `Buffer Low: Stock (${item.currentStock} ${item.unit}) reached reorder threshold (${item.minThreshold} ${item.unit})`;
        }

        const urgency: 'urgent' | 'high' | 'medium' =
          isOutOfStock || isBlocking ? 'urgent' : item.currentStock <= item.minThreshold / 2 ? 'high' : 'medium';

        return {
          item,
          recommendedQty,
          estimatedCost,
          blockingWorkOrders,
          ruleExplanation,
          urgency,
        };
      })
      .sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2 };
        return priorityOrder[a.urgency] - priorityOrder[b.urgency];
      });
  }, [inventoryItems, workOrders]);

  // Frequently requested items analysis from transaction history
  const frequentlyRequested = useMemo(() => {
    const counts: Record<string, number> = {};
    stockTransactions.forEach((tx) => {
      if (tx.type === 'stock_out' || tx.type === 'allocation') {
        counts[tx.itemId] = (counts[tx.itemId] || 0) + tx.quantity;
      }
    });

    return Object.entries(counts)
      .map(([itemId, totalQty]) => {
        const item = inventoryItems.find((i) => i.id === itemId);
        return { item, totalQty };
      })
      .filter((entry): entry is { item: InventoryItem; totalQty: number } => Boolean(entry.item))
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 4);
  }, [stockTransactions, inventoryItems]);

  // Filtered Catalogue Items
  const filteredCatalogue = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;

      const matchesStatus =
        selectedStatus === 'all' ||
        (selectedStatus === 'in_stock' && item.status === 'in_stock') ||
        (selectedStatus === 'low_stock' && item.status === 'low_stock') ||
        (selectedStatus === 'out_of_stock' && item.status === 'out_of_stock') ||
        (selectedStatus === 'below_min' && item.currentStock <= item.minThreshold);

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [inventoryItems, searchQuery, selectedCategory, selectedStatus]);

  // Filtered Procurement Requests
  const filteredProcurements = useMemo(() => {
    return procurementRequests.filter((p) => {
      if (procurementFilterStatus === 'all') return true;
      return p.status === procurementFilterStatus;
    });
  }, [procurementRequests, procurementFilterStatus]);

  // Filtered Stock Transactions Audit Trail
  const filteredTransactions = useMemo(() => {
    return stockTransactions.filter((tx) => {
      if (auditFilterType === 'all') return true;
      return tx.type === auditFilterType;
    });
  }, [stockTransactions, auditFilterType]);

  const openStockModal = (itemId?: string, type: StockTransactionType = 'stock_in') => {
    setStockModalItemId(itemId || null);
    setStockModalType(type);
    setIsStockModalOpen(true);
  };

  const openProcurementModal = (itemId?: string, suggestedQty?: number, defaultReason?: string) => {
    setProcurementModalItemId(itemId || null);
    setProcurementSuggestedQty(suggestedQty);
    setProcurementDefaultReason(defaultReason);
    setIsProcurementModalOpen(true);
  };

  const openAllocateModal = (itemId?: string) => {
    setAllocateModalItemId(itemId || null);
    setIsAllocateModalOpen(true);
  };

  return (
    <div className="px-6 py-7 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            to="/dashboard"
            className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors"
          >
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">
              Inventory & Procurement Hub
            </h1>
            <span className="px-2.5 py-1 rounded-full bg-[#E9F9F2] text-[#2E8B67] border border-[#C5EFE0] font-jakarta text-[11px] font-bold">
              Phase 2.4 Active
            </span>
          </div>
          <p className="font-jakarta text-sm text-[#74788C] mt-1">
            Real-time campus supplies, atomic stock ledger, work-order part allocation, and rule-based procurement
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => openStockModal(undefined, 'stock_in')}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#E7E2DD] text-[#24283B] font-jakarta font-semibold text-xs hover:bg-[#F6F0E5] shadow-pastel-sm transition-all"
          >
            <Sliders size={14} className="text-[#6878CA]" /> Stock Operation
          </button>
          <button
            onClick={() => openAllocateModal()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#E7E2DD] text-[#24283B] font-jakarta font-semibold text-xs hover:bg-[#F6F0E5] shadow-pastel-sm transition-all"
          >
            <Wrench size={14} className="text-[#C06B33]" /> Allocate to Work Order
          </button>
          <button
            onClick={() => openProcurementModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#24283B] text-white font-jakarta font-semibold text-xs hover:bg-[#383E58] shadow-pastel-sm transition-all"
          >
            <Plus size={14} /> New Requisition
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#E7E2DD] gap-2 overflow-x-auto pb-px">
        {[
          { id: 'overview', label: 'Dashboard & Insights', count: reorderSuggestions.length ? `${reorderSuggestions.length} alerts` : undefined },
          { id: 'catalogue', label: 'Inventory Catalogue', count: inventoryItems.length },
          { id: 'procurement', label: 'Intelligent Procurement', count: procurementRequests.length },
          { id: 'audit_trail', label: 'Stock Movement Ledger', count: stockTransactions.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as InventoryTab)}
              className={`flex items-center gap-2 px-4 py-3 font-jakarta text-xs font-semibold whitespace-nowrap transition-all border-b-2 -mb-px ${
                isActive
                  ? 'border-[#24283B] text-[#24283B]'
                  : 'border-transparent text-[#74788C] hover:text-[#24283B]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-[#24283B] text-white' : 'bg-[#E7E2DD] text-[#74788C]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & INSIGHTS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key KPI Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total Catalogued', value: metrics.totalItems, sub: 'Distinct SKUs', bg: '#F2F4FF', color: '#6878CA' },
              { label: 'Available Stock', value: metrics.availableStock, sub: 'Units in stores', bg: '#E9F9F2', color: '#2E8B67' },
              { label: 'Low Stock Buffer', value: metrics.lowStockCount, sub: 'Requires replenishment', bg: '#FFF2E7', color: '#C06B33' },
              { label: 'Critical Out of Stock', value: metrics.outOfStockCount, sub: '0 units remaining', bg: '#FDF0F6', color: '#BA3D6E' },
              { label: 'Allocated to WOs', value: metrics.totalAllocated, sub: 'Parts reserved', bg: '#F6F0E5', color: '#24283B' },
              {
                label: 'Inventory Valuation',
                value: `₹${(metrics.totalValuation / 1000).toFixed(1)}k`,
                sub: `Total: ₹${metrics.totalValuation.toLocaleString('en-IN')}`,
                bg: '#FAF7F1',
                color: '#24283B',
              },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-card border border-[#E7E2DD] shadow-pastel-sm" style={{ background: stat.bg }}>
                <p className="font-jakarta text-[11px] font-semibold text-[#74788C] uppercase tracking-wider">{stat.label}</p>
                <p className="font-space font-bold text-2xl mt-1 tracking-tight" style={{ color: stat.color }}>{stat.value}</p>
                <p className="font-jakarta text-[11px] text-[#74788C] mt-0.5 truncate">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Intelligent Reorder Suggestions Section */}
          <div className="bg-white rounded-card-lg border border-[#E7E2DD] p-5 shadow-pastel-sm">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FFF2E7] flex items-center justify-center text-[#C06B33]">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h2 className="font-space font-bold text-base text-[#24283B]">
                    Rule-Based Reorder & Shortage Recommendations
                  </h2>
                  <p className="font-jakarta text-xs text-[#74788C]">
                    Deterministic evaluation: stock threshold triggers, work order dependencies, and vendor lead times
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-jakarta text-[#74788C] bg-[#FAF7F1] px-3 py-1 rounded-full border border-[#E7E2DD]">
                {reorderSuggestions.length} Active Shortage Flags
              </span>
            </div>

            {reorderSuggestions.length === 0 ? (
              <div className="p-8 text-center bg-[#FAF7F1] rounded-card border border-dashed border-[#E7E2DD]">
                <CheckCircle2 size={28} className="mx-auto text-[#2E8B67] mb-2" />
                <p className="font-space font-bold text-sm text-[#24283B]">All inventory levels are healthy</p>
                <p className="font-jakarta text-xs text-[#74788C] mt-1">
                  Every catalogue item has stock meeting or exceeding minimum buffer thresholds.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reorderSuggestions.map(({ item, recommendedQty, estimatedCost, blockingWorkOrders, ruleExplanation, urgency }) => {
                  const pct = Math.min(100, Math.round((item.currentStock / item.minThreshold) * 100));
                  const isBlocked = blockingWorkOrders.length > 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-card border transition-all ${
                        urgency === 'urgent'
                          ? 'border-[#E8B4C8] bg-[#FDF0F6]/40'
                          : 'border-[#E7E2DD] bg-[#FAF7F1]'
                      } hover:shadow-pastel-sm`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-jakarta font-bold text-[12px] text-[#74788C]">{item.sku}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold uppercase ${
                                urgency === 'urgent'
                                  ? 'bg-[#F8DCE8] text-[#BA3D6E]'
                                  : 'bg-[#FFE4CF] text-[#C06B33]'
                              }`}
                            >
                              {urgency === 'urgent' ? 'Critical Shortage' : 'Low Buffer'}
                            </span>
                            <span className="font-jakarta text-[11px] text-[#74788C]">{item.category}</span>
                            {isBlocked && (
                              <span className="px-2 py-0.5 rounded-full bg-[#BA3D6E] text-white font-jakarta text-[10px] font-bold flex items-center gap-1">
                                <AlertTriangle size={10} /> Blocks {blockingWorkOrders[0].orderNumber}
                              </span>
                            )}
                          </div>

                          <h3 className="font-space font-bold text-sm text-[#24283B]">{item.name}</h3>

                          <p className="font-jakarta text-[12px] text-[#BA3D6E] mt-1 font-semibold flex items-center gap-1.5">
                            <Sparkles size={12} /> {ruleExplanation}
                          </p>

                          <div className="flex items-center gap-4 mt-2.5 flex-wrap text-xs font-jakarta text-[#74788C]">
                            <span>
                              Stock: <strong className={item.currentStock === 0 ? 'text-[#BA3D6E]' : 'text-[#24283B]'}>{item.currentStock}</strong> / {item.minThreshold} {item.unit}
                            </span>
                            <span>•</span>
                            <span>Depot: <strong>{item.location}</strong></span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} /> Lead: {item.leadTimeDays} days ({item.supplierName})
                            </span>
                          </div>

                          {/* Stock buffer indicator */}
                          <div className="mt-2.5 flex items-center gap-3 max-w-md">
                            <div className="flex-1 h-1.5 rounded-full bg-[#E7E2DD] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  background: pct === 0 ? '#BA3D6E' : pct < 50 ? '#C06B33' : '#2E8B67',
                                }}
                              />
                            </div>
                            <span className="font-jakarta text-[11px] font-bold text-[#74788C]">{pct}% buffer</span>
                          </div>
                        </div>

                        {/* Reorder Recommendation Box */}
                        <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 lg:border-l border-[#E7E2DD] pt-3 lg:pt-0 lg:pl-5 flex-shrink-0">
                          <div className="text-left lg:text-right">
                            <span className="font-jakarta text-[11px] text-[#74788C] block">Suggested Order:</span>
                            <span className="font-space font-bold text-sm text-[#24283B]">
                              +{recommendedQty} {item.unit} (~₹{estimatedCost.toLocaleString('en-IN')})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openStockModal(item.id, 'stock_in')}
                              className="px-3 py-1.5 rounded-xl border border-[#E7E2DD] bg-white text-[#74788C] hover:text-[#24283B] font-jakarta font-semibold text-[11px] hover:bg-[#FAF7F1] transition-all"
                            >
                              Stock-In
                            </button>
                            <button
                              onClick={() =>
                                openProcurementModal(
                                  item.id,
                                  recommendedQty,
                                  `Rule-based automated requisition: ${ruleExplanation}`
                                )
                              }
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#24283B] text-white font-jakarta font-semibold text-[11px] hover:bg-[#383E58] shadow-pastel-sm transition-all"
                            >
                              <ShoppingBag size={12} /> Raise Requisition
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lower Grid: Frequently Requested Items & Recent Stock Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Frequently Requested Items */}
            <div className="bg-white rounded-card-lg border border-[#E7E2DD] p-5 shadow-pastel-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-[#6878CA]" />
                <h3 className="font-space font-bold text-sm text-[#24283B]">Frequently Requested Spares</h3>
              </div>
              <div className="space-y-3">
                {frequentlyRequested.map(({ item, totalQty }) => (
                  <div key={item.id} className="p-3 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] flex items-center justify-between">
                    <div>
                      <p className="font-space font-bold text-xs text-[#24283B]">{item.name}</p>
                      <p className="font-jakarta text-[11px] text-[#74788C]">{item.category} · {item.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-space font-bold text-xs text-[#6878CA] block">
                        {totalQty} {item.unit} issued
                      </span>
                      <span className="font-jakarta text-[10px] text-[#74788C]">
                        {item.currentStock} currently in store
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Ledger Movements */}
            <div className="lg:col-span-2 bg-white rounded-card-lg border border-[#E7E2DD] p-5 shadow-pastel-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <History size={16} className="text-[#24283B]" />
                  <h3 className="font-space font-bold text-sm text-[#24283B]">Recent Stock Movements (Audit Trail)</h3>
                </div>
                <button
                  onClick={() => setActiveTab('audit_trail')}
                  className="font-jakarta text-xs text-[#6878CA] font-semibold hover:underline flex items-center gap-1"
                >
                  View full ledger <ChevronRight size={12} />
                </button>
              </div>

              <div className="space-y-2.5">
                {stockTransactions.slice(0, 5).map((tx) => {
                  const isPositive = tx.type === 'stock_in' || tx.type === 'return';
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] hover:border-[#6878CA]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isPositive ? 'bg-[#D5F3E8] text-[#1B6648]' : 'bg-[#F8DCE8] text-[#BA3D6E]'
                          }`}
                        >
                          {isPositive ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-space font-bold text-xs text-[#24283B] truncate">{tx.itemName}</p>
                          <p className="font-jakarta text-[11px] text-[#74788C] truncate">
                            {tx.reason} · {tx.performedBy}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-4">
                        <span
                          className={`font-space font-bold text-xs ${
                            isPositive ? 'text-[#2E8B67]' : 'text-[#BA3D6E]'
                          }`}
                        >
                          {isPositive ? '+' : '-'}{tx.quantity}
                        </span>
                        <span className="block font-jakarta text-[10px] text-[#74788C]">
                          {tx.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY CATALOGUE */}
      {activeTab === 'catalogue' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="p-4 bg-white rounded-card border border-[#E7E2DD] shadow-pastel-sm flex flex-col md:flex-row items-center gap-3 justify-between">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74788C]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalogue by part name, SKU, category, supplier, or location…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#C06B33] bg-[#FAF7F1]"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#C06B33]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none focus:border-[#C06B33]"
              >
                <option value="all">All Stock Statuses</option>
                <option value="in_stock">In Stock (&gt; Min Buffer)</option>
                <option value="low_stock">Low Stock (≤ Min Buffer)</option>
                <option value="out_of_stock">Out of Stock (0 units)</option>
                <option value="below_min">All Below Safety Threshold</option>
              </select>
            </div>
          </div>

          {/* Items Catalogue Table */}
          <div className="bg-white rounded-card-lg border border-[#E7E2DD] shadow-pastel-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E7E2DD] bg-[#FAF7F1]">
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Item / SKU</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Category</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Stock & Buffer</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Depot Location</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Unit Cost</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Supplier</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2DD]/60">
                  {filteredCatalogue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 font-jakarta text-xs text-[#74788C]">
                        No catalogue items match your search or filter parameters.
                      </td>
                    </tr>
                  ) : (
                    filteredCatalogue.map((item) => {
                      const isLow = item.currentStock <= item.minThreshold && item.currentStock > 0;
                      const isZero = item.currentStock === 0;

                      return (
                        <tr key={item.id} className="hover:bg-[#FAF7F1]/70 transition-colors">
                          {/* Item & SKU */}
                          <td className="py-3.5 px-4">
                            <span className="font-jakarta font-bold text-[11px] text-[#74788C] block">{item.sku}</span>
                            <span className="font-space font-bold text-xs text-[#24283B] block">{item.name}</span>
                            <p className="font-jakarta text-[11px] text-[#74788C] line-clamp-1 mt-0.5">{item.description}</p>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4 font-jakarta text-xs text-[#74788C]">
                            <span className="px-2 py-0.5 rounded-full bg-[#F6F0E5] text-[#24283B] text-[11px] font-semibold">
                              {item.category}
                            </span>
                          </td>

                          {/* Stock Status & Bar */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-space font-bold text-xs ${
                                  isZero ? 'text-[#BA3D6E]' : isLow ? 'text-[#C06B33]' : 'text-[#2E8B67]'
                                }`}
                              >
                                {item.currentStock} {item.unit}
                              </span>
                              <span className="font-jakarta text-[11px] text-[#74788C]">
                                (min: {item.minThreshold})
                              </span>
                            </div>
                            {item.allocatedQuantity > 0 && (
                              <span className="font-jakarta text-[10px] text-[#C06B33] block">
                                {item.allocatedQuantity} allocated to WOs
                              </span>
                            )}
                          </td>

                          {/* Storage Location */}
                          <td className="py-3.5 px-4 font-jakarta text-xs text-[#74788C]">
                            <span className="font-semibold text-[#24283B] block">{item.location}</span>
                          </td>

                          {/* Unit Cost */}
                          <td className="py-3.5 px-4">
                            <span className="font-space font-bold text-xs text-[#24283B]">
                              ₹{item.unitCost.toLocaleString('en-IN')}
                            </span>
                            <span className="block font-jakarta text-[10px] text-[#74788C]">
                              Val: ₹{(item.currentStock * item.unitCost).toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* Supplier */}
                          <td className="py-3.5 px-4 font-jakarta text-xs">
                            <span className="font-semibold text-[#24283B] block">{item.supplierName}</span>
                            <span className="text-[11px] text-[#74788C] flex items-center gap-1">
                              <Clock size={10} /> {item.leadTimeDays}d lead time
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openStockModal(item.id, 'stock_in')}
                                title="Adjust or Record Stock Operation"
                                className="p-1.5 rounded-lg border border-[#E7E2DD] bg-[#FAF7F1] text-[#24283B] hover:bg-[#E7E2DD] transition-colors"
                              >
                                <Sliders size={13} />
                              </button>
                              <button
                                onClick={() => openAllocateModal(item.id)}
                                title="Allocate to Maintenance Work Order"
                                className="p-1.5 rounded-lg border border-[#E7E2DD] bg-[#FAF7F1] text-[#C06B33] hover:bg-[#FFE4CF] transition-colors"
                              >
                                <Wrench size={13} />
                              </button>
                              <button
                                onClick={() => openProcurementModal(item.id)}
                                title="Raise Procurement Requisition"
                                className="p-1.5 rounded-lg bg-[#24283B] text-white hover:bg-[#383E58] transition-colors"
                              >
                                <ShoppingBag size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INTELLIGENT PROCUREMENT */}
      {activeTab === 'procurement' && (
        <div className="space-y-6">
          {/* Header Stats & Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white rounded-card border border-[#E7E2DD] shadow-pastel-sm">
            <div>
              <h2 className="font-space font-bold text-base text-[#24283B]">Procurement Requisitions & Orders</h2>
              <p className="font-jakarta text-xs text-[#74788C]">
                Full lifecycle management: Request → Approval → Vendor Order → Receiving & Atomic Stock-In
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={procurementFilterStatus}
                onChange={(e) => setProcurementFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-[#FAF7F1]"
              >
                <option value="all">All Statuses</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="ordered">Ordered (Dispatched)</option>
                <option value="received">Received & Stocked</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={() => openProcurementModal()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#24283B] text-white font-jakarta font-semibold text-xs hover:bg-[#383E58] transition-colors"
              >
                <Plus size={13} /> New Requisition
              </button>
            </div>
          </div>

          {/* Procurement Requisitions List */}
          <div className="space-y-3">
            {filteredProcurements.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-card border border-[#E7E2DD]">
                <p className="font-jakarta text-xs text-[#74788C]">No procurement requisitions found.</p>
              </div>
            ) : (
              filteredProcurements.map((req) => {
                const STATUS_STYLES: Record<
                  ProcurementStatus,
                  { bg: string; text: string; label: string; icon: React.ElementType }
                > = {
                  draft: { bg: '#F6F0E5', text: '#74788C', label: 'Draft', icon: Clock },
                  pending_approval: { bg: '#FFE4CF', text: '#C06B33', label: 'Pending Approval', icon: Clock },
                  approved: { bg: '#D5F3E8', text: '#1B6648', label: 'Approved — Ready to Order', icon: CheckCircle2 },
                  ordered: { bg: '#E6E9FF', text: '#6878CA', label: 'Ordered · Dispatched', icon: Truck },
                  received: { bg: '#E9F9F2', text: '#2E8B67', label: 'Received & In Stock', icon: Check },
                  rejected: { bg: '#F8DCE8', text: '#BA3D6E', label: 'Declined', icon: AlertTriangle },
                };

                const stat = STATUS_STYLES[req.status];
                const StatusIcon = stat.icon;

                return (
                  <div
                    key={req.id}
                    className="p-5 bg-white rounded-card border border-[#E7E2DD] shadow-pastel-sm hover:border-[#6878CA]/30 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-jakarta font-bold text-xs text-[#74788C]">{req.requestNumber}</span>
                          <span
                            className="px-2.5 py-0.5 rounded-full font-jakarta text-[10px] font-bold flex items-center gap-1"
                            style={{ background: stat.bg, color: stat.text }}
                          >
                            <StatusIcon size={11} /> {stat.label}
                          </span>
                          <span className="font-jakarta text-[11px] text-[#74788C]">[{req.itemSku}]</span>
                          <span className="font-jakarta text-[11px] text-[#74788C]">{req.category}</span>
                        </div>

                        <h3 className="font-space font-bold text-sm text-[#24283B]">{req.itemName}</h3>
                        <p className="font-jakarta text-xs text-[#74788C] mt-1">{req.reason}</p>

                        {req.ruleTriggerReason && (
                          <p className="font-jakarta text-[11px] text-[#6878CA] mt-1 flex items-center gap-1">
                            <Sparkles size={11} /> {req.ruleTriggerReason}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2.5 flex-wrap text-xs font-jakarta text-[#74788C]">
                          <span>
                            Quantity: <strong>{req.quantity} {req.unit}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Vendor: <strong>{req.supplierName}</strong>
                          </span>
                          <span>•</span>
                          <span>Requested by: {req.requestedBy}</span>
                          <span>•</span>
                          <span>{req.createdAt}</span>
                          {req.approvedBy && (
                            <>
                              <span>•</span>
                              <span className="text-[#2E8B67]">Approved by: {req.approvedBy}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Total Cost & Lifecycle Actions */}
                      <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 border-t lg:border-t-0 lg:border-l border-[#E7E2DD] pt-3 lg:pt-0 lg:pl-5 flex-shrink-0">
                        <div className="text-left lg:text-right">
                          <span className="font-jakarta text-[11px] text-[#74788C] block">Total Estimated Cost:</span>
                          <span className="font-space font-bold text-base text-[#24283B]">
                            ₹{req.totalEstimatedCost.toLocaleString('en-IN')}
                          </span>
                        </div>

                        {/* Lifecycle buttons */}
                        <div className="flex items-center gap-2">
                          {req.status === 'pending_approval' && (
                            <>
                              <button
                                onClick={() => approveProcurement(req.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#D5F3E8] text-[#1B6648] font-jakarta font-semibold text-[11px] hover:bg-[#B8ECD8] transition-colors"
                              >
                                <CheckCircle2 size={12} /> Approve
                              </button>
                              <button
                                onClick={() => rejectProcurement(req.id)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F6F0E5] text-[#74788C] font-jakarta font-semibold text-[11px] hover:bg-[#E7E2DD] transition-colors"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {req.status === 'approved' && (
                            <button
                              onClick={() => orderProcurement(req.id)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6878CA] text-white font-jakarta font-semibold text-[11px] hover:bg-[#5262B4] transition-colors"
                            >
                              <Truck size={12} /> Mark as Ordered
                            </button>
                          )}

                          {req.status === 'ordered' && (
                            <button
                              onClick={() => receiveProcurementStock(req.id)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2E8B67] text-white font-jakarta font-semibold text-[11px] hover:bg-[#236C50] shadow-pastel-sm transition-colors"
                            >
                              <CheckCircle2 size={12} /> Record Stock Receipt
                            </button>
                          )}

                          {req.status === 'received' && (
                            <span className="px-3 py-1 rounded-xl bg-[#E9F9F2] text-[#2E8B67] font-jakarta text-[11px] font-bold flex items-center gap-1">
                              <Check size={12} /> In Inventory
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL & STOCK LEDGER */}
      {activeTab === 'audit_trail' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-card border border-[#E7E2DD] shadow-pastel-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div>
              <h2 className="font-space font-bold text-base text-[#24283B]">Stock Movement Ledger (Audit Trail)</h2>
              <p className="font-jakarta text-xs text-[#74788C]">
                Immutable, timestamped audit trail of all stock additions, deductions, allocations, and adjustments
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditFilterType}
                onChange={(e) => setAuditFilterType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-[#FAF7F1]"
              >
                <option value="all">All Operations</option>
                <option value="stock_in">Stock-In Only</option>
                <option value="stock_out">Stock-Out Only</option>
                <option value="allocation">Work Order Allocations</option>
                <option value="return">Returns Only</option>
                <option value="adjustment">Audit Adjustments</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-card-lg border border-[#E7E2DD] shadow-pastel-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E7E2DD] bg-[#FAF7F1]">
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Tx Number</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Item & SKU</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Operation Type</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Quantity</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Balance Change</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Reason / Reference</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Performed By</th>
                    <th className="py-3 px-4 font-jakarta font-bold text-[11px] text-[#74788C] uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2DD]/60">
                  {filteredTransactions.map((tx) => {
                    const isPositive = tx.type === 'stock_in' || tx.type === 'return';
                    const TYPE_BADGES: Record<StockTransactionType, { bg: string; text: string; label: string }> = {
                      stock_in: { bg: '#D5F3E8', text: '#1B6648', label: 'Stock-In' },
                      stock_out: { bg: '#F8DCE8', text: '#BA3D6E', label: 'Stock-Out' },
                      allocation: { bg: '#FFE4CF', text: '#C06B33', label: 'WO Allocation' },
                      return: { bg: '#E9F9F2', text: '#2E8B67', label: 'Return' },
                      adjustment: { bg: '#E6E9FF', text: '#6878CA', label: 'Adjustment' },
                    };
                    const badge = TYPE_BADGES[tx.type];

                    return (
                      <tr key={tx.id} className="hover:bg-[#FAF7F1]/70 transition-colors">
                        <td className="py-3 px-4 font-space font-bold text-xs text-[#24283B]">{tx.transactionNumber}</td>
                        <td className="py-3 px-4">
                          <span className="font-space font-bold text-xs text-[#24283B] block">{tx.itemName}</span>
                          <span className="font-jakarta text-[11px] text-[#74788C]">{tx.itemSku}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold"
                            style={{ background: badge.bg, color: badge.text }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-space font-bold text-xs ${
                              isPositive ? 'text-[#2E8B67]' : 'text-[#BA3D6E]'
                            }`}
                          >
                            {isPositive ? '+' : '-'}{tx.quantity}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-jakarta text-xs text-[#74788C]">
                          <span>{tx.previousStock} → <strong>{tx.newStock}</strong></span>
                        </td>
                        <td className="py-3 px-4 font-jakarta text-xs text-[#24283B]">
                          <p className="line-clamp-1">{tx.reason}</p>
                          {tx.referenceId && (
                            <span className="text-[11px] text-[#6878CA] font-semibold">{tx.referenceId}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-jakarta text-xs text-[#74788C]">{tx.performedBy}</td>
                        <td className="py-3 px-4 font-jakarta text-xs text-[#74788C] whitespace-nowrap">{tx.timestamp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <StockOperationModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        initialItemId={stockModalItemId}
        initialType={stockModalType}
      />

      <CreateProcurementModal
        isOpen={isProcurementModalOpen}
        onClose={() => setIsProcurementModalOpen(false)}
        initialItemId={procurementModalItemId}
        suggestedQty={procurementSuggestedQty}
        defaultReason={procurementDefaultReason}
      />

      <AllocatePartModal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        initialItemId={allocateModalItemId}
        onOpenProcurementModal={(itemId) => openProcurementModal(itemId)}
      />
    </div>
  );
}
