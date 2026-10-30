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
  WorkOrderPartAllocation
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
  DEMO_PROCUREMENT_REQUESTS
} from '../data/demoData';
import { CAMPUS_BUILDINGS } from '../data/buildingsData';

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
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
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
  const [roomDisruptions] = useState<RoomDisruption[]>(DEMO_ROOM_DISRUPTIONS);
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

  // Phase 2.4: Stock Operation (atomic, audit-logged, prevents negative stock)
  const performStockOperation = (params: {
    itemId: string;
    type: StockTransactionType;
    quantity: number;
    reason: string;
    referenceType?: StockTransaction['referenceType'];
    referenceId?: string;
  }) => {
    const item = inventoryItems.find((i) => i.id === params.itemId);
    if (!item) {
      showToast('Item not found in inventory', 'error');
      return { success: false, message: 'Item not found' };
    }

    if (params.quantity <= 0) {
      showToast('Quantity must be greater than zero', 'error');
      return { success: false, message: 'Quantity must be greater than zero' };
    }

    // Prevent negative inventory for stock deductions
    if ((params.type === 'stock_out' || params.type === 'allocation') && item.currentStock < params.quantity) {
      showToast(`Cannot deduct ${params.quantity} ${item.unit}. Only ${item.currentStock} in stock.`, 'error');
      return { success: false, message: 'Insufficient stock' };
    }

    let newStock = item.currentStock;
    if (params.type === 'stock_in' || params.type === 'return') {
      newStock += params.quantity;
    } else if (params.type === 'stock_out' || params.type === 'allocation') {
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
      reason: params.reason || `${params.type.replace('_', ' ')} recorded`,
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

    const item = inventoryItems.find((i) => i.id === itemId);
    if (!item) {
      showToast('Item not found in inventory', 'error');
      return { success: false, message: 'Item not found' };
    }

    if (quantity <= 0) {
      showToast('Quantity must be greater than zero', 'error');
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
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' as const } : item))
    );
    // Also sync with procurement requests
    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'approved' as const, approvedBy: `${user.name} (${user.role})` } : r
      )
    );
    const target = approvals.find((a) => a.id === id);
    if (target) {
      const newAct: ActivityItem = {
        id: `act-${Date.now()}`,
        actor: user.name,
        actorRole: user.role,
        avatar: user.avatar,
        action: 'approved requisition for',
        target: target.title,
        category: 'approval',
        timestamp: 'Just now',
        badgeText: 'Approved',
      };
      setRecentActivities((prev) => [newAct, ...prev]);
      showToast(`Request "${target.title.slice(0, 30)}..." approved`, 'success');
    }
  };

  const rejectRequest = (id: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'rejected' as const } : item))
    );
    setProcurementRequests((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: 'rejected' as const } : r
      )
    );
    const target = approvals.find((a) => a.id === id);
    if (target) {
      showToast(`Request "${target.title.slice(0, 30)}..." declined`, 'info');
    }
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

