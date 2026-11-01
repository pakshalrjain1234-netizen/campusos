import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { authenticateToken, normalizeServerRole } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { DEMO_APPROVALS_STORE } from './approvals';

export const bookingsRouter = Router();

const serverSupabase = config.isConfigured
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey)
  : null;

export interface RoomBookingRecord {
  id: string;
  bookingCode: string;
  roomCode: string;
  roomName: string;
  buildingCode: string;
  buildingName: string;
  title: string;
  eventType: 'lecture' | 'examination' | 'lab_session' | 'seminar' | 'faculty_meeting';
  bookedBy: string;
  bookedByRole: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  status: 'confirmed' | 'tentative' | 'disrupted' | 'relocated' | 'cancelled' | 'rejected' | 'approved' | 'reallocated';
  expectedAttendees: number;
  approvalRequestId?: string;
  originalRoomCode?: string;
  relocationDetails?: {
    reason: string;
    suggestedRoomCode: string;
    approvedBy?: string;
    approvedAt?: string;
    isExamRelocation: boolean;
  };
  createdAt: string;
}

export interface DisruptionRecord {
  id: string;
  roomCode: string;
  buildingName: string;
  incidentId?: string;
  workOrderId?: string;
  issue: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedBookings: string[]; // booking IDs
  status: 'active' | 'pending_relocation_approval' | 'mitigated' | 'resolved';
  alternativeRoomSuggestion?: {
    roomCode: string;
    roomName: string;
    capacity: number;
    equipment: string[];
    suitabilityScore: number;
  };
  isExamAffected: boolean;
  resolutionEta: string;
  createdAt: string;
}

export const DEMO_BOOKINGS: RoomBookingRecord[] = [
  {
    id: 'book-001',
    bookingCode: 'BK-901',
    roomCode: 'I101',
    roomName: 'IT Computing Lab A',
    buildingCode: 'ITB',
    buildingName: 'Information Technology Center',
    title: 'CS301 Algorithm Design Practical Exam',
    eventType: 'examination',
    bookedBy: 'Prof. Ananya Sen',
    bookedByRole: 'faculty',
    startTime: '2026-10-30T10:00:00.000Z',
    endTime: '2026-10-30T13:00:00.000Z',
    status: 'disrupted',
    expectedAttendees: 65,
    createdAt: '2026-10-28T09:00:00Z',
    relocationDetails: {
      reason: 'Ambient temperature rising above server safety threshold',
      suggestedRoomCode: 'A101',
      isExamRelocation: true,
    },
  },
  {
    id: 'book-002',
    bookingCode: 'BK-902',
    roomCode: 'A101',
    roomName: 'Main Lecture Hall Alpha',
    buildingCode: 'ACB',
    buildingName: 'Academic Complex',
    title: 'Open University Orientation',
    eventType: 'lecture',
    bookedBy: 'Dr. Jennifer Rao',
    bookedByRole: 'coo',
    startTime: '2026-10-30T14:30:00.000Z',
    endTime: '2026-10-30T16:30:00.000Z',
    status: 'confirmed',
    expectedAttendees: 110,
    createdAt: '2026-10-25T11:00:00Z',
  },
  {
    id: 'book-003',
    bookingCode: 'BK-903',
    roomCode: 'S201',
    roomName: 'Advanced Chemistry Lab',
    buildingCode: 'SCB',
    buildingName: 'Science & Research Building',
    title: 'Organic Synthesis Workshop',
    eventType: 'lab_session',
    bookedBy: 'Dr. R. Ramanathan',
    bookedByRole: 'faculty',
    startTime: '2026-10-30T11:00:00.000Z',
    endTime: '2026-10-30T13:00:00.000Z',
    status: 'confirmed',
    expectedAttendees: 30,
    createdAt: '2026-10-29T14:00:00Z',
  },
];

let bookingsStore = [...DEMO_BOOKINGS];

let disruptionsStore: DisruptionRecord[] = [
  {
    id: 'disrupt-001',
    roomCode: 'I101',
    buildingName: 'Information Technology Center',
    incidentId: 'inc-001',
    workOrderId: 'wo-101',
    issue: 'HVAC Loop Pressure Failure — Chilled Water Temp Exceeded 26°C',
    severity: 'critical',
    affectedBookings: ['book-001'],
    status: 'pending_relocation_approval',
    isExamAffected: true,
    alternativeRoomSuggestion: {
      roomCode: 'A101',
      roomName: 'Main Lecture Hall Alpha (ACB)',
      capacity: 120,
      equipment: ['Gigabit LAN', 'Dual HD Projectors', 'HVAC Automated'],
      suitabilityScore: 96,
    },
    resolutionEta: '1:30 PM today',
    createdAt: new Date().toISOString(),
  },
];

