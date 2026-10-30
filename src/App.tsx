import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CampusProvider } from './context/CampusContext';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import Campus3DPage from './pages/Campus3DPage';
import MaintenancePage from './pages/MaintenancePage';
import InventoryPage from './pages/InventoryPage';
import BookingsPage from './pages/BookingsPage';
import SparePartsPage from './pages/SparePartsPage';
import RiskRadarPage from './pages/RiskRadarPage';
import ApprovalsPage from './pages/ApprovalsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import CommandPalette from './components/ui/CommandPalette';
import ReportIncidentModal from './components/modals/ReportIncidentModal';
import CreateWorkOrderModal from './components/modals/CreateWorkOrderModal';
import CreateBookingModal from './components/modals/CreateBookingModal';
import ReportDisruptionModal from './components/modals/ReportDisruptionModal';
import ReallocateBookingModal from './components/modals/ReallocateBookingModal';
import ToastNotification from './components/ui/ToastNotification';
import NotificationDrawer from './components/ui/NotificationDrawer';
import GlobalErrorBoundary from './components/ui/GlobalErrorBoundary';

export default function App() {
  return (
    <GlobalErrorBoundary>
      <CampusProvider>
      {/* Global overlays – always mounted */}
      <CommandPalette />
      <ReportIncidentModal />
      <CreateWorkOrderModal />
      <CreateBookingModal />
      <ReportDisruptionModal />
      <ReallocateBookingModal />
      <NotificationDrawer />
      <ToastNotification />

      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/campus-3d" element={<Campus3DPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/bookings" element={<BookingsPage />} />
          <Route path="/spare-parts" element={<SparePartsPage />} />
          <Route path="/risk-radar" element={<RiskRadarPage />} />
          <Route path="/approvals" element={<ApprovalsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </CampusProvider>
  </GlobalErrorBoundary>
  );
}

