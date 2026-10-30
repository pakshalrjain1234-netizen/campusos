import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { useCampus } from '../context/CampusContext';

export default function InventoryPage() {
  const { stockAlerts } = useCampus();

  const REORDER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    critical: { bg: '#F8DCE8', text: '#BA3D6E', label: 'Critical — Out of Stock Risk' },
    reordered: { bg: '#D5F3E8', text: '#2E8B67', label: 'Reordered · En Route' },
    pending_approval: { bg: '#FFE4CF', text: '#C06B33', label: 'Pending Approval' },
  };

  return (
    <div className="px-6 py-7 space-y-6">
      <div>
        <Link to="/dashboard" className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">Inventory & Assets</h1>
        <p className="font-jakarta text-sm text-[#74788C] mt-1">Track all campus supplies, spare parts, and equipment assets</p>
      </div>

      {/* Alert cards */}
      <div>
        <h2 className="font-space font-bold text-base text-[#24283B] mb-3">Active Stock Alerts</h2>
        <div className="space-y-3">
          {stockAlerts.map((alert) => {
            const style = REORDER_STYLES[alert.reorderStatus];
            const pct = Math.min(100, Math.round((alert.currentStock / alert.minThreshold) * 100));
            return (
              <div key={alert.id} className="p-5 bg-white rounded-card border border-[#E7E2DD] hover:shadow-pastel-sm transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: style.bg }}>
                    <Package size={16} style={{ color: style.text }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-jakarta font-bold text-[12px] text-[#74788C]">{alert.sku}</span>
                      <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold" style={{ background: style.bg, color: style.text }}>{style.label}</span>
                    </div>
                    <h3 className="font-space font-bold text-[14px] text-[#24283B]">{alert.itemName}</h3>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="font-jakarta text-[12px] text-[#74788C]">{alert.category}</span>
                      <span className="font-jakarta text-[12px] font-semibold" style={{ color: style.text }}>
                        {alert.currentStock} / {alert.minThreshold} {alert.unit}
                      </span>
                      <span className="flex items-center gap-1 font-jakarta text-[12px] text-[#74788C]"><Clock size={11} />Lead: {alert.leadTimeDays} days</span>
                      <span className="font-jakarta text-[12px] text-[#74788C]">{alert.location}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-[#F6F0E5] overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: style.text }} />
                      </div>
                      <span className="font-jakarta text-[11px] font-semibold" style={{ color: style.text }}>{pct}% of min</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F6F0E5] text-[#74788C] font-jakarta font-semibold text-[12px] hover:bg-[#E7E2DD] transition-colors flex-shrink-0">
                    <RefreshCw size={12} /> Reorder
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature preview */}
      <div>
        <h2 className="font-space font-bold text-base text-[#24283B] mb-3">Upcoming in Phase 2</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Full Asset Registry', desc: 'Complete lifecycle tracking for every piece of campus equipment, from procurement to decommission.', bg: '#F2F4FF', color: '#6878CA' },
            { title: 'Automated Reordering', desc: 'Smart threshold-based PO generation directly integrated with approved campus vendors.', bg: '#E9F9F2', color: '#2E8B67' },
            { title: 'Spare-Part Finder', desc: 'Cross-reference workshop inventory, find exact part locations, and raise checkout requests in seconds.', bg: '#FFF2E7', color: '#C06B33' },
          ].map((f) => (
            <div key={f.title} className="p-5 rounded-card border border-[#E7E2DD]" style={{ background: f.bg }}>
              <h3 className="font-space font-bold text-[14px] mb-1" style={{ color: f.color }}>{f.title}</h3>
              <p className="font-jakarta text-[12px] text-[#74788C] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

