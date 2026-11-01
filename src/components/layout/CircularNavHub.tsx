import React, { useState, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Building2,
  Wrench,
  Package,
  CalendarDays,
  Search,
  Radar,
  CheckCircle2,
  BarChart3,
  Settings,
  Zap,
  List,
  Compass,
  ChevronRight,
  ShieldCheck,
  Activity,
  X,
} from 'lucide-react';
import { useCampus } from '../../context/CampusContext';

export interface OrbitalModule {
  id: string;
  label: string;
  shortLabel: string;
  path: string;
  icon: React.ElementType;
  badge?: number | string;
  category: 'core' | 'management';
  description: string;
  accentColor: string;
  pastelBg: string;
}

export const ORBITAL_MODULES: OrbitalModule[] = [
  {
    id: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    path: '/dashboard',
    icon: LayoutDashboard,
    category: 'core',
    description: 'Central campus operations & pulse',
    accentColor: '#E6E9FF',
    pastelBg: '#F2F4FF',
  },
  {
    id: 'incidents',
    label: 'Incidents & Complaints',
    shortLabel: 'Incidents',
    path: '/incidents',
    icon: AlertTriangle,
    badge: 24,
    category: 'core',
    description: '24 open tickets across facilities',
    accentColor: '#F8DCE8',
    pastelBg: '#FDF0F6',
  },
  {
    id: 'campus-3d',
    label: '3D Campus',
    shortLabel: '3D Twin',
    path: '/campus-3d',
    icon: Building2,
    category: 'core',
    description: 'Interactive digital twin & facilities',
    accentColor: '#E9DDFB',
    pastelBg: '#F4EDFE',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    shortLabel: 'Work Orders',
    path: '/maintenance',
    icon: Wrench,
    category: 'core',
    description: 'Work orders, tasks & scheduling',
    accentColor: '#FFE4CF',
    pastelBg: '#FFF2E7',
  },
  {
    id: 'inventory',
    label: 'Inventory & Assets',
    shortLabel: 'Inventory',
    path: '/inventory',
    icon: Package,
    badge: 3,
    category: 'core',
    description: 'Stock reserves, parts & depot',
    accentColor: '#D5F3E8',
    pastelBg: '#E9F9F2',
  },
  {
    id: 'bookings',
    label: 'Room Booking',
    shortLabel: 'Bookings',
    path: '/bookings',
    icon: CalendarDays,
    category: 'core',
    description: 'Lecture halls, labs & reservations',
    accentColor: '#E6E9FF',
    pastelBg: '#F2F4FF',
  },
  {
    id: 'spare-parts',
    label: 'Spare-Part Finder',
    shortLabel: 'Spare Parts',
    path: '/spare-parts',
    icon: Search,
    category: 'management',
    description: 'Locate components & workshop stores',
    accentColor: '#FFE4CF',
    pastelBg: '#FFF2E7',
  },
  {
    id: 'risk-radar',
    label: 'Predictive Risk Radar',
    shortLabel: 'Risk Radar',
    path: '/risk-radar',
    icon: Radar,
    category: 'management',
    description: 'AI anomaly forecasting & telemetry',
    accentColor: '#E9DDFB',
    pastelBg: '#F4EDFE',
  },
  {
    id: 'approvals',
    label: 'Approvals',
    shortLabel: 'Approvals',
    path: '/approvals',
    icon: CheckCircle2,
    badge: 3,
    category: 'management',
    description: '3 pending requisitions awaiting sign-off',
    accentColor: '#D5F3E8',
    pastelBg: '#E9F9F2',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    shortLabel: 'Analytics',
    path: '/analytics',
    icon: BarChart3,
    category: 'management',
    description: 'KPI reports, resolution rates & SLA',
    accentColor: '#E6E9FF',
    pastelBg: '#F2F4FF',
  },
  {
    id: 'settings',
    label: 'Settings',
    shortLabel: 'Settings',
    path: '/settings',
    icon: Settings,
    category: 'management',
    description: 'Campus config, profiles & telemetry',
    accentColor: '#E7E2DD',
    pastelBg: '#FAF7F1',
  },
];

