import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { useCampus } from '../../context/CampusContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: number | string;
  group: 'campus' | 'management';
}

const navItems: NavItem[] = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard, group: 'campus' },
  { label: 'Incidents', path: '/incidents', icon: AlertTriangle, badge: 24, group: 'campus' },
  { label: '3D Campus', path: '/campus-3d', icon: Building2, group: 'campus' },
  { label: 'Maintenance', path: '/maintenance', icon: Wrench, group: 'campus' },
  { label: 'Inventory & Assets', path: '/inventory', icon: Package, badge: 3, group: 'campus' },
  { label: 'Room Booking', path: '/bookings', icon: CalendarDays, group: 'campus' },
  { label: 'Spare-Part Finder', path: '/spare-parts', icon: Search, group: 'management' },
  { label: 'Risk Radar', path: '/risk-radar', icon: Radar, group: 'management' },
  { label: 'Approvals', path: '/approvals', icon: CheckCircle2, badge: 3, group: 'management' },
  { label: 'Analytics', path: '/analytics', icon: BarChart3, group: 'management' },
  { label: 'Settings', path: '/settings', icon: Settings, group: 'management' },
];

export default function Sidebar() {
  const { isSidebarCollapsed, setIsSidebarCollapsed, inventoryItems, approvals } = useCampus();
  const navigate = useNavigate();

  const toggle = () => setIsSidebarCollapsed((prev: boolean) => !prev);

  const lowStockCount = inventoryItems.filter((i) => i.currentStock <= i.minThreshold).length;
  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  const dynamicNavItems: NavItem[] = navItems.map((item) => {
    if (item.path === '/inventory') {
      return { ...item, badge: lowStockCount };
    }
    if (item.path === '/approvals') {
      return { ...item, badge: pendingApprovalsCount };
    }
    return item;
  });

  return (
    <aside
      className="fixed top-0 left-0 h-full z-30 flex flex-col transition-all duration-300 ease-in-out"
      style={{
        width: isSidebarCollapsed ? '72px' : '260px',
        background: 'linear-gradient(180deg, #24283B 0%, #1A1E2E 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center px-4 py-5 border-b border-white/[0.07]" style={{ minHeight: '72px' }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 group focus:outline-none"
        >
          {/* Logo mark */}
          <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #E6E9FF 0%, #E9DDFB 100%)' }}>
            <Zap size={18} className="text-[#24283B]" strokeWidth={2.5} />
          </div>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden">
              <span className="block text-white font-space font-bold text-base leading-none tracking-tight">
                CampusOps
              </span>
              <span className="block text-white/40 font-jakarta text-[10px] font-medium mt-0.5 uppercase tracking-widest">
                Operations Hub
              </span>
            </div>
          )}
        </button>

        {/* Live pulse indicator */}
        {!isSidebarCollapsed && (
          <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D5F3E8] animate-pulse-subtle" />
            <span className="font-jakarta text-[9px] text-white/30 uppercase tracking-widest">Live</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1 scrollbar-thin">
        {/* Campus HQ Group */}
        {!isSidebarCollapsed && (
          <p className="px-3 pb-1 pt-1 font-jakarta text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
            Campus HQ
          </p>
        )}

        {dynamicNavItems.filter(i => i.group === 'campus').map(item => (
          <NavItem key={item.path} item={item} collapsed={isSidebarCollapsed} />
        ))}

        {/* Divider */}
        <div className="my-3 mx-2 border-t border-white/[0.06]" />

        {/* Management Group */}
        {!isSidebarCollapsed && (
          <p className="px-3 pb-1 pt-1 font-jakarta text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
            Management
          </p>
        )}

        {dynamicNavItems.filter(i => i.group === 'management').map(item => (
          <NavItem key={item.path} item={item} collapsed={isSidebarCollapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/[0.07] p-3">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all duration-200 font-jakarta text-xs"
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isSidebarCollapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}

function NavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
          isActive
            ? 'bg-gradient-to-r from-[#E6E9FF]/15 to-[#E9DDFB]/10 text-white shadow-inner'
            : 'text-white/50 hover:text-white/85 hover:bg-white/[0.05]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator bar */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#E6E9FF]" />
          )}

          <Icon
            size={18}
            strokeWidth={isActive ? 2.2 : 1.8}
            className={`flex-shrink-0 transition-colors ${isActive ? 'text-[#E6E9FF]' : ''}`}
          />

          {!collapsed && (
            <span className={`flex-1 font-jakarta text-[13px] font-medium truncate ${isActive ? 'font-semibold' : ''}`}>
              {item.label}
            </span>
          )}

          {/* Badge */}
          {!collapsed && item.badge !== undefined && (
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full font-jakarta text-[10px] font-bold bg-[#F8DCE8]/20 text-[#F8DCE8]">
              {item.badge}
            </span>
          )}
          {collapsed && item.badge !== undefined && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F8DCE8]" />
          )}
        </>
      )}
    </NavLink>
  );
}