const maintenanceRooms = new Set<string>(['I101', 'L102', 'I102', 'M101']);
const DEMO_ROOMS = [
  { id: 'room-demo-mb101', room_code: 'MB-101', name: 'Executive Board Room A', building_id: 'main-block', building_name: 'Main Administrative Block', floor: '1st Floor', capacity: 30, category: 'Conference Room', status: 'available', facilities: ['Air Conditioning', 'WiFi-6'], equipment: ['Projector', 'Video Conferencing'], is_accessible: true },
  { id: 'room-demo-mb201', room_code: 'MB-201', name: 'Academic Council Chamber', building_id: 'main-block', building_name: 'Main Administrative Block', floor: '2nd Floor', capacity: 85, category: 'Auditorium', status: 'available', facilities: ['Central AC'], equipment: ['4K Projector'], is_accessible: true },
  { id: 'room-demo-a201', room_code: 'A201', name: 'Lecture Hall 201', building_id: 'academic-complex', building_name: 'Academic Complex', floor: '2nd Floor', capacity: 120, category: 'Lecture Hall', status: 'available', facilities: ['Air Conditioning'], equipment: ['Projector'], is_accessible: true },
];

bookingsRouter.get('/rooms', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  if (!serverSupabase) {
    res.json({ rooms: DEMO_ROOMS, source: 'demo_fallback' });
    return;
  }
  const { data, error } = await serverSupabase
    .from('rooms')
    .select('id, room_code, name, building_id, floor, capacity, category, status')
    .order('building_id', { ascending: true })
    .order('room_code', { ascending: true });
  if (error) { res.status(500).json({ error: 'Room catalogue query failed', message: error.message }); return; }
  const buildingIds = [...new Set((data || []).map((room) => room.building_id))];
  const { data: buildings, error: buildingsError } = await serverSupabase.from('buildings').select('id,name').in('id', buildingIds);
  if (buildingsError) { res.status(500).json({ error: 'Room building lookup failed', message: buildingsError.message }); return; }
  const names = new Map((buildings || []).map((building) => [building.id, building.name]));
  res.json({ rooms: (data || []).map((room) => ({ ...room, building_name: names.get(room.building_id) || 'Campus' })), source: 'supabase_postgres' });
});

const CreateBookingSchema = z.object({
  roomCode: z.string(),
  title: z.string().min(3),
  eventType: z.enum(['lecture', 'examination', 'lab_session', 'seminar', 'faculty_meeting']),
  startTime: z.string().refine((value) => Number.isFinite(Date.parse(value)), 'Start time must be a valid date and time.'),
  endTime: z.string().refine((value) => Number.isFinite(Date.parse(value)), 'End time must be a valid date and time.'),
  expectedAttendees: z.number().int().positive(),
  buildingCode: z.string().optional(),
  buildingName: z.string().optional(),
  roomName: z.string().optional(),
}).refine((booking) => new Date(booking.endTime) > new Date(booking.startTime), {
  message: 'End time must be after start time.',
  path: ['endTime'],
});

const BookingReviewSchema = z.object({ status: z.enum(['approved', 'rejected', 'cancelled']), reason: z.string().max(250).optional() });

const ReportDisruptionSchema = z.object({
  roomId: z.string().min(1),
  roomCode: z.string().min(1),
  buildingName: z.string().optional(),
  issue: z.string().trim().min(5).max(300),
  reasonCategory: z.enum(['room_unavailable', 'equipment_failure', 'maintenance_closure', 'safety_hazard', 'emergency_building_closure', 'hvac_power_failure']),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  resolutionEta: z.string().max(80).optional(),
  relatedIncidentTicket: z.string().max(50).optional(),
  relatedWorkOrderNumber: z.string().max(50).optional(),
});

const RelocationApprovalSchema = z.object({
  disruptionId: z.string(),
  bookingId: z.string(),
  targetRoomCode: z.string(),
  approvalNotes: z.string().optional(),
});

/**
 * GET /api/bookings
 */
