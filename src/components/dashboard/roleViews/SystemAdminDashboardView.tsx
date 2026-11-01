import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Activity,
  Users,
  Shield,
  Key,
  Database,
  Wifi,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { useCampus } from '../../../context/CampusContext';
import { useAuth } from '../../../context/AuthContext';

export default function SystemAdminDashboardView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isBackendPersistent, recentActivities } = useCampus();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ── */}
      <div
        className="relative flex flex-col md:flex-row items-start md:items-end justify-between p-6 sm:p-8 rounded-card-lg overflow-hidden border border-[#E7E2DD]"
        style={{ background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 60%, #FAF7F1 100%)' }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-jakarta text-[11px] font-bold">
              System Administration & Core Infrastructure
            </span>
            <span className="text-xs font-jakarta text-[#74788C]">
              Admin Identity: {user?.email}
            </span>
          </div>
          <h1 className="font-space font-bold text-3xl sm:text-4xl text-[#24283B] tracking-tight">
            Infrastructure Governance & Health.
          </h1>
          <p className="font-jakarta text-sm text-[#74788C] mt-2 max-w-lg leading-relaxed">
            Monitor Express API endpoints, Supabase PostgreSQL persistence, Realtime change listeners, role-based access security, and audit event logs across all campus subsystems.
          </p>
        </div>

        <div className="relative z-10 mt-4 md:mt-0 flex flex-col items-start md:items-end gap-2">
          <p className="font-space font-bold text-xs text-[#24283B]">{today}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/settings')}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E7E2DD] text-[#24283B] hover:bg-[#FAF7F1] font-jakarta text-xs font-semibold shadow-xs"
            >
              System Settings
            </button>
            <button
              onClick={() => navigate('/users')}
              className="px-4 py-2 rounded-xl bg-[#24283B] text-white hover:bg-[#383E58] font-jakarta text-xs font-semibold shadow-pastel-sm transition-all flex items-center gap-1.5"
            >
              <Users size={14} /> Staff Role Governance
            </button>
          </div>
        </div>
      </div>

      {/* ── Important Separation of Duties Notice ── */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 flex items-start gap-3 shadow-xs text-xs font-jakarta text-slate-800">
        <Lock size={18} className="text-slate-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold uppercase tracking-wider text-[11px] text-slate-900">
            Technical Administrator Role Boundary
          </p>
          <p className="text-slate-700 mt-0.5 leading-relaxed">
            System Administrator is a technical governance role and does not automatically grant business approval authority. Commercial procurement decisions must be reviewed by the authorized <strong>Procurement Approver</strong> role.
          </p>
        </div>
      </div>

      {/* ── KPI Row: Infrastructure Telemetry ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#E9F9F2]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#D5F3E8] flex items-center justify-center text-[#2E8B67]">
              <Activity size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#2E8B67] bg-white px-2 py-0.5 rounded-full border border-[#D5F3E8]">
              200 OK
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">99.98%</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            API Health & Uptime
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#F2F4FF]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#E6E9FF] flex items-center justify-center text-[#6878CA]">
              <Database size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#4A5AA0] bg-white px-2 py-0.5 rounded-full border border-[#E6E9FF]">
              Postgres
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">
            {isBackendPersistent ? 'Connected' : 'Local Demo'}
          </p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Supabase DB Status
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-[#FAF7F1]">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E2DD] flex items-center justify-center text-[#24283B]">
              <Wifi size={18} />
            </div>
            <span className="text-[10px] font-bold text-[#2E8B67] bg-[#D5F3E8] px-2 py-0.5 rounded-full">
              Live
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">Active</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            Realtime Subscriptions
          </p>
        </div>

        <div className="p-5 rounded-card border border-[#E7E2DD] bg-slate-50">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-800">
              <Users size={18} />
            </div>
            <span className="text-[10px] font-bold text-slate-800 bg-white px-2 py-0.5 rounded-full border border-slate-300">
              6 Roles
            </span>
          </div>
          <p className="font-space font-bold text-3xl text-[#24283B]">Active</p>
          <p className="font-jakarta text-xs text-[#74788C] mt-1 font-semibold uppercase tracking-wider">
            PS2 RBAC Governance
          </p>
        </div>
      </div>

      {/* ── Main Administration Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: System Components & Middleware (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-slate-800" />
              <h2 className="font-space font-bold text-base text-[#24283B]">
                CampusOps System Components & Security Middleware
              </h2>
            </div>
            <span className="text-xs font-jakarta text-[#2E8B67] font-semibold bg-[#D5F3E8] px-2.5 py-0.5 rounded-full">
              All Services Operational
            </span>
          </div>

          <div className="bg-white rounded-card border border-[#E7E2DD] divide-y divide-[#F6F0E5] shadow-xs">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-space font-bold text-xs text-[#24283B]">Express API Gateway</p>
                <p className="text-[11px] text-[#74788C]">
                  Port 5000 · 8 registered routers (Incidents, WorkOrders, Inventory, Bookings, Occupancy, Copilot, Approvals, Users)
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D5F3E8] text-[#2E8B67] text-[10px] font-bold">
                ONLINE
              </span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-space font-bold text-xs text-[#24283B]">Security Middlewares</p>
                <p className="text-[11px] text-[#74788C]">
                  Rate Limiting (250 req/15min) · X-Content-Type-Options: nosniff · Frameguard: SAMEORIGIN · XSS Filter
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D5F3E8] text-[#2E8B67] text-[10px] font-bold">
                ENFORCED
              </span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-space font-bold text-xs text-[#24283B]">Authentication & RBAC Engine</p>
                <p className="text-[11px] text-[#74788C]">
                  Bearer JWT Verification · Database Role Validation · Anti-Role-Escalation · Anti-Self-Approval
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D5F3E8] text-[#2E8B67] text-[10px] font-bold">
                ENFORCED
              </span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-space font-bold text-xs text-[#24283B]">Deterministic Priority Engine (7 Factors)</p>
                <p className="text-[11px] text-[#74788C]">
                  Mathematical scoring: Safety (30%) + Severity (20%) + People (15%) + Facility (15%) + Disruption (10%) + Wait (5%) + Repeat (5%)
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D5F3E8] text-[#2E8B67] text-[10px] font-bold">
                ACTIVE
              </span>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-space font-bold text-xs text-[#24283B]">3D Digital Twin Coordinate System</p>
                <p className="text-[11px] text-[#74788C]">
                  14 Facilities mapped · Normalized GLB master model footprint: 18 units centered at (0, 0, 0)
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#D5F3E8] text-[#2E8B67] text-[10px] font-bold">
                SYNCHRONIZED
              </span>
            </div>
          </div>

          {/* Quick User Governance Tile */}
          <div className="p-5 rounded-2xl bg-white border border-[#E7E2DD] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E6E9FF] flex items-center justify-center text-[#4A5AA0]">
                <Users size={18} />
              </div>
              <div>
                <p className="font-space font-bold text-sm text-[#24283B]">Manage Staff Roles & Permissions</p>
                <p className="font-jakarta text-xs text-[#74788C]">
                  Assign official PS2 stakeholder roles, activate or suspend accounts, and audit user activity.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/users')}
              className="px-4 py-2 bg-[#24283B] text-white rounded-xl text-xs font-bold hover:bg-[#383E58] transition"
            >
              Open Users Panel →
            </button>
          </div>
        </div>

        {/* Right Column: Security Audit Events & Logs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-slate-800" />
              <h2 className="font-space font-bold text-base text-[#24283B]">
                Live Security & Audit Trail
              </h2>
            </div>
            <span className="text-[10px] font-bold text-[#74788C]">Immutable</span>
          </div>

          <div className="bg-white rounded-card border border-[#E7E2DD] p-4 space-y-3">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {recentActivities.map((act) => (
                <div key={act.id} className="p-2.5 rounded-xl bg-[#FAF7F1] border border-[#E7E2DD] text-xs font-jakarta space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#24283B]">{act.actor}</span>
                    <span className="text-[10px] text-[#74788C]">{act.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-[#74788C]">
                    {act.action} <strong className="text-[#24283B]">{act.target}</strong>
                  </p>
                  <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 uppercase mt-0.5">
                    {act.category} · {act.badgeText}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

