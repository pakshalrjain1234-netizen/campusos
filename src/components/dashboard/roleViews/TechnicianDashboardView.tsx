import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  Crosshair,
  MapPin,
  Sparkles,
  Bot,
} from 'lucide-react';
import { useCampus } from '../../../context/CampusContext';
import { useAuth } from '../../../context/AuthContext';

export default function TechnicianDashboardView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    incidents,
    workOrders,
    inventory,
    stockAlerts,
    setSelectedIncidentId,
    setIsCreateWorkOrderOpen,
  } = useCampus();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Filter work orders assigned to this technician
  const myWorkOrders = workOrders.filter(
    (wo) =>
      wo.assigneeId === user?.id ||
      wo.assignedTo?.toLowerCase().includes((user?.fullName || '').toLowerCase()) ||
      user?.role === 'technician' ||
      user?.role === 'engineer'
  );

  const activeWorkOrders = myWorkOrders.filter(
    (w) => w.status !== 'completed' && w.status !== 'verified'
  );
  const completedWorkOrders = myWorkOrders.filter(
    (w) => w.status === 'completed' || w.status === 'verified'
  );

  // Critical incidents assigned to or requiring technical attention
  const criticalAssignedIncidents = incidents.filter(
    (i) =>
      (i.severity === 'critical' || i.severity === 'high') &&
      i.lifecycleStatus !== 'closed' &&
      i.lifecycleStatus !== 'resolved'
  );

  const criticalStockCount = stockAlerts.length;

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div
        className="relative flex flex-col md:flex-row items-start md:items-end justify-between p-6 sm:p-8 rounded-card-lg overflow-hidden border border-[#E7E2DD]"
        style={{ background: 'linear-gradient(135deg, #FFF6EE 0%, #FFE4CF 60%, #FAF7F1 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFE4CF] text-[#C06B33] font-jakarta text-[11px] font-bold">
              Technician Operations Deck
            </span>
            <span className="text-xs font-jakarta text-[#74788C]">
              {user?.departmentName || 'HVAC & Maintenance Engineering'}
            </span>
          </div>
          <h1 className="font-space font-bold text-3xl sm:text-4xl text-[#24283B] tracking-tight">
            Field Queue: {user?.fullName || 'Technician'}.
          </h1>
          <p className="font-jakarta text-sm text-[#74788C] mt-2 max-w-lg leading-relaxed">
            Manage your assigned work orders, verify equipment pinpoint locations, allocate spare parts, and log repair completions with photo evidence.
          </p>
        </div>

        <div className="relative z-10 mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2">
          <p className="font-space font-bold text-xs text-[#24283B]">{today}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/spare-parts')}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E7E2DD] text-[#24283B] hover:bg-[#FAF7F1] font-jakarta text-xs font-semibold shadow-xs"
            >
              Check Spares
            </button>
            <button
              onClick={() => navigate('/maintenance')}
              className="px-4 py-2 rounded-xl bg-[#24283B] text-white hover:bg-[#383E58] font-jakarta text-xs font-semibold shadow-pastel-sm transition-all"
            >
              My Work Orders ({activeWorkOrders.length})
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#FFF2E7]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFE4CF] flex items-center justify-center text-[#C06B33]">
              <Wrench size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#C06B33] bg-white px-2 py-0.5 rounded-full border border-[#FFE4CF]">
              Assigned
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{activeWorkOrders.length}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Active Work Orders
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#FDF0F6]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8DCE8] flex items-center justify-center text-[#BA3D6E]">
              <AlertTriangle size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#BA3D6E] bg-white px-2 py-0.5 rounded-full border border-[#F8DCE8]">
              Critical
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{criticalAssignedIncidents.length}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            High-Priority Incidents
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#E9F9F2]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#D5F3E8] flex items-center justify-center text-[#2E8B67]">
              <CheckCircle2 size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#2E8B67] bg-white px-2 py-0.5 rounded-full border border-[#D5F3E8]">
              Done
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{completedWorkOrders.length}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Completed Tasks
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#FAF7F1]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E2DD] flex items-center justify-center text-[#74788C]">
              <Package size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#C06B33] bg-[#FFE4CF] px-2 py-0.5 rounded-full">
              Alerts
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{criticalStockCount}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Critical Spare Alerts
          </p>
        </div>
      </div>

      {/* ── Main Work Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Assigned Work Orders (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-[#C06B33]" />
              <h2 className="font-space font-bold text-base text-[#24283B]">
                Assigned Work Orders Awaiting Action
              </h2>
            </div>
            <button
              onClick={() => navigate('/maintenance')}
              className="text-xs font-jakarta font-semibold text-[#6878CA] hover:underline flex items-center gap-1"
            >
              Open Maintenance Desk <ArrowRight size={12} />
            </button>
          </div>

          <div className="bg-white rounded-card border border-[#E7E2DD] divide-y divide-[#F6F0E5] shadow-xs">
            {activeWorkOrders.length > 0 ? (
              activeWorkOrders.slice(0, 5).map((wo) => (
                <div
                  key={wo.id}
                  onClick={() => navigate('/maintenance')}
                  className="p-4 hover:bg-[#FAF7F1] transition-colors cursor-pointer flex items-start justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-space font-bold text-xs text-[#24283B]">{wo.orderNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          wo.priority === 'urgent'
                            ? 'bg-[#F8DCE8] text-[#BA3D6E]'
                            : wo.priority === 'high'
                            ? 'bg-[#FFE4CF] text-[#C06B33]'
                            : 'bg-[#E6E9FF] text-[#4A5AA0]'
                        }`}
                      >
                        {wo.priority}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[9px] font-bold uppercase">
                        {wo.status}
                      </span>
                    </div>
                    <p className="font-jakarta font-semibold text-xs text-[#24283B] truncate">{wo.title}</p>
                    <p className="font-jakarta text-[11px] text-[#74788C] flex items-center gap-1">
                      <MapPin size={11} /> {wo.buildingName} · Est: {wo.estimatedHours}h
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0 text-[11px] font-jakarta">
                    <span className="text-[#BA3D6E] font-bold flex items-center gap-1 justify-end">
                      <Clock size={11} /> {wo.slaRemaining || '2h Remaining'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/maintenance');
                      }}
                      className="mt-1 px-2.5 py-1 rounded-lg bg-[#24283B] text-white text-[10px] font-bold hover:bg-[#383E58] transition"
                    >
                      Update Status →
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs font-jakarta text-[#74788C]">
                ✓ All assigned work orders are up to date! Check open incidents queue below.
              </div>
            )}
          </div>

          {/* Critical Incident Field Queue */}
          <div className="space-y-3 pt-2">
            <h3 className="font-space font-bold text-xs uppercase tracking-wider text-[#74788C]">
              Critical Incidents Requiring Field Inspection
            </h3>
            <div className="space-y-2">
              {criticalAssignedIncidents.slice(0, 3).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className="p-3.5 rounded-xl bg-white border border-[#E7E2DD] hover:bg-[#FAF7F1] transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-jakarta font-semibold text-xs text-[#24283B] truncate">
                        {inc.ticketNumber}: {inc.title}
                      </p>
                      <p className="text-[10px] text-[#74788C]">
                        {inc.buildingName} · {inc.room || 'General Area'} {inc.assetName ? `· ${inc.assetName}` : ''}
                      </p>
                    </div>
                  </div>
                  {inc.annotationCoordinates && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#E9F9F2] text-[#2E8B67] flex-shrink-0">
                      <Crosshair size={11} /> Pin Mapped
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Spare Parts & Technical Assistant */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-[#2E8B67]" />
              <h2 className="font-space font-bold text-base text-[#24283B]">
                Workshop Spare Parts
              </h2>
            </div>
            <button
              onClick={() => navigate('/spare-parts')}
              className="text-xs font-jakarta font-semibold text-[#6878CA] hover:underline"
            >
              Component Finder
            </button>
          </div>

          <div className="bg-white rounded-card border border-[#E7E2DD] p-4 space-y-3">
            <div className="space-y-2">
              {inventory.slice(0, 4).map((item: any) => (
                <div key={item.id} className="p-2.5 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] flex items-center justify-between text-xs font-jakarta">
                  <div>
                    <p className="font-semibold text-[#24283B]">{item.itemName}</p>
                    <p className="text-[10px] text-[#74788C]">{item.partNumber} · {item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-space font-bold ${item.currentStock <= item.minThreshold ? 'text-[#BA3D6E]' : 'text-[#2E8B67]'}`}>
                      {item.currentStock} {item.unit}
                    </p>
                    <span className="text-[9px] text-[#74788C]">Min: {item.minThreshold}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/inventory')}
              className="w-full py-2 bg-white border border-[#E7E2DD] hover:bg-[#FAF7F1] rounded-xl text-xs font-bold text-[#4A5AA0] transition"
            >
              Request Stock Requisition →
            </button>
          </div>

          {/* AI Copilot Technical Assistant */}
          <div className="p-4 rounded-card border border-indigo-200 bg-gradient-to-br from-[#F2F4FF] to-[#E9DDFB] space-y-3">
            <div className="flex items-center gap-2 text-indigo-900">
              <Sparkles size={16} />
              <span className="font-space font-bold text-xs">Technical Copilot Assistant</span>
            </div>
            <p className="font-jakarta text-xs text-[#24283B]">
              Need technician dispatch advice or wiring diagrams for Belimo 24V actuators or Chiller loop bypasses?
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('campusops-toggle-copilot'))}
              className="w-full py-2 rounded-xl bg-indigo-600 text-white font-jakarta text-xs font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Bot size={13} /> Launch Technical Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