bookingsRouter.get('/', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('room_bookings')
        .select('*')
        .order('start_time', { ascending: true });
      if (error) {
        res.status(500).json({ error: 'Booking query failed', message: error.message });
        return;
      }
      res.json({ bookings: data || [], source: 'supabase_postgres' });
      return;
    } catch (err: unknown) {
      res.status(500).json({ error: 'Booking query failed', message: err instanceof Error ? err.message : 'Unknown database error' });
      return;
    }
  }
  res.json({ bookings: bookingsStore, source: 'demo_fallback' });
});

/**
 * GET /api/bookings/disruptions
 */
bookingsRouter.get('/disruptions', authenticateToken, async (_req: AuthenticatedRequest, res: Response) => {
  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase.from('room_disruptions').select('*');
      if (error) {
        res.status(500).json({ error: 'Disruption query failed', message: error.message });
        return;
      }
      res.json({ disruptions: data || [], source: 'supabase_postgres' });
      return;
    } catch (err: unknown) {
      res.status(500).json({ error: 'Disruption query failed', message: err instanceof Error ? err.message : 'Unknown database error' });
      return;
    }
  }
  res.json({ disruptions: disruptionsStore, source: 'demo_fallback' });
});

/**
 * POST /api/bookings/disruptions
 * Creates a disruption and marks the room unavailable atomically in persistent mode.
 */
bookingsRouter.post(
  '/disruptions',
  authenticateToken,
  requireRole(['technician', 'department_manager', 'facilities_administrator']),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const parse = ReportDisruptionSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: 'Invalid disruption payload', details: parse.error.format() });
      return;
    }
    const data = parse.data;
    const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

    if (serverSupabase) {
      if (!isUuid(data.roomId)) {
        res.status(400).json({ error: 'Persistent disruption reporting requires a valid room ID.', code: 'INVALID_RECORD_ID' });
        return;
      }
      try {
        const { data: result, error } = await serverSupabase.rpc('campusops_report_room_disruption', {
          p_room_id: data.roomId,
          p_issue: data.issue,
          p_reason_category: data.reasonCategory,
          p_severity: data.severity,
          p_resolution_eta: data.resolutionEta || 'Investigating',
          p_reporter_id: isUuid(user.id) ? user.id : null,
          p_reporter_name: user.fullName,
          p_reporter_role: user.role,
          p_incident_ticket: data.relatedIncidentTicket || null,
          p_work_order_number: data.relatedWorkOrderNumber || null,
        });
        if (error) {
          const missing = error.code === 'P0002' || /not found/i.test(error.message);
          res.status(missing ? 404 : 500).json({ error: error.message, code: missing ? 'ROOM_NOT_FOUND' : 'DISRUPTION_PERSISTENCE_FAILED' });
          return;
        }
        res.status(201).json({ success: true, ...result, source: 'supabase_postgres' });
        return;
      } catch (err: unknown) {
        res.status(500).json({ error: 'Disruption report failed', message: err instanceof Error ? err.message : 'Unknown database error' });
        return;
      }
    }

    const affectedBookings = bookingsStore.filter((booking) =>
      booking.roomCode.toLowerCase() === data.roomCode.toLowerCase() && !['cancelled', 'relocated'].includes(booking.status)
    ).map((booking) => booking.id);
    const disruption: DisruptionRecord = {
      id: `disrupt-${Date.now()}`,
      roomCode: data.roomCode,
      buildingName: data.buildingName || 'Campus',
      issue: data.issue,
      severity: data.severity,
      affectedBookings,
      status: 'active',
      isExamAffected: affectedBookings.some((id) => bookingsStore.find((booking) => booking.id === id)?.eventType === 'examination'),
      resolutionEta: data.resolutionEta || 'Investigating',
      createdAt: new Date().toISOString(),
    };
    disruptionsStore.unshift(disruption);
    maintenanceRooms.add(data.roomCode.toUpperCase());
    res.status(201).json({ success: true, disruption, source: 'demo_fallback' });
  }
);

/**
 * POST /api/bookings
 * Double-Booking Prevention & Maintenance Exclusion
 */
