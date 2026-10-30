import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Filter, Plus,
  Clock, Building2, CheckCircle2, Activity,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';

const SEV_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: '#F8DCE8', text: '#BA3D6E', label: 'Critical' },
  high: { bg: '#FFE4CF', text: '#C06B33', label: 'High' },
  medium: { bg: '#E6E9FF', text: '#6878CA', label: 'Medium' },
  low: { bg: '#D5F3E8', text: '#2E8B67', label: 'Low' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: '#F8DCE8', text: '#BA3D6E', label: 'Open' },
  in_progress: { bg: '#FFE4CF', text: '#C06B33', label: 'In Progress' },
  investigating: { bg: '#E6E9FF', text: '#6878CA', label: 'Investigating' },
  resolved: { bg: '#D5F3E8', text: '#2E8B67', label: 'Resolved' },
  closed: { bg: '#F6F0E5', text: '#74788C', label: 'Closed' },
};

export default function IncidentsPage() {
  const { incidents, setIsReportIncidentOpen } = useCampus();

  return (
    <div className="px-6 py-7 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/dashboard" className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm transition-colors">
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>
          <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">Incidents & Complaints</h1>
          <p className="font-jakarta text-sm text-[#74788C] mt-1">Track, assign, and resolve all campus operational issues</p>
        </div>
        <button
          onClick={() => setIsReportIncidentOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#24283B] text-white font-jakarta font-semibold text-sm hover:bg-[#383E58] transition-colors shadow-pastel-sm"
        >
          <Plus size={16} /> Report Incident
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Open', value: incidents.filter(i => i.status !== 'resolved' && i.status !== 'closed').length, color: '#BA3D6E', bg: '#FDF0F6' },
          { label: 'In Progress', value: incidents.filter(i => i.status === 'in_progress').length, color: '#C06B33', bg: '#FFF2E7' },
          { label: 'Investigating', value: incidents.filter(i => i.status === 'investigating').length, color: '#6878CA', bg: '#F2F4FF' },
          { label: 'Critical', value: incidents.filter(i => i.severity === 'critical').length, color: '#BA3D6E', bg: '#FDF0F6' },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-card border border-[#E7E2DD]" style={{ background: stat.bg }}>
            <p className="font-space font-bold text-2xl" style={{ color: stat.color }}>{stat.value}</p>
            <p className="font-jakarta text-[12px] text-[#74788C] mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E7E2DD] bg-white font-jakarta text-sm text-[#74788C] hover:bg-[#F6F0E5] transition-colors">
          <Filter size={14} /> All Statuses
        </button>
        {['All', 'Critical', 'High', 'Medium', 'Low'].map((s) => (
          <button key={s} className={`px-4 py-2 rounded-xl border font-jakarta text-sm transition-colors ${s === 'All' ? 'border-[#24283B] bg-[#24283B] text-white' : 'border-[#E7E2DD] bg-white text-[#74788C] hover:bg-[#F6F0E5]'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Incident cards */}
      <div className="space-y-3">
        {incidents.map((inc) => {
          const sev = SEV_STYLES[inc.severity];
          const stat = STATUS_STYLES[inc.status];
          return (
            <div key={inc.id} className="flex items-start gap-4 p-5 bg-white rounded-card border border-[#E7E2DD] hover:shadow-pastel-sm transition-all duration-200">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: sev.bg }}>
                <AlertTriangle size={16} style={{ color: sev.text }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-jakarta font-bold text-[12px] text-[#74788C]">{inc.ticketNumber}</span>
                  <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold" style={{ background: sev.bg, color: sev.text }}>{sev.label}</span>
                  <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold" style={{ background: stat.bg, color: stat.text }}>{stat.label}</span>
                </div>
                <h3 className="font-space font-bold text-[14px] text-[#24283B]">{inc.title}</h3>
                <p className="font-jakarta text-[12px] text-[#74788C] mt-1 line-clamp-1">{inc.description}</p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="flex items-center gap-1 font-jakarta text-[11px] text-[#74788C]"><Building2 size={11} />{inc.buildingName}</span>
                  <span className="flex items-center gap-1 font-jakarta text-[11px] text-[#74788C]"><Clock size={11} />SLA: {inc.slaDeadline}</span>
                  <span className="flex items-center gap-1 font-jakarta text-[11px] text-[#74788C]"><Activity size={11} />{inc.createdAt}</span>
                  {inc.assignedTo && <span className="flex items-center gap-1 font-jakarta text-[11px] text-[#74788C]"><CheckCircle2 size={11} />{inc.assignedTo}</span>}
                </div>
              </div>
              <span className="font-jakarta text-[11px] font-semibold text-[#74788C] bg-[#F6F0E5] px-3 py-1.5 rounded-xl flex-shrink-0">{inc.category}</span>
            </div>
          );
        })}
      </div>

      {/* Phase notice */}
      <div className="p-4 rounded-card bg-[#F2F4FF] border border-[#E6E9FF]">
        <p className="font-jakarta text-[12px] text-[#6878CA]">
          <strong>Phase 1 · Demo Mode:</strong> All incident data is synthetic. Full SLA tracking, staff assignment workflows, root cause analysis, and Supabase integration are planned for Phase 2.
        </p>
      </div>
    </div>
  );
}

