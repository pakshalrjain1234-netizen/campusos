import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  AlertTriangle,
  Wrench,
  Package,
  CalendarDays,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldAlert,
  Sparkles,
  MapPin,
  ChevronRight,
  Send,
} from 'lucide-react';
import { useCampus } from '../../../context/CampusContext';
import { useAuth } from '../../../context/AuthContext';

export default function DeptManagerDashboardView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    incidents,
    workOrders,
    bookings,
    roomDisruptions,
    inventory,
    showToast,
  } = useCampus();

  const [isEscalating, setIsEscalating] = useState(false);

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const deptName = user?.departmentName || 'Computing Services & IT';

  // Incidents in this department
  const deptIncidents = incidents.filter(
    (i) =>
      i.department?.toLowerCase() === deptName.toLowerCase() ||
      i.buildingName?.toLowerCase().includes('it') ||
      i.buildingName?.toLowerCase().includes('computing') ||
      i.category === 'IT / Network' ||
      user?.role === 'department_manager' ||
      user?.role === 'director'
  );

  const pendingDeptIncidents = deptIncidents.filter(
    (i) => i.lifecycleStatus === 'reported' || i.lifecycleStatus === 'triaged'
  );

  const deptWorkOrders = workOrders.filter(
    (w) =>
      w.department?.toLowerCase() === deptName.toLowerCase() ||
      w.buildingName?.toLowerCase().includes('it') ||
      user?.role === 'department_manager' ||
      user?.role === 'director'
  );

  const deptBookings = bookings.filter(
    (b) => b.department?.toLowerCase() === deptName.toLowerCase()
  );

  const handleEscalateToFacilities = () => {
    setIsEscalating(true);
    setTimeout(() => {
      setIsEscalating(false);
      showToast(
        'Priority escalation dispatched to Facilities Administrator with audit log entry.',
        'success'
      );
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div
        className="relative flex flex-col md:flex-row items-start md:items-end justify-between p-6 sm:p-8 rounded-card-lg overflow-hidden border border-[#E7E2DD]"
        style={{ background: 'linear-gradient(135deg, #F5EFFE 0%, #E9DDFB 60%, #FAF7F1 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#E9DDFB] text-[#7C5CBF] font-jakarta text-[11px] font-bold">
              Department Operations Management
            </span>
            <span className="text-xs font-jakarta text-[#74788C]">
              Dept: {deptName}
            </span>
          </div>
          <h1 className="font-space font-bold text-3xl sm:text-4xl text-[#24283B] tracking-tight">
            {deptName}
          </h1>
          <p className="font-jakarta text-sm text-[#74788C] mt-2 max-w-lg leading-relaxed">
            Monitor departmental facility integrity, triage staff and student complaints, manage room conflicts, and oversee department maintenance progress.
          </p>
        </div>

        <div className="relative z-10 mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2">
          <p className="font-space font-bold text-xs text-[#24283B]">{today}</p>
          <button
            onClick={handleEscalateToFacilities}
            disabled={isEscalating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#BA3D6E] text-white hover:bg-[#9B2F59] font-jakarta text-xs font-semibold shadow-pastel-sm transition-all"
          >
            <Send size={14} /> Escalate to Facilities Admin
          </button>
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#FDF0F6]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#F8DCE8] flex items-center justify-center text-[#BA3D6E]">
              <AlertTriangle size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#BA3D6E] bg-white px-2 py-0.5 rounded-full border border-[#F8DCE8]">
              Department
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{deptIncidents.length}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Total Complaints
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#FFF2E7]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFE4CF] flex items-center justify-center text-[#C06B33]">
              <Clock size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#C06B33] bg-white px-2 py-0.5 rounded-full border border-[#FFE4CF]">
              Triage
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{pendingDeptIncidents.length}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Awaiting Triage
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#F2F4FF]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6E9FF] flex items-center justify-center text-[#6878CA]">
              <Wrench size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#6878CA] bg-white px-2 py-0.5 rounded-full border border-[#E6E9FF]">
              Active
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">{deptWorkOrders.length}</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Maintenance Jobs
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#E9F9F2]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#D5F3E8] flex items-center justify-center text-[#2E8B67]">
              <TrendingUp size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#2E8B67] bg-white px-2 py-0.5 rounded-full border border-[#D5F3E8]">
              SLA
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">91%</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Dept Resolution SLA
          </p>
        </div>
      </div>

      {/* ── Department Issues & Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Department Complaints & Triage (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-[#BA3D6E]" />
              <h2 className="font-space font-bold text-base text-[#24283B]">
                Department Incidents Requiring Triage & Review
              </h2>
            </div>
            <button
              onClick={() => navigate('/incidents')}
              className="text-xs font-jakarta font-semibold text-[#6878CA] hover:underline flex items-center gap-1"
            >
              All Incidents <ArrowRight size={12} />
            </button>
          </div>

          <div className="bg-white rounded-card border border-[#E7E2DD] divide-y divide-[#F6F0E5] shadow-xs">
            {deptIncidents.slice(0, 5).map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate('/incidents')}
                className="p-4 hover:bg-[#FAF7F1] transition cursor-pointer flex items-start justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-space font-bold text-xs text-[#24283B]">{inc.ticketNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        inc.severity === 'critical'
                          ? 'bg-[#F8DCE8] text-[#BA3D6E]'
                          : inc.severity === 'high'
                          ? 'bg-[#FFE4CF] text-[#C06B33]'
                          : 'bg-[#E6E9FF] text-[#4A5AA0]'
                      }`}
                    >
                      {inc.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[9px] font-bold uppercase">
                      {inc.lifecycleStatus || inc.status}
                    </span>
                  </div>
                  <p className="font-jakarta font-semibold text-xs text-[#24283B] truncate">{inc.title}</p>
                  <p className="font-jakarta text-[11px] text-[#74788C]">
                    {inc.buildingName} · {inc.room || 'General Area'} · Reported by {inc.reportedBy}
                  </p>
                </div>

                <div className="text-right flex-shrink-0 text-[11px] font-jakarta">
                  <span className="text-[#74788C] block">{inc.createdAt}</span>
                  <span className="text-[10px] text-[#6878CA] font-bold block mt-1 hover:underline">
                    Assign Technician →
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Department Maintenance Progress */}
          <div className="space-y-3 pt-2">
            <h3 className="font-space font-bold text-xs uppercase tracking-wider text-[#74788C]">
              Department Work Orders in Progress
            </h3>
            <div className="space-y-2">
              {deptWorkOrders.slice(0, 3).map((w) => (
                <div key={w.id} className="p-3 rounded-xl bg-white border border-[#E7E2DD] flex items-center justify-between">
                  <div>
                    <p className="font-jakarta font-semibold text-xs text-[#24283B]">{w.title}</p>
                    <p className="text-[10px] text-[#74788C]">{w.buildingName} · Assigned to: <strong>{w.assignedTo}</strong></p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#E6E9FF] text-[#4A5AA0] text-[10px] font-bold uppercase">
                    {w.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Room Conflicts & Inventory */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-[#7C5CBF]" />
              <h2 className="font-space font-bold text-base text-[#24283B]">
                Department Booking Conflicts
              </h2>
            </div>
            <button
              onClick={() => navigate('/bookings')}
              className="text-xs font-jakarta font-semibold text-[#6878CA] hover:underline"
            >
              Manage
            </button>
          </div>

          <div className="bg-white rounded-card border border-[#E7E2DD] p-4 space-y-3">
            {roomDisruptions.length > 0 ? (
              roomDisruptions.slice(0, 2).map((rd) => (
                <div key={rd.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1 text-xs font-jakarta">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900">{rd.roomCode}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-200 text-amber-800 uppercase">
                      Disrupted
                    </span>
                  </div>
                  <p className="text-amber-800">{rd.issue}</p>
                  <p className="text-[10px] text-amber-700">Relocation recommendation ready in Bookings.</p>
                </div>
              ))
            ) : (
              <p className="text-xs font-jakarta text-[#2E8B67] text-center py-4">
                ✓ No room booking conflicts reported in your department.
              </p>
            )}
          </div>

          {/* Department Assets & Inventory Summary */}
          <div className="p-4 rounded-card border border-[#E7E2DD] bg-[#FAF7F1] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-space font-bold text-xs text-[#24283B]">Department Assets & Inventory</span>
              <button
                onClick={() => navigate('/inventory')}
                className="text-[11px] font-bold text-[#6878CA] hover:underline"
              >
                Inspect
              </button>
            </div>
            <div className="space-y-1.5">
              {inventory.slice(0, 3).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between text-xs font-jakarta bg-white p-2 rounded-lg border border-[#E7E2DD]">
                  <span className="font-semibold text-[#24283B] truncate mr-2">{item.itemName}</span>
                  <span className="font-space font-bold text-[#2E8B67] flex-shrink-0">{item.currentStock} {item.unit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
