import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, Menu, X, User, LogOut, RefreshCw } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/incidents': 'Incidents & Complaints',
  '/campus-3d': '3D Campus',
  '/maintenance': 'Maintenance',
  '/inventory': 'Inventory & Assets',
  '/bookings': 'Room Booking',
  '/spare-parts': 'Spare-Part Finder',
  '/risk-radar': 'Predictive Risk Radar',
  '/approvals': 'Approvals',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export default function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    user,
    setUserRole,
    unreadNotificationCount,
    setIsCommandPaletteOpen,
    setIsNotificationDrawerOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
  } = useCampus();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'CampusOps';

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roles: typeof user.role[] = [
    'Chief Operations Officer',
    'Director of Facilities',
    'Lead Maintenance Engineer',
    'Student Affairs Liaison',
  ];

  return (
    <header
      className="flex-shrink-0 flex items-center gap-4 px-6 h-[68px] bg-white/80 backdrop-blur-md border-b border-[#E7E2DD] z-20"
      style={{ position: 'sticky', top: 0 }}
    >
      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden p-2 rounded-lg text-[#74788C] hover:bg-[#F6F0E5]"
        onClick={() => setIsSidebarCollapsed((p: boolean) => !p)}
      >
        {isSidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
      </button>

      {/* Page title */}
      <h1 className="font-space font-bold text-xl text-[#24283B] tracking-tight hidden sm:block">
        {pageTitle}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search bar → opens command palette */}
      <button
        onClick={() => setIsCommandPaletteOpen(true)}
        className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] hover:border-[#D8D1C8] hover:bg-white transition-all duration-200 min-w-[220px] text-left"
      >
        <Search size={15} className="text-[#74788C] flex-shrink-0" />
        <span className="font-jakarta text-[13px] text-[#74788C] flex-1">Search campus…</span>
        <kbd className="font-jakarta text-[10px] font-semibold text-[#74788C] bg-[#E7E2DD] px-1.5 py-0.5 rounded-md">
          ⌘K
        </kbd>
      </button>

      {/* Notification bell */}
      <button
        onClick={() => setIsNotificationDrawerOpen(true)}
        className="relative p-2.5 rounded-xl text-[#74788C] hover:bg-[#F6F0E5] hover:text-[#24283B] transition-all duration-200"
        title="Notifications"
      >
        <Bell size={19} />
        {unreadNotificationCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#BA3D6E] text-white font-jakarta font-bold text-[9px] flex items-center justify-center">
            {unreadNotificationCount}
          </span>
        )}
      </button>

      {/* Profile dropdown */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setIsProfileOpen((p) => !p)}
          className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-[#F6F0E5] transition-all duration-200"
        >
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover border-2 border-[#E6E9FF]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=E6E9FF&color=24283B';
            }}
          />
          <div className="hidden sm:block text-left">
            <p className="font-jakarta font-semibold text-[13px] text-[#24283B] leading-none">{user.name}</p>
            <p className="font-jakarta text-[10px] text-[#74788C] mt-0.5 leading-none max-w-[140px] truncate">{user.role}</p>
          </div>
          <ChevronDown size={14} className="text-[#74788C]" />
        </button>

        {isProfileOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-[0_16px_40px_-4px_rgba(36,40,59,0.12)] border border-[#E7E2DD] py-2 z-50">
            {/* User info */}
            <div className="px-4 py-3 border-b border-[#E7E2DD]">
              <div className="flex items-center gap-3">
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-xl object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=E6E9FF&color=24283B'; }} />
                <div>
                  <p className="font-space font-bold text-sm text-[#24283B]">{user.name}</p>
                  <p className="font-jakarta text-xs text-[#74788C]">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Switch role */}
            <div className="px-4 py-2 border-b border-[#E7E2DD]">
              <p className="font-jakarta text-[10px] font-semibold uppercase tracking-widest text-[#74788C] mb-2">
                Switch Role
              </p>
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => { setUserRole(role); setIsProfileOpen(false); navigate('/dashboard'); }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-[#F6F0E5] transition-colors mb-0.5 ${
                    user.role === role ? 'bg-[#E6E9FF]' : ''
                  }`}
                >
                  <RefreshCw size={12} className="text-[#74788C] flex-shrink-0" />
                  <span className="font-jakarta text-[12px] text-[#24283B]">{role}</span>
                </button>
              ))}
            </div>

            {/* Profile & Logout */}
            <div className="px-2 py-1.5">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#24283B] hover:bg-[#F6F0E5] transition-colors font-jakarta text-sm">
                <User size={15} className="text-[#74788C]" />
                My Profile
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#BA3D6E] hover:bg-[#FDF0F6] transition-colors font-jakarta text-sm">
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

