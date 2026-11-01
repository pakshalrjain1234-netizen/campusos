import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CampusProvider, useCampus } from './context/CampusContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleGuard } from './components/auth/RoleGuard';
import AppLayout from './layouts/AppLayout';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage'));
const Campus3DPage = lazy(() => import('./pages/Campus3DPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const OccupancyPage = lazy(() => import('./pages/OccupancyPage'));
const SparePartsPage = lazy(() => import('./pages/SparePartsPage'));
const RiskRadarPage = lazy(() => import('./pages/RiskRadarPage'));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const UsersManagementPage = lazy(() => import('./pages/UsersManagementPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

import CommandPalette from './components/ui/CommandPalette';
import ReportIncidentModal from './components/modals/ReportIncidentModal';
import CreateWorkOrderModal from './components/modals/CreateWorkOrderModal';
import CreateBookingModal from './components/modals/CreateBookingModal';
import ReportDisruptionModal from './components/modals/ReportDisruptionModal';
import ReallocateBookingModal from './components/modals/ReallocateBookingModal';
import ToastNotification from './components/ui/ToastNotification';
import NotificationDrawer from './components/ui/NotificationDrawer';
import CampusCopilotDrawer from './components/copilot/CampusCopilotDrawer';
import GlobalErrorBoundary from './components/ui/GlobalErrorBoundary';

function GlobalOverlays() {
  const { isCopilotOpen, setIsCopilotOpen } = useCampus();

  return (
    <>
      <CommandPalette />
      <ReportIncidentModal />
      <CreateWorkOrderModal />
      <CreateBookingModal />
      <ReportDisruptionModal />
      <ReallocateBookingModal />
      <NotificationDrawer />
      <CampusCopilotDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
      <ToastNotification />
    </>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <CampusProvider>
          <GlobalOverlays />
          <Suspense fallback={<div role="status" className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">Loading CampusOps…</div>}>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected Application Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route element={<AppLayout />}>
                {/* Unrestricted for all authenticated operational roles */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/incidents" element={<IncidentsPage />} />
                <Route path="/campus-3d" element={<Campus3DPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/occupancy" element={<OccupancyPage />} />
                <Route path="/settings" element={<SettingsPage />} />

                {/* Operations & Technical Roles */}
                <Route
                  path="/maintenance"
                  element={
                    <RoleGuard
                      allowedRoles={[
                        'technician',
                        'department_manager',
                        'facilities_administrator',
                        'system_administrator',
                        'coo',
                        'director',
                        'engineer',
                      ]}
                    >
                      <MaintenancePage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/inventory"
                  element={
                    <RoleGuard
                      allowedRoles={[
                        'technician',
                        'department_manager',
                        'facilities_administrator',
                        'procurement_approver',
                        'system_administrator',
                        'coo',
                        'director',
                        'engineer',
                      ]}
                    >
                      <InventoryPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/spare-parts"
                  element={
                    <RoleGuard
                      allowedRoles={[
                        'technician',
                        'facilities_administrator',
                        'procurement_approver',
                        'system_administrator',
                        'coo',
                        'director',
                        'engineer',
                      ]}
                    >
                      <SparePartsPage />
                    </RoleGuard>
                  }
                />

                {/* Management & Strategic Analytics */}
                <Route
                  path="/risk-radar"
                  element={
                    <RoleGuard
                      allowedRoles={[
                        'department_manager',
                        'facilities_administrator',
                        'system_administrator',
                        'coo',
                        'director',
                      ]}
                    >
                      <RiskRadarPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <RoleGuard
                      allowedRoles={[
                        'department_manager',
                        'facilities_administrator',
                        'procurement_approver',
                        'system_administrator',
                        'coo',
                        'director',
                      ]}
                    >
                      <AnalyticsPage />
                    </RoleGuard>
                  }
                />

                {/* Approvals (Restricted to review roles and requisitioning staff) */}
                <Route
                  path="/approvals"
                  element={
                    <RoleGuard
                      allowedRoles={[
                        'technician',
                        'department_manager',
                        'facilities_administrator',
                        'procurement_approver',
                        'coo',
                        'director',
                        'engineer',
                      ]}
                    >
                      <ApprovalsPage />
                    </RoleGuard>
                  }
                />

                {/* Governance & Staff Administration (System Administrator only) */}
                <Route
                  path="/users"
                  element={
                    <RoleGuard allowedRoles={['system_administrator', 'coo']}>
                      <UsersManagementPage />
                    </RoleGuard>
                  }
                />
              </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </Suspense>
        </CampusProvider>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}
