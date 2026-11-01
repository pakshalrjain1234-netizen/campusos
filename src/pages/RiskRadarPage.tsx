import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Brain, TrendingUp, ShieldAlert, ArrowUpRight, CircleAlert } from 'lucide-react';
import { useCampus } from '../context/CampusContext';

type RiskSignal = {
  id: string;
  title: string;
  detail: string;
  severity: string;
  score: number;
  recommendation?: string;
  detectedTimeAgo?: string;
};

const ACTIVE_INCIDENT_STATUSES = new Set(['open', 'reported', 'triaged', 'assigned', 'acknowledged', 'in_progress', 'investigating']);
const ACTIVE_WORK_ORDER_STATUSES = new Set(['open', 'unassigned', 'assigned', 'in_progress', 'on_hold']);
const SEVERITY_WEIGHT: Record<string, number> = { critical: 5, high: 4, medium: 2, low: 1 };

export default function RiskRadarPage() {
  const { aiInsights, incidents, workOrders, buildings } = useCampus();
  const activeIncidents = incidents.filter((incident) => ACTIVE_INCIDENT_STATUSES.has(String(incident.status).toLowerCase()));
  const activeWorkOrders = workOrders.filter((order) => ACTIVE_WORK_ORDER_STATUSES.has(String(order.status).toLowerCase()));

  const incidentPatterns = new Map<string, { category: string; buildingName: string; count: number }>();
  for (const incident of activeIncidents) {
    const buildingName = incident.buildingName || buildings.find((building) => building.id === incident.buildingId)?.name || incident.buildingId || 'Unspecified building';
    const category = incident.category || 'General';
    const key = `${category.toLowerCase()}::${buildingName.toLowerCase()}`;
    const pattern = incidentPatterns.get(key) || { category, buildingName, count: 0 };
    pattern.count += 1;
    incidentPatterns.set(key, pattern);
  }
  const repeatedPatterns = [...incidentPatterns.values()].filter((pattern) => pattern.count > 1).sort((a, b) => b.count - a.count);

  const risksByBuilding = new Map<string, { buildingId: string; buildingName: string; score: number; incidents: number; workOrders: number; highestSeverity: string }>();
  for (const incident of activeIncidents) {
    const buildingId = incident.buildingId || 'unknown';
    const buildingName = incident.buildingName || buildings.find((building) => building.id === buildingId)?.name || buildingId;
    const risk = risksByBuilding.get(buildingId) || { buildingId, buildingName, score: 0, incidents: 0, workOrders: 0, highestSeverity: 'low' };
    risk.score += SEVERITY_WEIGHT[String(incident.severity).toLowerCase()] || 1;
    risk.incidents += 1;
    if ((SEVERITY_WEIGHT[String(incident.severity).toLowerCase()] || 1) > (SEVERITY_WEIGHT[risk.highestSeverity] || 1)) risk.highestSeverity = String(incident.severity).toLowerCase();
    risksByBuilding.set(buildingId, risk);
  }
  for (const order of activeWorkOrders) {
    const buildingId = order.buildingId || 'unknown';
    const buildingName = order.buildingName || buildings.find((building) => building.id === buildingId)?.name || buildingId;
    const risk = risksByBuilding.get(buildingId) || { buildingId, buildingName, score: 0, incidents: 0, workOrders: 0, highestSeverity: 'low' };
    risk.score += 1;
    risk.workOrders += 1;
    risksByBuilding.set(buildingId, risk);
  }
  const rankedRisks = [...risksByBuilding.values()].sort((a, b) => b.score - a.score);
  const topRisk = rankedRisks[0];
  const attentionBuildings = rankedRisks.filter((risk) => risk.score >= 4).length;

  const generatedSignals: RiskSignal[] = [
    ...(topRisk ? [{
      id: `risk-${topRisk.buildingId}`,
      title: `${topRisk.buildingName} has the highest current issue load`,
      detail: `${topRisk.incidents} active incident${topRisk.incidents === 1 ? '' : 's'} and ${topRisk.workOrders} active work order${topRisk.workOrders === 1 ? '' : 's'} are contributing to its risk score.`,
      severity: topRisk.score >= 7 ? 'critical' : topRisk.score >= 4 ? 'warning' : 'advisory',
      score: Math.min(99, topRisk.score * 12),
    }] : []),
    ...(repeatedPatterns[0] ? [{
      id: `pattern-${repeatedPatterns[0].category}-${repeatedPatterns[0].buildingName}`,
      title: `Repeated ${repeatedPatterns[0].category.toLowerCase()} issues at ${repeatedPatterns[0].buildingName}`,
      detail: `${repeatedPatterns[0].count} active incidents share this category and building. Review them together for a common cause.`,
      severity: 'warning',
      score: Math.min(99, repeatedPatterns[0].count * 20),
    }] : []),
  ];
  const visibleSignals: RiskSignal[] = aiInsights.length ? aiInsights.map((insight) => ({
    id: insight.id,
    title: insight.title,
    detail: insight.rootCause,
    severity: insight.severity,
    score: insight.confidenceScore,
    recommendation: insight.recommendedAction,
    detectedTimeAgo: insight.detectedTimeAgo,
  })) : generatedSignals;

  return (
    <div className="px-6 py-7 space-y-6">
      <div>
        <Link to="/dashboard" className="flex items-center gap-1 text-[#74788C] hover:text-[#24283B] font-jakarta text-sm mb-1 transition-colors">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <h1 className="font-space font-bold text-3xl text-[#24283B] tracking-tight">Predictive Risk Radar</h1>
        <p className="font-jakarta text-sm text-[#74788C] mt-1">Operational risk estimates and recurring issue patterns from current campus records</p>
      </div>

      <section>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="font-space font-bold text-base text-[#24283B]">Active Risk Signals</h2>
            <p className="font-jakarta text-xs text-[#74788C] mt-1">Signals are derived from active incidents and work orders; they are operational indicators, not equipment telemetry forecasts.</p>
          </div>
          <span className="font-jakarta text-xs text-[#74788C]">{activeIncidents.length} active incidents · {activeWorkOrders.length} active work orders</span>
        </div>
        <div className="space-y-3">
          {visibleSignals.map((signal) => {
            const severity = String(signal.severity).toLowerCase();
            const colors = severity === 'critical'
              ? { bg: '#FDF0F6', border: '#BA3D6E', text: '#BA3D6E', label: 'Critical' }
              : severity === 'warning' || severity === 'high'
                ? { bg: '#FFF2E7', border: '#C06B33', text: '#C06B33', label: 'Watch' }
                : { bg: '#F2F4FF', border: '#6878CA', text: '#6878CA', label: 'Advisory' };
            return (
              <article key={signal.id} className="p-5 bg-white rounded-card border-l-4 border-t border-r border-b border-[#E7E2DD]" style={{ borderLeftColor: colors.border }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold" style={{ background: colors.bg, color: colors.text }}>{colors.label}</span>
                      <span className="font-jakarta text-[11px] text-[#74788C]">{signal.score}% signal strength{signal.detectedTimeAgo ? ` · ${signal.detectedTimeAgo}` : ''}</span>
                    </div>
                    <h3 className="font-space font-bold text-[14px] text-[#24283B]">{signal.title}</h3>
                    <p className="font-jakarta text-[12px] text-[#74788C] mt-1">{signal.detail}</p>
                    {signal.recommendation && <p className="font-jakarta text-[12px] text-[#24283B] mt-2"><strong>Recommended action:</strong> {signal.recommendation}</p>}
                  </div>
                </div>
              </article>
            );
          })}
          {!visibleSignals.length && (
            <div className="p-5 rounded-card border border-[#E7E2DD] bg-white font-jakarta text-sm text-[#74788C]">
              No active risk signals or repeated issue patterns are present in the records currently available to your role.
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <article className="p-5 rounded-card border border-[#E7E2DD] bg-[#E9DDFB]">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-[#8964B820]"><Brain size={18} className="text-[#8964B8]" /></div>
          <h3 className="font-space font-bold text-[14px] text-[#24283B] mb-1">Priority Forecast</h3>
          <p className="font-jakarta text-[12px] text-[#74788C] leading-relaxed">A rule-based operational estimate ranks locations using active issue severity and open maintenance work.</p>
          {topRisk ? <p className="mt-3 font-jakarta text-sm font-semibold text-[#24283B]">Highest load: {topRisk.buildingName} · {topRisk.score} weighted points</p> : <p className="mt-3 font-jakarta text-xs text-[#74788C]">Waiting for active incident or maintenance records.</p>}
        </article>

        <article className="p-5 rounded-card border border-[#E7E2DD] bg-[#F2F4FF]">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-[#6878CA20]"><TrendingUp size={18} className="text-[#6878CA]" /></div>
          <h3 className="font-space font-bold text-[14px] text-[#24283B] mb-1">Pattern Recognition</h3>
          <p className="font-jakarta text-[12px] text-[#74788C] leading-relaxed">Groups active complaints by issue category and building to surface possible recurring causes.</p>
          {repeatedPatterns[0] ? <p className="mt-3 font-jakarta text-sm font-semibold text-[#24283B]">{repeatedPatterns[0].count} {repeatedPatterns[0].category} issues · {repeatedPatterns[0].buildingName}</p> : <p className="mt-3 font-jakarta text-xs text-[#74788C]">No repeated category/building pattern found in active incidents.</p>}
        </article>

        <article className="p-5 rounded-card border border-[#E7E2DD] bg-[#FFF2E7]">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-[#C06B3320]"><ShieldAlert size={18} className="text-[#C06B33]" /></div>
          <h3 className="font-space font-bold text-[14px] text-[#24283B] mb-1">Campus Risk Map</h3>
          <p className="font-jakarta text-[12px] text-[#74788C] leading-relaxed">See incident and maintenance locations on the interactive campus model.</p>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="font-jakarta text-sm font-semibold text-[#24283B]">{attentionBuildings} {attentionBuildings === 1 ? 'building' : 'buildings'} need close attention</p>
            <Link to="/campus-3d" className="inline-flex items-center gap-1 text-xs font-semibold text-[#24283B] hover:underline">Open map <ArrowUpRight size={14} /></Link>
          </div>
        </article>
      </div>

      {rankedRisks.length > 0 && (
        <section className="rounded-card border border-[#E7E2DD] bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E7E2DD] flex items-center gap-2"><CircleAlert size={17} className="text-[#C06B33]" /><h2 className="font-space font-bold text-sm text-[#24283B]">Buildings with current operational load</h2></div>
          <div className="divide-y divide-[#F0ECE7]">
            {rankedRisks.slice(0, 6).map((risk) => (
              <div key={risk.buildingId} className="px-5 py-3 flex items-center justify-between gap-3">
                <div><p className="font-jakarta text-sm font-semibold text-[#24283B]">{risk.buildingName}</p><p className="font-jakarta text-xs text-[#74788C]">{risk.incidents} active incidents · {risk.workOrders} active work orders</p></div>
                <span className="font-jakarta text-xs font-bold text-[#C06B33]">{risk.score} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
