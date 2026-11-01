import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useRef } from 'react';
import { 
  Incident, 
  WorkOrder, 
  StockAlert, 
  RoomDisruption, 
  AIInsight, 
  ActivityItem, 
  ApprovalRequest, 
  Building,
  UserProfile,
  InventoryItem,
  StockTransaction,
  StockTransactionType,
  ProcurementRequest,
  ProcurementUrgency,
  ProcurementStatus,
  WorkOrderPartAllocation,
  Room,
  RoomBooking,
  RoomRecommendation,
  DisruptionCategory,
  DisruptionSeverity,
  ClassroomOccupancy,
  OccupancyStatus,
  IncidentLifecycleStatus,
  TimelineEvent,
  TriageDetails,
  MaintenanceTechnician
} from '../types';
import { CAMPUS_BUILDINGS } from '../data/buildingsData';
import { calculateTriageScore } from '../utils/triageEngine';

import { api } from '../services/api';
import { 
  hasPermission, 
  authorizeApprovalAction, 
  sanitizeString, 
  isValidDateFormat, 
  isValidTimeWindow, 
  isPositiveSafeInteger, 
  isNonNegativeNumber,
  isValidIncidentTransition,
  isValidWorkOrderTransition,
  isValidProcurementTransition
} from '../utils/security';
import { logger, RateLimiter } from '../utils/observability';
import { useAuth } from './AuthContext';
import { normalizeCampusRole } from '../types/auth';
import { calculateBuildingHealthScore, getActiveBuildingIncidents } from '../utils/buildingHealth';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  isRead: boolean;
  type: 'critical' | 'alert' | 'success' | 'info';
}

interface CampusContextType {
  // Phase 2.8: Cross-module, Occupancy & Six-Role RBAC Integration
  inventory: StockAlert[];
  selectedIncidentId: string | null;
  setSelectedIncidentId: (id: string | null) => void;
  transitionIncidentStatus: (
    incidentId: string, 
    targetStatus: IncidentLifecycleStatus, 
    remarks?: string, 
    assigneeId?: string, 
    assigneeName?: string
  ) => boolean;
  selectedWorkOrderId: string | null;
  setSelectedWorkOrderId: (id: string | null) => void;
  createWorkOrderForIncident: (
    incidentId: string, 
    orderData: Partial<WorkOrder>
  ) => { success: boolean; workOrder?: WorkOrder; error?: string };
  resolveIncidentWithWorkOrder: (
    workOrderId: string, 
    completionNotes: string
  ) => { success: boolean; error?: string };
  allocateStockToWorkOrder: (
    workOrderId: string, 
    sku: string, 
    quantity: number
  ) => { success: boolean; error?: string; createdRequisition?: boolean };
  createProcurementRequisition: (
    sku: string, 
    quantity: number, 
    workOrderId?: string, 
    urgency?: 'high' | 'medium'
  ) => ApprovalRequest;
  receiveGoods: (
    sku: string, 
    quantity: number, 
    receiptToken: string
  ) => { success: boolean; isIdempotentReplay?: boolean; error?: string };
  addBooking: (
    booking: Omit<RoomBooking, 'id' | 'bookingCode' | 'createdAt'>
  ) => { success: boolean; booking?: RoomBooking; error?: string };
  approveRoomRelocation: (
    disruptionId: string, 
    bookingId: string, 
    targetRoomCode: string
  ) => { success: boolean; error?: string };
  classrooms: ClassroomOccupancy[];
  performFacultyCheckIn: (roomCode: string) => void;
  updateClassroomOccupancyStatus: (roomCode: string, status: OccupancyStatus) => void;
  selectedRoomCode: string | null;
  setSelectedRoomCode: (code: string | null) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  isBackendPersistent: boolean;
  isLoadingData: boolean;
  connectionError: string | null;
  refreshData: () => Promise<void>;
  retryConnection: () => Promise<void>;

  user: UserProfile;
  setUserRole: (role: UserProfile['role']) => void;
  incidents: Incident[];
  addIncident: (incident: Omit<Incident, 'id' | 'ticketNumber' | 'createdAt'>) => Promise<{ success: boolean; message: string; incident?: Incident }> | { success: boolean; message: string; incident?: Incident };
  updateIncidentStatus: (incidentId: string, nextStatus: Incident['status']) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  workOrders: WorkOrder[];
  addWorkOrder: (order: Omit<WorkOrder, 'id' | 'orderNumber'>) => Promise<{ success: boolean; message: string; workOrder?: WorkOrder }> | { success: boolean; message: string; workOrder?: WorkOrder };
  updateWorkOrderStatus: (workOrderId: string, nextStatus: WorkOrder['status']) => { success: boolean; message: string };
  allocateWorkOrderToTechnician: (workOrderId: string, technicianId: string, technicianName?: string) => Promise<{ success: boolean; message?: string; workOrder?: WorkOrder }>;
  technicians: MaintenanceTechnician[];
  isLoadingTechnicians: boolean;
  techniciansError: string | null;
  refreshTechnicians: () => Promise<void>;
  stockAlerts: StockAlert[];
  roomDisruptions: RoomDisruption[];
  aiInsights: AIInsight[];
  recentActivities: ActivityItem[];
  approvals: ApprovalRequest[];
  approveRequest: (id: string) => Promise<{ success: boolean; message: string }>;
  rejectRequest: (id: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  buildings: Building[];
  selectedBuildingId: string | null;
  setSelectedBuildingId: (id: string | null) => void;
  
  // UI states
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isCopilotOpen: boolean;
  setIsCopilotOpen: (open: boolean) => void;
  isReportIncidentOpen: boolean;
  setIsReportIncidentOpen: (open: boolean) => void;
  isCreateWorkOrderOpen: boolean;
  setIsCreateWorkOrderOpen: (open: boolean) => void;
  isNotificationDrawerOpen: boolean;
  setIsNotificationDrawerOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  
  // Notifications
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  addNotification: (title: string, message: string, type?: NotificationItem['type']) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  
  // Active toast
  toastMessage: { text: string; type: 'success' | 'info' | 'error' } | null;
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;

  // Phase 2.4: Inventory Management & Stock Operations
  inventoryItems: InventoryItem[];
  stockTransactions: StockTransaction[];
  procurementRequests: ProcurementRequest[];
  performStockOperation: (params: {
    itemId: string;
    type: StockTransactionType;
    quantity: number;
    reason: string;
    referenceType?: StockTransaction['referenceType'];
    referenceId?: string;
  }) => { success: boolean; message: string };

  // Phase 2.4: Intelligent Procurement
  createProcurement: (params: {
    itemId: string;
    quantity: number;
    reason: string;
    urgency?: ProcurementUrgency;
  }) => Promise<{ success: boolean; message: string }>;
  approveProcurement: (id: string) => Promise<void>;
  rejectProcurement: (id: string) => Promise<void>;
  orderProcurement: (id: string) => Promise<{ success: boolean; message: string }>;
  receiveProcurementStock: (id: string) => Promise<{ success: boolean; message: string }>;

  // Phase 2.4: Work Order Part Integration
  allocatePartToWorkOrder: (
    workOrderId: string,
    itemId: string,
    quantity: number
  ) => { success: boolean; message: string };
  returnPartFromWorkOrder: (
    workOrderId: string,
    allocationId: string,
    reason?: string
  ) => { success: boolean; message: string };

  // Phase 2.5: Room Booking & Emergency Management
  rooms: Room[];
  bookings: RoomBooking[];
  isCreateBookingOpen: boolean;
  setIsCreateBookingOpen: (open: boolean) => void;
  isReportDisruptionOpen: boolean;
  setIsReportDisruptionOpen: (open: boolean) => void;
  isReallocateModalOpen: boolean;
  setIsReallocateModalOpen: (open: boolean) => void;
  selectedBookingForReallocation: RoomBooking | null;
  setSelectedBookingForReallocation: (booking: RoomBooking | null) => void;

  createBooking: (
    booking: Omit<RoomBooking, 'id' | 'bookingNumber' | 'createdAt'>
  ) => Promise<{ success: boolean; message: string; booking?: RoomBooking }>;
  cancelBooking: (bookingId: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  approveBooking: (bookingId: string) => Promise<void>;
  rejectBooking: (bookingId: string, reason?: string) => Promise<void>;
  checkBookingConflict: (
    roomId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ) => { hasConflict: boolean; conflictingBooking?: RoomBooking };
  reportRoomDisruption: (data: {
    roomId: string;
    issue: string;
    reasonCategory: DisruptionCategory;
    severity: DisruptionSeverity;
    resolutionEta: string;
    relatedIncidentTicket?: string;
    relatedWorkOrderNumber?: string;
  }) => { success: boolean; message: string; disruption?: RoomDisruption };
  resolveRoomDisruption: (disruptionId: string) => { success: boolean; message: string };
  recommendAlternativeRooms: (booking: RoomBooking) => RoomRecommendation[];
  reallocateBooking: (
    bookingId: string,
    targetRoomId: string,
    reason: string
  ) => { success: boolean; message: string };
}


const CampusContext = createContext<CampusContextType | undefined>(undefined);

export const CampusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: authenticatedUser, isLoading: isAuthLoading, isAuthenticated, isDemoMode, switchDemoRole } = useAuth();
  const resolvedUser = useMemo<UserProfile>(() => authenticatedUser ? ({
    id: authenticatedUser.id,
    name: authenticatedUser.fullName,
    fullName: authenticatedUser.fullName,
    role: normalizeCampusRole(authenticatedUser.role),
    email: authenticatedUser.email,
    avatar: authenticatedUser.avatarUrl || '',
    avatarUrl: authenticatedUser.avatarUrl || '',
    department: authenticatedUser.departmentName || 'Operations',
    departmentId: authenticatedUser.departmentId || undefined,
    isActive: authenticatedUser.isActive,
  }) : {
    id: 'guest',
    name: 'Campus User',
    role: 'student_faculty',
    email: '',
    department: 'Campus Operations',
  }, [authenticatedUser]);
  const [user, setUser] = useState<UserProfile>(resolvedUser);
  useEffect(() => setUser(resolvedUser), [resolvedUser]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<MaintenanceTechnician[]>([]);
  const [isLoadingTechnicians, setIsLoadingTechnicians] = useState<boolean>(false);
  const [techniciansError, setTechniciansError] = useState<string | null>(null);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [roomDisruptions, setRoomDisruptions] = useState<RoomDisruption[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<RoomBooking[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const buildings = useMemo<Building[]>(() => CAMPUS_BUILDINGS.map((building) => {
    const activeIssues = getActiveBuildingIncidents(building, incidents);
    const activeOrders = workOrders.filter((order) =>
      order.buildingId === building.id || order.buildingId === building.code
    ).filter((order) => !['completed', 'verified', 'cancelled'].includes(String(order.status).toLowerCase()));
    const healthScore = calculateBuildingHealthScore(building, incidents);
    return {
      ...building,
      openIncidents: activeIssues.length,
      activeWorkOrders: activeOrders.length,
      healthScore,
      status: healthScore < 70 ? 'alert' : healthScore < 90 ? 'warning' : 'optimal',
    };
  }), [incidents, workOrders]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<ClassroomOccupancy[]>([]);
  const [selectedRoomCode, setSelectedRoomCode] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBackendPersistent, setIsBackendPersistent] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const processedTokensRef = useRef<Set<string>>(new Set(['GRN-2026-9041']));

  // Phase 2.4: Inventory & Procurement State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
  const [procurementRequests, setProcurementRequests] = useState<ProcurementRequest[]>([]);

  // Modals & Panels
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isReportIncidentOpen, setIsReportIncidentOpen] = useState(false);
  const [isCreateWorkOrderOpen, setIsCreateWorkOrderOpen] = useState(false);
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false);
  const [isReportDisruptionOpen, setIsReportDisruptionOpen] = useState(false);
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);
  const [selectedBookingForReallocation, setSelectedBookingForReallocation] = useState<RoomBooking | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Keyboard shortcut for Command Palette (Ctrl+K or Cmd+K) and Copilot (Ctrl+J or Cmd+J)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsCopilotOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const setUserRole = (role: UserProfile['role']) => {
    if (!isDemoMode) {
      showToast('Your role is managed by your campus administrator.', 'error');
      return;
    }
    const canonicalRole = normalizeCampusRole(String(role));
    switchDemoRole(canonicalRole);
    showToast(`Demo role switched to ${canonicalRole}`, 'info');
  };

