function LiveBadge({ isPersistent }: { isPersistent?: boolean }) {
  if (isPersistent) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D5F3E8] text-[#1B6648] font-jakarta text-[9px] font-bold uppercase tracking-widest">
        <span className="w-1.5 h-1.5 rounded-full bg-[#2E8B67]" />
        Live
      </span>
    );
  }
  return null;
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Package, DoorOpen,
  TrendingUp, TrendingDown, Minus,
  Brain, Zap, ArrowRight, Clock,
  CheckCheck, XCircle, Activity,
  Building2, ExternalLink,
  Plus, FileText, CalendarDays, Search as SearchIcon,
  Sparkles, Bot,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext';
import { useAuth } from '../context/AuthContext';
import { normalizeRole } from '../utils/permissions';
import CampusViewer3D from '../components/3d/CampusViewer3D';
import ThreejsErrorBoundary from '../components/3d/ThreejsErrorBoundary';
import { CampusPriorityQueueWidget } from '../components/dashboard/CampusPriorityQueueWidget';
import StudentFacultyDashboardView from '../components/dashboard/roleViews/StudentFacultyDashboardView';
import TechnicianDashboardView from '../components/dashboard/roleViews/TechnicianDashboardView';
import DeptManagerDashboardView from '../components/dashboard/roleViews/DeptManagerDashboardView';
import ProcurementDashboardView from '../components/dashboard/roleViews/ProcurementDashboardView';
import SystemAdminDashboardView from '../components/dashboard/roleViews/SystemAdminDashboardView';
import { AIInsight, ApprovalRequest, ActivityItem, WorkOrder, Incident } from '../types';

/* ─── Tiny helpers ─────────────────────────────────────────────── */
const SEV_COLORS: Record<string, string> = {
  critical: '#BA3D6E',
  high: '#C06B33',
  medium: '#6878CA',
  low: '#2E8B67',
};

function SeverityDot({ severity }: { severity: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ background: SEV_COLORS[severity] ?? '#74788C' }}
    />
  );
}

function StatusBadge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold"
      style={{ background: color + '22', color }}
    >
      {text}
    </span>
  );
}

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6E9FF] text-[#4A5AA0] font-jakarta text-[9px] font-bold uppercase tracking-widest">
      <span className="w-1.5 h-1.5 rounded-full bg-[#6878CA] animate-pulse" />
      Demo
    </span>
  );
}

/* ─── KPI Card ──────────────────────────────────────────────────── */
interface KPIProps {
  label: string;
  value: string | number;
  trend: string;
  trendUp?: boolean | null;
  bg: string;
  iconBg: string;
  icon: React.ElementType;
  iconColor: string;
  onClick?: () => void;
}
function KPICard({ label, value, trend, trendUp, bg, iconBg, icon: Icon, iconColor, onClick, isPersistent }: KPIProps & { isPersistent?: boolean }) {
  const isBackendPersistent = isPersistent;
  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col justify-between p-5 rounded-card border border-[#E7E2DD] overflow-hidden transition-all duration-300 hover:shadow-pastel-md hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}
      style={{ background: bg }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: iconBg }}
        >
          <Icon size={20} style={{ color: iconColor }} strokeWidth={2} />
        </div>
        <LiveBadge isPersistent={isBackendPersistent} />
      </div>
      <div>
        <p className="font-space font-bold text-[2.4rem] leading-none text-[#24283B] tracking-tight">{value}</p>
        <p className="font-jakarta text-[12px] font-semibold text-[#74788C] mt-1.5 uppercase tracking-wider">{label}</p>
        <p className="flex items-center gap-1 mt-3 font-jakarta text-[12px] text-[#74788C]">
          {trendUp === true && <TrendingUp size={13} className="text-[#2E8B67]" />}
          {trendUp === false && <TrendingDown size={13} className="text-[#BA3D6E]" />}
          {trendUp === null && <Minus size={13} />}
          {trend}
        </p>
      </div>
    </div>
  );
}

