import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench, Clock, User, TrendingUp, Plus } from 'lucide-react';
import { useCampus } from '../context/CampusContext';

const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  urgent: { bg: '#F8DCE8', text: '#BA3D6E', label: 'Urgent' },
  high: { bg: '#FFE4CF', text: '#C06B33', label: 'High' },
  medium: { bg: '#E6E9FF', text: '#6878CA', label: 'Medium' },
  low: { bg: '#D5F3E8', text: '#2E8B67', label: 'Low' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  in_progress: { bg: '#FFE4CF', text: '#C06B33', label: 'In Progress' },
  unassigned: { bg: '#F8DCE8', text: '#BA3D6E', label: 'Unassigned' },
  awaiting_parts: { bg: '#E6E9FF', text: '#6878CA', label: 'Awaiting Parts' },
  completed: { bg: '#D5F3E8', text: '#2E8B67', label: 'Completed' },
};

export default function MaintenancePage() {
  const { workOrders, setIsCreateWorkOrderOpen } = useCampus();

  return (
    <div className="px-6 py-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/dashboard" className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">Maintenance</h1>
          <p className="font-jakarta text-sm text-[#74788C] mt-1">Active work orders, scheduling and completion tracking</p>
        </div>
        <button
          onClick={() => setIsCreateWorkOrderOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#24283B] text-white font-jakarta font-semibold text-sm hover:bg-[#383E58] transition-colors"
        >
          <Plus size={16} /> Create Work Order
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Open Orders', value: workOrders.filter(w => w.status !== 'completed').length, color: '#C06B33', bg: '#FFF2E7' },
          { label: 'In Progress', value: workOrders.filter(w => w.status === 'in_progress').length, color: '#6878CA', bg: '#F2F4FF' },
          { label: 'Awaiting Parts', value: workOrders.filter(w => w.status === 'awaiting_parts').length, color: '#BA3D6E', bg: '#FDF0F6' },
          { label: 'Completion Rate', value: '86%', color: '#2E8B67', bg: '#E9F9F2' },
        ].map((s) => (
          <div key={s.label} className="p-4 rounded-card border border-[#E7E2DD]" style={{ background: s.bg }}>
            <p className="font-space font-bold text-2xl" style={{ color: s.color }}>{s.value}</p>
            <p className="font-jakarta text-[12px] text-[#74788C] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Work order cards */}
      <div className="space-y-3">
        {workOrders.map((wo) => {
          const pri = PRIORITY_STYLES[wo.priority];
          const stat = STATUS_STYLES[wo.status];
          return (
            <div key={wo.id} className="p-5 bg-white rounded-card border border-[#E7E2DD] hover:shadow-pastel-sm transition-all duration-200">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-[#FFE4CF] flex items-center justify-center flex-shrink-0">
                  <Wrench size={16} className="text-[#C06B33]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-jakarta font-bold text-[12px] text-[#74788C]">{wo.orderNumber}</span>
                    <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold" style={{ background: pri.bg, color: pri.text }}>{pri.label}</span>
                    <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold" style={{ background: stat.bg, color: stat.text }}>{stat.label}</span>
                  </div>
                  <h3 className="font-space font-bold text-[14px] text-[#24283B]">{wo.title}</h3>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <span className="font-jakarta text-[12px] text-[#74788C]">{wo.buildingName} · {wo.location}</span>
                    <span className="flex items-center gap-1 font-jakarta text-[12px] text-[#74788C]"><Clock size={11} />Due: {wo.dueDate}</span>
                    <span className="flex items-center gap-1 font-jakarta text-[12px] text-[#74788C]"><User size={11} />{wo.assignedEngineer}</span>
                  </div>
                  {/* Progress bar */}
                  {wo.completionRate > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-[#F6F0E5] overflow-hidden">
                        <div className="h-full rounded-full bg-[#2E8B67]" style={{ width: `${wo.completionRate}%` }} />
                      </div>
                      <span className="font-jakarta text-[11px] text-[#2E8B67] font-semibold">{wo.completionRate}%</span>
                    </div>
                  )}
                  {wo.partsRequired && wo.partsRequired.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {wo.partsRequired.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-full bg-[#F6F0E5] text-[#74788C] font-jakarta text-[10px]">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 rounded-card bg-[#F2F4FF] border border-[#E6E9FF]">
        <p className="font-jakarta text-[12px] text-[#6878CA]">
          <strong>Phase 1 · Demo Mode:</strong> Full Gantt scheduling, technician GPS dispatch, parts ordering, and predictive maintenance workflows are planned for Phase 2.
        </p>
      </div>
    </div>
  );
}