  // Duplicate submission throttle map: key -> timestamp
  const [recentSubmissions, setRecentSubmissions] = useState<Map<string, number>>(new Map());

  const addIncident = async (newIncidentData: Omit<Incident, 'id' | 'ticketNumber' | 'createdAt'>) => {
    const cleanTitle = sanitizeString(newIncidentData.title, 150);
    const cleanDesc = sanitizeString(newIncidentData.description, 500);

    if (!cleanTitle) {
      showToast('Incident title is required and cannot be blank', 'error');
      return { success: false, message: 'Incident title is required' };
    }
    if (cleanTitle.length < 5) {
      const message = 'Incident title must contain at least 5 characters after removing unsupported markup.';
      showToast(message, 'error');
      return { success: false, message };
    }
    if (cleanDesc.length < 10) {
      const message = 'Incident description must contain at least 10 characters.';
      showToast(message, 'error');
      return { success: false, message };
    }

    // Duplicate submission prevention (same title & building within 60s)
    const dedupKey = `inc-${newIncidentData.buildingId}-${cleanTitle.toLowerCase()}`;
    const now = Date.now();
    const lastSub = recentSubmissions.get(dedupKey);

    if (lastSub && now - lastSub < 60000) {
      showToast('Duplicate submission: Identical incident reported within the last 60 seconds.', 'error');
      return { success: false, message: 'Duplicate submission prevented by campus throttling policy.' };
    }

    // Submit to real backend database API
    const res = await api.createIncident({
      ...newIncidentData,
      title: cleanTitle,
      description: cleanDesc,
    });

    if (res.success && res.incident) {
      // Only throttle after the server confirms persistence. Failed requests must
      // remain retryable; the server makes retries idempotent if the response was lost.
      setRecentSubmissions((prev) => new Map(prev).set(dedupKey, now));
      const persistedInc = res.incident;
      setIncidents((prev) => [persistedInc, ...prev]);

      const newAct: ActivityItem = {
        id: `act-${Date.now()}`,
        actor: user.name,
        actorRole: user.role,
        avatar: user.avatar || '',
        action: 'reported new campus incident',
        target: `${persistedInc.ticketNumber}: ${persistedInc.title}`,
        category: 'incident',
        timestamp: 'Just now',
        badgeText: persistedInc.severity.toUpperCase(),
      };
      setRecentActivities((prev) => [newAct, ...prev]);
      showToast(
        res.duplicate
          ? `Incident #${persistedInc.ticketNumber} was already received and is visible in your incident list`
          : `Incident #${persistedInc.ticketNumber} successfully submitted to database`,
        'success'
      );
      return { success: true, message: res.duplicate ? 'Incident was already received' : 'Incident submitted', incident: persistedInc };
    }

    showToast(res.error || 'Failed to submit incident to database', 'error');
    return { success: false, message: res.error || 'Database submission failed' };
  };