bookingsRouter.post(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const parse = CreateBookingSchema.safeParse(req.body);

    if (!parse.success) {
      res.status(400).json({ error: 'Invalid booking payload', details: parse.error.format() });
      return;
    }

    const data = parse.data;

    // Demo-only exclusions must not override the live room status in persistent mode.
    if (!serverSupabase && maintenanceRooms.has(data.roomCode.toUpperCase())) {
      res.status(409).json({
        error: `Room ${data.roomCode} is currently under maintenance or has an active technical disruption. New reservations are strictly prohibited.`,
        code: 'ROOM_UNDER_MAINTENANCE',
        roomCode: data.roomCode,
      });
      return;
    }

    // 2. Interval conflict check
    const reqStart = new Date(data.startTime).getTime();
    const reqEnd = new Date(data.endTime).getTime();

    // Supabase path: validate the selected room and rely on the database exclusion constraint
    // as the final race-safe guard against overlapping confirmed reservations.
    if (serverSupabase) {
      try {
        const { data: dbRoom, error: roomError } = await serverSupabase
          .from('rooms')
          .select('id, room_code, name, building_id, capacity, status, building_name, room_type')
          .eq('room_code', data.roomCode)
          .maybeSingle();
        if (roomError) {
          res.status(500).json({ error: 'Room lookup failed', message: roomError.message });
          return;
        }
        if (!dbRoom) {
          res.status(404).json({ error: `Room ${data.roomCode} was not found.`, code: 'ROOM_NOT_FOUND' });
          return;
        }
        if (dbRoom.status === 'maintenance' || dbRoom.status === 'disrupted') {
          res.status(409).json({ error: `Room ${data.roomCode} is unavailable.`, code: 'ROOM_UNDER_MAINTENANCE' });
          return;
        }
        if (data.expectedAttendees > dbRoom.capacity) {
          res.status(400).json({ error: `Room capacity is ${dbRoom.capacity}; ${data.expectedAttendees} attendees were requested.`, code: 'ROOM_CAPACITY_EXCEEDED' });
          return;
        }
        const { data: activeDisruption, error: disruptionError } = await serverSupabase
          .from('room_disruptions')
          .select('id')
          .eq('room_id', dbRoom.id)
          .eq('status', 'active')
          .limit(1);
        if (disruptionError) {
          res.status(500).json({ error: 'Room disruption lookup failed', message: disruptionError.message });
          return;
        }
        if (activeDisruption?.length) {
          res.status(409).json({ error: `Room ${data.roomCode} has an active disruption.`, code: 'ROOM_UNDER_MAINTENANCE' });
          return;
        }

        const { data: conflicts, error: conflictError } = await serverSupabase
          .from('room_bookings')
          .select('id, title, start_time, end_time')
          .eq('room_id', dbRoom.id)
          .not('status', 'in', '("cancelled","relocated","rejected","disrupted")')
          .lt('start_time', data.endTime)
          .gt('end_time', data.startTime);
        if (conflictError) {
          res.status(500).json({ error: 'Booking conflict check failed', message: conflictError.message });
          return;
        }
        if (conflicts?.length) {
          res.status(409).json({
            error: `Schedule Conflict: Room ${data.roomCode} is already booked for "${conflicts[0].title}".`,
            code: 'DOUBLE_BOOKING_CONFLICT',
            conflictingBooking: conflicts[0],
          });
          return;
        }

        const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
        const { data: result, error: createError } = await serverSupabase.rpc('campusops_create_room_booking', {
          p_room_code: data.roomCode,
          p_title: data.title,
          p_event_type: data.eventType,
          p_start_time: data.startTime,
          p_end_time: data.endTime,
          p_attendees: data.expectedAttendees,
          p_booked_by: isUuid(user.id) ? user.id : null,
          p_booked_by_name: user.fullName,
          p_booked_by_role: user.role,
          p_department: user.department || null,
        });
        if (createError || !result?.booking) {
          const message = createError?.message || 'Booking could not be saved.';
          const isConflict = createError?.code === '23P01' || /overlap|conflict/i.test(message);
          const isMissing = createError?.code === 'P0002' || /not found/i.test(message);
          res.status(isConflict ? 409 : isMissing ? 404 : 500).json({
            error: message,
            code: isConflict ? 'DOUBLE_BOOKING_CONFLICT' : isMissing ? 'ROOM_NOT_FOUND' : 'BOOKING_PERSISTENCE_FAILED',
          });
          return;
        }
        res.status(201).json({ success: true, booking: result.booking, approval: result.approval, source: 'supabase_postgres' });
        return;
      } catch (err: unknown) {
        res.status(500).json({ error: 'Database booking failed', message: err instanceof Error ? err.message : 'Unknown database error' });
        return;
      }
    }

    // Demo store fallback check
    const conflict = bookingsStore.find((b) => {
      if (b.roomCode.toLowerCase() !== data.roomCode.toLowerCase() || ['cancelled', 'relocated', 'rejected', 'disrupted'].includes(b.status)) {
        return false;
      }
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return (reqStart < bEnd && reqEnd > bStart) || b.startTime === data.startTime;
    });

    if (conflict) {
      res.status(409).json({
        error: `Schedule Conflict: Room ${data.roomCode} is already reserved for "${conflict.title}" during this interval.`,
        code: 'DOUBLE_BOOKING_CONFLICT',
        conflictingBooking: conflict,
      });
      return;
    }

    const demoRoom = DEMO_ROOMS.find((room) => room.room_code.toLowerCase() === data.roomCode.toLowerCase());
    if (!demoRoom) { res.status(404).json({ error: `Room ${data.roomCode} was not found.`, code: 'ROOM_NOT_FOUND' }); return; }
    if (demoRoom.status !== 'available') { res.status(409).json({ error: `Room ${data.roomCode} is unavailable.`, code: 'ROOM_UNDER_MAINTENANCE' }); return; }
    if (data.expectedAttendees > demoRoom.capacity) { res.status(400).json({ error: `Room capacity is ${demoRoom.capacity}.`, code: 'ROOM_CAPACITY_EXCEEDED' }); return; }

    const bookingCode = `BK-${Math.floor(920 + Math.random() * 70)}`;
    const requiresApproval = data.expectedAttendees >= 80 || demoRoom.category.toLowerCase() === 'auditorium';
    const approvalId = requiresApproval ? `app-book-${Date.now()}` : undefined;
    const newBooking: RoomBookingRecord = {
      id: `book-${Date.now()}`,
      bookingCode,
      roomCode: data.roomCode,
      roomName: data.roomName || demoRoom.name,
      buildingCode: data.buildingCode || 'ACB',
      buildingName: data.buildingName || demoRoom.building_name,
      title: data.title,
      eventType: data.eventType,
      bookedBy: user.fullName,
      bookedByRole: user.role,
      startTime: data.startTime,
      endTime: data.endTime,
      status: requiresApproval ? 'tentative' : 'confirmed',
      expectedAttendees: data.expectedAttendees,
      approvalRequestId: approvalId,
      createdAt: new Date().toISOString(),
    };

    bookingsStore.unshift(newBooking);

    if (approvalId) DEMO_APPROVALS_STORE.unshift({
      id: approvalId,
      title: `Room Reservation: ${newBooking.roomName} (${bookingCode})`,
      category: 'Room Reservation',
      requestType: 'room_booking',
      requesterId: user.id,
      requesterName: user.fullName,
      requesterRole: user.role,
      department: user.department || 'Operations',
      estimatedCost: '₹0',
      urgency: 'medium',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reason: `${data.title} · ${data.expectedAttendees} attendees`,
      entityId: newBooking.id,
    });

    res.status(201).json({
      success: true,
      booking: newBooking,
      source: 'demo_fallback',
    });
  }
);

