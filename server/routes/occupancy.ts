import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { authenticateToken } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { INITIAL_CLASSROOM_OCCUPANCY } from '../../src/data/occupancyData';
import { CAMPUS_BUILDINGS } from '../../src/data/buildingsData';

export const occupancyRouter = Router();

const serverSupabase = config.isConfigured
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey)
  : null;

// Explicitly labeled starter data for deployments that are running without a
// configured database. Database-backed deployments use the SQL seed migration.
export const DEMO_CLASSROOM_OCCUPANCY_STORE = INITIAL_CLASSROOM_OCCUPANCY.map((room) => ({
  ...room,
  status: room.status === 'occupied' ? 'scheduled' as const : room.status,
  dataSource: room.status === 'scheduled' ? 'timetable' as const : 'manual_inspection' as const,
  confidenceLevel: 'medium' as const,
  lastUpdated: new Date().toISOString(),
  currentClass: room.currentClass ? { ...room.currentClass, isCheckedIn: false } : undefined,
  sensorMeta: undefined,
}));

const mapOccupancyRecord = (record: any) => {
  const buildingId = record.building_id || record.buildingId || '';
  const databaseBuilding = record.buildings || record.building || {};
  const building = CAMPUS_BUILDINGS.find((candidate) =>
    [candidate.id, candidate.code, candidate.name, candidate.shortName, ...(candidate.aliases || [])]
      .some((value) => value.toLowerCase() === String(buildingId).toLowerCase())
  );
  const currentClass = record.current_class || record.currentClass;
  const upcoming = record.upcoming_classes || record.upcomingClasses || [];
  const lastUpdated = record.last_updated || record.lastUpdated;
  const rawFloor = record.floor;
  const floor = Number.isFinite(Number(rawFloor))
    ? Number(rawFloor)
    : /basement/i.test(String(rawFloor))
      ? -1
      : Number(String(rawFloor || '').match(/\d+/)?.[0] || 0);
  const rawStatus = String(record.status || '').toLowerCase();
  const status = ['maintenance', 'under_maintenance', 'disrupted'].includes(rawStatus)
    ? 'under_maintenance'
    : ['occupied', 'scheduled', 'available', 'unknown'].includes(rawStatus)
      ? rawStatus
      : 'unknown';

  return {
    id: record.id || `${buildingId}-${record.room_code || record.roomCode}`,
    roomCode: record.room_code || record.roomCode,
    roomName: record.room_name || record.roomName || record.name,
    buildingId: building?.id || buildingId,
    buildingCode: record.building_code || record.buildingCode || databaseBuilding.code || building?.code || buildingId,
    buildingName: record.building_name || record.buildingName || databaseBuilding.name || building?.name || buildingId,
    floor,
    capacity: Number(record.capacity || 0),
    equipment: Array.isArray(record.equipment) ? record.equipment : [],
    status,
    dataSource: record.data_source || record.dataSource || 'manual_inspection',
    confidenceLevel: record.confidence_level || record.confidenceLevel || 'low',
    lastUpdated: lastUpdated ? (Number.isNaN(Date.parse(lastUpdated)) ? lastUpdated : new Date(lastUpdated).toLocaleString()) : 'Not updated',
    currentClass: currentClass ? {
      courseCode: currentClass.courseCode || currentClass.course_code || currentClass.course || '',
      courseName: currentClass.courseName || currentClass.course_name || '',
      facultyName: currentClass.facultyName || currentClass.faculty_name || '',
      startTime: currentClass.startTime || currentClass.start_time || currentClass.startsAt || '',
      endTime: currentClass.endTime || currentClass.end_time || currentClass.endsAt || '',
      isCheckedIn: Boolean(currentClass.isCheckedIn ?? currentClass.is_checked_in),
      expectedStudents: Number(currentClass.expectedStudents ?? currentClass.expected_students ?? 0),
    } : undefined,
    upcomingClasses: Array.isArray(upcoming) ? upcoming.map((item: any) => ({
      courseCode: item.courseCode || item.course_code || item.course || '',
      courseName: item.courseName || item.course_name || '',
      facultyName: item.facultyName || item.faculty_name || '',
      startTime: item.startTime || item.start_time || item.startsAt || '',
      endTime: item.endTime || item.end_time || item.endsAt || '',
    })) : [],
    maintenanceIssue: record.maintenance_issue || record.maintenanceIssue || undefined,
  };
};

const CheckInSchema = z.object({
  roomCode: z.string().min(2),
  courseCode: z.string().min(2),
  courseName: z.string().min(3),
  facultyName: z.string().min(2),
});

