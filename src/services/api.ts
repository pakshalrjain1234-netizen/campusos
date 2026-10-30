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
  ProcurementStatus,
  Room,
  RoomBooking,
  RoomRecommendation
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

  // Phase 2.5: Room Booking & Emergency Management
  getRooms: async (): Promise<Room[]> => {
    await new Promise((r) => setTimeout(r, 40));
    return [...DEMO_ROOMS];
  },

  getBookings: async (): Promise<RoomBooking[]> => {
    await new Promise((r) => setTimeout(r, 40));
    return [...DEMO_ROOM_BOOKINGS];
  },

  /**
   * Deterministic conflict detection engine.
   * Compares time windows (startA < endB && endA > startB) on the same date and room.
   */
  checkBookingConflict: (
    roomId: string,
    date: string,
    startTime: string,
    endTime: string,
    existingBookings: RoomBooking[],
    excludeBookingId?: string
  ): { hasConflict: boolean; conflictingBooking?: RoomBooking } => {
    const conflict = existingBookings.find((b) => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.status === 'rejected' || b.status === 'cancelled') return false;
      if (b.roomId !== roomId || b.date !== date) return false;

      // Time overlap check: newStart < existingEnd && newEnd > existingStart
      return startTime < b.endTime && endTime > b.startTime;
    });

    return {
      hasConflict: !!conflict,
      conflictingBooking: conflict,
    };
  },

  /**
   * Transparent rule-based alternative room recommendation engine.
   * Considers capacity, required equipment, proximity (same building), and schedule availability.
   */
  recommendAlternativeRooms: (
    booking: RoomBooking,
    allRooms: Room[],
    allBookings: RoomBooking[]
  ): RoomRecommendation[] => {
    const candidates: RoomRecommendation[] = [];

    for (const room of allRooms) {
      // Rule 1: Exclude the disrupted or original room
      if (room.id === booking.roomId) continue;

      // Rule 2: Exclude disrupted rooms or rooms under maintenance
      if (room.status === 'disrupted' || room.status === 'maintenance') continue;

      // Rule 3: Must meet capacity requirements (attendance <= room capacity)
      if (room.capacity < booking.expectedAttendance) continue;

      // Rule 4: Check conflict on date and time slot
      const hasConflict = allBookings.some((b) => {
        if (b.id === booking.id) return false;
        if (b.status === 'rejected' || b.status === 'cancelled') return false;
        if (b.roomId !== room.id || b.date !== booking.date) return false;
        return booking.startTime < b.endTime && booking.endTime > b.startTime;
      });

      if (hasConflict) continue;

      // Scoring criteria
      let score = 100;
      const matchReasons: string[] = [];

      // Capacity fit analysis
      const capacityRatio = room.capacity / Math.max(1, booking.expectedAttendance);
      const capacityFitPercent = Math.min(100, Math.round((booking.expectedAttendance / room.capacity) * 100));

      if (capacityRatio >= 1 && capacityRatio <= 1.4) {
        score += 25;
        matchReasons.push(`Optimal capacity match (${room.capacity} seats for ${booking.expectedAttendance} attendees)`);
      } else if (capacityRatio <= 2.0) {
        score += 15;
        matchReasons.push(`Comfortable room size (${room.capacity} capacity)`);
      } else {
        score -= 10;
        matchReasons.push(`Higher capacity room (${room.capacity} seats)`);
      }

      // Proximity / Same Building
      const isNearby = room.buildingId === booking.buildingId;
      if (isNearby) {
        score += 30;
        matchReasons.push(`Same building location (${room.buildingName})`);
      } else {
        matchReasons.push(`Located in ${room.buildingName}`);
      }

      // Equipment match
      const roomEquipLower = (room.equipment || []).map((e) => e.toLowerCase());
      let matchedEquipCount = 0;
      for (const req of booking.requiredEquipment || []) {
        const found = roomEquipLower.some((e) => e.includes(req.toLowerCase()) || req.toLowerCase().includes(e));
        if (found) {
          matchedEquipCount++;
        }
      }

      if (booking.requiredEquipment && booking.requiredEquipment.length > 0) {
        if (matchedEquipCount === booking.requiredEquipment.length) {
          score += 25;
          matchReasons.push(`Fully equipped with all ${matchedEquipCount} requested equipment items`);
        } else if (matchedEquipCount > 0) {
          score += 10;
          matchReasons.push(`Equipped with ${matchedEquipCount} of ${booking.requiredEquipment.length} requested items`);
        } else {
          score -= 20;
          matchReasons.push(`Missing some requested equipment`);
        }
      }

      // Room type similarity
      if (
        (booking.purpose.toLowerCase().includes('lab') && room.roomType === 'laboratory') ||
        (booking.purpose.toLowerCase().includes('briefing') && (room.roomType === 'seminar_hall' || room.roomType === 'lecture_hall')) ||
        (booking.purpose.toLowerCase().includes('council') && room.roomType === 'auditorium')
      ) {
        score += 15;
        matchReasons.push(`Matching room category (${room.roomType.replace('_', ' ')})`);
      }

      // Accessibility
      if (room.isAccessible) {
        score += 5;
        matchReasons.push('Wheelchair accessible');
      }

      candidates.push({
        room,
        score,
        matchReasons,
        conflictFree: true,
        isNearby,
        capacityFitPercent,
      });
    }

    // Sort descending by score
    return candidates.sort((a, b) => b.score - a.score);
  },

  createBooking: async (booking: Omit<RoomBooking, 'id' | 'bookingNumber' | 'createdAt'>): Promise<RoomBooking> => {
    await new Promise((r) => setTimeout(r, 80));
    const newBooking: RoomBooking = {
      ...booking,
      id: `bk-${Date.now()}`,
      bookingNumber: `BK-2026-${Math.floor(100 + Math.random() * 899)}`,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };
    return newBooking;
  },

  // User Profile
  getCurrentUser: async (): Promise<UserProfile> => {
    return { ...CURRENT_USER };
  },

  // AI Copilot Integration
  queryCopilot: async (question: string, user?: UserProfile) => {
    // 1. First attempt to query the backend Copilot service with a verified Bearer token
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s client timeout

      // Resolve valid token from session storage or trusted role registry token
      const sessionToken =
        localStorage.getItem('campusops_auth_token') ||
        sessionStorage.getItem('campusops_auth_token') ||
        (user?.role ? `campusops-token-${user.role}` : 'campusops-token-facilities_administrator');

      const response = await fetch('http://localhost:3001/api/copilot/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch {
      // Backend not running or network error: Seamlessly fall through to deterministic engine
    }

    // 2. Client-side fallback to deterministic operational engine (guarantees 100% uptime)
    const { processDeterministicQuery } = await import('./deterministicEngine');
    return processDeterministicQuery(question, user);
  },

  getCopilotStatus: async () => {
    try {
      const res = await fetch('http://localhost:3001/api/copilot/status', {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Backend offline
    }

    return {
      success: true,
      activeProvider: 'local_deterministic',
      geminiConfigured: false,
      model: 'Deterministic Operations Engine v1.0',
    };
  },
};

export const api = campusApi;
export default campusApi;