bookingsRouter.patch(
  '/:id/status',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = BookingReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid booking status update.', details: parsed.error.format() });
      return;
    }
    const user = req.user!;
    const { status, reason } = parsed.data;
    const role = normalizeServerRole(user.role);
    const isReviewer = ['facilities_administrator', 'department_manager'].includes(role);

    if (status !== 'cancelled' && !isReviewer) {
      res.status(403).json({ error: 'Only facilities reviewers can approve or reject bookings.', code: 'INSUFFICIENT_PRIVILEGES' });
      return;
    }

    if (serverSupabase) {
      try {
        const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
        const paramId = String(req.params.id);
        if (!isUuid(paramId)) {
          res.status(400).json({ error: 'Persistent booking updates require a valid booking ID.', code: 'INVALID_RECORD_ID' });
          return;
        }
        const { data, error } = await serverSupabase.rpc('campusops_review_room_booking', {
          p_booking_id: String(req.params.id),
          p_status: status,
          p_actor_id: isUuid(user.id) ? user.id : null,
          p_actor_name: user.fullName,
          p_actor_role: user.role,
          p_reason: reason || null,
        });
        if (error) {
          const missing = error.code === 'P0002' || /not found/i.test(error.message);
          const denied = error.code === '42501' || /not authorized|self-approval/i.test(error.message);
          res.status(missing ? 404 : denied ? 403 : 409).json({ error: error.message, code: missing ? 'BOOKING_NOT_FOUND' : denied ? 'BOOKING_REVIEW_FORBIDDEN' : 'BOOKING_UPDATE_FAILED' });
          return;
        }
        res.json({ success: true, booking: data, source: 'supabase_postgres' });
        return;
      } catch (err: unknown) {
        res.status(500).json({ error: 'Booking update failed', message: err instanceof Error ? err.message : 'Unknown database error' });
        return;
      }
    }

    const booking = bookingsStore.find((entry) => entry.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    if (status === 'cancelled' && booking.bookedBy !== user.fullName && !isReviewer) {
      res.status(403).json({ error: 'You may only cancel your own booking.', code: 'BOOKING_CANCEL_FORBIDDEN' });
      return;
    }
    booking.status = status === 'approved' ? 'confirmed' : status === 'rejected' ? 'rejected' : 'cancelled';
    res.json({ success: true, booking, source: 'demo_fallback' });
  },
);

