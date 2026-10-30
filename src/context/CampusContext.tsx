import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  DisruptionSeverity
} from '../types';
import { 
  DEMO_INCIDENTS, 
  DEMO_WORK_ORDERS, 
  DEMO_STOCK_ALERTS, 
  DEMO_ROOM_DISRUPTIONS, 
  DEMO_AI_INSIGHTS, 
  DEMO_RECENT_ACTIVITIES, 
  DEMO_PENDING_APPROVALS,
  CURRENT_USER,
  DEMO_INVENTORY_ITEMS,
  DEMO_STOCK_TRANSACTIONS,
  DEMO_PROCUREMENT_REQUESTS,
  DEMO_ROOMS,
  DEMO_ROOM_BOOKINGS
} from '../data/demoData';
import { CAMPUS_BUILDINGS } from '../data/buildingsData';
import { api } from '../services/api';
import { 
  hasPermission, 
  authorizeApprovalAction, 
  sanitizeString, 
  isValidDateFormat, 
  isValidTimeWindow, 
  isPositiveSafeInteger, 
  isNonNegativeNumber 
} from '../utils/security';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  isRead: boolean;
  type: 'critical' | 'alert' | 'success' | 'info';
}

interface CampusContextType {
  user: UserProfile;
  setUserRole: (role: UserProfile['role']) => void;
  incidents: Incident[];
  addIncident: (incident: Omit<Incident, 'id' | 'ticketNumber' | 'createdAt'>) => void;
  workOrders: WorkOrder[];
  addWorkOrder: (order: Omit<WorkOrder, 'id' | 'orderNumber'>) => void;
  stockAlerts: StockAlert[];
  roomDisruptions: RoomDisruption[];
  aiInsights: AIInsight[];
  recentActivities: ActivityItem[];
  approvals: ApprovalRequest[];
  approveRequest: (id: string) => { success: boolean; message: string };
  rejectRequest: (id: string, reason?: string) => { success: boolean; message: string };
  buildings: Building[];
  selectedBuildingId: string | null;
  setSelectedBuildingId: (id: string | null) => void;
  
  // UI states
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
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
  }) => { success: boolean; message: string };
  approveProcurement: (id: string) => void;
  rejectProcurement: (id: string) => void;
  orderProcurement: (id: string) => void;
  receiveProcurementStock: (id: string) => void;

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
  ) => { success: boolean; message: string; booking?: RoomBooking };
  cancelBooking: (bookingId: string, reason?: string) => { success: boolean; message: string };
  approveBooking: (bookingId: string) => void;
  rejectBooking: (bookingId: string, reason?: string) => void;
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

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'High Thermal Warning in IT Server Annex',
    message: 'Ambient temp exceeded 26°C. Auto-ticket INC-2401 logged.',
    timeAgo: '15m ago',
    isRead: false,
    type: 'critical',
  },
  {
    id: 'notif-2',
    title: 'Purchase Order Approval Needed',
    message: '12x Cat6 Cable Spools requisition submitted by Computing Services.',
    timeAgo: '45m ago',
    isRead: false,
    type: 'alert',
  },
  {
    id: 'notif-3',
    title: 'Preventive Overhaul Scheduled',
    message: 'Mechanical Lathe #4 downtime scheduled for 5:00 PM today.',
    timeAgo: '1h ago',
    isRead: false,
    type: 'info',
  },
  {
    id: 'notif-4',
    title: 'Smart Card Access Terminal Re-calibrated',
    message: 'Architecture South Entrance card reader back online.',
    timeAgo: '2h ago',
    isRead: true,
    type: 'success',
  },
];

const CampusContext = createContext<CampusContextType | undefined>(undefined);