/* ─── Priority Item ──────────────────────────────────────────────── */
function PriorityItem({ item, type }: { item: WorkOrder | Incident; type: 'wo' | 'inc' }) {
  const navigate = useNavigate();
  const isWO = type === 'wo';
  const severity = isWO ? (item as WorkOrder).priority : (item as Incident).severity;
  const sla = isWO ? (item as WorkOrder).slaRemaining : (item as Incident).slaDeadline;
  const building = isWO ? (item as WorkOrder).buildingName : (item as Incident).buildingName;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#E7E2DD] last:border-0 group">
      <SeverityDot severity={severity} />
      <div className="flex-1 min-w-0">
        <p className="font-jakarta font-semibold text-[13px] text-[#24283B] truncate">{item.title}</p>
        <p className="font-jakarta text-[11px] text-[#74788C] mt-0.5">{building}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="flex items-center gap-1 font-jakarta text-[11px] text-[#74788C]">
          <Clock size={11} />
          {sla}
        </span>
        <button
          onClick={() => navigate(isWO ? '/maintenance' : '/incidents')}
          className="px-2.5 py-1 rounded-lg bg-[#F6F0E5] text-[#74788C] font-jakarta text-[11px] font-semibold hover:bg-[#E7E2DD] hover:text-[#24283B] transition-colors"
        >
          View
        </button>
      </div>
    </div>
  );
}

/* ─── AI Insight Card ────────────────────────────────────────────── */
const INSIGHT_CONFIG: Record<AIInsight['severity'], { border: string; iconBg: string; iconColor: string; label: string }> = {
  critical: { border: '#BA3D6E', iconBg: '#F8DCE8', iconColor: '#BA3D6E', label: 'Critical' },
  warning: { border: '#C06B33', iconBg: '#FFE4CF', iconColor: '#C06B33', label: 'Warning' },
  advisory: { border: '#6878CA', iconBg: '#E6E9FF', iconColor: '#6878CA', label: 'Advisory' },
};

