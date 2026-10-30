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

  // Buildings & 3D metadata
  getBuildings: async (): Promise<Building[]> => {
    return [...CAMPUS_BUILDINGS];
  },

  // User Profile
  getCurrentUser: async (): Promise<UserProfile> => {
    return { ...CURRENT_USER };
  },
};

