import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Zap,
  Database,
  GitBranch,
  MapPin,
  Package,
  Wrench,
  ShoppingBag,
  Clock,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import AllocatePartModal from '../components/modals/AllocatePartModal';
import CreateProcurementModal from '../components/modals/CreateProcurementModal';
import StockOperationModal from '../components/modals/StockOperationModal';

export default function SparePartsPage() {
  const { inventoryItems, workOrders } = useCampus();

  const [query, setQuery] = useState('');
  const [selectedDepot, setSelectedDepot] = useState('all');

  // Modals
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [allocateItemId, setAllocateItemId] = useState<string | null>(null);

  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
  const [procurementItemId, setProcurementItemId] = useState<string | null>(null);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockItemId, setStockItemId] = useState<string | null>(null);

  // Depots list
  const depots = useMemo(() => {
    const set = new Set(inventoryItems.map((i) => i.location.split(' - ')[0]));
    return ['all', ...Array.from(set)];
  }, [inventoryItems]);

  // Filtered parts based on query and depot
  const filteredParts = useMemo(() => {
    const q = query.toLowerCase().trim();
    return inventoryItems.filter((item) => {
      const depotName = item.location.split(' - ')[0];
      const matchesDepot = selectedDepot === 'all' || depotName === selectedDepot;

      if (!q) return matchesDepot;

      const matchesBasic =
        (item.name || item.itemName || '').toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q);

      const matchesEquipment = (item.compatibleEquipment || []).some((eq) =>
        eq.toLowerCase().includes(q)
      );

      return matchesDepot && (matchesBasic || matchesEquipment);
    });
  }, [inventoryItems, query, selectedDepot]);

  const quickFilterPills = [
    { label: 'All Spares', query: '' },
    { label: 'CNC & Machine Bearings', query: 'Bearing' },
    { label: 'HVAC Dampers & Controls', query: 'Actuator' },
    { label: 'Pumps & Float Switches', query: 'Switch' },
    { label: 'Network Cabling & Optical', query: 'Cable' },
    { label: 'Electrical Circuit Breakers', query: 'MCB' },
  ];

  return (
    <div className="px-6 py-7 space-y-6">
      <div>
        <Link
          to="/dashboard"
          className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors"
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">Spare-Part Finder</h1>
          <span className="px-2.5 py-1 rounded-full bg-[#E6E9FF] text-[#6878CA] border border-[#CAD2FC] font-jakarta text-[11px] font-bold">
            Live Cross-Reference
          </span>
        </div>
        <p className="font-jakarta text-sm text-[#74788C] mt-1">
          Instantly locate parts, verify cross-compatibility with machines, and issue spares to maintenance work orders
        </p>
      </div>

      {/* Smart Search Bar */}
      <div className="p-6 bg-white rounded-card-lg border border-[#E7E2DD] shadow-pastel-sm space-y-4">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-[#E6E9FF] bg-[#F2F4FF] focus-within:border-[#6878CA] transition-all">
          <Search size={20} className="text-[#6878CA] flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by part name, SKU, machine (e.g. 'CNC Lathe', 'Chiller AHU', 'Drainage Sump', 'Rooftop Inverter')…"
            className="w-full bg-transparent font-jakarta text-sm text-[#24283B] placeholder:text-[#9CA1B4] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[#74788C] hover:text-[#24283B] text-xs font-jakarta font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick query recommendation pills & Depot filter */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <span className="font-jakarta text-[11px] font-semibold text-[#74788C] whitespace-nowrap">
              Suggestions:
            </span>
            {quickFilterPills.map((pill) => (
              <button
                key={pill.label}
                type="button"
                onClick={() => setQuery(pill.query)}
                className={`px-3 py-1 rounded-full font-jakarta text-[11px] font-semibold whitespace-nowrap transition-all ${
                  query === pill.query
                    ? 'bg-[#24283B] text-white'
                    : 'bg-[#FAF7F1] text-[#74788C] hover:text-[#24283B] border border-[#E7E2DD]'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-jakarta text-[11px] font-semibold text-[#74788C] whitespace-nowrap">Depot:</span>
            <select
              value={selectedDepot}
              onChange={(e) => setSelectedDepot(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-[#FAF7F1] focus:outline-none"
            >
              {depots.map((d) => (
                <option key={d} value={d}>
                  {d === 'all' ? 'All Campus Storage Depots' : d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count & Status */}
      <div className="flex items-center justify-between text-xs font-jakarta text-[#74788C]">
        <span>
          Showing <strong>{filteredParts.length}</strong> matching spare parts
        </span>
        <Link to="/inventory" className="text-[#6878CA] font-semibold hover:underline flex items-center gap-1">
          Go to full catalogue & inventory hub →
        </Link>
      </div>

      {/* Parts Search Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredParts.map((item) => {
          const isZero = item.currentStock === 0;
          const isLow = item.currentStock <= item.minThreshold && !isZero;

          return (
            <div
              key={item.id}
              className="p-5 bg-white rounded-card-lg border border-[#E7E2DD] shadow-pastel-sm hover:shadow-pastel transition-all flex flex-col justify-between"
            >
              <div>
                {/* SKU and Status Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-jakarta font-bold text-xs text-[#74788C]">{item.sku}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-jakarta text-[10px] font-bold ${
                      isZero
                        ? 'bg-[#F8DCE8] text-[#BA3D6E]'
                        : isLow
                        ? 'bg-[#FFE4CF] text-[#C06B33]'
                        : 'bg-[#D5F3E8] text-[#1B6648]'
                    }`}
                  >
                    {isZero ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                  </span>
                </div>

                <h3 className="font-space font-bold text-sm text-[#24283B] mb-1">{item.name || item.itemName}</h3>
                <p className="font-jakarta text-xs text-[#74788C] line-clamp-2 leading-relaxed mb-3">
                  {item.description || ''}
                </p>

                {/* Storage Location */}
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] text-xs font-jakarta text-[#24283B] mb-3">
                  <MapPin size={14} className="text-[#C06B33] flex-shrink-0" />
                  <span className="truncate">{item.location}</span>
                </div>

                {/* Machine Compatibility Cross-References */}
                {item.compatibleEquipment && item.compatibleEquipment.length > 0 && (
                  <div className="mb-4">
                    <span className="font-jakarta text-[11px] font-semibold text-[#74788C] block mb-1.5 flex items-center gap-1">
                      <GitBranch size={11} className="text-[#6878CA]" /> Compatible Equipment:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.compatibleEquipment.map((eq) => (
                        <span
                          key={eq}
                          className="px-2 py-0.5 rounded-lg bg-[#F2F4FF] text-[#6878CA] font-jakarta text-[10px] font-semibold border border-[#E6E9FF]"
                        >
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom stock numbers and actions */}
              <div className="pt-3 border-t border-[#E7E2DD] flex items-center justify-between gap-2">
                <div>
                  <span className="font-jakarta text-[11px] text-[#74788C] block">Available Store:</span>
                  <span
                    className={`font-space font-bold text-sm ${
                      isZero ? 'text-[#BA3D6E]' : 'text-[#24283B]'
                    }`}
                  >
                    {item.currentStock} {item.unit}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setStockItemId(item.id);
                      setIsStockModalOpen(true);
                    }}
                    title="Stock Operation"
                    className="p-2 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] text-[#24283B] hover:bg-[#E7E2DD] transition-colors"
                  >
                    <Sliders size={13} />
                  </button>

                  {isZero ? (
                    <button
                      onClick={() => {
                        setProcurementItemId(item.id);
                        setIsProcurementModalOpen(true);
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#BA3D6E] text-white font-jakarta font-semibold text-[11px] hover:bg-[#9B2F5A] transition-colors"
                    >
                      <ShoppingBag size={12} /> Requisition
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setAllocateItemId(item.id);
                        setIsAllocateModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#24283B] text-white font-jakarta font-semibold text-[11px] hover:bg-[#383E58] shadow-pastel-sm transition-colors"
                    >
                      <Wrench size={12} /> Allocate
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature capabilities footer banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {[
          {
            title: 'Real-Time Multi-Depot Search',
            desc: 'Cross-references all mechanical workshops, electrical stores, and hazardous storage lockers in real time.',
            icon: Zap,
            bg: '#FFF2E7',
            color: '#C06B33',
          },
          {
            title: 'Atomic Work-Order Allocation',
            desc: 'Reserves and issues spare parts to technicians without duplicate checkout or negative stock risks.',
            icon: Database,
            bg: '#F2F4FF',
            color: '#6878CA',
          },
          {
            title: 'Equipment Compatibility Trees',
            desc: 'Tracks which campus machinery accepts which bearings, belts, and actuators to avoid mismatch downtime.',
            icon: GitBranch,
            bg: '#E9F9F2',
            color: '#2E8B67',
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="p-5 rounded-card border border-[#E7E2DD]" style={{ background: f.bg }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: f.color + '20' }}>
                <Icon size={18} style={{ color: f.color }} />
              </div>
              <h3 className="font-space font-bold text-[14px] text-[#24283B] mb-1">{f.title}</h3>
              <p className="font-jakarta text-[12px] text-[#74788C] leading-relaxed">{f.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <AllocatePartModal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        initialItemId={allocateItemId}
        onOpenProcurementModal={(itemId) => {
          setProcurementItemId(itemId);
          setIsProcurementModalOpen(true);
        }}
      />

      <CreateProcurementModal
        isOpen={isProcurementModalOpen}
        onClose={() => setIsProcurementModalOpen(false)}
        initialItemId={procurementItemId}
      />

      <StockOperationModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        initialItemId={stockItemId}
      />
    </div>
  );
}