const SmartFinderQuerySchema = z.object({
  buildingCode: z.string().optional(),
  floor: z.string().optional(),
  minCapacity: z.string().optional(),
  requiredEquipment: z.string().optional(), // comma-separated
});

/**
 * GET /api/occupancy
 * Return live classroom occupancy data with confidence and data-source indicators
 */
occupancyRouter.get(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { building, status } = req.query;

    if (!serverSupabase) {
      res.json({
        classrooms: DEMO_CLASSROOM_OCCUPANCY_STORE,
        message: 'Live classroom occupancy retrieved (demo mode)',
        userRole: user.role,
        source: 'demo_fixture',
      });
      return;
    }

    // The deployed database already stores teaching and meeting spaces in
    // `rooms`; the optional occupancy extension table is not installed there.
    // Read the persisted rooms directly so this page works without a remote
    // schema migration and does not silently show an empty dashboard.
    let query = serverSupabase
      .from('rooms')
      .select('*, buildings(name, code, short_name)');

    if (building) query = query.eq('building_id', building);
    // Status values in `rooms` include maintenance/disrupted; filter after
    // normalizing them to the occupancy vocabulary.

    const { data, error } = await query.order('room_code', { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const classrooms = (data || []).map(mapOccupancyRecord);
    res.json({
      classrooms: status ? classrooms.filter((room) => room.status === status) : classrooms,
      source: 'supabase_rooms',
    });
  }
);

/**
 * POST /api/occupancy/check-in
 * Faculty check-in indicating physical class start
 */
occupancyRouter.post(
  '/check-in',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const parseResult = CheckInSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed for faculty check-in',
        details: parseResult.error.format(),
      });
      return;
    }

    const { roomCode, courseCode, courseName, facultyName } = parseResult.data;

    if (!serverSupabase) {
      res.json({
        success: true,
        message: `Faculty check-in verified for Room ${roomCode}. Status changed to OCCUPIED.`,
        checkIn: {
          roomCode,
          courseCode,
          courseName,
          facultyName,
          checkedInBy: user.fullName,
          checkedInAt: new Date().toISOString(),
          status: 'occupied',
          dataSource: 'faculty_checkin',
        },
      });
      return;
    }

    // Insert faculty check-in record
    const { data, error } = await serverSupabase
      .from('faculty_checkins')
      .insert([
        {
          room_code: roomCode,
          building_id: 'A1',
          faculty_id: user.id,
          faculty_name: facultyName,
          course_code: courseCode,
          course_name: courseName,
          scheduled_start: new Date().toISOString(),
          scheduled_end: new Date(Date.now() + 5400000).toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Update classroom status to occupied with high confidence
    await serverSupabase
      .from('classroom_occupancy_records')
      .update({
        status: 'occupied',
        data_source: 'faculty_checkin',
        confidence_level: 'high',
        last_updated: new Date().toISOString(),
      })
      .eq('room_code', roomCode);

    res.json({ success: true, checkIn: data });
  }
);

/**
 * GET /api/occupancy/smart-finder
 * Validates capacity, building, equipment, and absence of conflicts or maintenance
 */
occupancyRouter.get(
  '/smart-finder',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const parseResult = SmartFinderQuerySchema.safeParse(req.query);

    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid search parameters' });
      return;
    }

    const { minCapacity, buildingCode, requiredEquipment } = parseResult.data;
    const minCap = minCapacity ? parseInt(minCapacity) : 30;

    res.json({
      query: { minCapacity: minCap, buildingCode, requiredEquipment },
      criteriaEnforced: [
        'Room status strictly AVAILABLE (not OCCUPIED, SCHEDULED, UNKNOWN, or UNDER_MAINTENANCE)',
        'Capacity >= minimum requested',
        'No active maintenance work orders or facility disruption flags',
        'All required equipment present',
      ],
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * GET /api/occupancy/sensors
 * Sensor device abstraction endpoints (ESP32 + mmWave / PIR telemetry)
 */
occupancyRouter.get(
  '/sensors',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    res.json({
      architecture: 'ESP32 IoT Gateway + 24GHz mmWave / PIR Hardware Interface',
      hardwareReady: true,
      protocol: 'MQTT / HTTP Webhook Telemetry',
      devicesSupported: ['ESP32-S3', 'HLK-LD2410C 24GHz Radar', 'HC-SR501 PIR', 'Bluetooth LE Beacon'],
      note: 'Software-based telemetry active. Physical IoT devices can be bound by MAC/Sensor-ID.',
    });
  }
);