interface CircularNavHubProps {
  onNavigate?: () => void;
  isMobileDrawer?: boolean;
}

export default function CircularNavHub({ onNavigate, isMobileDrawer = false }: CircularNavHubProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { setIsMobileMenuOpen } = useCampus();

  const [activeTier, setActiveTier] = useState<'all' | 'core' | 'management'>('all');
  const [hoveredModule, setHoveredModule] = useState<OrbitalModule | null>(null);
  const [navMode, setNavMode] = useState<'orbital' | 'list'>('orbital');

  // Find currently active module
  const currentActiveModule = useMemo(() => {
    return ORBITAL_MODULES.find((m) => m.path === location.pathname) || ORBITAL_MODULES[0];
  }, [location.pathname]);

  // Active module to display in center (hovered takes preview priority, else current active)
  const displayModule = hoveredModule || currentActiveModule;

  // Filter modules based on tier selection
  const displayedModules = useMemo(() => {
    if (activeTier === 'all') return ORBITAL_MODULES;
    return ORBITAL_MODULES.filter((m) => m.category === activeTier);
  }, [activeTier]);

  // Radius for orbital wheel
  const ORBIT_RADIUS = 118; // px
  const CENTER_X = 145;
  const CENTER_Y = 145;

  return (
    <div className="flex flex-col h-full text-white select-none">
      {/* ── 1. Top Brand Header ── */}
      <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
        <button
          onClick={() => {
            navigate('/dashboard');
            if (onNavigate) onNavigate();
          }}
          className="flex items-center gap-3 group text-left focus:outline-none"
        >
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(230,233,255,0.25)] transition-transform duration-300 group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #E6E9FF 0%, #E9DDFB 100%)' }}
          >
            <Zap size={20} className="text-[#24283B]" strokeWidth={2.5} />
          </div>
          <div>
            <span className="block font-space font-bold text-base tracking-tight text-white leading-none">
              CampusOps
            </span>
            <span className="block font-jakarta text-[10px] font-semibold text-[#D5F3E8] tracking-widest uppercase mt-1">
              Orbital Control Hub
            </span>
          </div>
        </button>

        {/* View mode toggle (Orbital Wheel vs List) */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.06] border border-white/[0.08]">
          <button
            onClick={() => setNavMode('orbital')}
            className={`p-1.5 rounded-lg transition-colors ${
              navMode === 'orbital' ? 'bg-[#E6E9FF] text-[#24283B]' : 'text-white/50 hover:text-white'
            }`}
            title="Circular Orbital View"
          >
            <Compass size={14} />
          </button>
          <button
            onClick={() => setNavMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              navMode === 'list' ? 'bg-[#E6E9FF] text-[#24283B]' : 'text-white/50 hover:text-white'
            }`}
            title="Detailed Module List"
          >
            <List size={14} />
          </button>

          {isMobileDrawer && (
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-white/50 hover:text-white ml-1"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Tier Filter Segment ── */}
      <div className="px-5 pt-3 pb-2 flex items-center justify-between gap-1">
        {[
          { key: 'all', label: 'All (11)' },
          { key: 'core', label: 'Core Ops' },
          { key: 'management', label: 'Management' },
        ].map((tier) => (
          <button
            key={tier.key}
            onClick={() => setActiveTier(tier.key as any)}
            className={`flex-1 py-1.5 px-2 rounded-xl font-jakarta text-[11px] font-semibold transition-all duration-200 text-center ${
              activeTier === tier.key
                ? 'bg-white/15 text-white shadow-sm border border-white/20'
                : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
            }`}
          >
            {tier.label}
          </button>
        ))}
      </div>

      {/* ── 3. Main Navigation Canvas ── */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col items-center justify-center min-h-[360px]">
        {navMode === 'orbital' ? (
          /* ── CIRCULAR ORBITAL WHEEL ── */
          <div className="relative w-[290px] h-[290px] flex items-center justify-center my-auto">
            {/* SVG Background Orbital Rings & Connection Rays */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 290 290"
              fill="none"
            >
              {/* Outer boundary ring */}
              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r={ORBIT_RADIUS}
                stroke="rgba(230, 233, 255, 0.12)"
                strokeWidth="1.5"
                strokeDasharray="3 4"
              />
              {/* Inner accent ring */}
              <circle
                cx={CENTER_X}
                cy={CENTER_Y}
                r={ORBIT_RADIUS - 32}
                stroke="rgba(233, 221, 251, 0.08)"
                strokeWidth="1"
              />

              {/* Active Beam ray from center to current active node */}
              {displayedModules.map((mod, idx) => {
                const total = displayedModules.length;
                const angleDeg = (idx / total) * 360 - 90;
                const angleRad = (angleDeg * Math.PI) / 180;
                const nodeX = CENTER_X + Math.cos(angleRad) * ORBIT_RADIUS;
                const nodeY = CENTER_Y + Math.sin(angleRad) * ORBIT_RADIUS;
                const isActive = mod.path === location.pathname;
                const isHovered = hoveredModule?.id === mod.id;

                if (isActive || isHovered) {
                  return (
                    <line
                      key={`ray-${mod.id}`}
                      x1={CENTER_X}
                      y1={CENTER_Y}
                      x2={nodeX}
                      y2={nodeY}
                      stroke={isActive ? '#E6E9FF' : '#E9DDFB'}
                      strokeWidth={isActive ? '2' : '1.5'}
                      strokeOpacity={isActive ? '0.6' : '0.4'}
                      strokeDasharray={isActive ? 'none' : '2 3'}
                    />
                  );
                }
                return null;
              })}
            </svg>

            {/* ── Center Operations Core ── */}
            <button
              onClick={() => {
                navigate('/dashboard');
                if (onNavigate) onNavigate();
              }}
              onMouseEnter={() => setHoveredModule(null)}
              className="relative z-10 w-[100px] h-[100px] rounded-full p-2 flex flex-col items-center justify-center text-center transition-all duration-300 group focus:outline-none"
              style={{
                background: 'radial-gradient(circle, #2A3047 0%, #1A1E2E 100%)',
                boxShadow:
                  '0 0 25px rgba(230, 233, 255, 0.18), inset 0 0 15px rgba(255, 255, 255, 0.08)',
                border: '1.5px solid rgba(230, 233, 255, 0.35)',
              }}
              title="Click to return to Main Overview Canvas"
            >
              {/* Breathing status halo */}
              <span className="absolute inset-0 rounded-full border border-[#D5F3E8]/40 animate-pulse-subtle" />

              {/* Dynamic Center Display */}
              <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-white/10 text-white mb-1 group-hover:scale-110 transition-transform">
                {React.createElement(displayModule.icon, { size: 16, strokeWidth: 2.2 })}
              </div>
              <span className="font-space font-bold text-[11px] leading-tight text-white max-w-[85px] truncate px-1">
                {displayModule.shortLabel}
              </span>
              <span className="font-jakarta text-[8px] font-semibold text-[#D5F3E8] uppercase tracking-wider mt-0.5">
                {displayModule.badge ? `${displayModule.badge} Alerts` : 'Online'}
              </span>
            </button>

            {/* ── Circular Orbital Module Nodes ── */}
            {displayedModules.map((mod, idx) => {
              const total = displayedModules.length;
              // Distribute evenly around 360°, offset by -90° so 1st item is at top (12 o'clock)
              const angleDeg = (idx / total) * 360 - 90;
              const angleRad = (angleDeg * Math.PI) / 180;

              // Node coordinates
              const nodeX = CENTER_X + Math.cos(angleRad) * ORBIT_RADIUS;
              const nodeY = CENTER_Y + Math.sin(angleRad) * ORBIT_RADIUS;

              const isActive = mod.path === location.pathname;
              const isHovered = hoveredModule?.id === mod.id;
              const Icon = mod.icon;

              return (
                <div
                  key={mod.id}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                  style={{
                    left: `${nodeX}px`,
                    top: `${nodeY}px`,
                  }}
                >
                  <NavLink
                    to={mod.path}
                    onClick={onNavigate}
                    onMouseEnter={() => setHoveredModule(mod)}
                    onMouseLeave={() => setHoveredModule(null)}
                    className={`relative w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 group ${
                      isActive
                        ? 'scale-115 text-[#24283B] shadow-[0_0_20px_rgba(230,233,255,0.7)]'
                        : isHovered
                        ? 'scale-110 text-white bg-white/20 border-white/40'
                        : 'text-white/60 bg-[#24283B]/90 border border-white/15 hover:text-white hover:bg-white/15'
                    }`}
                    style={{
                      backgroundColor: isActive ? mod.accentColor : undefined,
                      border: isActive
                        ? `2px solid ${mod.accentColor}`
                        : isHovered
                        ? '1.5px solid rgba(255,255,255,0.5)'
                        : '1px solid rgba(255,255,255,0.15)',
                    }}
                    title={`${mod.label} — ${mod.description}`}
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.4 : 1.9} />

                    {/* Badge on node */}
                    {mod.badge !== undefined && (
                      <span
                        className={`absolute -top-1 -right-1 px-1.5 min-w-[16px] h-4 rounded-full font-jakarta text-[9px] font-bold flex items-center justify-center shadow-sm ${
                          isActive
                            ? 'bg-[#BA3D6E] text-white'
                            : 'bg-[#F8DCE8] text-[#BA3D6E] border border-white/20'
                        }`}
                      >
                        {mod.badge}
                      </span>
                    )}

                    {/* Active pulse ring */}
                    {isActive && (
                      <span className="absolute -inset-1 rounded-full border border-white/40 animate-ping pointer-events-none" />
                    )}
                  </NavLink>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── ACCESSIBLE LIST VIEW FALLBACK ── */
          <div className="w-full space-y-1 py-1">
            {displayedModules.map((mod) => {
              const isActive = mod.path === location.pathname;
              const Icon = mod.icon;
              return (
                <NavLink
                  key={mod.id}
                  to={mod.path}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-[#E6E9FF]/20 to-[#E9DDFB]/10 text-white border-l-3 border-[#E6E9FF] font-semibold shadow-inner'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      isActive ? 'bg-[#E6E9FF] text-[#24283B]' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.3 : 1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-jakarta text-[13px] truncate">{mod.label}</p>
                    <p className="font-jakarta text-[10px] text-white/40 truncate">{mod.description}</p>
                  </div>
                  {mod.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full font-jakarta text-[10px] font-bold bg-[#F8DCE8]/20 text-[#F8DCE8]">
                      {mod.badge}
                    </span>
                  )}
                  <ChevronRight size={14} className="text-white/30 group-hover:translate-x-0.5 transition-transform" />
                </NavLink>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. Bottom Active Module Telemetry Card ── */}
      <div className="px-4 py-3 border-t border-white/[0.08] bg-black/20">
        <div className="p-3 rounded-2xl bg-white/[0.06] border border-white/[0.1] backdrop-blur-sm">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D5F3E8] animate-pulse-subtle" />
              <span className="font-jakarta text-[10px] font-bold uppercase tracking-wider text-[#D5F3E8]">
                Active Console Route
              </span>
            </div>
            <span className="font-space font-bold text-[11px] text-white/80">
              {currentActiveModule.category === 'core' ? 'Tier 1 Core' : 'Tier 2 Mgmt'}
            </span>
          </div>

          <p className="font-space font-bold text-[13px] text-white leading-tight truncate">
            {currentActiveModule.label}
          </p>
          <p className="font-jakarta text-[11px] text-white/50 mt-0.5 leading-snug line-clamp-1">
            {currentActiveModule.description}
          </p>

          <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-jakarta text-white/45">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-[#D5F3E8]" /> 98.4% System Integrity
            </span>
            <span className="flex items-center gap-1">
              <Activity size={12} className="text-[#E6E9FF]" /> 6 Staff Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

