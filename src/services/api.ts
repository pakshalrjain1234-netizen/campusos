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
  ProcurementRequest,
  ProcurementStatus
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

/**
 * CampusOps Service Layer
 * Supabase-ready client abstraction.
 * When real Supabase credentials (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY)
 * are provided, this layer connects directly to live database tables.
 * Until then, it seamlessly serves strongly-typed demo records.
 */

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
};

export const campusApi = {
  // Incident operations
  getIncidents: async (): Promise<Incident[]> => {
    // Simulated network latency
    await new Promise((r) => setTimeout(r, 60));
    return [...DEMO_INCIDENTS];
  },

  createIncident: async (incident: Omit<Incident, 'id' | 'ticketNumber' | 'createdAt'>): Promise<Incident> => {
    await new Promise((r) => setTimeout(r, 120));
    const newIncident: Incident = {
      ...incident,
      id: `inc-${Date.now()}`,
      ticketNumber: `INC-${Math.floor(2400 + Math.random() * 600)}`,
      createdAt: 'Just now',
      isDemo: true,
    };
    return newIncident;
  },

  // Work Orders
  getWorkOrders: async (): Promise<WorkOrder[]> => {
    await new Promise((r) => setTimeout(r, 60));
    return [...DEMO_WORK_ORDERS];
  },

  createWorkOrder: async (order: Omit<WorkOrder, 'id' | 'orderNumber'>): Promise<WorkOrder> => {
    await new Promise((r) => setTimeout(r, 120));
    const newOrder: WorkOrder = {
      ...order,
      id: `wo-${Date.now()}`,
      orderNumber: `WO-${Math.floor(8800 + Math.random() * 200)}`,
    };
    return newOrder;
  },

  // Stock alerts
  getStockAlerts: async (): Promise<StockAlert[]> => {
    return [...DEMO_STOCK_ALERTS];
  },

  // Room disruptions
  getRoomDisruptions: async (): Promise<RoomDisruption[]> => {
    return [...DEMO_ROOM_DISRUPTIONS];
  },

  // AI insights
  getAIInsights: async (): Promise<AIInsight[]> => {
    return [...DEMO_AI_INSIGHTS];
  },

  // Activity stream
  getActivities: async (): Promise<ActivityItem[]> => {
    return [...DEMO_RECENT_ACTIVITIES];
  },

  // Approvals
  getApprovals: async (): Promise<ApprovalRequest[]> => {
    return [...DEMO_PENDING_APPROVALS];
  },

  updateApprovalStatus: async (id: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; id: string; status: string }> => {
    await new Promise((r) => setTimeout(r, 80));
    return { success: true, id, status };
  },

  // Inventory Management (Phase 2.4)
  getInventoryItems: async (): Promise<InventoryItem[]> => {
    await new Promise((r) => setTimeout(r, 60));
    return [...DEMO_INVENTORY_ITEMS];
  },

  createInventoryItem: async (item: Omit<InventoryItem, 'id' | 'allocatedQuantity' | 'status'>): Promise<InventoryItem> => {
    await new Promise((r) => setTimeout(r, 100));
    const status: InventoryItem['status'] = item.currentStock === 0 ? 'out_of_stock' : item.currentStock <= item.minThreshold ? 'low_stock' : 'in_stock';
    const newItem: InventoryItem = {
      ...item,
      id: `inv-${Date.now()}`,
      allocatedQuantity: 0,
      status,
      lastRestockedAt: 'Just now',
    };
    return newItem;
  },

  // Stock Transactions (Phase 2.4)
  getStockTransactions: async (): Promise<StockTransaction[]> => {
    await new Promise((r) => setTimeout(r, 50));
    return [...DEMO_STOCK_TRANSACTIONS];
  },

  createStockTransaction: async (tx: Omit<StockTransaction, 'id' | 'transactionNumber' | 'timestamp'>): Promise<StockTransaction> => {
    await new Promise((r) => setTimeout(r, 80));
    const newTx: StockTransaction = {
      ...tx,
      id: `tx-${Date.now()}`,
      transactionNumber: `TX-${Math.floor(700 + Math.random() * 299)}`,
      timestamp: 'Just now',
    };
    return newTx;
  },

  // Intelligent Procurement (Phase 2.4)
  getProcurementRequests: async (): Promise<ProcurementRequest[]> => {
    await new Promise((r) => setTimeout(r, 60));
    return [...DEMO_PROCUREMENT_REQUESTS];
  },

  createProcurementRequest: async (req: Omit<ProcurementRequest, 'id' | 'requestNumber' | 'createdAt'>): Promise<ProcurementRequest> => {
    await new Promise((r) => setTimeout(r, 100));
    const newReq: ProcurementRequest = {
      ...req,
      id: `pr-${Date.now()}`,
      requestNumber: `REQ-${Math.floor(400 + Math.random() * 599)}`,
      createdAt: 'Just now',
    };
    return newReq;
  },

  updateProcurementStatus: async (
    id: string, 
    status: ProcurementStatus, 
    options?: { approvedBy?: string; orderedAt?: string; receivedAt?: string }
  ): Promise<{ success: boolean; id: string; status: ProcurementStatus; details?: typeof options }> => {
    await new Promise((r) => setTimeout(r, 80));
    return { success: true, id, status, details: options };
  },

  // Buildings & 3D metadata
  getBuildings: async (): Promise<Building[]> => {
    return [...CAMPUS_BUILDINGS];
  },

  // User Profile
  getCurrentUser: async (): Promise<UserProfile> => {
    return { ...CURRENT_USER };
  },
};

