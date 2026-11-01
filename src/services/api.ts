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
  IncidentLifecycleStatus, 
  WorkOrderStatus, 
  StockTransaction, 
  RoomBooking,
  ClassroomOccupancy,
  InventoryItem,
  ProcurementRequest,
  ProcurementStatus,
  Room,
  RoomRecommendation,
  MaintenanceTechnician
} from '../types';
import { CAMPUS_BUILDINGS } from '../data/buildingsData';
import { isSupabaseConfigured, supabase } from './supabase';

const API_BASE_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || (typeof process !== 'undefined' && process.env?.VITE_API_URL) || 'http://localhost:5000';

export async function getAuthToken(): Promise<string> {
  try {
    // A stale demo session must never shadow the authenticated Supabase session.
    // If Supabase is configured but signed out, fail closed instead of using demo auth.
    if (isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token || '';
    }
    const raw = localStorage.getItem('campusops_demo_auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.session?.accessToken === 'string') return parsed.session.accessToken;
    }
  } catch {
    return '';
  }
  return '';
}

async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; isPersistent: boolean }> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const validationMessages: string[] = [];
      const collectValidationMessages = (value: any, path = '') => {
        if (!value || typeof value !== 'object') return;
        if (Array.isArray(value._errors)) {
          for (const message of value._errors) validationMessages.push(`${path ? `${path}: ` : ''}${message}`);
        }
        for (const [key, nested] of Object.entries(value)) {
          if (key !== '_errors') collectValidationMessages(nested, path ? `${path}.${key}` : key);
        }
      };
      if (body?.details) collectValidationMessages(body.details);
      const errMsg = validationMessages.length
        ? `${body?.error || 'Please check the form'} ${validationMessages.join(' ')}`
        : body?.error || `API Error ${res.status}: ${res.statusText}`;
      return { data: null, error: errMsg, isPersistent: false };
    }

    const isPersistent = body?.source === 'supabase_postgres' || body?.source === 'supabase_rooms';
    return { data: body, error: null, isPersistent };
  } catch (err: any) {
    // Backend unreachable: gracefully return offline flag
    return { 
      data: null, 
      error: `Network error connecting to CampusOps API (${API_BASE_URL}). Running in offline mode.`, 
      isPersistent: false 
    };
  }
}

