import React from 'react';
import { useCampus } from '../../context/CampusContext';
import { CurvedPastelSidebar } from '../navigation/CurvedPastelSidebar';

export default function Sidebar() {
  const {
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
  } = useCampus();

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev: boolean) => !prev);
  };

  const handleCloseMobile = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* ── Mobile Backdrop for Slide-over Drawer ── */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#24283B]/50 backdrop-blur-sm md:hidden transition-opacity"
          onClick={handleCloseMobile}
        />
      )}

      {/* ── Desktop & Tablet Fixed Navigation ── */}
      <div className="hidden md:block">
        <CurvedPastelSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* ── Mobile Slide-over Drawer ── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-y-0 left-0 z-50 md:hidden animate-in slide-in-from-left duration-300">
          <CurvedPastelSidebar
            isCollapsed={false}
            onToggleCollapse={handleCloseMobile}
            onNavigateItem={handleCloseMobile}
          />
        </div>
      )}
    </>
  );
}
