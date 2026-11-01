import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MOBILE_BOTTOM_ITEMS } from './navItems';

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="CampusOps Mobile Navigation"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] z-40 flex items-center justify-around rounded-full p-1.5 shadow-[0_12px_36px_rgba(104,120,202,0.2)] backdrop-blur-2xl md:hidden border border-white/90 bg-[#FAF7F2]/95 text-[#24283B] transition-all"
    >
      {MOBILE_BOTTOM_ITEMS.map((item) => {
        const isActive =
          item.to === '/dashboard'
            ? location.pathname === '/dashboard' || location.pathname === '/'
            : location.pathname === item.to;
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className={`group relative flex min-w-[56px] min-h-[44px] flex-1 flex-col items-center justify-center rounded-full py-1 text-[10px] font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-gradient-to-r from-white via-[#F8F1FC] to-[#ECE0F7] text-[#24283B] border border-white/90 shadow-[0_4px_14px_rgba(104,120,202,0.2)]'
                : 'text-[#74788C] hover:text-[#24283B]'
            }`}
          >
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform ${
                isActive
                  ? 'bg-gradient-to-br from-[#6878CA] to-[#4A5AA0] text-white shadow-xs scale-105'
                  : `${item.iconBg} ${item.iconColor} group-hover:scale-105`
              }`}
            >
              <Icon size={14} className={isActive ? 'text-white' : item.iconColor} />
            </div>
            <span
              className={`mt-0.5 truncate tracking-tight text-[9px] font-space ${
                isActive ? 'font-bold text-[#24283B]' : 'text-[#74788C]'
              }`}
            >
              {item.shortLabel}
            </span>
            {item.badge && !isActive && (
              <span className="absolute top-1 right-3 h-1.5 w-1.5 rounded-full bg-[#BA3D6E]" />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

