import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import { MobileBottomNav } from '../components/navigation/MobileBottomNav';
import { useCampus } from '../context/CampusContext';

export default function AppLayout() {
  const { isSidebarCollapsed } = useCampus();

  return (
    <div className="flex h-screen bg-[#F6F0E5] text-[#24283B] overflow-hidden select-none">
      {/* Curved Left-Side Circular Navigation */}
      <Sidebar />

      {/* Main content area */}
      <div
        className={`flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-out ml-0 md:ml-20 ${
          isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-[290px] xl:ml-[310px]'
        }`}
      >
        <TopNav />
        <main className="flex-1 min-h-0 min-w-0 overflow-y-auto pb-24 md:pb-0 scroll-smooth">
          <Outlet />
        </main>
      </div>

      {/* Mobile Floating Bottom Navigation Pill */}
      <MobileBottomNav />
    </div>
  );
}