  const updateIncidentStatus = async (incidentId: string, nextStatus: Incident['status']) => {
    const inc = incidents.find((i) => i.id === incidentId);
    if (!inc) {
      showToast('Incident ticket not found', 'error');
      return { success: false, message: 'Incident ticket not found' };
    }

    const check = isValidIncidentTransition(inc.status, nextStatus, user.role);
    if (!check.allowed) {
      showToast(check.reason || 'Invalid status transition', 'error');
      return { success: false, message: check.reason || 'Invalid status transition' };
    }

    setIncidents((prev) =>
      prev.map((i) => (i.id === incidentId ? { ...i, status: nextStatus } : i))
    );

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar || '',
      action: `updated incident status to ${nextStatus}`,
      target: `${inc.ticketNumber}: ${inc.title}`,
      category: 'incident',
      timestamp: 'Just now',
      badgeText: nextStatus.toUpperCase(),
    };
    setRecentActivities((prev) => [newAct, ...prev]);
    showToast(`Incident #${inc.ticketNumber} status updated to ${nextStatus}`, 'success');
    return { success: true, message: `Status updated to ${nextStatus}` };
  };

  const addWorkOrder = async (newOrderData: Omit<WorkOrder, 'id' | 'orderNumber'>) => {
    const cleanTitle = sanitizeString(newOrderData.title, 150);
    const cleanLoc = sanitizeString(newOrderData.location, 100);

    if (!cleanTitle) {
      showToast('Work order title is required', 'error');
      return { success: false, message: 'Work order title is required' };
    }

    if (!newOrderData.assignedEngineer || newOrderData.assignedEngineer.trim().length === 0) {
      showToast('Work order must have a valid assigned maintenance engineer', 'error');
      return { success: false, message: 'Assigned maintenance engineer is required' };
    }

    const res = await api.createWorkOrder({
      ...newOrderData,
      title: cleanTitle,
      location: cleanLoc,
    });

    if (res.success && res.workOrder) {
      setWorkOrders((prev) => [res.workOrder!, ...prev]);
      showToast(`Work Order #${res.workOrder.orderNumber} issued and persisted`, 'success');
      return { success: true, message: 'Work order issued', workOrder: res.workOrder };
    }

    showToast(res.error || 'Failed to create work order in database', 'error');
    return { success: false, message: res.error || 'Database write failed' };
  };

  const updateWorkOrderStatus = (workOrderId: string, nextStatus: WorkOrder['status']) => {
    const wo = workOrders.find((w) => w.id === workOrderId);
    if (!wo) {
      showToast('Work order not found', 'error');
      return { success: false, message: 'Work order not found' };
    }

    const isAssigned =
      user.name.trim().toLowerCase() === wo.assignedEngineer.trim().toLowerCase() ||
      user.email.trim().toLowerCase() === wo.assignedEngineer.trim().toLowerCase();

    const check = isValidWorkOrderTransition(wo.status, nextStatus, user.role, isAssigned);
    if (!check.allowed) {
      showToast(check.reason || 'Invalid status transition', 'error');
      return { success: false, message: check.reason || 'Invalid status transition' };
    }

    setWorkOrders((prev) =>
      prev.map((w) =>
        w.id === workOrderId
          ? {
              ...w,
              status: nextStatus,
              completionRate: nextStatus === 'completed' ? 100 : w.completionRate,
            }
          : w
      )
    );

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar || '',
      action: `updated work order status to ${nextStatus}`,
      target: `${wo.orderNumber}: ${wo.title}`,
      category: 'maintenance',
      timestamp: 'Just now',
      badgeText: nextStatus.toUpperCase(),
    };
    setRecentActivities((prev) => [newAct, ...prev]);
    showToast(`Work Order #${wo.orderNumber} updated to ${nextStatus}`, 'success');
    return { success: true, message: `Status updated to ${nextStatus}` };
  };

  // Phase 2.4 / 2.9: Hardened Stock Operation (RBAC, atomic, audit-logged, prevents negative stock)
  const performStockOperation = (params: {
    itemId: string;
    type: StockTransactionType;
    quantity: number;
    reason: string;
    referenceType?: StockTransaction['referenceType'];
    referenceId?: string;
  }) => {
    // 1. RBAC authorization guard
    if (!hasPermission(user.role, 'manage_inventory')) {
      showToast(`Unauthorized: Role "${user.role}" does not have inventory operation privileges`, 'error');
      const secAct: ActivityItem = {
        id: `sec-${Date.now()}`,
        actor: user.name,
        actorRole: user.role,
        avatar: user.avatar || '',
        action: 'blocked unauthorized stock modification attempt',
        target: `${params.type} (${params.quantity})`,
        category: 'inventory',
        timestamp: 'Just now',
        badgeText: 'SECURITY BLOCKED',
      };
      setRecentActivities((prev) => [secAct, ...prev]);
      return { success: false, message: 'Unauthorized role for inventory management' };
    }

    const item = inventoryItems.find((i) => i.id === params.itemId);
    if (!item) {
      showToast('Item not found in inventory', 'error');
      return { success: false, message: 'Item not found' };
    }

    // 2. Numerical safety & integer validation
    if (params.type === 'adjustment') {
      if (!Number.isFinite(params.quantity) || !Number.isInteger(params.quantity) || params.quantity < 0) {
        showToast('Adjustment quantity must be a non-negative whole number', 'error');
        return { success: false, message: 'Invalid adjustment quantity' };
      }
    } else {
      if (!isPositiveSafeInteger(params.quantity)) {
        showToast('Quantity must be a positive whole number', 'error');
        return { success: false, message: 'Quantity must be a positive whole number' };
      }
    }

    // 3. Prevent negative inventory for stock deductions (stock_out, allocation, transfer)
    const isDeduction = params.type === 'stock_out' || params.type === 'allocation' || (params.type as string) === 'transfer';
    if (isDeduction && item.currentStock < params.quantity) {
      showToast(`Cannot deduct ${params.quantity} ${item.unit}. Only ${item.currentStock} in stock.`, 'error');
      return { success: false, message: 'Insufficient stock' };
    }

    let newStock = item.currentStock;
    if (params.type === 'stock_in' || params.type === 'return') {
      newStock += params.quantity;
    } else if (isDeduction) {
      newStock -= params.quantity;
    } else if (params.type === 'adjustment') {
      newStock = params.quantity;
    }

    if (newStock < 0) {
      showToast('Adjustment cannot result in negative stock', 'error');
      return { success: false, message: 'Negative inventory prevented' };
    }

    const newStatus: InventoryItem['status'] =
      newStock === 0 ? 'out_of_stock' : newStock <= item.minThreshold ? 'low_stock' : 'in_stock';

    const safeReason = sanitizeString(params.reason || `${params.type.replace('_', ' ')} recorded`, 250);

    // Update item atomically
    setInventoryItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              currentStock: newStock,
              status: newStatus,
              lastRestockedAt: params.type === 'stock_in' ? 'Just now' : i.lastRestockedAt,
            }
          : i
      )
    );

    // Create audit transaction record
    const newTx: StockTransaction = {
      id: `tx-${Date.now()}`,
      transactionNumber: `TX-${Math.floor(720 + Math.random() * 200)}`,
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.itemName || item.name || item.sku || 'Item',
      type: params.type,
      quantity: params.quantity,
      previousStock: item.currentStock,
      newStock,
      referenceType: params.referenceType || 'manual_adjustment',
      referenceId: params.referenceId,
      reason: safeReason,
      performedBy: `${user.name} (${user.role})`,
      timestamp: 'Just now',
    };

    setStockTransactions((prev) => [newTx, ...prev]);

    // Add activity log
    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar || '',
      action: `${params.type.replace('_', ' ')} (${params.quantity} ${item.unit})`,
      target: `${item.sku} - ${item.name}`,
      category: 'inventory',
      timestamp: 'Just now',
      badgeText: params.type.toUpperCase(),
    };
    setRecentActivities((prev) => [newAct, ...prev]);

    showToast(`Stock updated: ${item.name} (${item.currentStock} → ${newStock} ${item.unit})`, 'success');
    return { success: true, message: 'Stock updated successfully' };
  };

  // Phase 2.4: Intelligent Procurement Actions
  const createProcurement = async (params: {
    itemId: string;
    quantity: number;
    reason: string;
    urgency?: ProcurementUrgency;
  }): Promise<{ success: boolean; message: string }> => {
    const item = inventoryItems.find((i) => i.id === params.itemId);
    if (!item) {
      showToast('Inventory item not found', 'error');
      return { success: false, message: 'Item not found' };
    }

    const urgency = params.urgency || (item.currentStock === 0 ? 'urgent' : item.currentStock <= item.minThreshold / 2 ? 'high' : 'medium');
    const totalCost = item.unitCost * params.quantity;
    const newReqData = {
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.itemName || item.name || item.sku || 'Item',
      category: item.category,
      quantity: params.quantity,
      unit: item.unit,
      estimatedUnitCost: item.unitCost,
      totalEstimatedCost: totalCost,
      supplierName: item.supplierName || 'Campus Procurement',
      supplierContact: item.supplierContact,
      urgency,
      status: 'pending_approval' as ProcurementStatus,
      reason: params.reason,
      ruleTriggerReason: `Rule: Current stock (${item.currentStock} ${item.unit}) <= Min threshold (${item.minThreshold} ${item.unit})`,
      requestedBy: user.name,
    };
    const created = await api.createProcurementRequest(newReqData);
    if (!created.success || !created.request) {
      const message = created.error || 'Requisition could not be saved.';
      showToast(message, 'error');
      return { success: false, message };
    }
    const newReq: ProcurementRequest = created.request;

    setProcurementRequests((prev) => [newReq, ...prev]);

    // Mirror to general approvals list
    const newApproval: ApprovalRequest = {
      id: created.approvalId || newReq.id,
      title: `${newReq.requestNumber}: Requisition for ${newReq.quantity}x ${item.name}`,
      category: 'Procurement',
      requestType: 'procurement',
      entityId: newReq.id,
      requesterId: user.id,
      requesterName: user.name,
      requesterRole: user.role,
      department: user.department,
      estimatedCost: `₹${totalCost.toLocaleString('en-IN')}`,
      urgency: urgency === 'urgent' ? 'high' : urgency,
      status: 'pending',
      submittedAt: 'Just now',
      reason: params.reason,
    };
    setApprovals((prev) => [newApproval, ...prev]);

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar || '',
      action: 'created procurement requisition for',
      target: `${newReq.quantity}x ${item.name}`,
      category: 'inventory',
      timestamp: 'Just now',
      badgeText: 'Requisition',
    };
    setRecentActivities((prev) => [newAct, ...prev]);

    showToast(`Procurement requisition #${newReq.requestNumber} raised`, 'success');
    return { success: true, message: 'Requisition created successfully' };
  };

  const approveProcurement = async (id: string) => {
    const result = await api.updateProcurementStatus(id, 'approved');
    if (!result.success) { showToast(result.error || 'Requisition approval failed', 'error'); return; }
    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'approved' as const, approvedBy: `${user.name} (${user.role})` } : r
      )
    );
    setApprovals((prev) =>
      prev.map((a) => (a.entityId === id || a.id === id ? { ...a, status: 'approved' as const } : a))
    );

    const target = procurementRequests.find((r) => r.id === id);
    if (target) {
      const newAct: ActivityItem = {
        id: `act-${Date.now()}`,
        actor: user.name,
        actorRole: user.role,
        avatar: user.avatar || '',
        action: 'approved procurement for',
        target: `${target.quantity}x ${target.itemName}`,
        category: 'approval',
        timestamp: 'Just now',
        badgeText: 'Approved',
      };
      setRecentActivities((prev) => [newAct, ...prev]);
      showToast(`Procurement #${target.requestNumber} approved by ${user.name}`, 'success');
    }
  };

  const rejectProcurement = async (id: string) => {
    const result = await api.updateProcurementStatus(id, 'rejected');
    if (!result.success) { showToast(result.error || 'Requisition rejection failed', 'error'); return; }
    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'rejected' as const } : r
      )
    );
    setApprovals((prev) =>
      prev.map((a) => (a.entityId === id || a.id === id ? { ...a, status: 'rejected' as const } : a))
    );
    const target = procurementRequests.find((r) => r.id === id);
    if (target) {
      showToast(`Procurement #${target.requestNumber} declined`, 'info');
    }
  };

  const orderProcurement = async (id: string): Promise<{ success: boolean; message: string }> => {
    const target = procurementRequests.find((r) => r.id === id);
    if (!target) {
      showToast('Procurement requisition not found', 'error');
      return { success: false, message: 'Requisition not found' };
    }

    const check = isValidProcurementTransition(target.status, 'ordered');
    if (!check.allowed) {
      showToast(check.reason || 'Cannot order procurement', 'error');
      return { success: false, message: check.reason || 'Invalid status transition' };
    }

    const persisted = await api.updateProcurementStatus(id, 'ordered');
    if (!persisted.success) { const message = persisted.error || 'Purchase order could not be placed.'; showToast(message, 'error'); return { success: false, message }; }

    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'ordered' as const, orderedAt: 'Just now' } : r
      )
    );

    showToast(`Purchase Order #${target.requestNumber} dispatched to ${target.supplierName}`, 'info');
    return { success: true, message: 'Purchase order placed successfully' };
  };

  const receiveProcurementStock = async (id: string): Promise<{ success: boolean; message: string }> => {
    const target = procurementRequests.find((r) => r.id === id);
    if (!target) {
      showToast('Procurement requisition not found', 'error');
      return { success: false, message: 'Requisition not found' };
    }

    const check = isValidProcurementTransition(target.status, 'received');
    if (!check.allowed) {
      showToast(check.reason || 'Cannot receive goods', 'error');
      return { success: false, message: check.reason || 'Invalid status transition' };
    }

    const persisted = await api.updateProcurementStatus(id, 'received', { receiptToken: `procurement-receipt:${id}` });
    if (!persisted.success) { const message = persisted.error || 'Goods receipt failed.'; showToast(message, 'error'); return { success: false, message }; }
    setProcurementRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: 'received', receivedAt: new Date().toISOString() } : r));
    const [inventoryRes, inventoryItemsRes, txRes] = await Promise.all([api.getInventory(), api.getInventoryItems(), api.getStockTransactions()]);
    setStockAlerts(inventoryRes.items);
    setInventoryItems(inventoryItemsRes);
    setStockTransactions(txRes.transactions);
    showToast(`Received ${target.quantity} ${target.unit} of ${target.itemName}. Added to stock!`, 'success');
    return { success: true, message: 'Stock received' };
  };

  // Phase 2.4: Work Order Part Integration
  const allocatePartToWorkOrder = (
    workOrderId: string,
    itemId: string,
    quantity: number
  ) => {
    const wo = workOrders.find((w) => w.id === workOrderId);
    if (!wo) {
      showToast('Work order not found', 'error');
      return { success: false, message: 'Work order not found' };
    }

    if (wo.status === 'completed') {
      showToast('Cannot allocate parts to a completed work order', 'error');
      return { success: false, message: 'Work order is already completed' };
    }

    const item = inventoryItems.find((i) => i.id === itemId);
    if (!item) {
      showToast('Item not found in inventory', 'error');
      return { success: false, message: 'Item not found' };
    }

    if (!isPositiveSafeInteger(quantity)) {
      showToast('Allocation quantity must be a positive whole number', 'error');
      return { success: false, message: 'Invalid quantity' };
    }

    if (item.currentStock < quantity) {
      showToast(`Insufficient stock! Requested: ${quantity}, Available: ${item.currentStock} ${item.unit}`, 'error');
      return { success: false, message: 'Insufficient stock' };
    }

    const stockOp = performStockOperation({
      itemId: item.id,
      type: 'allocation',
      quantity,
      reason: `Allocated to ${wo.orderNumber}: ${wo.title}`,
      referenceType: 'work_order',
      referenceId: wo.orderNumber,
    });

    if (!stockOp.success) return stockOp;

    setInventoryItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, allocatedQuantity: (i.allocatedQuantity || 0) + quantity }
          : i
      )
    );

    const allocation: WorkOrderPartAllocation = {
      id: `alloc-${Date.now()}`,
      workOrderId: wo.id,
      orderNumber: wo.orderNumber,
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.itemName || item.name || item.sku || 'Item',
      quantity,
      allocatedAt: 'Just now',
      allocatedBy: `${user.name} (${user.role})`,
      status: 'allocated',
    };

    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id === wo.id) {
          const currentParts = w.allocatedParts || [];
          const nextStatus = w.status === 'awaiting_parts' ? 'in_progress' : w.status;
          return {
            ...w,
            status: nextStatus,
            allocatedParts: [...currentParts, allocation],
          };
        }
        return w;
      })
    );

    showToast(`Allocated ${quantity}x ${item.name} to ${wo.orderNumber}`, 'success');
    return { success: true, message: 'Allocated successfully' };
  };

  const returnPartFromWorkOrder = (
    workOrderId: string,
    allocationId: string,
    reason?: string
  ) => {
    const wo = workOrders.find((w) => w.id === workOrderId);
    if (!wo) return { success: false, message: 'Work order not found' };

    const allocation = (wo.allocatedParts || []).find((a) => a.id === allocationId);
    if (!allocation) return { success: false, message: 'Allocation record not found' };

    if (allocation.status !== 'allocated') {
      showToast(`Part allocation is already ${allocation.status}`, 'error');
      return { success: false, message: `Part is already ${allocation.status}` };
    }

    performStockOperation({
      itemId: allocation.itemId,
      type: 'return',
      quantity: allocation.quantity,
      reason: reason || `Returned unused from ${wo.orderNumber}`,
      referenceType: 'work_order',
      referenceId: wo.orderNumber,
    });

    setInventoryItems((prev) =>
      prev.map((i) =>
        i.id === allocation.itemId
          ? { ...i, allocatedQuantity: Math.max(0, (i.allocatedQuantity || 0) - allocation.quantity) }
          : i
      )
    );

    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id === wo.id) {
          return {
            ...w,
            allocatedParts: (w.allocatedParts || []).map((a) =>
              a.id === allocationId ? { ...a, status: 'returned' as const } : a
            ),
          };
        }
        return w;
      })
    );

    showToast(`Returned ${allocation.quantity}x ${allocation.itemName} to inventory`, 'info');
    return { success: true, message: 'Part returned to stock' };
  };

  const approveRequest = async (id: string) => {
    const target = approvals.find((a) => a.id === id);
    if (!target) {
      showToast('Requisition request not found', 'error');
      return { success: false, message: 'Requisition request not found' };
    }

    // Phase 2.9 Security: RBAC + Self-Approval Guard (Separation of Duties)
    const authCheck = authorizeApprovalAction(user, target, 'approve');
    if (!authCheck.allowed) {
      showToast(authCheck.reason || 'Approval unauthorized', 'error');
      const secAct: ActivityItem = {
        id: `sec-${Date.now()}`,
        actor: user.name,
        actorRole: user.role,
        avatar: user.avatar || '',
        action: `blocked unauthorized approval attempt (${authCheck.code})`,
        target: target.title,
        category: 'approval',
        timestamp: 'Just now',
        badgeText: 'SECURITY BLOCKED',
      };
      setRecentActivities((prev) => [secAct, ...prev]);
      return { success: false, message: authCheck.reason || 'Approval unauthorized' };
    }

    let persisted: { success: boolean; error?: string };
    if (target.requestType === 'procurement' && procurementRequests.some((request) => request.id === target.entityId)) {
      persisted = await api.updateProcurementStatus(target.entityId!, 'approved');
    } else if (target.requestType === 'room_booking') {
      const booking = bookings.find((entry) => entry.approvalRequestId === target.id || entry.id === target.entityId);
      persisted = booking ? await api.updateBookingStatus(booking.id, 'approved') : { success: false, error: 'Linked booking not found.' };
    } else {
      persisted = await api.updateApprovalStatus(id, 'approved');
    }
    if (!persisted.success) {
      const message = persisted.error || 'Approval could not be saved.';
      showToast(message, 'error');
      return { success: false, message };
    }

    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' as const } : item))
    );
    // Also sync with procurement requests
    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === target.entityId ? { ...r, status: 'approved' as const, approvedBy: `${user.name} (${user.role})` } : r
      )
    );
    // Also sync with room bookings
    setBookings((prev) =>
      prev.map((b) =>
        b.approvalRequestId === id
          ? {
              ...b,
              status: 'approved' as const,
              approvedBy: `${user.name} (${user.role})`,
              approvalTimestamp: 'Just now',
            }
          : b
      )
    );

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar || '',
      action: 'authorized requisition for',
      target: target.title,
      category: 'approval',
      timestamp: 'Just now',
      badgeText: 'Approved',
    };
    setRecentActivities((prev) => [newAct, ...prev]);
    showToast(`Request "${target.title.slice(0, 30)}..." approved`, 'success');
    return { success: true, message: 'Request approved successfully' };
  };

  const rejectRequest = async (id: string, reason?: string) => {
    const target = approvals.find((a) => a.id === id);
    if (!target) {
      showToast('Requisition request not found', 'error');
      return { success: false, message: 'Requisition request not found' };
    }

    const authCheck = authorizeApprovalAction(user, target, 'reject');
    if (!authCheck.allowed) {
      showToast(authCheck.reason || 'Decline unauthorized', 'error');
      const secAct: ActivityItem = {
        id: `sec-${Date.now()}`,
        actor: user.name,
        actorRole: user.role,
        avatar: user.avatar || '',
        action: `blocked unauthorized decline attempt (${authCheck.code})`,
        target: target.title,
        category: 'approval',
        timestamp: 'Just now',
        badgeText: 'SECURITY BLOCKED',
      };
      setRecentActivities((prev) => [secAct, ...prev]);
      return { success: false, message: authCheck.reason || 'Decline unauthorized' };
    }

    let persisted: { success: boolean; error?: string };
    if (target.requestType === 'procurement' && procurementRequests.some((request) => request.id === target.entityId)) {
      persisted = await api.updateProcurementStatus(target.entityId!, 'rejected');
    } else if (target.requestType === 'room_booking') {
      const booking = bookings.find((entry) => entry.approvalRequestId === target.id || entry.id === target.entityId);
      persisted = booking ? await api.updateBookingStatus(booking.id, 'rejected', reason) : { success: false, error: 'Linked booking not found.' };
    } else {
      persisted = await api.updateApprovalStatus(id, 'rejected');
    }
    if (!persisted.success) {
      const message = persisted.error || 'Rejection could not be saved.';
      showToast(message, 'error');
      return { success: false, message };
    }

    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'rejected' as const } : item))
    );
    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === target.entityId ? { ...r, status: 'rejected' as const } : r
      )
    );
    // Also sync with room bookings
    setBookings((prev) =>
      prev.map((b) =>
        b.approvalRequestId === id
          ? { ...b, status: 'rejected' as const, rejectionReason: reason || 'Declined by authorized coordinator' }
          : b
      )
    );

    showToast(`Request "${target.title.slice(0, 30)}..." declined`, 'info');
    return { success: true, message: 'Request declined' };
  };

  // ── Phase 2.5: Room Booking & Emergency Operations ─────────────────────────

  const checkBookingConflict = (
    roomId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ) => {
    return api.checkBookingConflict(roomId, date, startTime, endTime, bookings, excludeBookingId);
  };

  const createBooking = async (bookingData: Omit<RoomBooking, 'id' | 'bookingNumber' | 'createdAt'>): Promise<{ success: boolean; message: string; booking?: RoomBooking }> => {
    const sanitizedPurpose = sanitizeString(bookingData.purpose, 250);
    const sanitizedBookedBy = sanitizeString(bookingData.bookedBy, 120);
    const sanitizedDept = sanitizeString(bookingData.department, 120);
    const sanitizedNotes = bookingData.notes ? sanitizeString(bookingData.notes, 500) : undefined;

    if (!sanitizedPurpose) {
      showToast('Booking purpose is required and cannot be blank', 'error');
      return { success: false, message: 'Booking purpose is required' };
    }

    if (!bookingData.date || !isValidDateFormat(bookingData.date)) {
      showToast('Date must be in valid YYYY-MM-DD format', 'error');
      return { success: false, message: 'Invalid booking date format' };
    }

    if (!bookingData.roomId) {
      showToast('A room must be selected', 'error');
      return { success: false, message: 'A room must be selected' };
    }

    const attendance = bookingData.expectedAttendance ?? bookingData.expectedAttendees;
    const timeWindow = isValidTimeWindow(bookingData.startTime, bookingData.endTime);
    if (!timeWindow.valid) {
      showToast(timeWindow.error || 'Invalid time window', 'error');
      return { success: false, message: timeWindow.error || 'Invalid time window' };
    }

    if (!isPositiveSafeInteger(attendance)) {
      showToast('Expected attendance must be a positive whole number', 'error');
      return { success: false, message: 'Expected attendance must be a positive whole number' };
    }

    const room = rooms.find((r) => r.id === bookingData.roomId);
    if (!room) {
      showToast('Selected room not found', 'error');
      return { success: false, message: 'Room not found' };
    }

    if ((attendance as number) > room.capacity) {
      showToast(`Attendance (${attendance}) exceeds room capacity (${room.capacity})`, 'error');
      return { success: false, message: `Room capacity exceeded: maximum ${room.capacity} seats` };
    }

    if (room.status === 'disrupted') {
      showToast(`Cannot book: ${room.name} is currently disrupted`, 'error');
      return { success: false, message: `${room.name} is currently disrupted and unavailable` };
    }
    if (room.status === 'maintenance') {
      showToast(`Cannot book: ${room.name} is currently undergoing maintenance`, 'error');
      return { success: false, message: `${room.name} is under maintenance` };
    }

    const conflictResult = api.checkBookingConflict(
      bookingData.roomId,
      bookingData.date,
      bookingData.startTime,
      bookingData.endTime,
      bookings
    );

    if (conflictResult.hasConflict && conflictResult.conflictingBooking) {
      const conf = conflictResult.conflictingBooking;
      showToast(`Conflict: Overlaps with ${conf.bookingNumber} (${conf.startTime} - ${conf.endTime})`, 'error');
      return {
        success: false,
        message: `Conflict detected: Room is already reserved for "${conf.purpose}" (${conf.startTime} - ${conf.endTime})`,
      };
    }

    // Role-based or facility size requirement for approvals
    const needsApproval =
      (attendance as number) >= 80 ||
      room.roomType === 'auditorium';
    const approvalId = needsApproval ? `appr-bk-${Date.now()}` : undefined;

    const roomBuilding = buildings.find((building) => building.id === room.buildingId);
    const persisted = await api.createBooking({
      ...bookingData,
      purpose: sanitizedPurpose,
      title: sanitizedPurpose,
      bookedBy: sanitizedBookedBy || user.name,
      bookedByRole: bookingData.bookedByRole || user.role,
      department: sanitizedDept || user.department,
      notes: sanitizedNotes,
      expectedAttendance: attendance as number,
      expectedAttendees: attendance as number,
      roomCode: room.roomNumber,
      roomName: room.name,
      buildingCode: roomBuilding?.code,
      buildingName: room.buildingName,
    });
    if (!persisted.success || !persisted.booking) {
      const message = persisted.error || 'Booking could not be saved.';
      showToast(message, 'error');
      return { success: false, message };
    }
    const resolvedApprovalId = persisted.booking.approvalRequestId || approvalId;

    const newBooking: RoomBooking = {
      ...bookingData,
      purpose: sanitizedPurpose,
      bookedBy: sanitizedBookedBy || user.name,
      department: sanitizedDept || user.department,
      notes: sanitizedNotes,
      id: persisted.booking.id,
      bookingNumber: persisted.booking.bookingNumber || persisted.booking.bookingCode,
      status: String(persisted.booking.status) === 'tentative' || needsApproval ? 'pending' : 'approved',
      requiresApproval: needsApproval,
      approvalRequestId: resolvedApprovalId,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setBookings((prev) => [newBooking, ...prev]);

    if (needsApproval && resolvedApprovalId) {
      const newApproval: ApprovalRequest = {
        id: resolvedApprovalId,
        title: `Room Reservation: ${room.name} (${newBooking.bookingNumber})`,
        category: 'Room Reservation',
        requesterName: bookingData.bookedBy,
        requesterRole: bookingData.bookedByRole,
        department: bookingData.department || user.department || 'Operations',
        estimatedCost: 'N/A (Facility)',
        urgency: 'medium',
        status: 'pending',
        submittedAt: 'Just now',
        reason: `${bookingData.purpose || bookingData.title || 'Room booking'} | ${bookingData.date || 'Date unavailable'} (${bookingData.startTime} - ${bookingData.endTime}) | ${attendance} attendees`,
      };
      setApprovals((prev) => [newApproval, ...prev]);
    }

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar || '',
      action: needsApproval ? 'submitted room booking request for' : 'confirmed booking for',
      target: `${newBooking.bookingNumber}: ${room.name}`,
      category: 'system',
      timestamp: 'Just now',
      badgeText: needsApproval ? 'PENDING' : 'BOOKED',
    };
    setRecentActivities((prev) => [newAct, ...prev]);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: needsApproval ? 'Booking Request Submitted' : 'Room Booking Confirmed',
      message: `${newBooking.bookingNumber} reserved for ${room.name} on ${newBooking.date} (${newBooking.startTime} - ${newBooking.endTime}).`,
      timeAgo: 'Just now',
      isRead: false,
      type: needsApproval ? 'info' : 'success',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(
      needsApproval
        ? `Booking #${newBooking.bookingNumber} submitted for facility approval`
        : `Room #${newBooking.bookingNumber} reserved successfully!`,
      'success'
    );

    return { success: true, message: 'Booking confirmed', booking: newBooking };
  };

  const cancelBooking = async (bookingId: string, reason?: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      showToast('Booking not found', 'error');
      return { success: false, message: 'Booking not found' };
    }

    const persisted = await api.updateBookingStatus(bookingId, 'cancelled', reason);
    if (!persisted.success) {
      const message = persisted.error || 'Booking cancellation failed.';
      showToast(message, 'error');
      return { success: false, message };
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'cancelled' as const,
              reallocationReason: reason || 'Cancelled by user',
            }
          : b
      )
    );

    if (booking.approvalRequestId) {
      setApprovals((prev) =>
        prev.map((a) => (a.id === booking.approvalRequestId ? { ...a, status: 'rejected' as const } : a))
      );
    }

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar || '',
      action: 'cancelled room reservation',
      target: `${booking.bookingNumber}: ${booking.roomName}`,
      category: 'system',
      timestamp: 'Just now',
      badgeText: 'CANCELLED',
    };
    setRecentActivities((prev) => [newAct, ...prev]);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Booking Cancelled',
      message: `Reservation ${booking.bookingNumber} for ${booking.roomName} has been cancelled.`,
      timeAgo: 'Just now',
      isRead: false,
      type: 'alert',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(`Booking ${booking.bookingNumber} cancelled`, 'info');
    return { success: true, message: 'Booking cancelled' };
  };

  const approveBooking = async (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const persisted = await api.updateBookingStatus(bookingId, 'approved');
    if (!persisted.success) { showToast(persisted.error || 'Booking approval failed.', 'error'); return; }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'approved' as const,
              approvedBy: `${user.name} (${user.role})`,
              approvalTimestamp: 'Just now',
            }
          : b
      )
    );

    if (booking.approvalRequestId) {
      setApprovals((prev) =>
        prev.map((a) => (a.id === booking.approvalRequestId ? { ...a, status: 'approved' as const } : a))
      );
    }

    showToast(`Booking ${booking.bookingNumber} approved`, 'success');
  };

  const rejectBooking = async (bookingId: string, reason?: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const persisted = await api.updateBookingStatus(bookingId, 'rejected', reason);
    if (!persisted.success) { showToast(persisted.error || 'Booking rejection failed.', 'error'); return; }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: 'rejected' as const,
              reallocationReason: reason || 'Reservation request declined by facility coordinator',
            }
          : b
      )
    );

    if (booking.approvalRequestId) {
      setApprovals((prev) =>
        prev.map((a) => (a.id === booking.approvalRequestId ? { ...a, status: 'rejected' as const } : a))
      );
    }

    showToast(`Booking ${booking.bookingNumber} declined`, 'info');
  };

  const reportRoomDisruption = (data: {
    roomId: string;
    issue: string;
    reasonCategory: DisruptionCategory;
    severity: DisruptionSeverity;
    resolutionEta: string;
    relatedIncidentTicket?: string;
    relatedWorkOrderNumber?: string;
  }) => {
    // 1. RBAC check
    if (!hasPermission(user.role, 'report_disruption')) {
      showToast(`Unauthorized: Role "${user.role}" does not have authority to report emergency disruptions`, 'error');
      const secAct: ActivityItem = {
        id: `sec-${Date.now()}`,
        actor: user.name,
        actorRole: user.role,
        avatar: user.avatar || '',
        action: 'blocked unauthorized emergency disruption report attempt',
        target: `Room: ${data.roomId}`,
        category: 'incident',
        timestamp: 'Just now',
        badgeText: 'SECURITY BLOCKED',
      };
      setRecentActivities((prev) => [secAct, ...prev]);
      return { success: false, message: 'Unauthorized role for reporting disruptions' };
    }

    const room = rooms.find((r) => r.id === data.roomId);
    if (!room) {
      showToast('Room not found', 'error');
      return { success: false, message: 'Room not found' };
    }

    const sanitizedIssue = sanitizeString(data.issue, 300);
    if (!sanitizedIssue) {
      showToast('Disruption issue description cannot be blank', 'error');
      return { success: false, message: 'Issue description is required' };
    }

    const sanitizedEta = sanitizeString(data.resolutionEta, 80);
    const sanitizedIncidentTicket = data.relatedIncidentTicket ? sanitizeString(data.relatedIncidentTicket, 50) : undefined;
    const sanitizedWorkOrderNumber = data.relatedWorkOrderNumber ? sanitizeString(data.relatedWorkOrderNumber, 50) : undefined;

    const disruptionId = `rd-${Date.now()}`;
    const disruptionNumber = `DIS-2026-${Math.floor(10 + Math.random() * 89)}`;

    const affected = bookings.filter(
      (b) => b.roomId === room.id && b.status !== 'cancelled' && b.status !== 'rejected'
    );

    const newDisruption: RoomDisruption = {
      id: disruptionId,
      disruptionNumber,
      roomId: room.id,
      roomCode: room.roomNumber,
      buildingId: room.buildingId,
      buildingName: `${room.buildingName} (${room.floor})`,
      issue: sanitizedIssue,
      reasonCategory: data.reasonCategory,
      severity: data.severity,
      affectedSchedule:
        affected.length > 0
          ? `${affected[0].purpose} (${affected[0].startTime}) + ${affected.length - 1} more`
          : 'No scheduled sessions currently affected',
      status: 'confirmed',
      resolutionEta: sanitizedEta || 'Investigating',
      reportedBy: `${user.name} (${user.role})`,
      reportedByRole: user.role,
      relatedIncidentTicket: sanitizedIncidentTicket,
      relatedWorkOrderNumber: sanitizedWorkOrderNumber,
      affectedBookingIds: affected.map((b) => b.id),
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setRooms((prev) =>
      prev.map((r) => (r.id === room.id ? { ...r, status: 'disrupted' as const, activeDisruptionId: disruptionId } : r))
    );

    setRoomDisruptions((prev) => [newDisruption, ...prev]);

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar || '',
      action: 'reported emergency room disruption for',
      target: `${room.name} (${disruptionNumber})`,
      category: 'incident',
      timestamp: 'Just now',
      badgeText: data.severity.toUpperCase(),
    };
    setRecentActivities((prev) => [newAct, ...prev]);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: `Emergency Disruption: ${room.name}`,
      message: `${sanitizedIssue}. Room closed. ${affected.length} booking(s) flagged for reallocation.`,
      timeAgo: 'Just now',
      isRead: false,
      type: data.severity === 'critical' ? 'critical' : 'alert',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(`Emergency disruption logged: ${room.name} marked unavailable`, 'error');

    return { success: true, message: 'Disruption logged successfully', disruption: newDisruption };
  };

  const resolveRoomDisruption = (disruptionId: string) => {
    // 1. RBAC check
    if (!hasPermission(user.role, 'resolve_disruption')) {
      showToast(`Unauthorized: Role "${user.role}" does not have authority to resolve disruptions`, 'error');
      const secAct: ActivityItem = {
        id: `sec-${Date.now()}`,
        actor: user.name,
        actorRole: user.role,
        avatar: user.avatar || '',
        action: 'blocked unauthorized disruption resolution attempt',
        target: `Disruption ID: ${disruptionId}`,
        category: 'incident',
        timestamp: 'Just now',
        badgeText: 'SECURITY BLOCKED',
      };
      setRecentActivities((prev) => [secAct, ...prev]);
      return { success: false, message: 'Unauthorized role for resolving disruptions' };
    }

    const disruption = roomDisruptions.find((d) => d.id === disruptionId);
    if (!disruption) {
      showToast('Disruption not found', 'error');
      return { success: false, message: 'Disruption not found' };
    }

    setRoomDisruptions((prev) =>
      prev.map((d) => (d.id === disruptionId ? { ...d, status: 'resolved' as const } : d))
    );

    if (disruption.roomId) {
      setRooms((prev) =>
        prev.map((r) =>
          r.id === disruption.roomId
            ? { ...r, status: 'available' as const, activeDisruptionId: undefined }
            : r
        )
      );
    }

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar || '',
      action: 'resolved room disruption for',
      target: `${disruption.roomCode} (${disruption.disruptionNumber || disruptionId})`,
      category: 'incident',
      timestamp: 'Just now',
      badgeText: 'RESOLVED',
    };
    setRecentActivities((prev) => [newAct, ...prev]);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Room Disruption Resolved',
      message: `${disruption.roomCode} is now back online and operational.`,
      timeAgo: 'Just now',
      isRead: false,
      type: 'success',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(`Disruption for ${disruption.roomCode} marked as resolved!`, 'success');
    return { success: true, message: 'Disruption resolved' };
  };

  const recommendAlternativeRooms = (booking: RoomBooking) => {
    return api.recommendAlternativeRooms(booking, rooms, bookings);
  };

  const reallocateBooking = (bookingId: string, targetRoomId: string, reason: string) => {
    // 1. RBAC check
    if (!hasPermission(user.role, 'reallocate_booking')) {
      showToast(`Unauthorized: Role "${user.role}" does not have authority to reallocate bookings`, 'error');
      const secAct: ActivityItem = {
        id: `sec-${Date.now()}`,
        actor: user.name,
        actorRole: user.role,
        avatar: user.avatar || '',
        action: 'blocked unauthorized room reallocation attempt',
        target: `Booking ID: ${bookingId}`,
        category: 'system',
        timestamp: 'Just now',
        badgeText: 'SECURITY BLOCKED',
      };
      setRecentActivities((prev) => [secAct, ...prev]);
      return { success: false, message: 'Unauthorized role for room reallocation' };
    }

    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      showToast('Booking not found', 'error');
      return { success: false, message: 'Booking not found' };
    }

    const targetRoom = rooms.find((r) => r.id === targetRoomId);
    if (!targetRoom) {
      showToast('Target room not found', 'error');
      return { success: false, message: 'Target room not found' };
    }

    // 2. CRITICAL SAFETY & LOGIC CHECK: Target room cannot be disrupted or undergoing maintenance
    if (targetRoom.status === 'disrupted') {
      showToast(`Security block: Target room ${targetRoom.name} is currently disrupted!`, 'error');
      return { success: false, message: `Target room ${targetRoom.name} is disrupted and unavailable for reallocation` };
    }
    if (targetRoom.status === 'maintenance') {
      showToast(`Security block: Target room ${targetRoom.name} is undergoing maintenance!`, 'error');
      return { success: false, message: `Target room ${targetRoom.name} is under maintenance` };
    }

    const attendance = booking.expectedAttendance ?? booking.expectedAttendees;
    if (!isPositiveSafeInteger(attendance)) {
      showToast('Booking attendance is missing or invalid', 'error');
      return { success: false, message: 'Booking attendance is missing or invalid' };
    }
    if (targetRoom.capacity < attendance) {
      showToast(`Target room capacity (${targetRoom.capacity}) cannot accommodate attendance (${attendance})`, 'error');
      return { success: false, message: 'Target room capacity is insufficient' };
    }

    if (!booking.date) {
      showToast('Booking date is missing; reallocation cannot continue', 'error');
      return { success: false, message: 'Booking date is missing' };
    }

    const conflictResult = api.checkBookingConflict(
      targetRoom.id,
      booking.date,
      booking.startTime,
      booking.endTime,
      bookings,
      booking.id
    );

    if (conflictResult.hasConflict && conflictResult.conflictingBooking) {
      showToast('Target room has a booking conflict during that time slot', 'error');
      return { success: false, message: 'Target room is not available during that time window' };
    }

    const safeReason = sanitizeString(reason || 'Emergency reallocation', 250);
    const prevRoomName = booking.roomName;

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              roomId: targetRoom.id,
              roomCode: targetRoom.roomNumber,
              roomName: targetRoom.name,
              buildingId: targetRoom.buildingId,
              buildingName: targetRoom.buildingName,
              status: 'reallocated' as const,
              reallocatedFromRoomId: booking.roomId,
              reallocatedFromRoomName: prevRoomName,
              reallocationReason: safeReason,
              reallocationTimestamp: 'Just now',
            }
          : b
      )
    );

    setRoomDisruptions((prev) =>
      prev.map((d) => {
        if (d.affectedBookingIds && d.affectedBookingIds.includes(bookingId)) {
          return {
            ...d,
            alternativeRoom: targetRoom.name,
            alternativeRoomId: targetRoom.id,
            alternativeRoomName: targetRoom.name,
            status: 'mitigated' as const,
          };
        }
        return d;
      })
    );

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar || '',
      action: 'reallocated emergency booking from',
      target: `${prevRoomName} -> ${targetRoom.name} (${booking.bookingNumber})`,
      category: 'system',
      timestamp: 'Just now',
      badgeText: 'REALLOCATED',
    };
    setRecentActivities((prev) => [newAct, ...prev]);

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: 'Booking Reallocated',
      message: `Session "${booking.purpose}" (${booking.bookingNumber}) relocated from ${prevRoomName} to ${targetRoom.name} (${targetRoom.floor}, ${targetRoom.buildingName}).`,
      timeAgo: 'Just now',
      isRead: false,
      type: 'success',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(`Booking ${booking.bookingNumber} successfully reallocated to ${targetRoom.name}`, 'success');
    return { success: true, message: 'Booking reallocated successfully' };
  };

  const addNotification = (title: string, message: string, type: NotificationItem['type'] = 'info') => {
    const cleanTitle = sanitizeString(title, 120);
    const cleanMsg = sanitizeString(message, 300);

    // Notification deduplication: prevent identical notification titles within 60s
    const dedupKey = `notif-${cleanTitle.toLowerCase()}`;
    const now = Date.now();
    const lastTime = recentSubmissions.get(dedupKey);
    if (lastTime && now - lastTime < 60000) {
      logger.warn('Notification', 'Suppressed duplicate notification within throttle window', { title: cleanTitle });
      return;
    }

    setRecentSubmissions((prev) => new Map(prev).set(dedupKey, now));

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: cleanTitle,
      message: cleanMsg,
      timeAgo: 'Just now',
      isRead: false,
      type,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    showToast('All notifications marked as read', 'info');
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  
  // Phase 2.8: hydrate from the authenticated API. Empty persistent results stay empty.
  const refreshData = async (): Promise<void> => {
    setIsLoadingData(true);
    try {
      const [
        incidentsRes,
        workOrdersRes,
        inventoryRes,
        inventoryItemsRes,
        bookingsRes,
        disruptionsRes,
        approvalsRes,
        notificationsRes,
        transactionsRes,
        procurementRes,
        occupancyRes,
        roomsRes,
        techsRes,
      ] = await Promise.all([
        api.getIncidents(),
        api.getWorkOrders(),
        api.getInventory(),
        api.getInventoryItems(),
        api.getBookings(),
        api.getRoomDisruptions(),
        api.getApprovals(),
        api.getNotifications(),
        api.getStockTransactions(),
        api.getProcurementRequests(),
        api.getOccupancy(),
        api.getRooms(),
        api.getTechnicians().catch((e) => ({ technicians: [], error: e.message })),
      ]);

      setIncidents(incidentsRes.incidents || []);
      setWorkOrders(workOrdersRes.workOrders || []);
      setTechnicians(techsRes?.technicians || []);
      setTechniciansError(techsRes?.error || null);
      setStockAlerts(inventoryRes.items || []);
      setInventoryItems(inventoryItemsRes || []);
      setBookings(bookingsRes.bookings || []);
      setRoomDisruptions(disruptionsRes.disruptions || []);
      setApprovals(approvalsRes.approvals || []);
      setStockTransactions(transactionsRes.transactions || []);
      setProcurementRequests(procurementRes.requests || []);
      setClassrooms(occupancyRes.classrooms || []);
      setRooms(roomsRes || []);
      setNotifications((notificationsRes.notifications || []).map((n) => ({
        id: String(n.id),
        title: String(n.title || 'Campus update'),
        message: String(n.message || ''),
        timeAgo: String(n.timeAgo || n.created_at || 'Just now'),
        isRead: Boolean(n.is_read ?? n.isRead),
        type: (n.type === 'critical' || n.type === 'alert' || n.type === 'success' ? n.type : 'info') as NotificationItem['type'],
      })));

      const anyError = incidentsRes.error || workOrdersRes.error || inventoryRes.error || bookingsRes.error;
      if (anyError) {
        setConnectionError(anyError);
      } else {
        setConnectionError(null);
      }

      const corePersistence = [
        incidentsRes.isPersistent,
        workOrdersRes.isPersistent,
        inventoryRes.isPersistent,
        procurementRes.isPersistent,
        bookingsRes.isPersistent,
        disruptionsRes.isPersistent,
        approvalsRes.isPersistent,
        notificationsRes.isPersistent,
        transactionsRes.isPersistent,
      ].every(Boolean);
      setIsBackendPersistent(corePersistence);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to the CampusOps backend.';
      logger.error('CampusContext', 'Backend sync failed', { message: msg });
      setConnectionError(msg);
      setIsBackendPersistent(false);
      showToast('Could not refresh campus data from the API.', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) void refreshData();
  }, [isAuthLoading, isAuthenticated, user.id]);

  const transitionIncidentStatus = (
    incidentId: string, 
    targetStatus: IncidentLifecycleStatus, 
    remarks?: string, 
    assigneeId?: string, 
    assigneeName?: string
  ): boolean => {
    let updatedTarget: Incident | undefined;

    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;

        const prevLifecycle = inc.lifecycleStatus || 'reported';
        const newTimelineEvent: TimelineEvent = {
          id: `evt-${Date.now()}`,
          incidentId,
          fromStatus: prevLifecycle,
          toStatus: targetStatus,
          actorName: user.name,
          actorRole: user.role,
          remarks: remarks || `Transitioned ticket to ${targetStatus}`,
          createdAt: 'Just now',
        };

        const updated: Incident = {
          ...inc,
          lifecycleStatus: targetStatus,
          status: targetStatus === 'resolved' ? 'resolved' : targetStatus === 'closed' ? 'closed' : 'in_progress',
          timeline: [...(inc.timeline || []), newTimelineEvent],
        };

        if (assigneeName) {
          updated.assignedTo = assigneeName;
          updated.assignedEngineerId = assigneeId;
        }

        if (targetStatus === 'acknowledged') {
          updated.acknowledgedAt = 'Just now';
        } else if (targetStatus === 'resolved') {
          updated.resolvedAt = 'Just now';
          updated.slaDeadline = 'Resolved';
        } else if (targetStatus === 'closed') {
          updated.closedAt = 'Just now';
          updated.closedBy = user.id;
          updated.slaDeadline = 'Closed';
        }

        updatedTarget = updated;
        return updated;
      })
    );

    if (updatedTarget) {
      (api as any).transitionIncident?.(incidentId, targetStatus, remarks, assigneeId, assigneeName).catch(() => {});
      showToast(`Incident ${(updatedTarget as Incident).ticketNumber} transitioned to ${targetStatus}`, 'info');
      return true;
    }
    return false;
  };

  const createWorkOrderForIncident = (
    incidentId: string, 
    orderData: Partial<WorkOrder>
  ): { success: boolean; workOrder?: WorkOrder; error?: string } => {
    const existingActive = workOrders.find(
      (w) => w.incidentId === incidentId && w.status !== 'completed' && w.status !== 'verified'
    );
    if (existingActive) {
      const errorMsg = `Duplicate prevented: Active Work Order ${existingActive.orderNumber} already exists for this incident.`;
      showToast(errorMsg, 'error');
      return { success: false, error: errorMsg };
    }

    const incident = incidents.find((i) => i.id === incidentId);
    const orderNumber = `WO-${Math.floor(8820 + Math.random() * 150)}`;
    const newOrder: WorkOrder = {
      id: `wo-${Date.now()}`,
      orderNumber,
      title: orderData.title || `Maintenance: ${incident?.title || 'Reported Issue'}`,
      category: orderData.category || incident?.category || 'General Civil Works',
      buildingId: orderData.buildingId || incident?.buildingId || 'A1',
      buildingName: orderData.buildingName || incident?.buildingName || 'Academic Block',
      location: orderData.location || `${incident?.floor || ''} ${incident?.room || ''}`.trim() || 'Campus Facilities',
      priority: orderData.priority || (incident?.severity === 'critical' ? 'urgent' : incident?.severity === 'high' ? 'high' : 'medium'),
      status: orderData.status || (orderData.assignedEngineer ? 'in_progress' : 'unassigned'),
      assignedEngineer: orderData.assignedEngineer || incident?.assignedTo || 'Unassigned',
      assignedEngineerId: orderData.assignedEngineerId || incident?.assignedEngineerId,
      engineerAvatar: orderData.engineerAvatar || '',
      dueDate: orderData.dueDate || 'Today, 5:00 PM',
      slaRemaining: '4h 00m',
      completionRate: 0,
      partsRequired: orderData.partsRequired || [],
      incidentId,
      repairInstructions: orderData.repairInstructions || incident?.description,
    };

    setWorkOrders((prev) => [newOrder, ...prev]);

    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.id !== incidentId) return inc;
        return {
          ...inc,
          workOrderId: newOrder.id,
          lifecycleStatus: 'in_progress',
          status: 'in_progress',
        };
      })
    );

    showToast(`Work Order #${newOrder.orderNumber} issued`, 'success');
    return { success: true, workOrder: newOrder };
  };

  const resolveIncidentWithWorkOrder = (
    workOrderId: string, 
    completionNotes: string
  ): { success: boolean; error?: string } => {
    const wo = workOrders.find((w) => w.id === workOrderId);
    if (!wo) return { success: false, error: 'Work order not found' };

    setWorkOrders((prev) =>
      prev.map((w) =>
        w.id === workOrderId
          ? { ...w, status: 'completed', completionRate: 100, completionNotes }
          : w
      )
    );

    if (wo.incidentId) {
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc.id !== wo.incidentId) return inc;
          return {
            ...inc,
            lifecycleStatus: 'resolved',
            status: 'resolved',
            resolvedAt: 'Just now',
            slaDeadline: 'Resolved',
          };
        })
      );
    }

    showToast(`Work Order ${wo.orderNumber} completed & linked incident resolved`, 'success');
    return { success: true };
  };

  const refreshTechnicians = async (): Promise<void> => {
    setIsLoadingTechnicians(true);
    setTechniciansError(null);
    try {
      const res = await api.getTechnicians();
      if (res.error) {
        setTechniciansError(res.error);
        setTechnicians([]);
      } else {
        setTechnicians(res.technicians || []);
        setTechniciansError(null);
      }
    } catch (err: any) {
      setTechniciansError(err?.message || 'Failed to load technicians');
      setTechnicians([]);
    } finally {
      setIsLoadingTechnicians(false);
    }
  };

  const allocateWorkOrderToTechnician = async (
    workOrderId: string, 
    technicianId: string, 
    technicianName?: string
  ): Promise<{ success: boolean; message?: string; workOrder?: WorkOrder }> => {
    try {
      const res = await api.allocateWorkOrder(workOrderId, technicianId, technicianName);
      if (res.success && res.workOrder) {
        setWorkOrders((prev) =>
          prev.map((w) => (w.id === workOrderId ? res.workOrder! : w))
        );
        showToast(`Work order allocated to ${res.workOrder.assignedEngineer}`, 'success');
        return { success: true, message: 'Work order allocated successfully', workOrder: res.workOrder };
      }
      const err = res.error || 'Failed to allocate technician to work order';
      showToast(err, 'error');
      return { success: false, message: err };
    } catch (err: any) {
      const msg = err?.message || 'Network error allocating work order';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const allocateStockToWorkOrder = (
    workOrderId: string, 
    sku: string, 
    quantity: number
  ): { success: boolean; error?: string; createdRequisition?: boolean } => {
    const item = stockAlerts.find((s) => s.sku.toLowerCase() === sku.toLowerCase());
    if (!item) return { success: false, error: 'Item not found' };

    if (item.currentStock < quantity) {
      const errorMsg = `Insufficient stock for ${item.itemName}`;
      showToast(errorMsg, 'error');
      return { success: false, error: errorMsg, createdRequisition: true };
    }

    return { success: true };
  };

  const createProcurementRequisition = (
    sku: string, 
    quantity: number, 
    workOrderId?: string, 
    urgency: 'high' | 'medium' = 'high'
  ): ApprovalRequest => {
    const item = stockAlerts.find((s) => s.sku.toLowerCase() === sku.toLowerCase());
    const newReq: ApprovalRequest = {
      id: `app-proc-${Date.now()}`,
      title: `Procurement Requisition: ${item?.itemName || sku} (${quantity})`,
      category: 'Spares & Machinery',
      requestType: 'procurement',
      requesterId: user.id,
      requesterName: user.name,
      requesterRole: user.role,
      department: user.department || 'Campus Facilities',
      estimatedCost: `₹${((item?.unitCost || 1800) * quantity).toLocaleString('en-IN')}`,
      urgency,
      status: 'pending',
      submittedAt: 'Just now',
      reason: `Restock for ${item?.itemName || sku}`,
      entityId: sku,
    };
    setApprovals((prev) => [newReq, ...prev]);
    showToast('Procurement requisition submitted', 'info');
    return newReq;
  };

  const receiveGoods = (
    sku: string, 
    quantity: number, 
    receiptToken: string
  ): { success: boolean; isIdempotentReplay?: boolean; error?: string } => {
    if (processedTokensRef.current.has(receiptToken)) {
      showToast('Shipment already processed', 'info');
      return { success: true, isIdempotentReplay: true };
    }
    processedTokensRef.current.add(receiptToken);
    showToast(`Received ${quantity} items (Token: ${receiptToken})`, 'success');
    return { success: true };
  };

  const addBooking = (
    bookingData: Omit<RoomBooking, 'id' | 'bookingCode' | 'createdAt'>
  ): { success: boolean; booking?: RoomBooking; error?: string } => {
    const bookingCode = `BK-${Math.floor(920 + Math.random() * 70)}`;
    const newBooking: RoomBooking = {
      ...bookingData,
      id: `book-${Date.now()}`,
      bookingCode,
      createdAt: 'Just now',
      status: 'confirmed',
    };
    setBookings((prev) => [newBooking, ...prev]);
    showToast(`Reservation #${bookingCode} confirmed`, 'success');
    return { success: true, booking: newBooking };
  };

  const approveRoomRelocation = (
    disruptionId: string, 
    bookingId: string, 
    targetRoomCode: string
  ): { success: boolean; error?: string } => {
    setRoomDisruptions((prev) =>
      prev.map((d) => (d.id === disruptionId ? { ...d, status: 'mitigated', alternativeRoom: targetRoomCode } : d))
    );
    showToast(`Relocated to ${targetRoomCode}`, 'success');
    return { success: true };
  };

  const performFacultyCheckIn = (roomCode: string) => {
    setClassrooms((prev) =>
      prev.map((c) => (c.roomCode === roomCode ? { ...c, status: 'occupied', lastUpdated: 'Just now' } : c))
    );
    showToast(`Faculty check-in confirmed for ${roomCode}`, 'success');
  };

  const updateClassroomOccupancyStatus = (roomCode: string, status: OccupancyStatus) => {
    setClassrooms((prev) =>
      prev.map((c) => (c.roomCode === roomCode ? { ...c, status, lastUpdated: 'Just now' } : c))
    );
    showToast(`Room ${roomCode} updated to ${status}`, 'info');
  };

  return (
    <CampusContext.Provider
      value={{

        // Phase 2.8 Cross-module, Occupancy & Navigation values
        inventory: stockAlerts,
        selectedIncidentId,
        setSelectedIncidentId,
        transitionIncidentStatus,
        selectedWorkOrderId,
        setSelectedWorkOrderId,
        createWorkOrderForIncident,
        resolveIncidentWithWorkOrder,
        allocateStockToWorkOrder,
        createProcurementRequisition,
        receiveGoods,
        addBooking,
        approveRoomRelocation,
        classrooms,
        performFacultyCheckIn,
        updateClassroomOccupancyStatus,
        selectedRoomCode,
        setSelectedRoomCode,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        isBackendPersistent,
        isLoadingData,
        connectionError,
        refreshData,
        retryConnection: refreshData,
        user,
        setUserRole,
        incidents,
        addIncident,
        updateIncidentStatus,
        workOrders,
        addWorkOrder,
        updateWorkOrderStatus,
        allocateWorkOrderToTechnician,
        technicians,
        isLoadingTechnicians,
        techniciansError,
        refreshTechnicians,
        stockAlerts,
        roomDisruptions,
        aiInsights,
        recentActivities,
        approvals,
        approveRequest,
        rejectRequest,
        buildings,
        selectedBuildingId,
        setSelectedBuildingId,

        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isCopilotOpen,
        setIsCopilotOpen,
        isReportIncidentOpen,
        setIsReportIncidentOpen,
        isCreateWorkOrderOpen,
        setIsCreateWorkOrderOpen,
        isCreateBookingOpen,
        setIsCreateBookingOpen,
        isReportDisruptionOpen,
        setIsReportDisruptionOpen,
        isReallocateModalOpen,
        setIsReallocateModalOpen,
        selectedBookingForReallocation,
        setSelectedBookingForReallocation,
        isNotificationDrawerOpen,
        setIsNotificationDrawerOpen,
        isSidebarCollapsed,
        setIsSidebarCollapsed,

        notifications,
        unreadNotificationCount,
        addNotification,
        markAllNotificationsRead,
        markNotificationRead,

        toastMessage,
        showToast,

        // Phase 2.4: Inventory & Intelligent Procurement
        inventoryItems,
        stockTransactions,
        procurementRequests,
        performStockOperation,
        createProcurement,
        approveProcurement,
        rejectProcurement,
        orderProcurement,
        receiveProcurementStock,
        allocatePartToWorkOrder,
        returnPartFromWorkOrder,

        // Phase 2.5: Room Booking & Emergency Operations
        rooms,
        bookings,
        createBooking,
        cancelBooking,
        approveBooking,
        rejectBooking,
        checkBookingConflict,
        reportRoomDisruption,
        resolveRoomDisruption,
        recommendAlternativeRooms,
        reallocateBooking,
      }}
    >
      {children}
    </CampusContext.Provider>
  );
};

export const useCampus = () => {
  const context = useContext(CampusContext);
  if (!context) {
    throw new Error('useCampus must be used within a CampusProvider');
  }
  return context;
};