export const CampusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(CURRENT_USER);
  const [incidents, setIncidents] = useState<Incident[]>(DEMO_INCIDENTS);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(DEMO_WORK_ORDERS);
  const [stockAlerts] = useState<StockAlert[]>(DEMO_STOCK_ALERTS);
  const [roomDisruptions, setRoomDisruptions] = useState<RoomDisruption[]>(DEMO_ROOM_DISRUPTIONS);
  const [rooms, setRooms] = useState<Room[]>(DEMO_ROOMS);
  const [bookings, setBookings] = useState<RoomBooking[]>(DEMO_ROOM_BOOKINGS);
  const [aiInsights] = useState<AIInsight[]>(DEMO_AI_INSIGHTS);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>(DEMO_RECENT_ACTIVITIES);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(DEMO_PENDING_APPROVALS);
  const [buildings] = useState<Building[]>(CAMPUS_BUILDINGS);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  // Phase 2.4: Inventory & Procurement State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(DEMO_INVENTORY_ITEMS);
  const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>(DEMO_STOCK_TRANSACTIONS);
  const [procurementRequests, setProcurementRequests] = useState<ProcurementRequest[]>(DEMO_PROCUREMENT_REQUESTS);

  // Modals & Panels
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isReportIncidentOpen, setIsReportIncidentOpen] = useState(false);
  const [isCreateWorkOrderOpen, setIsCreateWorkOrderOpen] = useState(false);
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false);
  const [isReportDisruptionOpen, setIsReportDisruptionOpen] = useState(false);
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);
  const [selectedBookingForReallocation, setSelectedBookingForReallocation] = useState<RoomBooking | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Keyboard shortcut for Command Palette (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
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
    setUser((prev) => ({ ...prev, role }));
    showToast(`Role switched to ${role}`, 'info');
  };

  const addIncident = (newIncidentData: Omit<Incident, 'id' | 'ticketNumber' | 'createdAt'>) => {
    const newInc: Incident = {
      ...newIncidentData,
      id: `inc-${Date.now()}`,
      ticketNumber: `INC-${Math.floor(2400 + Math.random() * 600)}`,
      createdAt: 'Just now',
      isDemo: true,
    };
    setIncidents((prev) => [newInc, ...prev]);

    // Also add to recent activities
    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar,
      action: 'reported new campus incident',
      target: `${newInc.ticketNumber}: ${newInc.title}`,
      category: 'incident',
      timestamp: 'Just now',
      badgeText: newInc.severity.toUpperCase(),
    };
    setRecentActivities((prev) => [newAct, ...prev]);
    showToast(`Incident #${newInc.ticketNumber} successfully submitted`, 'success');
  };

  const addWorkOrder = (newOrderData: Omit<WorkOrder, 'id' | 'orderNumber'>) => {
    const newOrder: WorkOrder = {
      ...newOrderData,
      id: `wo-${Date.now()}`,
      orderNumber: `WO-${Math.floor(8820 + Math.random() * 150)}`,
    };
    setWorkOrders((prev) => [newOrder, ...prev]);
    showToast(`Work Order #${newOrder.orderNumber} issued`, 'success');
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
        avatar: user.avatar,
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
      itemName: item.name,
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
      avatar: user.avatar,
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
  const createProcurement = (params: {
    itemId: string;
    quantity: number;
    reason: string;
    urgency?: ProcurementUrgency;
  }) => {
    const item = inventoryItems.find((i) => i.id === params.itemId);
    if (!item) {
      showToast('Inventory item not found', 'error');
      return { success: false, message: 'Item not found' };
    }

    const urgency = params.urgency || (item.currentStock === 0 ? 'urgent' : item.currentStock <= item.minThreshold / 2 ? 'high' : 'medium');
    const totalCost = item.unitCost * params.quantity;
    const reqNum = `REQ-${Math.floor(420 + Math.random() * 500)}`;

    const newReq: ProcurementRequest = {
      id: `pr-${Date.now()}`,
      requestNumber: reqNum,
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.name,
      category: item.category,
      quantity: params.quantity,
      unit: item.unit,
      estimatedUnitCost: item.unitCost,
      totalEstimatedCost: totalCost,
      supplierName: item.supplierName,
      supplierContact: item.supplierContact,
      urgency,
      status: 'pending_approval',
      reason: params.reason,
      ruleTriggerReason: `Rule: Current stock (${item.currentStock} ${item.unit}) <= Min threshold (${item.minThreshold} ${item.unit})`,
      requestedBy: user.name,
      createdAt: 'Just now',
    };

    setProcurementRequests((prev) => [newReq, ...prev]);

    // Mirror to general approvals list
    const newApproval: ApprovalRequest = {
      id: newReq.id,
      title: `${newReq.requestNumber}: Requisition for ${newReq.quantity}x ${item.name}`,
      category: `${item.category} Procurement`,
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
      avatar: user.avatar,
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

  const approveProcurement = (id: string) => {
    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'approved' as const, approvedBy: `${user.name} (${user.role})` } : r
      )
    );
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'approved' as const } : a))
    );

    const target = procurementRequests.find((r) => r.id === id);
    if (target) {
      const newAct: ActivityItem = {
        id: `act-${Date.now()}`,
        actor: user.name,
        actorRole: user.role,
        avatar: user.avatar,
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

  const rejectProcurement = (id: string) => {
    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'rejected' as const } : r
      )
    );
    setApprovals((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'rejected' as const } : a))
    );
    const target = procurementRequests.find((r) => r.id === id);
    if (target) {
      showToast(`Procurement #${target.requestNumber} declined`, 'info');
    }
  };

  const orderProcurement = (id: string) => {
    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'ordered' as const, orderedAt: 'Just now' } : r
      )
    );
    const target = procurementRequests.find((r) => r.id === id);
    if (target) {
      showToast(`Purchase Order dispatched to ${target.supplierName}`, 'info');
    }
  };

  const receiveProcurementStock = (id: string) => {
    const target = procurementRequests.find((r) => r.id === id);
    if (!target) return;

    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'received' as const, receivedAt: 'Just now' } : r
      )
    );

    performStockOperation({
      itemId: target.itemId,
      type: 'stock_in',
      quantity: target.quantity,
      reason: `Procurement receipt for ${target.requestNumber} from ${target.supplierName}`,
      referenceType: 'procurement',
      referenceId: target.requestNumber,
    });

    showToast(`Received ${target.quantity} ${target.unit} of ${target.itemName}. Added to stock!`, 'success');
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
      itemName: item.name,
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

  const approveRequest = (id: string) => {
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
        avatar: user.avatar,
        action: `blocked unauthorized approval attempt (${authCheck.code})`,
        target: target.title,
        category: 'approval',
        timestamp: 'Just now',
        badgeText: 'SECURITY BLOCKED',
      };
      setRecentActivities((prev) => [secAct, ...prev]);
      return { success: false, message: authCheck.reason || 'Approval unauthorized' };
    }

    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' as const } : item))
    );
    // Also sync with procurement requests
    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'approved' as const, approvedBy: `${user.name} (${user.role})` } : r
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
      avatar: user.avatar,
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

  const rejectRequest = (id: string, reason?: string) => {
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
        avatar: user.avatar,
        action: `blocked unauthorized decline attempt (${authCheck.code})`,
        target: target.title,
        category: 'approval',
        timestamp: 'Just now',
        badgeText: 'SECURITY BLOCKED',
      };
      setRecentActivities((prev) => [secAct, ...prev]);
      return { success: false, message: authCheck.reason || 'Decline unauthorized' };
    }

    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'rejected' as const } : item))
    );
    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'rejected' as const } : r
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

  const createBooking = (bookingData: Omit<RoomBooking, 'id' | 'bookingNumber' | 'createdAt'>) => {
    const sanitizedPurpose = sanitizeString(bookingData.purpose, 250);
    const sanitizedBookedBy = sanitizeString(bookingData.bookedBy, 120);
    const sanitizedDept = sanitizeString(bookingData.department, 120);
    const sanitizedNotes = bookingData.notes ? sanitizeString(bookingData.notes, 500) : undefined;

    if (!sanitizedPurpose) {
      showToast('Booking purpose is required and cannot be blank', 'error');
      return { success: false, message: 'Booking purpose is required' };
    }

    if (!isValidDateFormat(bookingData.date)) {
      showToast('Date must be in valid YYYY-MM-DD format', 'error');
      return { success: false, message: 'Invalid booking date format' };
    }

    const timeWindow = isValidTimeWindow(bookingData.startTime, bookingData.endTime);
    if (!timeWindow.valid) {
      showToast(timeWindow.error || 'Invalid time window', 'error');
      return { success: false, message: timeWindow.error || 'Invalid time window' };
    }

    if (!isPositiveSafeInteger(bookingData.expectedAttendance)) {
      showToast('Expected attendance must be a positive whole number', 'error');
      return { success: false, message: 'Expected attendance must be a positive whole number' };
    }

    const room = rooms.find((r) => r.id === bookingData.roomId);
    if (!room) {
      showToast('Selected room not found', 'error');
      return { success: false, message: 'Room not found' };
    }

    if (bookingData.expectedAttendance > room.capacity) {
      showToast(`Attendance (${bookingData.expectedAttendance}) exceeds room capacity (${room.capacity})`, 'error');
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
      room.capacity >= 80 ||
      room.roomType === 'auditorium' ||
      user.role === 'Student Affairs Liaison';
    const approvalId = needsApproval ? `appr-bk-${Date.now()}` : undefined;

    const newBooking: RoomBooking = {
      ...bookingData,
      purpose: sanitizedPurpose,
      bookedBy: sanitizedBookedBy || user.name,
      department: sanitizedDept || user.department,
      notes: sanitizedNotes,
      id: `bk-${Date.now()}`,
      bookingNumber: `BK-2026-${Math.floor(100 + Math.random() * 899)}`,
      status: needsApproval ? 'pending' : 'approved',
      requiresApproval: needsApproval,
      approvalRequestId: approvalId,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    setBookings((prev) => [newBooking, ...prev]);

    if (needsApproval && approvalId) {
      const newApproval: ApprovalRequest = {
        id: approvalId,
        title: `Room Reservation: ${room.name} (${newBooking.bookingNumber})`,
        category: 'Room Reservation',
        requesterName: bookingData.bookedBy,
        requesterRole: bookingData.bookedByRole,
        department: bookingData.department,
        estimatedCost: 'N/A (Facility)',
        urgency: 'medium',
        status: 'pending',
        submittedAt: 'Just now',
        reason: `${bookingData.purpose} | ${bookingData.date} (${bookingData.startTime} - ${bookingData.endTime}) | ${bookingData.expectedAttendance} attendees`,
      };
      setApprovals((prev) => [newApproval, ...prev]);
    }

    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor: user.name,
      actorRole: user.role,
      avatar: user.avatar,
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

  const cancelBooking = (bookingId: string, reason?: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) {
      showToast('Booking not found', 'error');
      return { success: false, message: 'Booking not found' };
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
      avatar: user.avatar,
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

  const approveBooking = (bookingId: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

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

  const rejectBooking = (bookingId: string, reason?: string) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

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
        avatar: user.avatar,
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
      avatar: user.avatar,
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
        avatar: user.avatar,
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
      avatar: user.avatar,
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
        avatar: user.avatar,
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

    if (targetRoom.capacity < booking.expectedAttendance) {
      showToast(`Target room capacity (${targetRoom.capacity}) cannot accommodate attendance (${booking.expectedAttendance})`, 'error');
      return { success: false, message: 'Target room capacity is insufficient' };
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
      avatar: user.avatar,
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

  return (
    <CampusContext.Provider
      value={{
        user,
        setUserRole,
        incidents,
        addIncident,
        workOrders,
        addWorkOrder,
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