function AIInsightCard({ insight, onAct }: { insight: AIInsight; onAct: () => void }) {
  const cfg = INSIGHT_CONFIG[insight.severity];
  return (
    <div
      className="flex flex-col bg-white rounded-card border border-[#E7E2DD] overflow-hidden transition-all duration-300 hover:shadow-pastel-md hover:-translate-y-0.5"
      style={{ borderLeft: `4px solid ${cfg.border}` }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.iconBg }}>
            <Brain size={17} style={{ color: cfg.iconColor }} />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold" style={{ background: cfg.iconBg, color: cfg.iconColor }}>
              {cfg.label}
            </span>
            <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-semibold bg-[#F6F0E5] text-[#74788C]">
              {insight.confidenceScore}% confidence
            </span>
          </div>
        </div>
        <h4 className="font-space font-bold text-[14px] text-[#24283B] leading-snug mb-2">{insight.title}</h4>
        <p className="font-jakarta text-[12px] text-[#74788C] leading-relaxed line-clamp-2">{insight.summary}</p>
        <p className="font-jakarta text-[11px] text-[#9CA1B4] mt-2">{insight.buildingName} · {insight.detectedTimeAgo}</p>
      </div>
      <div className="mt-auto px-5 pb-4">
        <div className="p-3 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD]">
          <p className="font-jakarta text-[11px] font-semibold text-[#74788C] uppercase tracking-wider mb-1">Recommended Action</p>
          <p className="font-jakarta text-[12px] text-[#24283B] leading-snug">{insight.recommendedAction}</p>
          <button
            onClick={onAct}
            className="mt-2 flex items-center gap-1.5 font-jakarta font-semibold text-[12px] hover:gap-2.5 transition-all"
            style={{ color: cfg.iconColor }}
          >
            Act Now <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Activity item ─────────────────────────────────────────────── */
const ACT_COLORS: Record<ActivityItem['category'], string> = {
  incident: '#BA3D6E',
  maintenance: '#C06B33',
  inventory: '#2E8B67',
  approval: '#6878CA',
  system: '#74788C',
};

function ActivityRow({ item }: { item: ActivityItem }) {
  const color = ACT_COLORS[item.category];
  return (
    <div className="flex items-start gap-3 py-3.5">
      <div className="relative flex-shrink-0">
        {item.avatar ? (
          <img src={item.avatar} alt={item.actor} className="w-8 h-8 rounded-full object-cover border border-[#E7E2DD]"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: color + '20' }}>
            <Activity size={14} style={{ color }} />
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-jakarta text-[13px] text-[#24283B]">
          <span className="font-semibold">{item.actor}</span>
          <span className="text-[#74788C]"> {item.action} </span>
          <span className="font-semibold truncate">{item.target}</span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="font-jakarta text-[11px] text-[#9CA1B4]">{item.timestamp}</span>
          <span className="w-1 h-1 rounded-full bg-[#D8D1C8]" />
          <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold" style={{ background: color + '15', color }}>
            {item.badgeText}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Approval Card ─────────────────────────────────────────────── */
const URGENCY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: '#FDF0F6', text: '#BA3D6E', label: 'High Priority' },
  medium: { bg: '#FFF2E7', text: '#C06B33', label: 'Medium Priority' },
  normal: { bg: '#F2F4FF', text: '#6878CA', label: 'Normal' },
};

function ApprovalCard({ approval, onApprove, onReject }: {
  approval: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const ub = URGENCY_BADGE[approval.urgency];
  const isApproved = approval.status === 'approved';
  const isRejected = approval.status === 'rejected';
  const isDone = isApproved || isRejected;

  return (
    <div className={`p-4 rounded-card border transition-all duration-300 ${isDone ? 'opacity-60 border-[#E7E2DD] bg-[#FAF7F1]' : 'border-[#E7E2DD] bg-white hover:shadow-pastel-sm'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold" style={{ background: ub.bg, color: ub.text }}>
          {ub.label}
        </span>
        {isApproved && <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold bg-[#E9F9F2] text-[#2E8B67]">Approved ✓</span>}
        {isRejected && <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold bg-[#F6F0E5] text-[#74788C]">Declined</span>}
      </div>
      <h4 className="font-jakarta font-semibold text-[13px] text-[#24283B] leading-snug mb-1">{approval.title}</h4>
      <div className="flex items-center justify-between mb-3">
        <p className="font-jakarta text-[11px] text-[#74788C]">{approval.requesterName} · {approval.department}</p>
        <span className="font-space font-bold text-[13px] text-[#24283B]">{approval.estimatedCost}</span>
      </div>
      {!isDone && (
        <div className="flex gap-2">
          <button
            onClick={onApprove}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#D5F3E8] text-[#1B6648] font-jakarta font-semibold text-[12px] hover:bg-[#B8ECD8] transition-colors"
          >
            <CheckCheck size={13} /> Approve
          </button>
          <button
            onClick={onReject}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#F6F0E5] text-[#74788C] font-jakarta font-semibold text-[12px] hover:bg-[#EFE7D8] transition-colors"
          >
            <XCircle size={13} /> Decline
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Building Status row ────────────────────────────────────────── */
const HEALTH_COLOR = (s: number) => s >= 93 ? '#2E8B67' : s >= 82 ? '#C06B33' : '#BA3D6E';

function BuildingHealthRow({ buildings }: { buildings: { id: string; shortName: string; healthScore: number; openIncidents: number; status: string }[] }) {
  const shown = buildings.slice(0, 5);
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1">
      {shown.map((b) => (
        <div key={b.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E7E2DD] bg-white flex-shrink-0">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: HEALTH_COLOR(b.healthScore) }} />
          <span className="font-jakarta text-[12px] font-semibold text-[#24283B]">{b.shortName}</span>
          <span className="font-jakarta text-[11px] text-[#74788C]">{b.healthScore}%</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Quick Action Tile ─────────────────────────────────────────── */
function QuickActionTile({ label, sub, icon: Icon, bg, iconColor, onClick }: {
  label: string; sub: string; icon: React.ElementType; bg: string; iconColor: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-3 p-5 rounded-card border border-[#E7E2DD] text-left transition-all duration-300 hover:shadow-pastel-md hover:-translate-y-0.5 group w-full"
      style={{ background: bg }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: iconColor + '20' }}>
        <Icon size={24} style={{ color: iconColor }} strokeWidth={1.8} />
      </div>
      <div>
        <p className="font-space font-bold text-[14px] text-[#24283B]">{label}</p>
        <p className="font-jakarta text-[12px] text-[#74788C] mt-0.5">{sub}</p>
      </div>
      <ArrowRight size={16} className="self-end text-[#74788C] group-hover:translate-x-1 transition-transform" />
    </button>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    incidents,
    workOrders,
    stockAlerts,
    roomDisruptions,
    aiInsights,
    recentActivities,
    approvals,
    buildings,
    isBackendPersistent,
    connectionError,
    retryConnection,
    approveRequest,
    rejectRequest,
    setIsReportIncidentOpen,
    setIsCreateWorkOrderOpen,
    setSelectedBuildingId,
  } = useCampus();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const openIncidentCount = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed').length;
  const stockAlertCount = stockAlerts.length;
  const roomDisruptCount = roomDisruptions.filter((r) => r.status === 'active').length;

  const topPriorities: { item: WorkOrder | Incident; type: 'wo' | 'inc' }[] = [
    ...workOrders.filter((w) => w.priority === 'urgent' || w.priority === 'high').slice(0, 2).map((w) => ({ item: w as WorkOrder, type: 'wo' as const })),
    ...incidents.filter((i) => i.severity === 'critical' || i.severity === 'high').slice(0, 3).map((i) => ({ item: i as Incident, type: 'inc' as const })),
  ].slice(0, 5);

  const { role } = useAuth();
  const normRole = normalizeRole(role);

  if (normRole === 'student_faculty') {
    return (
      <div className="px-6 py-7 min-h-full pb-12">
        <StudentFacultyDashboardView />
      </div>
    );
  }

  if (normRole === 'technician') {
    return (
      <div className="px-6 py-7 min-h-full pb-12">
        <TechnicianDashboardView />
      </div>
    );
  }

  if (normRole === 'department_manager') {
    return (
      <div className="px-6 py-7 min-h-full pb-12">
        <DeptManagerDashboardView />
      </div>
    );
  }

  if (normRole === 'procurement_approver') {
    return (
      <div className="px-6 py-7 min-h-full pb-12">
        <ProcurementDashboardView />
      </div>
    );
  }

  if (normRole === 'system_administrator') {
    return (
      <div className="px-6 py-7 min-h-full pb-12">
        <SystemAdminDashboardView />
      </div>
    );
  }

  return (
    <div className="px-6 py-7 space-y-7 min-h-full pb-12">

      {/* ── A. Welcome Banner ─────────────────────────────────────── */}
      <div className="relative flex items-end justify-between px-8 py-8 rounded-card-lg overflow-hidden border border-[#E7E2DD]"
        style={{ background: 'linear-gradient(135deg, #F6F0E5 0%, #EFE7D8 60%, #E9DDFB 100%)' }}>
        {/* Decorative circle */}
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #E6E9FF 0%, transparent 70%)' }} />
        <div className="absolute right-16 bottom-4 w-48 h-48 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #E9DDFB 0%, transparent 70%)' }} />

        <div className="relative z-10">
          <p className="font-jakarta text-[12px] font-semibold uppercase tracking-[0.15em] text-[#74788C] mb-2">
            CampusOps · Intelligent Operations Hub
          </p>
          <h1 className="font-space font-bold text-4xl md:text-5xl text-[#24283B] tracking-tight leading-none">
            The campus pulse.
          </h1>
          <p className="font-jakarta text-[15px] text-[#74788C] mt-3 max-w-sm leading-relaxed">
            Your entire campus, working as one. All systems, incidents, and assets — unified in real time.
          </p>
        </div>

        <div className="relative z-10 text-right hidden md:block">
          <p className="font-space font-bold text-[13px] text-[#24283B] tracking-tight">{today}</p>
          <p className="font-jakarta text-[12px] text-[#74788C] mt-1">CampusOps Digital Campus</p>
          <div className="flex items-center gap-2 justify-end mt-3">
            <span className="w-2 h-2 rounded-full bg-[#2E8B67] animate-pulse-subtle" />
            <span className="font-jakarta text-[11px] font-semibold text-[#2E8B67]">All Systems Monitoring Active</span>
          </div>
          <LiveBadge isPersistent={isBackendPersistent} />
        </div>
      </div>

      {/* ── AI Copilot Command Strip ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-space font-bold text-xs sm:text-sm text-[#24283B]">CampusOps AI Copilot Active</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700">7-Factor Priority Engine</span>
            </div>
            <p className="font-jakarta text-[11px] text-[#74788C]">
              Ask complex queries across incidents, room disruptions, inventory, or technician assignments.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('campusops-toggle-copilot'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-jakarta text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Bot size={13} /> Ask Copilot <kbd className="font-mono text-[9px] bg-white/20 px-1 py-0.2 rounded ml-0.5">Ctrl+J</kbd>
          </button>
        </div>
      </div>

      {/* Connection Status Banner (if backend/Supabase error) */}
      {connectionError && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#FFF2E7] border border-[#FFE4CF] shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-[#C06B33] flex-shrink-0" />
            <div>
              <p className="font-space font-bold text-xs text-[#24283B]">Database Sync Status</p>
              <p className="font-jakarta text-[11px] text-[#74788C]">{connectionError}</p>
            </div>
          </div>
          <button
            onClick={() => retryConnection()}
            className="px-3 py-1.5 rounded-xl bg-white text-[#C06B33] border border-[#FFE4CF] font-jakarta text-xs font-bold hover:bg-[#FAF7F1] transition shadow-sm cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* ── B. KPI Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Open Incidents"
          value={openIncidentCount}
          trend="+3 since yesterday"
          trendUp={false}
          bg="#FDF0F6"
          iconBg="#F8DCE8"
          icon={AlertTriangle}
          iconColor="#BA3D6E"
          onClick={() => navigate('/incidents')}
        />
        <KPICard
          label="Tasks On Time"
          value="86%"
          trend="↑ improved from 81%"
          trendUp={true}
          bg="#E9F9F2"
          iconBg="#D5F3E8"
          icon={CheckCircle2}
          iconColor="#2E8B67"
          onClick={() => navigate('/maintenance')}
        />
        <KPICard
          label="Stock Alerts"
          value={stockAlertCount}
          trend="2 critical items low"
          trendUp={null}
          bg="#FFF2E7"
          iconBg="#FFE4CF"
          icon={Package}
          iconColor="#C06B33"
          onClick={() => navigate('/inventory')}
        />
        <KPICard
          label="Room Disruptions"
          value={roomDisruptCount}
          trend="Actionable relocations"
          trendUp={null}
          bg="#F2F4FF"
          iconBg="#E6E9FF"
          icon={DoorOpen}
          iconColor="#6878CA"
          onClick={() => navigate('/bookings')}
        />
      </div>

      {/* ── C+D. 3D Canvas + Today's Priorities ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* 3D Campus Panel (3/5) */}
        <div className="lg:col-span-3 flex flex-col rounded-card-lg border border-[#E7E2DD] overflow-hidden" style={{ background: '#F2F4FF', minHeight: '440px' }}>
          <div className="flex items-center justify-between px-5 py-4 bg-white/60 border-b border-[#E7E2DD]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#E6E9FF] flex items-center justify-center">
                <Building2 size={16} className="text-[#6878CA]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-space font-bold text-[14px] text-[#24283B]">3D Digital Twin</p>
                  <span className="px-2 py-0.5 rounded-full bg-[#E6E9FF] text-[#4A5AA0] font-jakarta text-[10px] font-bold">
                    {openIncidentCount} Active Issues
                  </span>
                </div>
                <p className="font-jakarta text-[11px] text-[#74788C]">Interactive 3D model with live physical incident pinpoints</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/campus-3d')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#6878CA] font-jakarta font-semibold text-[12px] hover:bg-[#E6E9FF] transition-colors"
            >
              Full 3D View <ExternalLink size={12} />
            </button>
          </div>

          {/* 3D Viewer */}
          <div className="flex-1 relative" style={{ minHeight: '320px' }}>
            <ThreejsErrorBoundary>
              <CampusViewer3D
                height="100%"
                onSelectBuilding={(bCode) => {
                  setSelectedBuildingId(bCode);
                  navigate('/campus-3d');
                }}
              />
            </ThreejsErrorBoundary>

            {/* Quick Hotspot Buildings Pills */}
            <div className="absolute top-3 left-3 right-3 flex items-center gap-2 overflow-x-auto pointer-events-auto pb-1 scrollbar-none z-10">
              <span className="px-2.5 py-1 rounded-xl bg-slate-900/80 text-white font-jakarta text-[10px] font-bold whitespace-nowrap backdrop-blur-sm shadow-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Live Incidents:
              </span>
              {buildings
                .filter((b) =>
                  incidents.some(
                    (i) =>
                      (i.buildingId === b.id || i.building === b.id || i.location === b.id) &&
                      i.status !== 'resolved' &&
                      i.lifecycleStatus !== 'closed'
                  )
                )
                .slice(0, 4)
                .map((b) => {
                  const bIncs = incidents.filter(
                    (i) =>
                      (i.buildingId === b.id || i.building === b.id || i.location === b.id) &&
                      i.status !== 'resolved' &&
                      i.lifecycleStatus !== 'closed'
                  );
                  const hasCrit = bIncs.some((i) => i.severity === 'critical');
                  return (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelectedBuildingId(b.id);
                        navigate('/campus-3d');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-jakarta font-bold border whitespace-nowrap shadow-sm backdrop-blur-md transition-all hover:scale-105 flex items-center gap-1.5 ${hasCrit
                          ? 'bg-red-50/95 text-red-700 border-red-300'
                          : 'bg-white/95 text-[#24283B] border-[#E7E2DD]'
                        }`}
                    >
                      <span>{b.shortName}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[9px] ${hasCrit ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-800'
                          }`}
                      >
                        {bIncs.length}
                      </span>
                    </button>
                  );
                })}
            </div>

            <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-white/80 backdrop-blur-sm border border-[#E7E2DD] z-10">
              <p className="font-jakarta text-[10px] text-[#74788C] font-semibold">
                Click 3D building badge to drill down
              </p>
            </div>
          </div>

          {/* Building health row */}
          <div className="px-5 py-3 bg-white/60 border-t border-[#E7E2DD]">
            <BuildingHealthRow buildings={buildings} />
          </div>
        </div>

        {/* Intelligent Campus Priority Queue (2/5) */}
        <div className="lg:col-span-2">
          <CampusPriorityQueueWidget fallbackIncidents={incidents} />
        </div>
      </div>

      {/* ── E. AI Operational Insights ────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E9DDFB] flex items-center justify-center">
              <Brain size={16} className="text-[#8964B8]" />
            </div>
            <div>
              <p className="font-space font-bold text-[15px] text-[#24283B]">AI Operational Insights</p>
              <p className="font-jakarta text-[11px] text-[#74788C]">Anomaly detection · Predictive maintenance · Conflict resolution</p>
            </div>
          </div>
          <LiveBadge isPersistent={isBackendPersistent} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {aiInsights.map((insight) => (
            <AIInsightCard
              key={insight.id}
              insight={insight}
              onAct={() => {
                if (insight.type === 'repeated-complaint' || insight.type === 'maintenance-risk') navigate('/maintenance');
                else if (insight.type === 'low-stock') navigate('/inventory');
                else if (insight.type === 'room-conflict') navigate('/bookings');
              }}
            />
          ))}
        </div>
      </div>

      {/* ── F+G. Activity + Approvals ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Activity Timeline (3/5) */}
        <div className="lg:col-span-3 bg-white rounded-card-lg border border-[#E7E2DD] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E2DD]">
            <p className="font-space font-bold text-[14px] text-[#24283B]">Recent Activity</p>
            <span className="font-jakarta text-[11px] text-[#74788C]">Live session feed</span>
          </div>
          <div className="divide-y divide-[#F6F0E5] px-5 max-h-[400px] overflow-y-auto">
            {recentActivities.map((act) => (
              <ActivityRow key={act.id} item={act} />
            ))}
          </div>
        </div>

        {/* Pending Approvals (2/5) */}
        <div className="lg:col-span-2 bg-white rounded-card-lg border border-[#E7E2DD] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7E2DD]">
            <p className="font-space font-bold text-[14px] text-[#24283B]">Pending Approvals</p>
            <span className="px-2 py-1 rounded-full bg-[#FFE4CF] text-[#C06B33] font-jakarta text-[11px] font-bold">
              {approvals.filter((a) => a.status === 'pending').length} pending
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {approvals.map((appr) => (
              <ApprovalCard
                key={appr.id}
                approval={appr}
                onApprove={() => approveRequest(appr.id)}
                onReject={() => rejectRequest(appr.id)}
              />
            ))}
          </div>
          <div className="px-5 py-3 border-t border-[#E7E2DD]">
            <button
              onClick={() => navigate('/approvals')}
              className="w-full py-2 rounded-xl text-center font-jakarta font-semibold text-[13px] text-[#74788C] hover:bg-[#F6F0E5] transition-colors"
            >
              View all approvals →
            </button>
          </div>
        </div>
      </div>

      {/* ── H. Quick Actions ──────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap size={16} className="text-[#6878CA]" />
          <p className="font-space font-bold text-[15px] text-[#24283B]">Quick Actions</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionTile
            label="Report an Incident"
            sub="Log a new campus issue"
            icon={AlertTriangle}
            bg="#FDF0F6"
            iconColor="#BA3D6E"
            onClick={() => setIsReportIncidentOpen(true)}
          />
          <QuickActionTile
            label="Create Work Order"
            sub="Issue a maintenance task"
            icon={FileText}
            bg="#FFF2E7"
            iconColor="#C06B33"
            onClick={() => setIsCreateWorkOrderOpen(true)}
          />
          <QuickActionTile
            label="Book a Room"
            sub="Reserve a campus space"
            icon={CalendarDays}
            bg="#F2F4FF"
            iconColor="#6878CA"
            onClick={() => navigate('/bookings')}
          />
          <QuickActionTile
            label="Check Inventory"
            sub="View stock & asset levels"
            icon={Package}
            bg="#E9F9F2"
            iconColor="#2E8B67"
            onClick={() => navigate('/inventory')}
          />
        </div>
      </div>
    </div>
  );
}

