import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import { useCampus } from '../context/CampusContext';

export default function AppLayout() {
  const { isSidebarCollapsed } = useCampus();

  return (
    <div className="flex h-screen bg-[#F6F0E5] overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className="flex flex-col flex-1 min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
        style={{ marginLeft: isSidebarCollapsed ? '72px' : '260px' }}
      >
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

