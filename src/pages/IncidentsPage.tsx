import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Filter, Plus, Search,
  Clock, Building2, CheckCircle2, Activity, AlertOctagon,
  LayoutGrid, List, Sparkles, ChevronRight, User
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { Incident, IncidentCategory, IncidentSeverity, IncidentLifecycleStatus } from '../types';
import IncidentDetailDrawer from '../components/modals/IncidentDetailDrawer';
import { LIFECYCLE_BADGES } from '../utils/incidentStateMachine';

const SEV_STYLES: Record<string, { bg: string; text: string; label: string; border: string }> = {
  critical: { bg: '#F8DCE8', text: '#BA3D6E', label: 'Critical', border: '#F2B5CD' },
  high: { bg: '#FFE4CF', text: '#C06B33', label: 'High', border: '#FFC89E' },
  medium: { bg: '#E6E9FF', text: '#4A5AA0', label: 'Medium', border: '#C5CDFF' },
  low: { bg: '#D5F3E8', text: '#2E8B67', label: 'Low', border: '#A6E6CD' },
};

export default function IncidentsPage() {
  const { 
    incidents, 
    setIsReportIncidentOpen, 
    setSelectedIncidentId,
    buildings 
  } = useCampus();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [onlySlaBreached, setOnlySlaBreached] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Multi-attribute filtering logic
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          inc.ticketNumber.toLowerCase().includes(q) ||
          inc.title.toLowerCase().includes(q) ||
          inc.description.toLowerCase().includes(q) ||
          (inc.room && inc.room.toLowerCase().includes(q)) ||
          inc.buildingName.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // 2. Category
      if (selectedCategory !== 'All' && inc.category !== selectedCategory) {
        return false;
      }

      // 3. Priority
      if (selectedPriority !== 'All' && inc.severity.toLowerCase() !== selectedPriority.toLowerCase()) {
        return false;
      }

      // 4. Building
      if (selectedBuilding !== 'All' && inc.buildingId !== selectedBuilding) {
        return false;
      }

      // 5. Lifecycle Status
      if (selectedStatus !== 'All') {
        const currentLife = inc.lifecycleStatus || 'reported';
        if (currentLife !== selectedStatus && inc.status !== selectedStatus) {
          return false;
        }
      }

      // 6. SLA Breached Toggle
      if (onlySlaBreached && !inc.isSlaBreached) {
        return false;
      }

      return true;
    });
  }, [
    incidents,
    searchQuery,
    selectedCategory,
    selectedPriority,
    selectedBuilding,
    selectedStatus,
    onlySlaBreached,
  ]);

  // Statistics
  const totalReported = incidents.length;
  const triageNeeded = incidents.filter((i) => !i.lifecycleStatus || i.lifecycleStatus === 'reported' || i.lifecycleStatus === 'triaged').length;
  const inProgress = incidents.filter((i) => i.lifecycleStatus === 'in_progress' || i.status === 'in_progress').length;
  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;
  const overdueCount = incidents.filter((i) => i.isSlaBreached).length;
  const resolvedCount = incidents.filter((i) => i.lifecycleStatus === 'resolved' || i.lifecycleStatus === 'closed' || i.status === 'resolved').length;

  return (
    <div className="px-6 py-7 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm transition-colors"
            >
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </div>
          <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">
            Intelligent Incident & Triage Management
          </h1>
          <p className="font-jakarta text-sm text-[#74788C] mt-1">
            Multi-factor priority scoring, deterministic triage, engineer assignment & lifecycle state tracking
          </p>
        </div>
        <button
          onClick={() => setIsReportIncidentOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#24283B] text-white font-jakarta font-semibold text-sm hover:bg-[#383E58] transition-colors shadow-pastel-sm"
        >
          <Plus size={16} /> Report Incident
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Reported', value: totalReported, color: '#24283B', bg: '#F6F0E5', border: '#E7E2DD' },
          { label: 'Triage Pending', value: triageNeeded, color: '#C06B33', bg: '#FFF2E7', border: '#FFE4CF' },
          { label: 'In Progress', value: inProgress, color: '#4A5AA0', bg: '#F2F4FF', border: '#E6E9FF' },
          { label: 'Critical Priority', value: criticalCount, color: '#BA3D6E', bg: '#FDF0F6', border: '#F8DCE8' },
          { label: 'SLA Overdue', value: overdueCount, color: '#BA3D6E', bg: '#FDF0F6', border: '#F8DCE8', alert: true },
          { label: 'Resolved / Closed', value: resolvedCount, color: '#2E8B67', bg: '#E9F9F2', border: '#D5F3E8' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-3.5 rounded-card border transition-all duration-200"
            style={{ background: stat.bg, borderColor: stat.border }}
          >
            <div className="flex items-center justify-between">
              <p className="font-space font-bold text-2xl" style={{ color: stat.color }}>
                {stat.value}
              </p>
              {stat.alert && stat.value > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#BA3D6E] animate-pulse" />
              )}
            </div>
            <p className="font-jakarta text-[11px] font-semibold text-[#74788C] mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter and Search Ribbon */}
      <div className="p-4 bg-white rounded-2xl border border-[#E7E2DD] shadow-pastel-sm space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#74788C]" />
            <input
              type="text"
              placeholder="Search by ticket #, issue title, room or building..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] placeholder:text-[#74788C] focus:outline-none focus:border-[#6878CA] focus:ring-1 focus:ring-[#E6E9FF]"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none"
          >
            <option value="All">All Categories (11)</option>
            <option value="Electrical">Electrical</option>
            <option value="Plumbing">Plumbing</option>
            <option value="HVAC">HVAC</option>
            <option value="Structural">Structural</option>
            <option value="IT / Network">IT / Network</option>
            <option value="Safety">Safety</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Pest Control">Pest Control</option>
            <option value="Furniture & Fixtures">Furniture & Fixtures</option>
            <option value="Landscaping">Landscaping</option>
            <option value="General">General</option>
          </select>

          {/* Priority Dropdown */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Building Dropdown */}
          <select
            value={selectedBuilding}
            onChange={(e) => setSelectedBuilding(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none"
          >
            <option value="All">All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Lifecycle Status Dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E7E2DD] font-jakarta text-xs text-[#24283B] bg-white focus:outline-none"
          >
            <option value="All">All Lifecycle Statuses</option>
            <option value="reported">Reported</option>
            <option value="triaged">Triaged</option>
            <option value="assigned">Assigned</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Overdue toggle */}
          <button
            onClick={() => setOnlySlaBreached((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border font-jakarta text-xs font-semibold transition-all ${
              onlySlaBreached
                ? 'bg-[#F8DCE8] border-[#F2B5CD] text-[#BA3D6E]'
                : 'bg-white border-[#E7E2DD] text-[#74788C] hover:bg-[#FAF7F1]'
            }`}
          >
            <AlertOctagon size={13} /> SLA Overdue Only
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl border border-[#E7E2DD] p-0.5 bg-[#FAF7F1] ml-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-jakarta transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-[#24283B]' : 'text-[#74788C]'
              }`}
              title="Card Grid"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-jakarta transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-xs text-[#24283B]' : 'text-[#74788C]'
              }`}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>
        </div>

        {/* Filter count indicator */}
        <div className="flex items-center justify-between text-xs font-jakarta text-[#74788C] pt-1 border-t border-[#E7E2DD]/50">
          <span>
            Showing <strong className="text-[#24283B]">{filteredIncidents.length}</strong> of{' '}
            <strong>{incidents.length}</strong> recorded incidents
          </span>
          {(searchQuery || selectedCategory !== 'All' || selectedPriority !== 'All' || selectedBuilding !== 'All' || selectedStatus !== 'All' || onlySlaBreached) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedPriority('All');
                setSelectedBuilding('All');
                setSelectedStatus('All');
                setOnlySlaBreached(false);
              }}
              className="text-[#BA3D6E] font-semibold hover:underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Incident List View */}
      {filteredIncidents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E7E2DD] p-8">
          <AlertTriangle size={36} className="mx-auto text-[#C06B33] mb-3 opacity-60" />
          <h3 className="font-space font-bold text-lg text-[#24283B]">No Incidents Match Current Filters</h3>
          <p className="font-jakarta text-sm text-[#74788C] mt-1 max-w-md mx-auto">
            Try adjusting your search query, clearing category or priority filters, or report a new incident.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Card Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIncidents.map((inc) => {
            const sev = SEV_STYLES[inc.severity] || SEV_STYLES.medium;
            const currentLife = inc.lifecycleStatus || 'reported';
            const lifeBadge = LIFECYCLE_BADGES[currentLife] || LIFECYCLE_BADGES.reported;

            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncidentId(inc.id)}
                className="group p-5 bg-white rounded-2xl border border-[#E7E2DD] hover:border-[#6878CA] hover:shadow-pastel-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header Strip */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-space font-bold text-xs text-[#24283B]">
                        {inc.ticketNumber}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold border"
                        style={{ background: sev.bg, color: sev.text, borderColor: sev.border }}
                      >
                        {sev.label}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold border"
                        style={{ background: lifeBadge.bg, color: lifeBadge.text, borderColor: lifeBadge.border }}
                      >
                        {lifeBadge.label}
                      </span>
                    </div>

                    <span className="font-jakarta text-[11px] font-semibold text-[#74788C] bg-[#FAF7F1] px-2.5 py-1 rounded-lg border border-[#E7E2DD]">
                      {inc.category}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-space font-bold text-base text-[#24283B] group-hover:text-[#4A5AA0] transition-colors leading-snug">
                    {inc.title}
                  </h3>
                  <p className="font-jakarta text-xs text-[#74788C] mt-1.5 line-clamp-2 leading-relaxed">
                    {inc.description}
                  </p>

                  {/* Triage Preview Pill if present */}
                  {inc.triageDetails && (
                    <div className="mt-3 p-2 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] flex items-center justify-between text-[11px] font-jakarta">
                      <span className="flex items-center gap-1 text-[#24283B]">
                        <Sparkles size={12} className="text-[#6878CA]" />
                        Triage Score: <strong>{inc.triageDetails.score}/100</strong>
                      </span>
                      <span className="text-[#74788C] truncate max-w-[220px]">
                        {inc.triageDetails.reason}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Metadata */}
                <div className="pt-4 mt-4 border-t border-[#E7E2DD] flex items-center justify-between flex-wrap gap-2 text-xs font-jakarta text-[#74788C]">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Building2 size={12} /> {inc.buildingName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {inc.slaDeadline}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {inc.assignedTo ? (
                      <span className="flex items-center gap-1 text-[#2E8B67] font-semibold">
                        <CheckCircle2 size={12} /> {inc.assignedTo}
                      </span>
                    ) : (
                      <span className="text-[#C06B33] font-semibold">Pending Assignee</span>
                    )}
                    <ChevronRight size={14} className="text-[#A0A4B8] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact Table View */
        <div className="bg-white rounded-2xl border border-[#E7E2DD] overflow-hidden shadow-pastel-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E7E2DD] bg-[#FAF7F1] text-[11px] font-space font-bold uppercase tracking-wider text-[#74788C]">
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Title & Zone</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Lifecycle</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">SLA Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E2DD] text-xs font-jakarta">
              {filteredIncidents.map((inc) => {
                const sev = SEV_STYLES[inc.severity] || SEV_STYLES.medium;
                const currentLife = inc.lifecycleStatus || 'reported';
                const lifeBadge = LIFECYCLE_BADGES[currentLife] || LIFECYCLE_BADGES.reported;

                return (
                  <tr
                    key={inc.id}
                    onClick={() => setSelectedIncidentId(inc.id)}
                    className="hover:bg-[#FAF7F1] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-space font-bold text-[#24283B]">
                      {inc.ticketNumber}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-semibold text-[#24283B] truncate">{inc.title}</p>
                      <p className="text-[11px] text-[#74788C] truncate">
                        {inc.buildingName} {inc.room ? `· ${inc.room}` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-[#FAF7F1] text-[#74788C] font-semibold border border-[#E7E2DD] text-[10px]">
                        {inc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded-full font-bold text-[10px] border"
                        style={{ background: sev.bg, color: sev.text, borderColor: sev.border }}
                      >
                        {sev.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-0.5 rounded-full font-bold text-[10px] border"
                        style={{ background: lifeBadge.bg, color: lifeBadge.text, borderColor: lifeBadge.border }}
                      >
                        {lifeBadge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#74788C]">
                      {inc.assignedTo ? (
                        <span className="text-[#24283B] font-semibold">{inc.assignedTo}</span>
                      ) : (
                        <span className="text-[#C06B33]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${inc.isSlaBreached ? 'text-[#BA3D6E]' : 'text-[#74788C]'}`}>
                        {inc.slaDeadline}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Architecture & AI Notice */}
      <div className="p-4 rounded-2xl bg-[#F2F4FF] border border-[#E6E9FF] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white border border-[#E6E9FF] flex items-center justify-center text-[#4A5AA0]">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="font-space font-bold text-xs text-[#24283B]">
              Phase 2.3 Intelligent Incident Engine Active
            </h4>
            <p className="font-jakarta text-[11px] text-[#6878CA]">
              Deterministic multi-factor scoring (safety risk, community disruption, room criticality) with audit trail stamping and Gemini 2.0 readiness.
            </p>
          </div>
        </div>
      </div>

      {/* Incident Detail Drawer */}
      <IncidentDetailDrawer />
    </div>
  );
}