export const campusApi = {
  // Backend health & connection check
  getHealth: async () => {
    return apiRequest<{ status: string; config: any }>('/api/health');
  },

  // --- Incidents ---
  getIncidents: async (): Promise<{ incidents: Incident[]; isPersistent: boolean; error?: string }> => {
    const res = await apiRequest<{ incidents: any[]; source?: string }>('/api/incidents');
    if (res.data && Array.isArray(res.data.incidents)) {
      // Map database snake_case columns if present
      const mapped: Incident[] = res.data.incidents.map((i: any) => ({
        id: i.id,
        ticketNumber: i.ticket_number || i.ticketNumber || `INC-${i.id.slice(-4)}`,
        title: i.title,
        description: i.description,
        buildingId: i.building_id || i.buildingId || 'ACB',
        buildingName: i.building_name || i.buildingName || 'Academic Complex',
        floor: i.floor || '',
        room: i.room_text || i.room || '',
        category: i.category,
        severity: i.severity,
        status: i.status,
        lifecycleStatus: i.lifecycle_status || i.lifecycleStatus || 'reported',
        safetyRisk: i.safety_risk || i.safetyRisk || 'low',
        disruptionLevel: i.disruption_level || i.disruptionLevel || 'none',
        peopleAffected: i.people_affected || i.peopleAffected || 1,
        reportedBy: i.reporter_name || i.reportedBy || 'Staff',
        reportedRole: i.reporter_role || i.reportedRole || 'Staff',
        assignedTo: i.assignee_name || i.assignedTo,
        assignedEngineerId: i.assignee_id || i.assignedEngineerId,
        createdAt: i.created_at ? new Date(i.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        slaDeadline: i.sla_deadline || 'In 4h',
        workOrderId: i.work_order_id || i.workOrderId,
        evidenceUrls: i.evidence_urls || i.evidenceUrls || [],
        timeline: i.timeline || [],
        isDemo: !res.isPersistent,
        assetId: i.asset_id || i.assetId,
        assetName: i.asset_name || i.assetName,
        assetCategory: i.asset_category || i.assetCategory,
        annotationCoordinates: i.annotation_coordinates || i.annotationCoordinates,
        mappedLocationLevel: i.mapped_location_level || i.mappedLocationLevel,
      }));
      return { incidents: mapped, isPersistent: res.isPersistent };
    }
    return { incidents: [], isPersistent: false, error: res.error || 'Failed to retrieve incidents from database' };
  },

  createIncident: async (incident: Omit<Incident, 'id' | 'ticketNumber' | 'createdAt'>): Promise<{ success: boolean; incident?: Incident; duplicate?: boolean; error?: string }> => {
    const payload = {
      title: incident.title,
      description: incident.description,
      category: incident.category,
      severity: incident.severity,
      safetyRisk: incident.safetyRisk,
      disruptionLevel: incident.disruptionLevel,
      peopleAffected: incident.peopleAffected,
      buildingId: incident.buildingId,
      floor: incident.floor,
      roomText: incident.room,
      evidenceUrls: incident.evidenceUrls,
      assetId: incident.assetId,
      assetName: incident.assetName,
      assetCategory: incident.assetCategory,
      annotationCoordinates: incident.annotationCoordinates,
      mappedLocationLevel: incident.mappedLocationLevel,
    };

    const res = await apiRequest<{ incident: any; duplicate?: boolean }>('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.data?.incident) {
      const i = res.data.incident;
      return {
        success: true,
        duplicate: res.data.duplicate === true,
        incident: {
          ...incident,
          id: i.id,
          ticketNumber: i.ticket_number || i.ticketNumber || `INC-${String(i.id).slice(-4)}`,
          title: i.title,
          description: i.description,
          buildingId: i.building_id || i.buildingId || incident.buildingId,
          buildingName: i.building_name || i.buildingName || incident.buildingName,
          floor: i.floor || '',
          room: i.room_text || i.room || incident.room || '',
          category: i.category || incident.category,
          severity: i.severity || incident.severity,
          status: i.status || 'open',
          reportedBy: i.reporter_name || i.reporterName || 'Staff',
          reportedRole: i.reporter_role || i.reporterRole || 'Staff',
          createdAt: i.created_at || i.createdAt || new Date().toISOString(),
          evidenceUrls: i.evidence_urls || i.evidenceUrls || incident.evidenceUrls || [],
          assetId: i.asset_id || i.assetId || incident.assetId,
          assetName: i.asset_name || i.assetName || incident.assetName,
          assetCategory: i.asset_category || i.assetCategory || incident.assetCategory,
          annotationCoordinates: i.annotation_coordinates || i.annotationCoordinates || incident.annotationCoordinates,
          mappedLocationLevel: i.mapped_location_level || i.mappedLocationLevel || incident.mappedLocationLevel,
        },
      };
    }
    return { success: false, error: res.error || 'Failed to persist incident' };
  },

  transitionIncident: async (
    id: string, 
    targetStatus: IncidentLifecycleStatus, 
    remarks?: string,
    assigneeId?: string,
    assigneeName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await apiRequest(`/api/incidents/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ targetStatus, remarks, assigneeId, assigneeName }),
    });
    return { success: !res.error, error: res.error || undefined };
  },

  // --- Work Orders ---
  getWorkOrders: async (): Promise<{ workOrders: WorkOrder[]; isPersistent: boolean; error?: string }> => {
    const res = await apiRequest<{ workOrders: any[]; source?: string }>('/api/work-orders');
    if (res.data && Array.isArray(res.data.workOrders)) {
      const mapped: WorkOrder[] = res.data.workOrders.map((w: any) => ({
        id: w.id,
        orderNumber: w.order_number || w.orderNumber || `WO-${w.id.slice(-4)}`,
        title: w.title,
        category: w.category,
        priority: w.priority,
        buildingId: w.building_id || w.buildingId || 'ACB',
        buildingName: w.building_name || w.buildingName || 'Campus Facility',
        location: w.location_details || w.location || 'General Area',
        assignedEngineer: w.assigned_engineer_name || w.assignedEngineer || 'Unassigned',
        assignedEngineerId: w.assigned_engineer_id || w.assignedEngineerId,
        engineerAvatar: '',
        dueDate: w.due_date || 'Today, 5:00 PM',
        slaRemaining: w.sla_remaining || '3h 30m',
        completionRate: w.completion_rate ?? w.completionRate ?? 0,
        status: w.status,
        incidentId: w.incident_id || w.incidentId,
        partsRequired: w.parts_required || w.partsRequired || [],
        repairInstructions: w.repair_instructions || w.repairInstructions,
        diagnosis: w.diagnosis,
        completionNotes: w.completion_notes || w.completionNotes,
      }));
      return { workOrders: mapped, isPersistent: res.isPersistent };
    }
    return { workOrders: [], isPersistent: false, error: res.error || 'Failed to retrieve work orders from database' };
  },

  createWorkOrder: async (order: Omit<WorkOrder, 'id' | 'orderNumber'>): Promise<{ success: boolean; workOrder?: WorkOrder; error?: string }> => {
    const res = await apiRequest<{ workOrder: any }>('/api/work-orders', {
      method: 'POST',
      body: JSON.stringify(order),
    });

    if (res.data?.workOrder) {
      return { success: true, workOrder: res.data.workOrder };
    }
    return { success: false, error: res.error || 'Failed to create work order' };
  },

  updateWorkOrder: async (
    id: string, 
    status: WorkOrderStatus, 
    details?: { diagnosis?: string; completionNotes?: string; completionRate?: number; assignedEngineerId?: string; assignedEngineer?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await apiRequest(`/api/work-orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...details }),
    });
    return { success: !res.error, error: res.error || undefined };
  },

  getTechnicians: async (): Promise<{ technicians: MaintenanceTechnician[]; error?: string }> => {
    const res = await apiRequest<{ technicians: any[] }>('/api/work-orders/technicians');
    if (res.data?.technicians && Array.isArray(res.data.technicians)) {
      const mapped: MaintenanceTechnician[] = res.data.technicians.map((t: any) => ({
        id: t.id,
        name: t.name || t.fullName || t.full_name,
        fullName: t.fullName || t.full_name || t.name,
        email: t.email,
        role: 'technician',
        department: t.department || t.departmentName || t.department_name || 'Facility Engineering & Maintenance',
        departmentId: t.departmentId || t.department_id,
        avatar: t.avatar || t.avatarUrl || t.avatar_url || '',
        phone: t.phone || '',
        isActive: t.isActive ?? t.is_active ?? true,
      }));
      return { technicians: mapped };
    }
    return { technicians: [], error: res.error || 'Failed to retrieve maintenance technicians' };
  },

  allocateWorkOrder: async (
    workOrderId: string, 
    technicianId: string, 
    technicianName?: string
  ): Promise<{ success: boolean; workOrder?: WorkOrder; error?: string }> => {
    const res = await apiRequest<{ success: boolean; workOrder: any; message?: string }>(
      `/api/work-orders/${workOrderId}/allocate`, 
      {
        method: 'POST',
        body: JSON.stringify({ technicianId, technicianName }),
      }
    );
    if (res.data?.success && res.data?.workOrder) {
      const w = res.data.workOrder;
      const mapped: WorkOrder = {
        id: w.id,
        orderNumber: w.order_number || w.orderNumber || `WO-${w.id.slice(-4)}`,
        title: w.title,
        category: w.category,
        priority: w.priority,
        buildingId: w.building_id || w.buildingId || 'ACB',
        buildingName: w.building_name || w.buildingName || 'Campus Facility',
        location: w.location_details || w.location || 'General Area',
        assignedEngineer: w.assigned_engineer_name || w.assignedEngineer || 'Unassigned',
        assignedEngineerId: w.assigned_engineer_id || w.assignedEngineerId,
        engineerAvatar: '',
        dueDate: w.due_date || w.dueDate || 'Today, 5:00 PM',
        slaRemaining: w.sla_remaining || w.slaRemaining || '3h 30m',
        completionRate: w.completion_rate ?? w.completionRate ?? 0,
        status: w.status,
        incidentId: w.incident_id || w.incidentId,
        partsRequired: w.parts_required || w.partsRequired || [],
        repairInstructions: w.repair_instructions || w.repairInstructions,
        diagnosis: w.diagnosis,
        completionNotes: w.completion_notes || w.completionNotes,
      };
      return { success: true, workOrder: mapped };
    }
    return { success: false, error: res.error || 'Failed to allocate technician to work order' };
  },

  // --- Inventory & Stock ---
  getInventory: async (): Promise<{ items: StockAlert[]; isPersistent: boolean; error?: string }> => {
    const res = await apiRequest<{ items: any[]; source?: string }>('/api/inventory');
    if (res.data && Array.isArray(res.data.items)) {
      const mapped: StockAlert[] = res.data.items.map((i: any) => ({
        id: i.id,
        sku: i.sku,
        itemName: i.item_name || i.name || i.itemName,
        category: i.category,
        currentStock: i.current_stock ?? i.currentStock ?? 0,
        minThreshold: i.min_threshold ?? i.minThreshold ?? 5,
        unit: i.unit || 'pcs',
        unitCost: i.unit_cost ?? i.unitCost ?? 1000,
        leadTimeDays: i.lead_time_days ?? i.leadTimeDays ?? 3,
        location: i.location || 'Central Stores',
        reorderStatus: i.reorder_status || i.reorderStatus || 'optimal',
      }));
      return { items: mapped, isPersistent: res.isPersistent };
    }
    return { items: [], isPersistent: false, error: res.error || 'Failed to retrieve inventory items from database' };
  },

  allocateStock: async (
    workOrderId: string, 
    sku: string, 
    quantity: number
  ): Promise<{ success: boolean; item?: any; transaction?: any; error?: string }> => {
    const res = await apiRequest<{ success: boolean; item: any; transaction: any }>('/api/inventory/allocate', {
      method: 'POST',
      body: JSON.stringify({ workOrderId, sku, quantity }),
    });

    if (res.data?.success) {
      return { success: true, item: res.data.item, transaction: res.data.transaction };
    }
    return { success: false, error: res.error || 'Stock allocation rejected' };
  },

  receiveGoods: async (
    sku: string, 
    quantity: number, 
    receiptToken: string
  ): Promise<{ success: boolean; isIdempotentReplay?: boolean; item?: any; error?: string }> => {
    const res = await apiRequest<{ success: boolean; isIdempotentReplay?: boolean; item: any }>('/api/inventory/receive', {
      method: 'POST',
      body: JSON.stringify({ sku, quantity, receiptToken }),
    });

    if (res.data?.success) {
      return { 
        success: true, 
        isIdempotentReplay: res.data.isIdempotentReplay, 
        item: res.data.item 
      };
    }
    return { success: false, error: res.error || 'Goods receipt failed' };
  },

  getStockTransactions: async (): Promise<{ transactions: StockTransaction[]; isPersistent: boolean; error?: string }> => {
    const res = await apiRequest<{ transactions: any[]; source?: string }>('/api/inventory/transactions');
    if (res.data && Array.isArray(res.data.transactions)) {
      const transactions: StockTransaction[] = res.data.transactions.map((tx: any) => ({
        id: tx.id,
        itemId: tx.item_id || tx.itemId,
        sku: tx.item_sku || tx.sku,
        itemSku: tx.item_sku || tx.sku,
        itemName: tx.item_name || tx.itemName,
        quantity: tx.quantity,
        type: tx.type || tx.transaction_type || 'adjustment',
        balanceBefore: tx.balance_before ?? tx.previous_stock,
        balanceAfter: tx.balance_after ?? tx.new_stock,
        transactionNumber: tx.transaction_number,
        previousStock: tx.previous_stock ?? tx.balance_before,
        newStock: tx.new_stock ?? tx.balance_after,
        referenceType: tx.reference_type,
        referenceId: tx.reference_id || tx.work_order_id,
        reason: tx.reason,
        performedBy: tx.performed_by || tx.actor_name,
        actorId: tx.actor_id || tx.user_id,
        actorName: tx.actor_name,
        timestamp: tx.created_at || tx.timestamp,
        createdAt: tx.created_at || tx.timestamp,
      }));
      return { transactions, isPersistent: res.isPersistent };
    }
    return { transactions: [], isPersistent: false, error: res.error || 'Failed to retrieve stock transactions from database' };
  },

  // --- Bookings & Disruptions ---
  getBookings: async (): Promise<{ bookings: RoomBooking[]; isPersistent: boolean; error?: string }> => {
    const res = await apiRequest<{ bookings: any[]; source?: string }>('/api/bookings');
    if (res.data && Array.isArray(res.data.bookings)) {
      const mapped: RoomBooking[] = res.data.bookings.map((b: any) => ({
        id: b.id,
        roomId: b.room_id || b.roomId,
        buildingId: b.building_id || b.buildingId,
        date: b.booking_date || b.date || b.start_time?.slice(0, 10),
        purpose: b.purpose || b.title,
        expectedAttendance: b.expected_attendance ?? b.attendee_count ?? b.expectedAttendance,
        bookingCode: b.booking_code || b.bookingCode || `BK-${b.id.slice(-3)}`,
        roomCode: b.room_code || b.roomCode || 'A101',
        roomName: b.room_name || b.roomName || 'Campus Space',
        buildingCode: b.building_code || b.buildingCode || 'ACB',
        buildingName: b.building_name || b.buildingName || 'Academic Complex',
        title: b.title,
        eventType: b.event_type || b.eventType || 'lecture',
        bookedBy: b.booked_by_name || b.bookedBy || 'Staff',
        bookedByRole: b.booked_by_role || b.bookedByRole || 'Staff',
        startTime: b.start_time || b.startTime,
        endTime: b.end_time || b.endTime,
        status: ({ tentative: 'pending', confirmed: 'approved', rejected: 'rejected', cancelled: 'cancelled', relocated: 'reallocated', disrupted: 'reallocated' } as Record<string, RoomBooking['status']>)[b.status] || b.status,
        approvalRequestId: b.approval_request_id || b.approvalRequestId,
        requiresApproval: Boolean(b.requires_approval ?? b.requiresApproval),
        approvedBy: b.approved_by || b.approvedBy,
        approvalTimestamp: b.approval_timestamp || b.approvalTimestamp,
        rejectionReason: b.reallocation_reason || b.rejectionReason,
        expectedAttendees: b.expected_attendance ?? b.attendee_count ?? b.expectedAttendees ?? 30,
        originalRoomCode: b.original_room_code || b.originalRoomCode,
        relocationDetails: b.relocation_details || b.relocationDetails,
        createdAt: b.created_at || 'Just now',
      }));
      return { bookings: mapped, isPersistent: res.isPersistent };
    }
    return { bookings: [], isPersistent: false, error: res.error || 'Failed to retrieve bookings from database' };
  },

  createBooking: async (booking: Omit<RoomBooking, 'id' | 'bookingCode' | 'createdAt'>): Promise<{ success: boolean; booking?: RoomBooking; error?: string }> => {
    const toIso = (time: string) => time.includes('T') ? new Date(time).toISOString() : new Date(`${booking.date || ''}T${time}`).toISOString();
    const payload = {
      roomCode: booking.roomCode,
      title: booking.title || booking.purpose || 'Room booking',
      eventType: booking.eventType || 'lecture',
      startTime: toIso(booking.startTime),
      endTime: toIso(booking.endTime),
      expectedAttendees: booking.expectedAttendance ?? booking.expectedAttendees ?? 1,
      buildingCode: booking.buildingCode,
      buildingName: booking.buildingName,
      roomName: booking.roomName,
    };
    const res = await apiRequest<{ success: boolean; booking: any }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.data?.success && res.data.booking) {
      const created = res.data.booking;
      return { success: true, booking: {
        ...booking,
        id: created.id,
        bookingCode: created.booking_code || created.bookingCode || created.booking_code,
        bookingNumber: created.booking_code || created.bookingNumber || created.bookingCode,
        approvalRequestId: created.approval_request_id || created.approvalRequestId,
        status: ({ tentative: 'pending', confirmed: 'approved', rejected: 'rejected', cancelled: 'cancelled', relocated: 'reallocated', disrupted: 'reallocated' } as Record<string, RoomBooking['status']>)[created.status] || created.status || 'approved',
        createdAt: created.created_at || new Date().toISOString(),
      } };
    }
    return { success: false, error: res.error || 'Booking creation rejected' };
  },

  updateBookingStatus: async (id: string, status: 'approved' | 'rejected' | 'cancelled', reason?: string) => {
    const res = await apiRequest<{ success: boolean; booking?: any }>(`/api/bookings/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
    if (!res.data?.success) return { success: false, error: res.error || 'Booking status update failed' };
    return { success: true, booking: res.data.booking };
  },

  getRoomDisruptions: async (): Promise<{ disruptions: RoomDisruption[]; isPersistent: boolean; error?: string }> => {
    const res = await apiRequest<{ disruptions: any[]; source?: string }>('/api/bookings/disruptions');
    if (res.data && Array.isArray(res.data.disruptions)) {
      const disruptions: RoomDisruption[] = res.data.disruptions.map((d: any) => ({
        id: d.id,
        disruptionNumber: d.disruption_number || d.disruptionNumber,
        roomId: d.room_id || d.roomId,
        roomCode: d.room_code || d.roomCode || '',
        roomName: d.room_name || d.roomName,
        buildingId: d.building_id || d.buildingId,
        buildingCode: d.building_code || d.buildingCode,
        buildingName: d.building_name || d.buildingName || 'Campus',
        issue: d.issue_description || d.issue || '',
        severity: d.severity || 'medium',
        reasonCategory: d.reason_category || d.reasonCategory,
        affectedSchedule: d.affected_schedule || d.affectedSchedule,
        status: d.status,
        alternativeRoom: d.alternative_room || d.alternativeRoom,
        alternativeRoomId: d.alternative_room_id || d.alternativeRoomId,
        alternativeRoomName: d.alternative_room_name || d.alternativeRoomName,
        resolutionEta: d.resolution_eta || 'Under review',
        reportedBy: d.reported_by_name || d.reportedBy,
        reportedByRole: d.reported_by_role || d.reportedByRole,
        relatedIncidentTicket: d.related_incident_ticket || d.relatedIncidentTicket,
        relatedWorkOrderNumber: d.related_work_order_number || d.relatedWorkOrderNumber,
        affectedBookingIds: d.affected_booking_ids || d.affectedBookingIds || [],
        affectedBookings: d.affected_booking_ids || d.affectedBookings || [],
        createdAt: d.created_at || d.createdAt,
        isExamAffected: d.is_exam_affected || false,
      }));
      return { disruptions, isPersistent: res.isPersistent };
    }
    return { disruptions: [], isPersistent: false, error: res.error || 'Failed to retrieve room disruptions from database' };
  },

  approveRelocation: async (
    disruptionId: string, 
    bookingId: string, 
    targetRoomCode: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await apiRequest('/api/bookings/disruptions/approve-relocation', {
      method: 'POST',
      body: JSON.stringify({ disruptionId, bookingId, targetRoomCode }),
    });
    return { success: !res.error, error: res.error || undefined };
  },

  // --- Approvals ---
  getApprovals: async (): Promise<{ approvals: ApprovalRequest[]; isPersistent: boolean; error?: string }> => {
    const res = await apiRequest<{ approvals: any[]; source?: string }>('/api/approvals');
    if (res.data && Array.isArray(res.data.approvals)) {
      const mapped: ApprovalRequest[] = res.data.approvals.map((a: any) => ({
        id: a.id,
        title: a.title,
        category: a.category || 'General',
        requestType: a.request_type || a.requestType || 'general',
        requesterId: a.requester_id || a.requesterId,
        requesterName: a.requester_name || a.requesterName || 'Staff',
        requesterRole: a.requester_role || a.requesterRole || 'Staff',
        department: a.department || 'Operations',
        estimatedCost: a.estimated_cost || a.estimatedCost || '₹0',
        urgency: a.urgency || 'normal',
        status: a.status,
        submittedAt: a.submitted_at || a.submittedAt || 'Today',
        reason: a.reason || '',
        entityId: a.entity_id || a.entityId,
        reviewedBy: a.reviewer_name || a.reviewedBy,
        reviewedAt: a.reviewed_at || a.reviewedAt,
      }));
      return { approvals: mapped, isPersistent: res.isPersistent };
    }
    return { approvals: [], isPersistent: false, error: res.error || 'Failed to retrieve approvals from database' };
  },

  reviewApproval: async (
    id: string, 
    status: 'approved' | 'rejected'
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await apiRequest(`/api/approvals/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    return { success: !res.error, error: res.error || undefined };
  },

  // --- Notifications ---
  getNotifications: async (): Promise<{ notifications: any[]; isPersistent: boolean }> => {
    const res = await apiRequest<{ notifications: any[]; source?: string }>('/api/notifications');
    if (res.data && Array.isArray(res.data.notifications)) {
      return { notifications: res.data.notifications, isPersistent: res.isPersistent };
    }
    return { notifications: [], isPersistent: false };
  },

  markNotificationRead: async (id: string): Promise<void> => {
    await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  getOccupancy: async (): Promise<{ classrooms: ClassroomOccupancy[]; isPersistent: boolean; error?: string }> => {
    const res = await apiRequest<{ classrooms: any[]; source?: string }>('/api/occupancy');
    if (res.data && Array.isArray(res.data.classrooms) && (!isSupabaseConfigured || res.isPersistent)) {
      return { classrooms: res.data.classrooms, isPersistent: res.isPersistent };
    }

    const mapRoomToOccupancy = (room: any): ClassroomOccupancy => {
      const buildingId = String(room.building_id || room.buildingId || '');
      const relatedBuilding = room.buildings || room.building || {};
      const building = CAMPUS_BUILDINGS.find((candidate) =>
        [candidate.id, candidate.code, candidate.name, candidate.shortName, ...(candidate.aliases || [])]
          .some((value) => value.toLowerCase() === buildingId.toLowerCase())
      );
      const rawStatus = String(room.status || '').toLowerCase();
      const status: ClassroomOccupancy['status'] = rawStatus === 'maintenance' || rawStatus === 'disrupted'
        ? 'under_maintenance'
        : rawStatus === 'available' || rawStatus === 'occupied' || rawStatus === 'scheduled'
          ? rawStatus
          : 'unknown';
      const rawFloor = String(room.floor || 'Ground Floor');
      const floor = /basement/i.test(rawFloor) ? -1 : Number(rawFloor.match(/\d+/)?.[0] || 0);

      return {
        id: String(room.id || `${buildingId}-${room.room_code || room.roomCode}`),
        roomCode: String(room.room_code || room.roomCode || room.roomNumber || ''),
        roomName: String(room.name || room.room_name || room.roomName || 'Unnamed room'),
        buildingId: building?.id || buildingId,
        buildingCode: String(room.building_code || relatedBuilding.code || building?.code || buildingId),
        buildingName: String(room.building_name || room.buildingName || relatedBuilding.name || building?.name || buildingId),
        floor,
        capacity: Number(room.capacity || 0),
        equipment: Array.isArray(room.equipment) ? room.equipment : [],
        status,
        dataSource: 'manual_inspection',
        confidenceLevel: 'low',
        lastUpdated: room.updated_at || room.updatedAt || 'Not updated',
        upcomingClasses: [],
      };
    };

    // If the optional occupancy table is absent, read the existing room
    // catalogue with the user's normal Supabase session and row-level policy.
    // This keeps the occupancy screen database-backed without a remote schema
    // migration or a service-role bypass.
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, room_code, name, building_id, floor, capacity, category, status, updated_at, buildings(name, code, short_name)')
        .order('room_code', { ascending: true });
      if (!error && Array.isArray(data)) {
        return { classrooms: data.map(mapRoomToOccupancy), isPersistent: true };
      }
    }

    // Older deployments may not have the optional occupancy extension table.
    // The authenticated room catalogue is already backed by public.rooms, so
    // use those persisted records rather than turning a missing extension into
    // an all-zero occupancy page.
    const roomRes = await apiRequest<{ rooms: any[]; source?: string }>('/api/bookings/rooms');
    if (roomRes.data && Array.isArray(roomRes.data.rooms)) {
      return { classrooms: roomRes.data.rooms.map(mapRoomToOccupancy), isPersistent: roomRes.isPersistent };
    }

    return { classrooms: [], isPersistent: false, error: res.error || 'Failed to retrieve occupancy records' };
  },

  markAllNotificationsRead: async (): Promise<void> => {
    await apiRequest('/api/notifications/mark-all-read', { method: 'POST' });
  },

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

    const expectedAttendance = booking.expectedAttendance ?? booking.expectedAttendees ?? 30;
    const purpose = (booking.purpose || booking.title || '').toLowerCase();
    for (const room of allRooms) {
      // Rule 1: Exclude the disrupted or original room
      if (room.id === booking.roomId) continue;

      // Rule 2: Exclude disrupted rooms or rooms under maintenance
      if (room.status === 'disrupted' || room.status === 'maintenance') continue;

      // Rule 3: Must meet capacity requirements (attendance <= room capacity)
      if (room.capacity < expectedAttendance) continue;

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
      const capacityRatio = room.capacity / Math.max(1, expectedAttendance);
      const capacityFitPercent = Math.min(100, Math.round((expectedAttendance / room.capacity) * 100));

      if (capacityRatio >= 1 && capacityRatio <= 1.4) {
        score += 25;
        matchReasons.push(`Optimal capacity match (${room.capacity} seats for ${expectedAttendance} attendees)`);
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
        (purpose.includes('lab') && room.roomType === 'laboratory') ||
        (purpose.includes('briefing') && (room.roomType === 'seminar_hall' || room.roomType === 'lecture_hall')) ||
        (purpose.includes('council') && room.roomType === 'auditorium')
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

  getStockAlerts: async (): Promise<StockAlert[]> => { const res = await campusApi.getInventory(); return res.items || []; },
  getAIInsights: async (): Promise<AIInsight[]> => [],
  getActivities: async (): Promise<ActivityItem[]> => [],
  getInventoryItems: async (): Promise<InventoryItem[]> => {
    const result = await apiRequest<{ items: any[] }>('/api/inventory');
    if (!result.error && Array.isArray(result.data?.items)) {
      return result.data.items.map((item: any) => ({
        id: item.id,
        sku: item.sku,
        itemName: item.item_name || item.name || item.itemName,
        category: item.category,
        currentStock: item.current_stock ?? item.currentStock ?? 0,
        allocatedQuantity: item.allocated_quantity ?? item.allocatedQuantity ?? 0,
        minThreshold: item.min_threshold ?? item.minThreshold ?? 0,
        unit: item.unit || 'pcs',
        unitCost: item.unit_cost ?? item.unitCost ?? 0,
        leadTimeDays: item.lead_time_days ?? item.leadTimeDays ?? 0,
        location: item.location || 'Central Stores',
        status: item.status || ((item.current_stock ?? item.currentStock ?? 0) <= (item.min_threshold ?? item.minThreshold ?? 0) ? 'low_stock' : 'in_stock'),
        reorderStatus: item.reorder_status || item.reorderStatus || 'optimal',
        supplierName: item.supplier_name || item.supplierName,
      } as InventoryItem));
    }
    return [];
  },
  createInventoryItem: async (_item: Omit<InventoryItem, 'id' | 'allocatedQuantity' | 'status'>): Promise<InventoryItem> => {
    throw new Error('Inventory item creation is not available in the configured API.');
  },
  createStockTransaction: async (_tx: Omit<StockTransaction, 'id' | 'transactionNumber' | 'timestamp'>): Promise<StockTransaction> => {
    throw new Error('Stock transactions must use validated allocation or receipt operations.');
  },
  getProcurementRequests: async (): Promise<{ requests: ProcurementRequest[]; isPersistent: boolean; error?: string }> => {
    const result = await apiRequest<{ requests: any[] }>('/api/inventory/procurement');
    const requests = (result.data?.requests || []).map((request: any) => ({
      id: request.id,
      requestNumber: request.request_number,
      itemId: request.item_id,
      itemSku: request.item_sku,
      itemName: request.item_name,
      category: request.category,
      quantity: request.quantity,
      unit: request.unit,
      estimatedUnitCost: Number(request.estimated_unit_cost || 0),
      totalEstimatedCost: Number(request.total_estimated_cost || 0),
      supplierName: request.supplier_name,
      supplierContact: request.supplier_contact,
      urgency: request.urgency,
      status: request.status,
      reason: request.reason,
      ruleTriggerReason: request.rule_trigger_reason,
      requestedBy: request.requested_by,
      approvedBy: request.approved_by,
      orderedAt: request.ordered_at,
      receivedAt: request.received_at,
      createdAt: request.created_at,
    } as ProcurementRequest));
    return { requests, isPersistent: result.isPersistent, error: result.error || undefined };
  },
  createProcurementRequest: async (request: Omit<ProcurementRequest, 'id' | 'requestNumber' | 'createdAt'>): Promise<{ success: boolean; request?: ProcurementRequest; approvalId?: string; error?: string }> => {
    const result = await apiRequest<{ request: any; approval?: any }>('/api/inventory/procurement', {
      method: 'POST',
      body: JSON.stringify({ itemId: request.itemId, quantity: request.quantity, reason: request.reason, urgency: request.urgency }),
    });
    if (result.error || !result.data?.request) return { success: false, error: result.error || 'Requisition creation failed' };
    const created = result.data.request;
    return { success: true, request: {
      ...request,
      id: created.id,
      requestNumber: created.request_number,
      createdAt: created.created_at,
    }, approvalId: result.data.approval?.id };
  },
  updateProcurementStatus: async (id: string, status: ProcurementStatus, options?: { approvedBy?: string; orderedAt?: string; receivedAt?: string; receiptToken?: string }) => {
    const result = await apiRequest(`/api/inventory/procurement/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, receiptToken: options?.receiptToken }),
    });
    return { success: !result.error, id, status, error: result.error || undefined };
  },
  getBuildings: async (): Promise<Building[]> => [...CAMPUS_BUILDINGS],
  getRooms: async (): Promise<Room[]> => {
    const res = await apiRequest<{ rooms: any[] }>('/api/bookings/rooms');
    if (res.data && Array.isArray(res.data.rooms)) {
      const roomTypes: Room['roomType'][] = ['lecture_hall', 'laboratory', 'seminar_hall', 'classroom', 'conference_room', 'auditorium', 'workshop'];
      const roomStatuses: Room['status'][] = ['available', 'occupied', 'maintenance', 'disrupted'];
      return res.data.rooms.map((room: any) => {
        const type = String(room.room_type || room.category || 'classroom').toLowerCase().replace(/[\s-]+/g, '_');
        const status = String(room.status || 'available').toLowerCase();
        return {
          id: room.id,
          roomNumber: room.room_number || room.room_code || room.roomNumber,
          name: room.name,
          buildingId: room.building_id || room.buildingId,
          buildingName: room.building_name || room.buildingName || 'Campus',
          floor: room.floor || 'Ground Floor',
          capacity: Number(room.capacity || 0),
          roomType: roomTypes.includes(type as Room['roomType']) ? type as Room['roomType'] : 'classroom',
          facilities: room.facilities || [],
          equipment: room.equipment || [],
          status: roomStatuses.includes(status as Room['status']) ? status as Room['status'] : 'available',
          isAccessible: Boolean(room.is_accessible ?? room.isAccessible),
          activeDisruptionId: room.active_disruption_id || room.activeDisruptionId,
        } as Room;
      });
    }
    return [];
  },
  getPriorityQueue: async (filters: { tier?: string; sort?: string } = {}) => {
    const query = new URLSearchParams();
    if (filters.tier) query.set('tier', filters.tier);
    if (filters.sort) query.set('sort', filters.sort);
    return apiRequest<any>(`/api/ai/priority-queue${query.size ? `?${query.toString()}` : ''}`);
  },
  overridePriority: async (incidentId: string, manualTier: string, reason: string) =>
    apiRequest<{ success: boolean; message?: string; override?: unknown }>('/api/ai/override-priority', {
      method: 'POST', body: JSON.stringify({ incidentId, manualTier, reason }),
    }),
  updateApprovalStatus: async (id: string, status: 'approved' | 'rejected') => {
    const result = await apiRequest(`/api/approvals/${id}/review`, { method: 'PATCH', body: JSON.stringify({ status }) });
    return { success: !result.error, id, status };
  },
  getCurrentUser: async (): Promise<UserProfile> => {
    const res = await apiRequest<{ user: any }>('/api/auth/me');
    if (res.data?.user) {
      return {
        id: res.data.user.id,
        name: res.data.user.fullName || res.data.user.name,
        role: res.data.user.role,
        email: res.data.user.email,
        department: res.data.user.departmentName || res.data.user.department,
        avatar: res.data.user.avatarUrl || '',
      };
    }
    return {
      id: 'unauthenticated',
      name: 'Campus User',
      role: 'student_faculty',
      email: '',
      department: 'General Operations',
    };
  },
  queryCopilot: async (question: string, user?: UserProfile) => {
    const result = await apiRequest<any>('/api/ai/query', { method: 'POST', body: JSON.stringify({ query: question }) });
    if (result.data) return result.data;
    const { processDeterministicQuery } = await import('./deterministicEngine');
    return processDeterministicQuery(question, user);
  },
  getCopilotStatus: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/status`);
      if (response.ok) return await response.json();
    } catch { /* Backend is unavailable. */ }
    return { status: 'offline', provider: 'unavailable', isFallbackActive: true };
  },
};

export const api = campusApi;
export default campusApi;
