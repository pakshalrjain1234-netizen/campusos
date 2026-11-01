import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, BarChart3, TrendingUp, Activity,
  Building2, Users, Clock, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { calculateBuildingHealthScore, getActiveBuildingIncidents } from '../utils/buildingHealth';

export default function AnalyticsPage() {
  const { incidents, workOrders, buildings } = useCampus();

  // Category distribution
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach((inc) => {
      counts[inc.category] = (counts[inc.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [incidents]);

  // Building hotspot rankings
  const buildingHotspots = useMemo(() => {
    return buildings
      .map((b) => {
        const buildingIncs = getActiveBuildingIncidents(b, incidents);
        const buildingWos = workOrders.filter((w) =>
          (w.buildingId === b.id || w.buildingId === b.code) &&
          !['completed', 'verified', 'cancelled'].includes(String(w.status).toLowerCase())
        );
        return {
          id: b.id,
          name: b.name,
          shortName: b.shortName,
          healthScore: calculateBuildingHealthScore(b, incidents),
          incidentCount: buildingIncs.length,
          workOrderCount: buildingWos.length,
        };
      })
      .sort((a, b) => b.incidentCount - a.incidentCount);
  }, [buildings, incidents, workOrders]);

  // Workload distribution
  const engineerWorkloads = useMemo(() => {
    const loads: Record<string, number> = {};
    workOrders.forEach((wo) => {
      const eng = wo.assignedEngineer || 'Unassigned';
      loads[eng] = (loads[eng] || 0) + 1;
    });
    return Object.entries(loads).sort((a, b) => b[1] - a[1]);
  }, [workOrders]);

  const totalIncidents = incidents.length || 1;
  const ringColors = ['#6878CA', '#2E8B67', '#C06B33', '#BA3D6E', '#8964B8', '#3A9BB7', '#9A7845'];
  const ringCircumference = 2 * Math.PI * 42;
  let ringOffset = 0;

  return (
    <div className="px-6 py-7 space-y-6 max-w-7xl mx-auto">
      <div>
        <Link
          to="/dashboard"
          className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors"
        >
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">
          Maintenance & Operations Analytics
        </h1>
        <p className="font-jakarta text-sm text-[#74788C] mt-1">
          Category breakdowns, building hotspot rankings, SLA compliance and technician workload distribution
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Resolution Time', value: '3.4h', delta: '↓ 22% improvement', good: true },
          { label: 'SLA Adherence Rate', value: '94.2%', delta: 'Target ≥ 90%', good: true },
          { label: 'Active Work Orders', value: workOrders.filter((w) => w.status !== 'completed' && w.status !== 'verified').length, delta: 'Dispatched on-site', good: true },
          { label: 'Facilities Under Warning', value: buildings.filter((b) => b.healthScore < 85).length, delta: 'Requires preventive cycle', good: false },
        ].map((m) => (
          <div key={m.label} className="p-5 bg-white rounded-2xl border border-[#E7E2DD] shadow-pastel-sm">
            <p className="font-space font-bold text-2xl text-[#24283B]">{m.value}</p>
            <p className="font-jakarta text-[11px] font-semibold text-[#74788C] mt-1 uppercase tracking-wider">
              {m.label}
            </p>
            <p className={`font-jakarta text-[12px] mt-2 font-semibold ${m.good ? 'text-[#2E8B67]' : 'text-[#BA3D6E]'}`}>
              {m.delta}
            </p>
          </div>
        ))}
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Card */}
        <div className="p-6 bg-white rounded-2xl border border-[#E7E2DD] shadow-pastel-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-[#6878CA]" />
              <h3 className="font-space font-bold text-base text-[#24283B]">Incident Category Distribution</h3>
            </div>
            <span className="font-jakarta text-xs text-[#74788C]">{incidents.length} total tickets</span>
          </div>

          <div className="pt-2 grid grid-cols-1 sm:grid-cols-[minmax(190px,0.8fr)_1fr] gap-6 items-center">
            <div className="flex justify-center">
              <div className="relative w-48 h-48" role="img" aria-label={`Circular chart showing ${incidents.length} incidents across ${categoryCounts.length} categories`}>
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden="true">
                  <circle cx="60" cy="60" r="42" fill="none" stroke="#EEEAE4" strokeWidth="14" />
                  {categoryCounts.map(([cat, count], index) => {
                    const segmentLength = incidents.length ? (count / incidents.length) * ringCircumference : 0;
                    const dashOffset = ringOffset;
                    ringOffset += segmentLength;
                    return (
                      <circle
                        key={cat}
                        cx="60"
                        cy="60"
                        r="42"
                        fill="none"
                        stroke={ringColors[index % ringColors.length]}
                        strokeWidth="14"
                        strokeDasharray={`${segmentLength} ${ringCircumference - segmentLength}`}
                        strokeDashoffset={-dashOffset}
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-space font-bold text-3xl leading-none text-[#24283B]">{incidents.length}</span>
                  <span className="font-jakarta text-[10px] uppercase tracking-wider text-[#74788C] mt-1">total issues</span>
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              {categoryCounts.length ? categoryCounts.map(([cat, count], index) => {
                const pct = Math.round((count / totalIncidents) * 100);
                return (
                  <div key={cat} className="flex items-center justify-between gap-3 text-xs font-jakarta">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ringColors[index % ringColors.length] }} />
                      <span className="font-semibold text-[#24283B] truncate">{cat}</span>
                    </span>
                    <span className="text-[#74788C] tabular-nums whitespace-nowrap">{count} · {pct}%</span>
                  </div>
                );
              }) : <p className="font-jakarta text-sm text-[#74788C]">No incident records available for this account yet.</p>}
              <p className="font-jakarta text-[10px] text-[#74788C] pt-1">Each slice represents its share of all loaded incident records.</p>
            </div>
          </div>
        </div>

        {/* Building Hotspots Card */}
        <div className="p-6 bg-white rounded-2xl border border-[#E7E2DD] shadow-pastel-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-[#C06B33]" />
              <h3 className="font-space font-bold text-base text-[#24283B]">Building Incident Hotspots</h3>
            </div>
            <span className="font-jakarta text-xs text-[#74788C]">Ranked by activity</span>
          </div>

          <div className="space-y-3 pt-2">
            {buildingHotspots.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] flex items-center justify-between text-xs font-jakarta"
              >
                <div>
                  <p className="font-semibold text-[#24283B]">{b.name}</p>
                  <p className="text-[11px] text-[#74788C]">
                    Health Score: <span className="font-bold text-[#2E8B67]">{b.healthScore}%</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-[#F8DCE8] text-[#BA3D6E] font-bold text-[11px]">
                    {b.incidentCount} {b.incidentCount === 1 ? 'incident' : 'incidents'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#FFE4CF] text-[#C06B33] font-bold text-[11px]">
                    {b.workOrderCount} WOs
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engineer Workload Allocation */}
        <div className="p-6 bg-white rounded-2xl border border-[#E7E2DD] shadow-pastel-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-[#2E8B67]" />
              <h3 className="font-space font-bold text-base text-[#24283B]">Technician Workload Balance</h3>
            </div>
            <span className="font-jakarta text-xs text-[#74788C]">Active assignments</span>
          </div>

          <div className="space-y-3 pt-2">
            {engineerWorkloads.map(([eng, count]) => (
              <div
                key={eng}
                className="flex items-center justify-between p-3 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] text-xs font-jakarta"
              >
                <span className="font-semibold text-[#24283B]">{eng}</span>
                <span className="px-2.5 py-1 rounded-full bg-[#E9F9F2] text-[#2E8B67] font-bold text-[11px]">
                  {count} active {count === 1 ? 'ticket' : 'tickets'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SLA Compliance Breakdown */}
        <div className="p-6 bg-white rounded-2xl border border-[#E7E2DD] shadow-pastel-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[#8964B8]" />
              <h3 className="font-space font-bold text-base text-[#24283B]">SLA Compliance Tiers</h3>
            </div>
            <span className="font-jakarta text-xs text-[#74788C]">Response Targets</span>
          </div>

          <div className="space-y-3 pt-2 text-xs font-jakarta">
            <div className="p-3 rounded-xl bg-[#FDF0F6] border border-[#F8DCE8] flex items-center justify-between">
              <div>
                <p className="font-bold text-[#BA3D6E]">Critical Severity (SLA &lt; 15m Ack, &lt; 2h Resolution)</p>
                <p className="text-[11px] text-[#74788C]">100% acknowledgment within target window</p>
              </div>
              <span className="font-space font-bold text-sm text-[#BA3D6E]">100%</span>
            </div>

            <div className="p-3 rounded-xl bg-[#FFF2E7] border border-[#FFE4CF] flex items-center justify-between">
              <div>
                <p className="font-bold text-[#C06B33]">High Severity (SLA &lt; 1h Ack, &lt; 8h Resolution)</p>
                <p className="text-[11px] text-[#74788C]">1 overdue acknowledgment flagged in Central Library</p>
              </div>
              <span className="font-space font-bold text-sm text-[#C06B33]">88.5%</span>
            </div>

            <div className="p-3 rounded-xl bg-[#F2F4FF] border border-[#E6E9FF] flex items-center justify-between">
              <div>
                <p className="font-bold text-[#4A5AA0]">Medium & Routine (SLA &lt; 4h Ack, &lt; 24h Resolution)</p>
                <p className="text-[11px] text-[#74788C]">Steady resolution timeline across all academic wings</p>
              </div>
              <span className="font-space font-bold text-sm text-[#4A5AA0]">96.8%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
