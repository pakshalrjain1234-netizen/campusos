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
  UserProfile 
} from '../types';
import { 
  DEMO_INCIDENTS, 
  DEMO_WORK_ORDERS, 
  DEMO_STOCK_ALERTS, 
  DEMO_ROOM_DISRUPTIONS, 
  DEMO_AI_INSIGHTS, 
  DEMO_RECENT_ACTIVITIES, 
  DEMO_PENDING_APPROVALS,
  CURRENT_USER 
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

  const approveRequest = (id: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' as const } : item))
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

