import { Incident } from '../types';
import { resolveBuildingCode, THREE_BUILDING_COORDINATES, parseFloorLevel } from './campus3dMapping';

export interface DemoIncidentLocalization {
  incidentIdOrTicket: string;
  buildingCode: string;
  buildingName: string;
  floorLevel: number;
  floorLabel: string;
  roomCode: string;
  roomName: string;
  issueType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

/**
 * TEMPORARY DEMO ROOM MAPPINGS
 * Clearly separated temporary demo mapping dataset for interactive 3D localization.
 * Configurable so real database room identifiers can replace demo mappings later.
 * NOT stored in Supabase or represented as genuine production reports.
 */
export const TEMPORARY_DEMO_ROOM_MAPPINGS: Record<string, DemoIncidentLocalization> = {
  'INC-001': {
    incidentIdOrTicket: 'INC-001',
    buildingCode: 'ADM',
    buildingName: 'Administrative Block',
    floorLevel: 1,
    floorLabel: 'Floor 1',
    roomCode: 'A-102',
    roomName: 'Room A-102',
    issueType: 'Electrical issue',
    severity: 'high',
    title: 'Main Distribution Panel Trip & Partial Lighting Failure',
    description: 'Sub-breaker 2B tripped on Floor 1, causing lighting and AC outage in Room A-102.',
  },
  'INC-002': {
    incidentIdOrTicket: 'INC-002',
    buildingCode: 'ADM',
    buildingName: 'Administrative Block',
    floorLevel: 2,
    floorLabel: 'Floor 2',
    roomCode: 'A-204',
    roomName: 'Room A-204',
    issueType: 'HVAC issue',
    severity: 'medium',
    title: 'HVAC FCU Thermostat Malfunction & Overheating',
    description: 'Fan coil unit in Room A-204 blowing ambient air; temperature sensor reading 29°C.',
  },
  'INC-003': {
    incidentIdOrTicket: 'INC-003',
    buildingCode: 'ADM',
    buildingName: 'Administrative Block',
    floorLevel: 3,
    floorLabel: 'Floor 3',
    roomCode: 'A-305',
    roomName: 'Room A-305',
    issueType: 'Water leakage',
    severity: 'critical',
    title: 'Chilled Water Line Condensation Leak in Ceiling Plenum',
    description: 'Continuous dripping from ceiling tile in Room A-305 near executive desk.',
  },
};

/**
 * Create synthetic Incident instances for 3D localization demonstration.
 * These are marked with isDemo: true and clearly isolated from real database state.
 */
export function createDemo3DIncidents(): Incident[] {
  return [
    {
      id: 'demo-3d-inc-001',
      ticketNumber: 'INC-001',
      title: 'Main Distribution Panel Trip (Room A-102)',
      description: 'Sub-breaker 2B tripped on Floor 1, causing lighting and AC outage in Room A-102.',
      category: 'Electrical',
      severity: 'high',
      status: 'investigating',
      lifecycleStatus: 'in_progress',
      buildingId: 'ADM',
      buildingName: 'Administrative Block',
      building: 'Administrative Block',
      floor: 'Floor 1',
      room: 'Room A-102',
      location: 'Administrative Block - Floor 1 - Room A-102',
      reportedBy: 'Alex Chen',
      reportedRole: 'student_faculty',
      reporterId: 'demo-student-001',
      department: 'Computer Science',
      assignedTo: 'Marcus Vance',
      assignedEngineerId: 'demo-tech-002',
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      slaDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      safetyRisk: 'high',
      disruptionLevel: 'moderate',
      peopleAffected: 25,
      mappedLocationLevel: 'room',
      isDemo: true,
      triageDetails: {
        score: 78,
        priority: 'high',
        reason: 'Sub-breaker tripped on Floor 1 causing partial room power outage',
        safetyRisk: 'high',
        disruptionLevel: 'moderate',
        peopleAffected: 25,
        facilityCriticality: 'critical',
        ackTargetMinutes: 15,
        resolutionTargetHours: 4,
        calculatedAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      },
    },
    {
      id: 'demo-3d-inc-002',
      ticketNumber: 'INC-002',
      title: 'HVAC FCU Thermostat Malfunction (Room A-204)',
      description: 'Fan coil unit in Room A-204 blowing ambient air; temperature sensor reading 29°C.',
      category: 'HVAC',
      severity: 'medium',
      status: 'open',
      lifecycleStatus: 'acknowledged',
      buildingId: 'ADM',
      buildingName: 'Administrative Block',
      building: 'Administrative Block',
      floor: 'Floor 2',
      room: 'Room A-204',
      location: 'Administrative Block - Floor 2 - Room A-204',
      reportedBy: 'Dr. Elena Rostova',
      reportedRole: 'department_manager',
      reporterId: 'demo-manager-003',
      department: 'Infrastructure Planning',
      assignedTo: 'Marcus Vance',
      assignedEngineerId: 'demo-tech-002',
      createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      slaDeadline: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
      acknowledgedAt: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
      safetyRisk: 'low',
      disruptionLevel: 'minor',
      peopleAffected: 12,
      mappedLocationLevel: 'room',
      isDemo: true,
      triageDetails: {
        score: 54,
        priority: 'medium',
        reason: 'FCU blowing ambient air in occupied office space',
        safetyRisk: 'low',
        disruptionLevel: 'minor',
        peopleAffected: 12,
        facilityCriticality: 'high',
        ackTargetMinutes: 30,
        resolutionTargetHours: 8,
        calculatedAt: new Date(Date.now() - 105 * 60 * 1000).toISOString(),
      },
    },
    {
      id: 'demo-3d-inc-003',
      ticketNumber: 'INC-003',
      title: 'Chilled Water Line Condensation Leak (Room A-305)',
      description: 'Continuous dripping from ceiling tile in Room A-305 near executive desk.',
      category: 'Plumbing',
      severity: 'critical',
      status: 'open',
      lifecycleStatus: 'reported',
      buildingId: 'ADM',
      buildingName: 'Administrative Block',
      building: 'Administrative Block',
      floor: 'Floor 3',
      room: 'Room A-305',
      location: 'Administrative Block - Floor 3 - Room A-305',
      reportedBy: 'Sarah Jenkins',
      reportedRole: 'facilities_administrator',
      reporterId: 'demo-facilities-004',
      department: 'Facilities & Engineering',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      safetyRisk: 'high',
      disruptionLevel: 'severe',
      peopleAffected: 8,
      mappedLocationLevel: 'room',
      isDemo: true,
      triageDetails: {
        score: 89,
        priority: 'critical',
        reason: 'Continuous water dripping from ceiling plenum near executive workstations',
        safetyRisk: 'high',
        disruptionLevel: 'severe',
        peopleAffected: 8,
        facilityCriticality: 'critical',
        ackTargetMinutes: 10,
        resolutionTargetHours: 2,
        calculatedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
    },
    {
      id: 'demo-3d-inc-004-noroom',
      ticketNumber: 'INC-004',
      title: 'Administrative Block Perimeter Light Pole Damaged',
      description: 'Exterior fixture near north walkway damaged by high wind. No interior room assigned.',
      category: 'Electrical',
      severity: 'low',
      status: 'open',
      lifecycleStatus: 'reported',
      buildingId: 'ADM',
      buildingName: 'Administrative Block',
      building: 'Administrative Block',
      floor: '',
      room: '',
      location: 'Administrative Block - Exterior Perimeter',
      reportedBy: 'Alex Chen',
      reportedRole: 'student_faculty',
      reporterId: 'demo-student-001',
      department: 'Computer Science',
      createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
      slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      safetyRisk: 'low',
      disruptionLevel: 'none',
      peopleAffected: 0,
      mappedLocationLevel: 'building',
      isDemo: true,
      triageDetails: {
        score: 32,
        priority: 'low',
        reason: 'Exterior lighting pole fixture damaged without live electrical hazard',
        safetyRisk: 'low',
        disruptionLevel: 'none',
        peopleAffected: 0,
        facilityCriticality: 'standard',
        ackTargetMinutes: 120,
        resolutionTargetHours: 24,
        calculatedAt: new Date(Date.now() - 175 * 60 * 1000).toISOString(),
      },
    },
  ];
}

export interface IncidentLocalizationResult {
  buildingCode: string;
  buildingName: string;
  floorLevel: number;
  floorLabel: string;
  room: string | null;
  hasExactRoom: boolean;
  issueDescription: string;
  isDemoMapping: boolean;
}

/**
 * Resolves an incident's physical building, floor and room.
 * Strictly adheres to rule: If room is not known, returns room: null with hasExactRoom: false.
 * Never invents a room for an incident.
 */
export function resolveIncidentLocalization(
  incident: Partial<Incident> | null | undefined
): IncidentLocalizationResult | null {
  if (!incident) return null;

  const ticket = (incident.ticketNumber || incident.id || '').toUpperCase();
  const demoMatch = TEMPORARY_DEMO_ROOM_MAPPINGS[ticket];
  if (demoMatch) {
    return {
      buildingCode: demoMatch.buildingCode,
      buildingName: demoMatch.buildingName,
      floorLevel: demoMatch.floorLevel,
      floorLabel: demoMatch.floorLabel,
      room: demoMatch.roomName,
      hasExactRoom: true,
      issueDescription: demoMatch.issueType,
      isDemoMapping: true,
    };
  }

  const rawBldg = incident.buildingId || incident.building || incident.location || 'ACB';
  const bCode = resolveBuildingCode(rawBldg);
  const bInfo = THREE_BUILDING_COORDINATES[bCode];
  const bName = bInfo?.name || incident.building || 'Campus Facility';

  const rawRoom = (incident.room || '').trim();
  const isExplicitlyUnavailable =
    !rawRoom ||
    rawRoom.toLowerCase().includes('not available') ||
    rawRoom.toLowerCase().includes('unassigned') ||
    rawRoom.toLowerCase() === 'none';

  const hasExactRoom = !isExplicitlyUnavailable;

  let floorLevel = 0;
  if (incident.floor) {
    floorLevel = parseFloorLevel(incident.floor);
  } else if (hasExactRoom) {
    floorLevel = parseFloorLevel(rawRoom);
  }

  return {
    buildingCode: bCode,
    buildingName: bName,
    floorLevel,
    floorLabel: floorLevel === 0 ? 'Ground Floor' : `Floor ${floorLevel}`,
    room: hasExactRoom ? rawRoom : null,
    hasExactRoom,
    issueDescription: incident.category || 'General Issue',
    isDemoMapping: false,
  };
}