/**
 * POST /api/bookings/disruptions/approve-relocation
 * Human authorization protocol enforcement for exams
 */
bookingsRouter.post(
  '/disruptions/approve-relocation',
  authenticateToken,
  requireRole(['facilities_administrator', 'department_manager', 'coo', 'director']),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const parse = RelocationApprovalSchema.safeParse(req.body);

    if (!parse.success) {
      res.status(400).json({ error: 'Invalid relocation payload', details: parse.error.format() });
      return;
    }

    const { disruptionId, bookingId, targetRoomCode, approvalNotes } = parse.data;

    // Database path: the SQL function locks and updates the disruption, booking,
    // target room, and append-only relocation audit row in one transaction.
    if (serverSupabase) {
      const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
      if (!isUuid(disruptionId) || !isUuid(bookingId)) {
        res.status(400).json({ error: 'Persistent reallocation requires valid booking and disruption IDs.', code: 'INVALID_RECORD_ID' });
        return;
      }
      try {
        const { data, error } = await serverSupabase.rpc('campusops_reallocate_booking', {
          p_disruption_id: disruptionId,
          p_booking_id: bookingId,
          p_target_room_code: targetRoomCode,
          p_actor_id: isUuid(user.id) ? user.id : null,
          p_actor_name: user.fullName,
          p_actor_role: user.role,
          p_reason: approvalNotes || null,
        });
        if (error) {
          const conflict = error.code === '23P01' || /conflict|unavailable|capacity/i.test(error.message);
          const missing = error.code === 'P0002' || /not found/i.test(error.message);
          res.status(conflict ? 409 : missing ? 404 : 500).json({
            error: error.message,
            code: conflict ? 'REALLOCATION_CONFLICT' : missing ? 'RECORD_NOT_FOUND' : 'REALLOCATION_FAILED',
          });
          return;
        }
        res.json({ success: true, message: `Emergency room reallocation authorized by ${user.fullName}.`, relocation: data, source: 'supabase_postgres' });
        return;
      } catch (err: unknown) {
        res.status(500).json({ error: 'Database reallocation failed', message: err instanceof Error ? err.message : 'Unknown database error' });
        return;
      }
    }

    // Demo store update
    const disruption = disruptionsStore.find((d) => d.id === disruptionId);
    if (disruption) {
      disruption.status = 'mitigated';
    }

    const booking = bookingsStore.find((b) => b.id === bookingId || b.bookingCode === bookingId);
    if (booking) {
      booking.status = 'relocated';
      booking.originalRoomCode = booking.roomCode;
      booking.roomCode = targetRoomCode;
      booking.relocationDetails = {
        reason: disruption?.issue || 'Facility emergency disruption',
        suggestedRoomCode: targetRoomCode,
        approvedBy: user.fullName,
        approvedAt: new Date().toISOString(),
        isExamRelocation: disruption?.isExamAffected || true,
      };
    }

    // Unblock the maintenance lock if all disruptions are resolved
    maintenanceRooms.delete(targetRoomCode.toUpperCase());

    res.json({
      success: true,
      message: `Emergency exam relocation to ${targetRoomCode} authorized with signature by ${user.fullName}.`,
      relocation: {
        disruptionId,
        bookingId,
        targetRoomCode,
        authorizedBy: user.fullName,
        role: user.role,
        approvedAt: new Date().toISOString(),
        notes: approvalNotes || 'Authorized relocation under examination safety protocols.',
      },
    });
  }
);
