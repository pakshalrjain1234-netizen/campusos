import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Sparkles,
  Zap,
  RefreshCw,
  LogOut,
  Users,
} from 'lucide-react';
import { CAMPUS_NAV_ITEMS, CampusNavItemConfig } from './navItems';
import { useAuth } from '../../context/AuthContext';
import { AppRole } from '../../types/auth';
import { ROLE_LABELS } from '../../utils/permissions';

interface CurvedPastelSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigateItem?: () => void;
}

export function CurvedPastelSidebar({
  isCollapsed,
  onToggleCollapse,
  onNavigateItem,
}: CurvedPastelSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, switchDemoRole, logout } = useAuth();

  const [isArcMode, setIsArcMode] = useState<boolean>(true);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const [isWheelScrolling, setIsWheelScrolling] = useState<boolean>(false);
  const isWheelScrollingRef = useRef<boolean>(false);
  const targetOffsetRef = useRef<number>(0);
  const currentOffsetRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const wheelSettleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isExpanded = !isCollapsed || isHovered;
  const isExpandedRef = useRef<boolean>(isExpanded);
  const isArcModeRef = useRef<boolean>(isArcMode);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  useEffect(() => {
    isArcModeRef.current = isArcMode;
  }, [isArcMode]);

  // Filter items based on current authenticated role
  const visibleNavItems = useMemo(() => {
    return CAMPUS_NAV_ITEMS.filter(
      (item) => !item.allowedRoles || item.allowedRoles.includes(role)
    );
  }, [role]);

  // Check active navigation item
  const isItemActive = useCallback(
    (item: CampusNavItemConfig) => {
      if (item.to === '/dashboard') {
        return location.pathname === '/dashboard' || location.pathname === '/';
      }
      return location.pathname === item.to;
    },
    [location.pathname]
  );

  const activeIndex = useMemo(() => {
    const idx = visibleNavItems.findIndex(isItemActive);
    return idx >= 0 ? idx : 0;
  }, [visibleNavItems, isItemActive]);

  const [rotationOffset, setRotationOffset] = useState<number>(activeIndex);
  const rotationOffsetRef = useRef<number>(activeIndex);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartYRef = useRef<number>(0);
  const dragStartOffsetRef = useRef<number>(0);
  const navContainerRef = useRef<HTMLElement>(null);
  const isPointerDownRef = useRef<boolean>(false);
  const hasDraggedRef = useRef<boolean>(false);
  const pointerIdRef = useRef<number | null>(null);
  const activeTargetRef = useRef<HTMLElement | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  }, []);

  // Keep rotationOffsetRef in sync with state
  useEffect(() => {
    rotationOffsetRef.current = rotationOffset;
  }, [rotationOffset]);

  // Synchronize arc position with active route when not dragging or wheeling
  useEffect(() => {
    if (!isDragging && !isWheelScrollingRef.current) {
      setRotationOffset(activeIndex);
      targetOffsetRef.current = activeIndex;
      currentOffsetRef.current = activeIndex;
      rotationOffsetRef.current = activeIndex;
    }
  }, [activeIndex, isDragging]);

  // Stop any active wheel-driven animation or snapping timer
  const stopWheelAnimation = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (wheelSettleTimerRef.current !== null) {
      clearTimeout(wheelSettleTimerRef.current);
      wheelSettleTimerRef.current = null;
    }
    isWheelScrollingRef.current = false;
    setIsWheelScrolling(false);
  }, []);

  // Smooth lerp animation loop for wheel scrolling along the circular arc
  const animateWheel = useCallback(() => {
    const current = currentOffsetRef.current;
    const target = targetOffsetRef.current;
    const diff = target - current;

    if (Math.abs(diff) > 0.002) {
      // Lerp with 0.16 damping factor gives a responsive, buttery ease-out at 60/120Hz
      const next = current + diff * 0.16;
      currentOffsetRef.current = next;
      rotationOffsetRef.current = next;
      setRotationOffset(next);
      rafIdRef.current = requestAnimationFrame(animateWheel);
    } else {
      // Settled on target
      currentOffsetRef.current = target;
      rotationOffsetRef.current = target;
      setRotationOffset(target);
      rafIdRef.current = null;

      if (!wheelSettleTimerRef.current) {
        isWheelScrollingRef.current = false;
        setIsWheelScrolling(false);
      }
    }
  }, []);

  // Pointer drag gestures
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isExpanded) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    stopWheelAnimation();
    isPointerDownRef.current = true;
    hasDraggedRef.current = false;
    dragStartYRef.current = e.clientY;
    dragStartOffsetRef.current = rotationOffset;
    pointerIdRef.current = e.pointerId;
    activeTargetRef.current = e.currentTarget as HTMLElement;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    const deltaY = e.clientY - dragStartYRef.current;
    if (!hasDraggedRef.current && Math.abs(deltaY) > 6) {
      hasDraggedRef.current = true;
      setIsDragging(true);
      if (activeTargetRef.current && pointerIdRef.current !== null) {
        try {
          activeTargetRef.current.setPointerCapture(pointerIdRef.current);
        } catch {
          // ignore
        }
      }
    }
    if (hasDraggedRef.current) {
      const rawOffset = dragStartOffsetRef.current - deltaY / 52;
      const clamped = Math.max(0, Math.min(visibleNavItems.length - 1, rawOffset));
      targetOffsetRef.current = clamped;
      currentOffsetRef.current = clamped;
      rotationOffsetRef.current = clamped;
      setRotationOffset(clamped);
    }
  };

  const handlePointerUp = () => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    if (hasDraggedRef.current) {
      setIsDragging(false);
      if (activeTargetRef.current && pointerIdRef.current !== null) {
        try {
          activeTargetRef.current.releasePointerCapture(pointerIdRef.current);
        } catch {
          // ignore
        }
      }
      setRotationOffset((curr) => {
        const snapped = Math.max(0, Math.min(visibleNavItems.length - 1, Math.round(curr)));
        targetOffsetRef.current = snapped;
        currentOffsetRef.current = snapped;
        rotationOffsetRef.current = snapped;
        return snapped;
      });
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 50);
    }
    pointerIdRef.current = null;
    activeTargetRef.current = null;
  };

  const handleContainerClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Dedicated non-passive native wheel listener:
  // 1. Strictly intercepts and stops wheel events from reaching or scrolling the right dashboard.
  // 2. When expanded in arc view, drives smooth, continuous circular motion along the navigation arc.
  // 3. When collapsed, allows compact list scrolling if needed while strictly keeping dashboard isolated.
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // Isolate the dashboard on the right: never allow background page scrolling from the sidebar
      e.preventDefault();
      e.stopPropagation();

      // If sidebar is in collapsed rail mode or list view fallback
      if (!isExpandedRef.current || !isArcModeRef.current) {
        if (navContainerRef.current) {
          navContainerRef.current.scrollTop += e.deltaY;
        }
        return;
      }

      // Sidebar is expanded in Circular Arc mode:
      // Normalize wheel delta across various input devices (pixels, lines, pages)
      let delta = e.deltaY;
      if (e.deltaMode === 1) {
        delta *= 24;
      } else if (e.deltaMode === 2) {
        delta *= 300;
      }

      // Initialize wheel scrolling mode
      if (!isWheelScrollingRef.current) {
        isWheelScrollingRef.current = true;
        setIsWheelScrolling(true);
        currentOffsetRef.current = rotationOffsetRef.current;
        targetOffsetRef.current = rotationOffsetRef.current;
      }

      // Sensitivity: ~100px wheel delta moves ~0.8 items along the arc smoothly
      const SENSITIVITY = 0.008;
      const maxIndex = visibleNavItems.length - 1;
      const nextTarget = targetOffsetRef.current + delta * SENSITIVITY;
      targetOffsetRef.current = Math.max(0, Math.min(maxIndex, nextTarget));

      // Kick off requestAnimationFrame if not already running
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(animateWheel);
      }

      // Settle timer: after the user pauses wheeling for 140ms,
      // snap target smoothly to the nearest whole item for a crisp, magnetic rest at the arc apex.
      if (wheelSettleTimerRef.current !== null) {
        clearTimeout(wheelSettleTimerRef.current);
      }
      wheelSettleTimerRef.current = setTimeout(() => {
        wheelSettleTimerRef.current = null;
        const snapped = Math.round(targetOffsetRef.current);
        targetOffsetRef.current = Math.max(0, Math.min(maxIndex, snapped));

        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(animateWheel);
        }
      }, 140);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      stopWheelAnimation();
    };
  }, [visibleNavItems.length, animateWheel, stopWheelAnimation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    stopWheelAnimation();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      rotateNext();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      rotatePrev();
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      setRotationOffset((c) => {
        const next = Math.min(visibleNavItems.length - 1, Math.round(c) + 3);
        targetOffsetRef.current = next;
        currentOffsetRef.current = next;
        rotationOffsetRef.current = next;
        return next;
      });
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      setRotationOffset((c) => {
        const next = Math.max(0, Math.round(c) - 3);
        targetOffsetRef.current = next;
        currentOffsetRef.current = next;
        rotationOffsetRef.current = next;
        return next;
      });
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetOffsetRef.current = 0;
      currentOffsetRef.current = 0;
      rotationOffsetRef.current = 0;
      setRotationOffset(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = visibleNavItems.length - 1;
      targetOffsetRef.current = last;
      currentOffsetRef.current = last;
      rotationOffsetRef.current = last;
      setRotationOffset(last);
    }
  };

  const rotatePrev = () => {
    stopWheelAnimation();
    setRotationOffset((c) => {
      const next = Math.max(0, Math.round(c) - 1);
      targetOffsetRef.current = next;
      currentOffsetRef.current = next;
      rotationOffsetRef.current = next;
      return next;
    });
  };

  const rotateNext = () => {
    stopWheelAnimation();
    setRotationOffset((c) => {
      const next = Math.min(visibleNavItems.length - 1, Math.round(c) + 1);
      targetOffsetRef.current = next;
      currentOffsetRef.current = next;
      rotationOffsetRef.current = next;
      return next;
    });
  };

  const roles: AppRole[] = [
    'student_faculty',
    'technician',
    'department_manager',
    'facilities_administrator',
    'procurement_approver',
    'system_administrator',
  ];

  return (
    <aside
      ref={sidebarRef}
      aria-label="CampusOps Circular Navigation"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsRoleDropdownOpen(false);
        stopWheelAnimation();
        setRotationOffset((curr) => {
          const snapped = Math.max(0, Math.min(visibleNavItems.length - 1, Math.round(curr)));
          targetOffsetRef.current = snapped;
          currentOffsetRef.current = snapped;
          rotationOffsetRef.current = snapped;
          return snapped;
        });
      }}
      className={`fixed inset-y-0 left-0 flex flex-col z-30 transition-all duration-300 ease-out select-none ${
        !isExpanded ? 'w-20' : 'w-[290px] xl:w-[310px] shadow-[0_16px_48px_rgba(104,120,202,0.22)]'
      }`}
    >
      {/* ============================================================== */}
      {/* 1. SCULPTED ORGANIC CURVED PASTEL GLASS BACKGROUND             */}
      {/* ============================================================== */}
      {isExpanded ? (
        <div className="absolute inset-0 pointer-events-none -z-10 overflow-visible">
          <svg
            className="w-full h-full overflow-visible drop-shadow-[0_12px_32px_rgba(104,120,202,0.18)]"
            preserveAspectRatio="none"
            viewBox="0 0 300 1000"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="sidebarGlassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.96" />
                <stop offset="25%" stopColor="#FAF7F2" stopOpacity="0.92" />
                <stop offset="65%" stopColor="#F2EDFF" stopOpacity="0.88" />
                <stop offset="100%" stopColor="#E9DDFB" stopOpacity="0.95" />
              </linearGradient>

              <linearGradient id="pearlShine" x1="20%" y1="20%" x2="80%" y2="80%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#EDE2F8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#D8C2F0" stopOpacity="0.75" />
              </linearGradient>

              <linearGradient id="mintPearlShine" x1="20%" y1="20%" x2="80%" y2="80%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#D5F3E8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#A7F3D0" stopOpacity="0.75" />
              </linearGradient>

              <linearGradient id="arcAxisGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6878CA" stopOpacity="0.05" />
                <stop offset="20%" stopColor="#6878CA" stopOpacity="0.35" />
                <stop offset="50%" stopColor="#966FD6" stopOpacity="0.55" />
                <stop offset="80%" stopColor="#6878CA" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#6878CA" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            <path
              d="M 0,0 L 255,0 C 290,120 315,320 305,520 C 292,720 272,870 255,1000 L 0,1000 Z"
              fill="url(#sidebarGlassGrad)"
              stroke="rgba(255, 255, 255, 0.95)"
              strokeWidth="1.5"
            />
            <path
              d="M 252,2 C 286,122 311,320 301,520 C 288,720 268,870 252,998"
              fill="none"
              stroke="rgba(255, 255, 255, 0.7)"
              strokeWidth="0.8"
            />

            <circle cx="282" cy="115" r="7" fill="url(#pearlShine)" filter="drop-shadow(0 2px 6px rgba(104,120,202,0.2))" />
            <circle cx="286" cy="112" r="2.2" fill="#FFFFFF" opacity="0.9" />

            <circle cx="310" cy="330" r="10" fill="url(#pearlShine)" filter="drop-shadow(0 3px 8px rgba(104,120,202,0.22))" />
            <circle cx="314" cy="326" r="3.2" fill="#FFFFFF" opacity="0.9" />

            <circle cx="304" cy="540" r="6.5" fill="url(#mintPearlShine)" filter="drop-shadow(0 2px 6px rgba(46,139,103,0.2))" />
            <circle cx="306" cy="538" r="2" fill="#FFFFFF" opacity="0.9" />

            <circle cx="280" cy="740" r="8.5" fill="url(#pearlShine)" filter="drop-shadow(0 2px 6px rgba(104,120,202,0.2))" />
            <circle cx="283" cy="737" r="2.5" fill="#FFFFFF" opacity="0.9" />
          </svg>
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-none -z-10 rounded-r-3xl bg-white/90 backdrop-blur-2xl border-r border-[#E7E2DD] shadow-[0_8px_32px_rgba(104,120,202,0.12)]" />
      )}

      {/* ============================================================== */}
      {/* 2. BRAND HEADER WITH CAMPUS EMBLEM & COLLAPSE CONTROLS        */}
      {/* ============================================================== */}
      <div className={`pt-5 pb-2 transition-all ${!isExpanded ? 'px-2 flex flex-col items-center' : 'px-5'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                navigate('/dashboard');
                onNavigateItem?.();
              }}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FAF5FF] via-[#EDE4F9] to-[#DFD0EF] text-[#6878CA] border border-white shadow-[0_4px_14px_rgba(104,120,202,0.22)] group focus:outline-none"
              title="Return to Campus Overview"
            >
              <Zap size={21} className="text-[#6878CA] group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#BA3D6E] text-[8px] font-black text-white shadow-sm">
                3D
              </span>
            </button>

            {isExpanded && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-space font-bold text-base text-[#24283B] tracking-tight">
                    CAMPUSOPS
                  </span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2E8B67] animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 font-jakarta text-[10px] font-semibold text-[#74788C]">
                  <span>CampusOps</span>
                  <span className="h-1 w-1 rounded-full bg-[#D8D1C8]" />
                  <span className="uppercase text-[9px] font-bold text-[#6878CA]">
                    {role.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={!isExpanded ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
            title={!isExpanded ? 'Expand navigation' : 'Collapse navigation'}
            className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/70 hover:bg-white text-[#74788C] hover:text-[#24283B] transition border border-white/80 shadow-sm cursor-pointer"
          >
            {!isExpanded ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. ROTATABLE CIRCULAR NAVIGATION ARC (ROLE-SCOPED)             */}
      {/* ============================================================== */}
      {isExpanded && (
        <div className="px-5 pt-1 pb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-[#74788C]">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6878CA] animate-pulse" />
            <span>Circular Arc Navigation</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsArcMode((m) => !m)}
              className="text-[9px] font-bold text-[#6878CA] hover:underline cursor-pointer"
              title="Toggle between Circular Arc layout and Standard List layout"
            >
              {isArcMode ? 'Arc View' : 'List View'}
            </button>
            <span className="text-[#C8D0FA]">•</span>
            <span className="font-bold text-[#6878CA]">{visibleNavItems.length}</span>
          </div>
        </div>
      )}

      {/* Navigation Arc Container */}
      <nav
        ref={navContainerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Main Campus Navigation"
        className={`relative flex-1 min-h-0 flex flex-col focus:outline-none ${
          !isExpanded ? 'px-2 py-2 overflow-y-auto' : 'px-3 xl:px-4'
        }`}
      >
        {!isExpanded ? (
          /* Compact Rail Navigation */
          <div className="space-y-2 py-1">
            {visibleNavItems.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigateItem}
                  title={`${item.label} — ${item.subtitle}`}
                  aria-label={item.label}
                  className={`relative flex h-11 w-11 items-center justify-center mx-auto rounded-2xl transition-all duration-200 ${
                    active
                      ? 'bg-gradient-to-br from-[#6878CA] to-[#4A5AA0] text-white shadow-[0_4px_16px_rgba(104,120,202,0.35)]'
                      : 'bg-white/70 hover:bg-white text-[#74788C] hover:text-[#24283B] border border-white/80 shadow-sm'
                  }`}
                >
                  <Icon size={19} className={active ? 'text-white' : item.iconColor} />
                  {active && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#BA3D6E] border-2 border-white animate-pulse" />
                  )}
                  {item.badge && !active && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#BA3D6E] text-[8px] font-bold text-white shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ) : !isArcMode ? (
          /* Detailed Module List View Fallback */
          <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-1.5 scrollbar-thin">
            {visibleNavItems.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNavigateItem}
                  className={`flex items-center gap-3 p-2 rounded-2xl transition-all ${
                    active
                      ? 'bg-gradient-to-r from-white via-[#F8F1FC] to-[#EDE2F8] border border-white shadow-sm'
                      : 'hover:bg-white/60 text-[#74788C] hover:text-[#24283B]'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                      active
                        ? 'bg-gradient-to-br from-[#6878CA] to-[#4A5AA0] text-white border-white'
                        : `${item.iconBg} ${item.iconBorder} ${item.iconColor}`
                    }`}
                  >
                    <Icon size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-[12px] truncate font-jakarta ${
                        active ? 'font-bold text-[#24283B]' : 'font-semibold text-[#24283B]'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-[10px] text-[#74788C] truncate">{item.subtitle}</p>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#E6E9FF] text-[#4A5AA0]">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ) : (
          /* Full Rotatable Circular Navigation Arc */
          <div className="relative flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-center pb-1">
              <button
                type="button"
                onClick={rotatePrev}
                disabled={rotationOffset <= 0.05}
                aria-label="Previous navigation modules"
                title="Rotate arc up"
                className={`flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                  rotationOffset <= 0.05
                    ? 'opacity-30 border-transparent text-slate-400 cursor-not-allowed'
                    : 'bg-white/80 hover:bg-white text-[#6878CA] border-white/90 shadow-sm hover:scale-105'
                }`}
              >
                <ChevronUp size={13} />
                <span>Prev</span>
              </button>
            </div>

            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onClickCapture={handleContainerClickCapture}
              style={{
                maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)',
              }}
              className={`relative flex-1 min-h-0 overflow-hidden cursor-grab active:cursor-grabbing touch-none select-none rounded-2xl ${
                isDragging ? 'cursor-grabbing' : ''
              }`}
            >
              <div className="absolute right-3 inset-y-0 w-44 pointer-events-none -z-0">
                <svg
                  className="w-full h-full overflow-visible"
                  preserveAspectRatio="none"
                  viewBox="0 0 160 400"
                  aria-hidden="true"
                >
                  <path
                    d="M 50,15 Q 150,200 50,385"
                    fill="none"
                    stroke="url(#arcAxisGrad)"
                    strokeWidth="1.5"
                    strokeDasharray="2 3"
                  />
                  <circle
                    cx={
                      50 +
                      100 *
                        (1 -
                          Math.pow(
                            (rotationOffset / (visibleNavItems.length - 1 || 1)) * 2 - 1,
                            2
                          ))
                    }
                    cy={25 + (350 * rotationOffset) / (visibleNavItems.length - 1 || 1)}
                    r="4"
                    fill="#6878CA"
                    opacity="0.8"
                    filter="drop-shadow(0 0 4px #A78BFA)"
                  />
                  <circle
                    cx={
                      50 +
                      100 *
                        (1 -
                          Math.pow(
                            (rotationOffset / (visibleNavItems.length - 1 || 1)) * 2 - 1,
                            2
                          ))
                    }
                    cy={25 + (350 * rotationOffset) / (visibleNavItems.length - 1 || 1)}
                    r="1.5"
                    fill="#FFFFFF"
                  />
                </svg>
              </div>

              <div className="relative w-full h-full">
                {visibleNavItems.map((item, idx) => {
                  const active = isItemActive(item);
                  const Icon = item.icon;
                  const diff = idx - rotationOffset;

                  // Configurable circular/elliptical geometry:
                  // 21 degrees angular step per item along the arc
                  const thetaDeg = diff * 21;
                  const thetaRad = (thetaDeg * Math.PI) / 180;

                  // Vertical coordinate calculated purely from angular position
                  const verticalOffset = Math.sin(thetaRad) * 185;

                  // Horizontal coordinate calculated purely from angular position:
                  // At the apex (diff = 0), horizontalOffset is 0 (furthest to the right).
                  // As distance from apex increases, items progressively curve inward
                  // to the left by up to 88px, matching the SVG glass backdrop curve.
                  const horizontalOffset = -160 * (1 - Math.cos(thetaRad));

                  // Perspective scaling and opacity along the curved trajectory
                  const scale = Math.max(0.76, 1 - 0.06 * Math.abs(diff));
                  const opacity = Math.max(0.08, 1 - 0.24 * Math.abs(diff));
                  const centerY = 'calc(50% - 24px)';

                  return (
                    <div
                      key={item.to}
                      style={{
                        position: 'absolute',
                        top: centerY,
                        right: 16,
                        width: 212,
                        transform: `translate3d(${horizontalOffset.toFixed(2)}px, ${verticalOffset.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`,
                        transformOrigin: 'right center',
                        opacity,
                        zIndex: active ? 20 : 10 - Math.min(9, Math.round(Math.abs(diff))),
                        transition:
                          isDragging || isWheelScrolling || prefersReducedMotion
                            ? 'none'
                            : 'transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.24s ease',
                      }}
                      className="pr-1"
                    >
                      <NavLink
                        to={item.to}
                        onClick={() => {
                          stopWheelAnimation();
                          targetOffsetRef.current = idx;
                          currentOffsetRef.current = idx;
                          rotationOffsetRef.current = idx;
                          setRotationOffset(idx);
                          onNavigateItem?.();
                        }}
                        className={`group relative flex items-center gap-3 rounded-2xl p-2 transition-all duration-200 ${
                          active
                            ? 'bg-gradient-to-r from-white/95 via-[#F8F1FC]/90 to-[#EDE2F8]/85 border border-white/95 shadow-[0_8px_20px_-4px_rgba(104,120,202,0.22),0_2px_6px_rgba(104,120,202,0.08)]'
                            : 'border border-transparent hover:border-white/70 hover:bg-white/55 text-[#74788C] hover:text-[#24283B]'
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 ${
                            active
                              ? 'bg-gradient-to-br from-[#6878CA] to-[#4A5AA0] border-white text-white shadow-[0_4px_12px_rgba(104,120,202,0.32)]'
                              : `${item.iconBg} ${item.iconBorder} ${item.iconColor} shadow-sm group-hover:scale-105`
                          }`}
                        >
                          <Icon size={17} className={active ? 'text-white' : item.iconColor} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[12px] truncate font-space ${
                                active ? 'font-bold text-[#24283B]' : 'font-semibold text-[#24283B]'
                              }`}
                            >
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="rounded-full bg-[#E6E9FF] text-[#4A5AA0] border border-[#C8D0FA] px-1.5 py-0.2 text-[8px] font-bold">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[10px] truncate font-jakarta ${
                              active ? 'font-medium text-[#6878CA]' : 'text-[#74788C]'
                            }`}
                          >
                            {item.subtitle}
                          </div>
                        </div>

                        {active && (
                          <div className="shrink-0 pr-1" aria-hidden="true">
                            <Sparkles size={14} className="text-[#C06B33] animate-pulse" />
                          </div>
                        )}
                      </NavLink>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-center pt-1">
              <button
                type="button"
                onClick={rotateNext}
                disabled={rotationOffset >= visibleNavItems.length - 1.05}
                aria-label="Next navigation modules"
                title="Rotate arc down"
                className={`flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                  rotationOffset >= visibleNavItems.length - 1.05
                    ? 'opacity-30 border-transparent text-slate-400 cursor-not-allowed'
                    : 'bg-white/80 hover:bg-white text-[#6878CA] border-white/90 shadow-sm hover:scale-105'
                }`}
              >
                <span>Next</span>
                <ChevronDown size={13} />
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ============================================================== */}
      {/* 4. FOOTER: TELEMETRY PULSE & PROFILE ROLE SWITCHER            */}
      {/* ============================================================== */}
      <div className={`pb-4 pt-2 transition-all ${!isExpanded ? 'px-2 space-y-2' : 'px-4 pr-7 space-y-2'}`}>
        {isExpanded && (
          <div className="flex items-center justify-between rounded-xl bg-white/50 border border-white/80 px-2.5 py-1.5 text-[10px] shadow-sm">
            <span className="font-semibold text-[#74788C]">Campus Telemetry</span>
            <div className="flex items-center gap-1.5 min-w-0" title="98.4% System Integrity">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#2E8B67] animate-pulse" />
              <span className="font-medium text-[#24283B] truncate max-w-[130px]">
                98.4% Optimal
              </span>
            </div>
          </div>
        )}

        <div className="relative">
          <div
            className={`flex items-center gap-2.5 p-2 rounded-2xl bg-white/70 border border-white/90 shadow-sm ${
              !isExpanded ? 'justify-center p-2' : 'justify-between'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={
                  user?.avatarUrl ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.fullName || 'User')}`
                }
                alt={user?.fullName || 'User Profile'}
                className="w-8 h-8 rounded-xl object-cover border border-white shadow-xs shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=CO`;
                }}
              />
              {isExpanded && (
                <div className="min-w-0">
                  <p className="font-space font-bold text-[12px] text-[#24283B] truncate">
                    {user?.fullName || 'Campus Staff'}
                  </p>
                  <p className="font-jakarta text-[10px] text-[#74788C] truncate">
                    {ROLE_LABELS[role]}
                  </p>
                </div>
              )}
            </div>

            {isExpanded && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsRoleDropdownOpen((p) => !p)}
                  className="p-1.5 rounded-lg text-[#74788C] hover:text-[#24283B] hover:bg-white/80 transition"
                  title="Switch Persona Role"
                >
                  <RefreshCw size={13} />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    navigate('/login');
                  }}
                  className="p-1.5 rounded-lg text-[#BA3D6E] hover:bg-[#FDF0F6] transition"
                  title="Sign out of operations"
                >
                  <LogOut size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Role switcher dropdown popover */}
          {isRoleDropdownOpen && isExpanded && (
            <div className="absolute bottom-full left-0 right-0 mb-2 p-2 rounded-2xl bg-white border border-[#E7E2DD] shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
              <p className="font-jakarta text-[10px] font-bold uppercase tracking-wider text-[#74788C] px-2 py-1">
                Switch Operational Persona
              </p>
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    switchDemoRole(r);
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl font-jakarta text-[11px] transition ${
                    role === r
                      ? 'bg-[#E6E9FF] text-[#4A5AA0] font-bold'
                      : 'text-[#24283B] hover:bg-[#FAF7F1]'
                  }`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
              {(role === 'system_administrator' || role === 'coo') && (
                <div className="pt-1 mt-1 border-t border-[#E7E2DD]">
                  <button
                    onClick={() => {
                      navigate('/users');
                      setIsRoleDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[#4A5AA0] hover:bg-[#E6E9FF] font-jakarta text-[11px] font-bold"
                  >
                    <Users size={12} />
                    <span>Manage Staff Roles</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
