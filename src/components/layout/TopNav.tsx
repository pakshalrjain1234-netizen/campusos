import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Search, Bell, ChevronDown, Menu, X, User, LogOut, RefreshCw, Users, Shield, Sparkles } from 'lucide-react';
import { useCampus } from '../../context/CampusContext';
import { useAuth } from '../../context/AuthContext';
import { AppRole } from '../../types/auth';
import { ROLE_LABELS, ROLE_BADGE_COLORS } from '../../utils/permissions';

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
  '/users': 'User & Access Governance',
  '/settings': 'Settings',
};

export default function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    unreadNotificationCount,
    setIsCommandPaletteOpen,
    setIsNotificationDrawerOpen,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useCampus();
  const { user, role, switchDemoRole, logout } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'CampusOps';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roles: AppRole[] = [
    'student_faculty',
    'technician',
    'department_manager',
    'facilities_administrator',
    'procurement_approver',
    'system_administrator',
  ];
  const badgeColor = ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS.student_faculty;

  const handleSignOut = async () => {
    setIsProfileOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header
      className="flex-shrink-0 flex items-center gap-3 sm:gap-4 px-4 sm:px-6 h-[68px] bg-white/80 backdrop-blur-md border-b border-[#E7E2DD] z-20"
      style={{ position: 'sticky', top: 0 }}
    >
      {/* Mobile sidebar hamburger toggle */}
      <button
        className="lg:hidden p-2 rounded-xl text-[#74788C] hover:bg-[#F6F0E5] hover:text-[#24283B] transition-colors cursor-pointer"
        onClick={() => setIsMobileMenuOpen((p: boolean) => !p)}
        title="Open navigation menu"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Page title with active operational badge */}
      <div className="flex items-center gap-2.5 min-w-0">
        <h1 className="font-space font-bold text-lg sm:text-xl text-[#24283B] tracking-tight truncate max-w-[200px] sm:max-w-none">
          {pageTitle}
        </h1>
        <span
          className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
          style={{
            backgroundColor: badgeColor.bg,
            color: badgeColor.text,
            borderColor: badgeColor.border,
          }}
        >
          <Shield size={11} />
          {role.toUpperCase()}
        </span>
      </div>

      <div className="flex-1" />

      {/* Mobile search icon button */}
      <button
        onClick={() => setIsCommandPaletteOpen(true)}
        className="md:hidden p-2.5 rounded-xl text-[#74788C] hover:bg-[#F6F0E5] hover:text-[#24283B] transition-colors"
        title="Search campus (Ctrl+K)"
      >
        <Search size={18} />
      </button>

      {/* Desktop Search bar */}
      <button
        onClick={() => setIsCommandPaletteOpen(true)}
        className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl border border-[#E7E2DD] bg-[#FAF7F1] hover:border-[#D8D1C8] hover:bg-white transition-all duration-200 min-w-[220px] text-left cursor-pointer"
      >
        <Search size={15} className="text-[#74788C] flex-shrink-0" />
        <span className="font-jakarta text-[13px] text-[#74788C] flex-1">Search campus…</span>
        <kbd className="font-jakarta text-[10px] font-semibold text-[#74788C] bg-[#E7E2DD] px-1.5 py-0.5 rounded-md">
          ⌘K
        </kbd>
      </button>

      {/* AI Copilot trigger button */}
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('campusops-toggle-copilot'));
        }}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 hover:from-indigo-500/20 hover:via-purple-500/20 hover:to-pink-500/20 border border-indigo-200/80 text-indigo-700 font-jakarta text-[12px] font-semibold transition-all shadow-sm cursor-pointer"
        title="Open AI Operations Copilot (Ctrl+J)"
      >
        <Sparkles size={15} className="text-indigo-600 animate-pulse" />
        <span className="hidden sm:inline">AI Copilot</span>
        <kbd className="hidden lg:inline font-mono text-[9px] px-1 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
          Ctrl+J
        </kbd>
      </button>

      {/* Notification bell */}
      <button
        onClick={() => setIsNotificationDrawerOpen(true)}
        className="relative p-2.5 rounded-xl text-[#74788C] hover:bg-[#F6F0E5] hover:text-[#24283B] transition-all duration-200 cursor-pointer"
        title="Notifications"
      >
        <Bell size={19} />
        {unreadNotificationCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#BA3D6E] text-white font-jakarta font-bold text-[9px] flex items-center justify-center">
            {unreadNotificationCount}
          </span>
        )}
      </button>

      {/* User profile menu */}
      <div className="relative" ref={profileRef}>
        <button
          onClick={() => setIsProfileOpen((p) => !p)}
          className="flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-xl hover:bg-[#F6F0E5] transition-all duration-200 cursor-pointer"
        >
          <img
            src={
              user?.avatarUrl ||
              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || 'User')}`
            }
            alt={user?.fullName || 'User'}
            className="w-8 h-8 rounded-full object-cover border-2 border-[#E6E9FF]"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=CO`;
            }}
          />
          <div className="hidden sm:block text-left">
            <p className="font-jakarta font-semibold text-[13px] text-[#24283B] leading-none">
              {user?.fullName || 'Staff Member'}
            </p>
            <p className="font-jakarta text-[10px] text-[#74788C] mt-0.5 leading-none max-w-[140px] truncate">
              {ROLE_LABELS[role]}
            </p>
          </div>
          <ChevronDown size={14} className="text-[#74788C]" />
        </button>

        {isProfileOpen && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-[0_16px_40px_-4px_rgba(36,40,59,0.14)] border border-[#E7E2DD] py-2 z-50 animate-in fade-in zoom-in-95">
            {/* User info */}
            <div className="px-4 py-3 border-b border-[#E7E2DD]">
              <div className="flex items-center gap-3">
                <img
                  src={
                    user?.avatarUrl ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || 'User')}`
                  }
                  alt={user?.fullName || 'User'}
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <p className="font-space font-bold text-sm text-[#24283B] truncate">
                    {user?.fullName || 'Staff Member'}
                  </p>
                  <p className="font-jakarta text-xs text-[#74788C] truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Authenticated Department & Role Details */}
            <div className="px-4 py-3 border-b border-[#E7E2DD] bg-[#FAF7F1]/60">
              <p className="font-jakarta text-[10px] font-bold uppercase tracking-wider text-[#74788C] mb-1">
                Assigned Department
              </p>
              <p className="font-space font-bold text-xs text-[#24283B]">
                {user?.departmentName || 'Central Operations Directorate'}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2E8B67]" />
                <span className="font-jakarta text-[11px] text-[#2E8B67] font-semibold">
                  Verified Database Session
                </span>
              </div>
            </div>

            {/* Profile actions & Sign Out */}
            <div className="px-2 py-1.5 space-y-1">
              {(role === 'system_administrator' || role === 'coo') && (
                <button
                  onClick={() => {
                    navigate('/users');
                    setIsProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#4A5AA0] hover:bg-[#E6E9FF] transition font-jakarta text-xs font-bold cursor-pointer"
                >
                  <Users size={15} />
                  <span>User & Access Governance</span>
                </button>
              )}

              <button
                onClick={() => {
                  navigate('/settings');
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#24283B] hover:bg-[#FAF7F1] transition font-jakarta text-xs font-semibold cursor-pointer"
              >
                <User size={15} className="text-[#74788C]" />
                <span>Account Settings</span>
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[#BA3D6E] hover:bg-[#FDF0F6] transition font-jakarta text-xs font-bold cursor-pointer"
              >
                <LogOut size={15} />
                <span>Sign Out of Operations</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
