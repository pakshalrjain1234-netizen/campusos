import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
  Users,
  Building2,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Wrench,
  AlertCircle,
} from 'lucide-react';
import { campusApi } from '../../services/api';
import { rankIncidentsClient, ClientRankedIncident, PriorityTier } from '../../utils/priorityEngine';
import { useAuth } from '../../context/AuthContext';
import { useCampus } from '../../context/CampusContext';
import { Incident } from '../../types';

interface PriorityQueueWidgetProps {
  fallbackIncidents: Incident[];
  onOpenReport?: () => void;
}

export const CampusPriorityQueueWidget: React.FC<PriorityQueueWidgetProps> = ({
  fallbackIncidents,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSelectedIncidentId, setSelectedBuildingId } = useCampus();

  const [activeTier, setActiveTier] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('priority');
  const [rankedList, setRankedList] = useState<ClientRankedIncident[]>([]);
  const [countsByTier, setCountsByTier] = useState<Record<string, number>>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Manual Override Modal State
  const [overrideTarget, setOverrideTarget] = useState<ClientRankedIncident | null>(null);
  const [selectedTier, setSelectedTier] = useState<PriorityTier>('CRITICAL');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);
  const [overrideSuccessMsg, setOverrideSuccessMsg] = useState<string | null>(null);

  const canOverride = user?.role === 'coo' || user?.role === 'director';

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await campusApi.getPriorityQueue({ tier: activeTier, sort: sortBy });
      if (res.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setRankedList(res.data.data);
        if (res.data.countsByTier) {
          setCountsByTier(res.data.countsByTier);
        }
      } else {
        // Fallback to client-side engine with local incidents
        applyClientFallback();
      }
    } catch {
      applyClientFallback();
    } finally {
      setIsLoading(false);
    }
  };

  const applyClientFallback = () => {
    let ranked = rankIncidentsClient(
      fallbackIncidents.map((i) => ({
        id: i.id,
        ticketNumber: i.ticketNumber,
        title: i.title,
        description: i.description,
        category: i.category,
        severity: i.severity,
        safetyRisk: i.safetyRisk as any,
        disruptionLevel: i.disruptionLevel as any,
        peopleAffected: i.peopleAffected,
        buildingId: i.buildingId,
        buildingName: i.buildingName,
        room: i.room,
        createdAt: i.createdAt,
        status: i.status,
        isSlaBreached: i.isSlaBreached,
      }))
    );

    const counts = {
      CRITICAL: ranked.filter((i) => i.priorityTier === 'CRITICAL').length,
      HIGH: ranked.filter((i) => i.priorityTier === 'HIGH').length,
      MEDIUM: ranked.filter((i) => i.priorityTier === 'MEDIUM').length,
      LOW: ranked.filter((i) => i.priorityTier === 'LOW').length,
    };
    setCountsByTier(counts);

    if (activeTier !== 'all') {
      ranked = ranked.filter((i) => i.priorityTier === activeTier.toUpperCase());
    }

    if (sortBy === 'oldest') {
      ranked.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sortBy === 'affected') {
      ranked.sort((a, b) => (b.peopleAffected || 0) - (a.peopleAffected || 0));
    }

    setRankedList(ranked);
  };

  useEffect(() => {
    fetchQueue();
  }, [activeTier, sortBy, fallbackIncidents]);

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTarget || !overrideReason.trim()) return;

    setIsSubmittingOverride(true);
    try {
      const res = await campusApi.overridePriority(overrideTarget.id, selectedTier, overrideReason.trim());
      if (res.data?.success) {
        setOverrideSuccessMsg(`Priority successfully overridden to ${selectedTier}`);
        setTimeout(() => {
          setOverrideTarget(null);
          setOverrideReason('');
          setOverrideSuccessMsg(null);
          fetchQueue();
        }, 1200);
      } else {
        alert(res.error || 'Failed to submit priority override');
      }
    } catch (err: any) {
      alert(`Override error: ${err.message}`);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toUpperCase()) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
          badge: 'bg-red-600 text-white',
          bar: 'bg-red-600',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
          badge: 'bg-amber-500 text-white',
          bar: 'bg-amber-500',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
          badge: 'bg-blue-500 text-white',
          bar: 'bg-blue-500',
        };
      default:
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          badge: 'bg-emerald-500 text-white',
          bar: 'bg-emerald-500',
        };
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-card-lg border border-[#E7E2DD] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#E7E2DD] bg-[#FAF7F1]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#BA3D6E] animate-pulse" />
            <h3 className="font-space font-bold text-[15px] sm:text-base text-[#24283B]">
              Intelligent Campus Priority Queue
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6E9FF] text-[#4A5AA0] border border-[#D5DCFF]">
              7-Factor Engine
            </span>
          </div>
          <p className="font-jakarta text-[11px] text-[#74788C] mt-0.5">
            Transparent algorithmic triage ranking incidents by safety risk (30%), severity (20%), and occupancy impact.
          </p>
        </div>

        {/* Sort & Refresh */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-[#E7E2DD] bg-white text-[#24283B] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="priority">Highest Priority</option>
            <option value="oldest">Oldest Unresolved</option>
            <option value="affected">Most Occupants Affected</option>
          </select>
          <button
            onClick={fetchQueue}
            disabled={isLoading}
            className="p-1.5 rounded-xl border border-[#E7E2DD] bg-white hover:bg-[#F6F0E5] text-[#74788C] transition-colors"
            title="Recalculate Priority Queue"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tier Filter Tabs */}
      <div className="px-4 sm:px-5 py-2.5 border-b border-[#E7E2DD] bg-white flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTier('all')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
            activeTier === 'all'
              ? 'bg-[#24283B] text-white shadow-sm'
              : 'bg-[#F6F0E5] text-[#74788C] hover:bg-[#E7E2DD]'
          }`}
        >
          All ({rankedList.length})
        </button>
        <button
          onClick={() => setActiveTier('critical')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTier === 'critical'
              ? 'bg-[#BA3D6E] text-white shadow-sm'
              : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60'
          }`}
        >
          Critical
          <span className="px-1 py-0.2 rounded-full text-[10px] bg-white/20">
            {countsByTier.CRITICAL ?? 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTier('high')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTier === 'high'
              ? 'bg-[#C06B33] text-white shadow-sm'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
          }`}
        >
          High
          <span className="px-1 py-0.2 rounded-full text-[10px] bg-white/20">
            {countsByTier.HIGH ?? 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTier('medium')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTier === 'medium'
              ? 'bg-[#6878CA] text-white shadow-sm'
              : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
          }`}
        >
          Medium
          <span className="px-1 py-0.2 rounded-full text-[10px] bg-white/20">
            {countsByTier.MEDIUM ?? 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTier('low')}
          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTier === 'low'
              ? 'bg-[#2E8B67] text-white shadow-sm'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
          }`}
        >
          Low
          <span className="px-1 py-0.2 rounded-full text-[10px] bg-white/20">
            {countsByTier.LOW ?? 0}
          </span>
        </button>
      </div>

      {/* Ranked Incident List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#F6F0E5] max-h-[500px]">
        {rankedList.length === 0 ? (
          <div className="p-8 text-center text-[#74788C]">
            <CheckCircle2 size={32} className="mx-auto text-[#2E8B67] mb-2 opacity-80" />
            <p className="font-space font-bold text-sm text-[#24283B]">No Incidents in this Tier</p>
            <p className="text-xs text-[#74788C] mt-1">All campus services in this category are operating within acceptable thresholds.</p>
          </div>
        ) : (
          rankedList.map((item, idx) => {
            const tier = item.priorityTier || (item as any).priorityAnalysis?.tier || 'LOW';
            const colors = getTierColor(tier);
            const score = item.priorityScore ?? (item as any).priorityAnalysis?.totalScore ?? 50;
            const isExpanded = expandedId === item.id;
            const explanation = item.explanation || (item as any).priorityAnalysis;

            return (
              <div
                key={item.id}
                className={`p-4 transition-colors ${isExpanded ? 'bg-[#FAF7F1]/60' : 'hover:bg-[#FAF7F1]/40'}`}
              >
                <div className="flex items-start gap-3">
                  {/* Rank Badge */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <span className="font-space font-bold text-xs text-[#74788C]">
                      #{String(idx + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${colors.badge}`}
                    >
                      {score}
                    </span>
                  </div>

                  {/* Incident Main Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span
                        className={`px-2 py-0.2 text-[9px] font-bold uppercase rounded border ${colors.bg}`}
                      >
                        {tier}
                      </span>
                      <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-[#F6F0E5] text-[#74788C]">
                        {item.category}
                      </span>
                      {item.ticketNumber && (
                        <span className="text-[10px] font-mono text-[#74788C]">
                          {item.ticketNumber}
                        </span>
                      )}
                      {(item as any).priorityAnalysis?.isManualOverride && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-purple-100 text-purple-700 border border-purple-200">
                          OVERRIDDEN
                        </span>
                      )}
                    </div>

                    <h4 className="font-jakarta font-bold text-[13px] text-[#24283B] leading-snug">
                      {item.title}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-[#74788C]">
                      <span className="flex items-center gap-1">
                        <Building2 size={11} className="text-[#6878CA]" />
                        {item.buildingName || item.buildingId}
                        {item.room ? ` · ${item.room}` : ''}
                      </span>
                      {item.peopleAffected ? (
                        <span className="flex items-center gap-1">
                          <Users size={11} className="text-[#C06B33]" />
                          {item.peopleAffected} occupants affected
                        </span>
                      ) : null}
                      {item.isSlaBreached && (
                        <span className="flex items-center gap-1 text-[#BA3D6E] font-bold">
                          <Clock size={11} /> SLA Overdue
                        </span>
                      )}
                    </div>

                    {/* Expandable 7-factor rationale toggle */}
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            Hide Factor Rationale <ChevronUp size={12} />
                          </>
                        ) : (
                          <>
                            View 7-Factor Breakdown <ChevronDown size={12} />
                          </>
                        )}
                      </button>

                      {canOverride && (
                        <button
                          onClick={() => {
                            setOverrideTarget(item);
                            setSelectedTier(item.priorityTier || 'CRITICAL');
                          }}
                          className="text-[10px] font-semibold text-purple-600 hover:text-purple-800 underline transition-colors"
                        >
                          Override Priority
                        </button>
                      )}
                    </div>

                    {/* Expanded Factor Breakdown */}
                    {isExpanded && explanation && (
                      <div className="mt-3 p-3 rounded-xl bg-white border border-[#E7E2DD] shadow-inner space-y-2.5 animate-in fade-in">
                        <div className="flex items-center justify-between border-b border-[#F6F0E5] pb-1.5">
                          <span className="text-[11px] font-bold text-[#24283B]">
                            Mathematical Factor Weighting:
                          </span>
                          <span className="text-[10px] font-mono text-[#74788C]">
                            Calculated Total: {score}/100
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                          <div className="p-1.5 rounded bg-[#FAF7F1] border border-[#E7E2DD]/70">
                            <span className="text-[#74788C] block">Safety Risk (30%)</span>
                            <span className="font-bold text-[#24283B]">
                              {explanation.factors?.safetyRisk?.score ?? 0}/30 pts
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-[#FAF7F1] border border-[#E7E2DD]/70">
                            <span className="text-[#74788C] block">Severity (20%)</span>
                            <span className="font-bold text-[#24283B]">
                              {explanation.factors?.severity?.score ?? 0}/20 pts
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-[#FAF7F1] border border-[#E7E2DD]/70">
                            <span className="text-[#74788C] block">People Affected (15%)</span>
                            <span className="font-bold text-[#24283B]">
                              {explanation.factors?.peopleAffected?.score ?? 0}/15 pts
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-[#FAF7F1] border border-[#E7E2DD]/70">
                            <span className="text-[#74788C] block">Facility Tier (15%)</span>
                            <span className="font-bold text-[#24283B]">
                              {explanation.factors?.facilityCriticality?.score ?? 0}/15 pts
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-[#FAF7F1] border border-[#E7E2DD]/70">
                            <span className="text-[#74788C] block">Disruption (10%)</span>
                            <span className="font-bold text-[#24283B]">
                              {explanation.factors?.operationalDisruption?.score ?? 0}/10 pts
                            </span>
                          </div>
                          <div className="p-1.5 rounded bg-[#FAF7F1] border border-[#E7E2DD]/70">
                            <span className="text-[#74788C] block">Waiting/SLA (5%)</span>
                            <span className="font-bold text-[#24283B]">
                              {explanation.factors?.waitingTime?.score ?? 0}/5 pts
                            </span>
                          </div>
                        </div>

                        {explanation.reasons && explanation.reasons.length > 0 && (
                          <div className="mt-1">
                            <span className="text-[10px] font-bold text-[#74788C] uppercase tracking-wider block mb-0.5">
                              Key Drivers:
                            </span>
                            <ul className="list-disc ml-3 text-[11px] text-[#24283B] space-y-0.5">
                              {explanation.reasons.map((r: string, rIdx: number) => (
                                <li key={rIdx}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {explanation.recommendedActions && explanation.recommendedActions.length > 0 && (
                          <div className="p-2 rounded bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-900">
                            <span className="font-bold block mb-0.5">Recommended Protocol:</span>
                            <span>{explanation.recommendedActions[0]}</span>
                          </div>
                        )}

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-2 pt-1 border-t border-[#F6F0E5]">
                          <button
                            onClick={() => navigate('/maintenance')}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <Wrench size={11} /> Issue Work Order
                          </button>
                          <button
                            onClick={() => {
                            if (item.buildingId) setSelectedBuildingId(item.buildingId);
                            setSelectedIncidentId(item.id);
                            navigate('/campus-3d');
                          }}
                            className="px-2.5 py-1 rounded-lg bg-[#F6F0E5] hover:bg-[#E7E2DD] text-[#24283B] text-[11px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <Building2 size={11} /> Inspect in 3D
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-[#FAF7F1] border-t border-[#E7E2DD] flex items-center justify-between text-[11px] text-[#74788C]">
        <span>Formula: 30% Safety + 20% Sev + 15% People + 15% Fac + 10% Disr + 5% Wait + 5% Esc</span>
        <button
          onClick={() => navigate('/incidents')}
          className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          View All Incidents <ArrowRight size={12} />
        </button>
      </div>

      {/* Manual Priority Override Modal */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#E7E2DD] shadow-2xl">
            <h4 className="font-space font-bold text-base text-[#24283B] mb-1">
              Manual Priority Override
            </h4>
            <p className="font-jakarta text-xs text-[#74788C] mb-4">
              Overriding: <strong className="text-[#24283B]">{overrideTarget.title}</strong>
            </p>

            {overrideSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold text-center">
                ✓ {overrideSuccessMsg}
              </div>
            ) : (
              <form onSubmit={handleApplyOverride} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#24283B] mb-1">Target Priority Tier</label>
                  <select
                    value={selectedTier}
                    onChange={(e) => setSelectedTier(e.target.value as PriorityTier)}
                    className="w-full text-xs p-2 rounded-xl border border-[#E7E2DD] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CRITICAL">CRITICAL (Emergency protocol, 15m response)</option>
                    <option value="HIGH">HIGH (Urgent same-day dispatch)</option>
                    <option value="MEDIUM">MEDIUM (Standard queue 24-48h)</option>
                    <option value="LOW">LOW (Routine preventive maintenance)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#24283B] mb-1">
                    Override Justification (Required for Audit Trail)
                  </label>
                  <textarea
                    rows={3}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    placeholder="State reason (e.g. VIP event in vicinity, impending inspection, specialized safety hazard)..."
                    required
                    className="w-full text-xs p-2.5 rounded-xl border border-[#E7E2DD] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOverrideTarget(null)}
                    disabled={isSubmittingOverride}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#74788C] hover:bg-[#F6F0E5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOverride || !overrideReason.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white transition-colors"
                  >
                    {isSubmittingOverride ? 'Recording...' : 'Commit Override'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

