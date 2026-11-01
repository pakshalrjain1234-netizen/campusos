export * from './auth';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'in_progress' | 'investigating' | 'resolved' | 'closed';

export type IncidentCategory = 
  | 'Electrical' 
  | 'Plumbing' 
  | 'HVAC' 
  | 'Structural' 
  | 'IT / Network' 
  | 'Safety' 
  | 'Sanitation'
  | 'Pest Control'
  | 'Furniture & Fixtures'
  | 'Landscaping'
  | 'General';

export type IncidentLifecycleStatus = 
  | 'reported' 
  | 'triaged' 
  | 'assigned' 
  | 'acknowledged' 
  | 'in_progress' 
  | 'resolved' 
  | 'closed' 
  | 'cancelled';

export type SafetyRiskLevel = 'low' | 'medium' | 'high' | 'hazardous';
export type DisruptionLevel = 'none' | 'minor' | 'moderate' | 'severe';

export interface TimelineEvent {
  id: string;
  incidentId: string;
  fromStatus?: string;
  toStatus: string;
  actorId?: string;
  actorName: string;
  actorRole: string;
  remarks?: string;
  createdAt: string;
}

export interface TriageDetails {
  score: number;
  priority: IncidentSeverity;
  reason: string;
  safetyRisk: SafetyRiskLevel;
  disruptionLevel: DisruptionLevel;
  peopleAffected: number;
  facilityCriticality: 'critical' | 'high' | 'medium' | 'standard';
  ackTargetMinutes: number;
  resolutionTargetHours: number;
  calculatedAt: string;
  isAiEnhanced?: boolean;
}

export interface Incident {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  buildingId: string;
  buildingName: string;
  building?: string;
  location?: string;
  floor: string;
  room?: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  lifecycleStatus?: IncidentLifecycleStatus;
  reportedBy: string;
  reportedRole: string;
  reporterId?: string;
  department?: string;
  assignedTo?: string;
  assignedEngineerId?: string;
  createdAt: string;
  slaDeadline: string;
  ackSlaDeadline?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  closedBy?: string;
  safetyRisk?: SafetyRiskLevel | string;
  disruptionLevel?: DisruptionLevel | string;
  peopleAffected?: number;
  evidenceUrls?: string[];
  triageDetails?: TriageDetails;
  timeline?: TimelineEvent[];
  workOrderId?: string;
  isSlaBreached?: boolean;
  isDemo?: boolean;
  assetId?: string;
  assetName?: string;
  assetCategory?: string;
  mappedLocationLevel?: 'building' | 'floor' | 'room' | 'asset';
  annotationCoordinates?: { x: number; y: number };
}

export interface MappedAsset {
  id: string;
  name: string;
  category: string;
  buildingId: string;
  buildingName: string;
  floor: string;
  room: string;
  photoUrl: string;
  annotationCoordinates: { x: number; y: number }; // normalized percentages 0-100 on photo
  position3D?: [number, number, number];
  serialNumber?: string;
  installDate?: string;
  lastServicedDate?: string;
  maintenanceHistory?: Array<{ date: string; action: string; technician: string; notes: string }>;
}

export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';
export type WorkOrderStatus = 'unassigned' | 'in_progress' | 'awaiting_parts' | 'completed' | 'verified';

export interface MaintenanceTechnician {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: 'technician';
  department?: string;
  departmentId?: string;
  avatar?: string;
  phone?: string;
  isActive?: boolean;
}

export interface WorkOrder {
  id: string;
  orderNumber: string;
  title: string;
  category: string;
  buildingId: string;
  buildingName: string;
  location: string;
  priority: PriorityLevel;
  status: WorkOrderStatus;
  assignedEngineer: string;
  assignedEngineerId?: string;
  assignedTo?: string;
  assigneeId?: string;
  department?: string;
  estimatedHours?: number | string;
  engineerAvatar: string;
  dueDate: string;
  slaRemaining: string;
  completionRate: number;
  partsRequired?: string[];
  allocatedParts?: WorkOrderPartAllocation[];
  incidentId?: string;
  diagnosis?: string;
  repairInstructions?: string;
  completionNotes?: string;
  inspectedBy?: string;
  inspectedAt?: string;
}

export interface EngineerProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  department: string;
  specialties: IncidentCategory[];
  activeTicketCount: number;
  maxCapacity: number;
  availability: 'available' | 'busy' | 'on_leave';
  rating: number; // e.g. 4.9
}

export interface StockAlert {
  id: string;
  sku: string;
  itemName?: string;
  name?: string; // alias for itemName
  category: string;
  currentStock: number;
  minThreshold: number;
  threshold?: number;
  unit: string;
  reorderStatus?: 'optimal' | 'reordered' | 'critical' | 'pending_approval';
  leadTimeDays?: number;
  location: string;
  unitCost?: number;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface InventoryItem extends StockAlert {
  unitCost: number;
  name?: string; // alias for itemName
  description?: string;
  maxThreshold?: number;
  buildingId?: string;
  supplierName?: string;
  supplierContact?: string;
  allocatedQuantity?: number;
  status?: StockStatus;
  lastRestockedAt?: string;
  compatibleEquipment?: string[];
  reorderPoint?: number;
}

export type StockTransactionType = 'stock_in' | 'stock_out' | 'allocation' | 'receipt' | 'return' | 'adjustment';

export interface StockTransaction {
  id: string;
  sku?: string;
  itemSku?: string; // alias for sku
  itemName?: string;
  name?: string; // alias for itemName
  quantity: number;
  type: StockTransactionType;
  balanceBefore?: number;
  balanceAfter?: number;
  transactionNumber?: string;
  itemId?: string;
  previousStock?: number;
  newStock?: number;
  referenceType?: 'work_order' | 'procurement' | 'manual_adjustment' | 'return';
  referenceId?: string;
  reason?: string;
  performedBy?: string;
  actorId?: string;
  actorName?: string;
  timestamp?: string;
  createdAt?: string;
}

export type ProcurementStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'received';
export type ProcurementUrgency = 'urgent' | 'high' | 'medium' | 'normal';

export interface ProcurementRequest {
  id: string;
  requestNumber: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedUnitCost: number;
  totalEstimatedCost: number;
  supplierName: string;
  supplierContact?: string;
  urgency: ProcurementUrgency;
  status: ProcurementStatus;
  reason: string;
  ruleTriggerReason?: string;
  requestedBy: string;
  approvedBy?: string;
  orderedAt?: string;
  receivedAt?: string;
  createdAt: string;
  canApprove?: boolean;
  selfApprovalBlocked?: boolean;
  businessApprovalRestricted?: boolean;
}

export interface WorkOrderPartAllocation {
  id: string;
  workOrderId: string;
  orderNumber?: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  allocatedAt: string;
  allocatedBy: string;
  status: 'allocated' | 'issued' | 'returned';
}

export type RoomType =
  | 'lecture_hall'
  | 'laboratory'
  | 'seminar_hall'
  | 'classroom'
  | 'conference_room'
  | 'auditorium'
  | 'workshop';

export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'disrupted';

export interface Room {
  id: string;
  roomNumber: string;
  name: string;
  buildingId: string;
  buildingName: string;
  floor: string;
  capacity: number;
  roomType: RoomType;
  facilities: string[];
  equipment: string[];
  status: RoomStatus;
  isAccessible: boolean;
  currentDisruption?: string;
  activeDisruptionId?: string;
}

export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'confirmed'
  | 'relocated'
  | 'reallocated';

export interface RoomBooking {
  id: string;
  bookingCode?: string;
  bookingNumber?: string;
  roomId?: string;
  roomCode: string;
  roomName: string;
  buildingId?: string;
  buildingCode?: string;
  buildingName: string;
  date?: string; // YYYY-MM-DD
  startTime: string; // HH:MM or ISO
  endTime: string; // HH:MM or ISO
  purpose?: string;
  title?: string;
  eventType?: 'lecture' | 'examination' | 'lab_session' | 'seminar' | 'faculty_meeting';
  expectedAttendance?: number;
  expectedAttendees?: number;
  requiredEquipment?: string[];
  bookedBy: string;
  bookedByRole: string;
  department?: string;
  status: BookingStatus;
  timeSlot?: string;
  requiresApproval?: boolean;
  approvalRequestId?: string;
  reallocatedFromRoomId?: string;
  reallocatedFromRoomName?: string;
  reallocationReason?: string;
  reallocationTimestamp?: string;
  approvedBy?: string;
  approvalTimestamp?: string;
  rejectionReason?: string;
  notes?: string;
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

export type DisruptionSeverity = 'critical' | 'high' | 'medium' | 'low';
export type DisruptionStatus = 'reported' | 'under_review' | 'confirmed' | 'resolved';
export type DisruptionCategory =
  | 'room_unavailable'
  | 'equipment_failure'
  | 'maintenance_closure'
  | 'safety_hazard'
  | 'emergency_building_closure'
  | 'hvac_power_failure';

export interface RoomDisruption {
  id: string;
  disruptionNumber?: string;
  roomId?: string;
  roomCode: string;
  roomName?: string;
  buildingId?: string;
  buildingCode?: string;
  buildingName: string;
  issue: string;
  severity: DisruptionSeverity | string;
  reasonCategory?: DisruptionCategory;
  affectedSchedule?: string;
  status: DisruptionStatus | 'active' | 'pending_relocation_approval' | 'mitigated' | 'resolved';
  alternativeRoom?: string;
  alternativeRoomId?: string;
  alternativeRoomName?: string;
  resolutionEta: string;
  reportedBy?: string;
  reportedByRole?: string;
  relatedIncidentTicket?: string;
  relatedWorkOrderNumber?: string;
  affectedBookingIds?: string[];
  affectedBookings?: string[];
  createdAt?: string;
  incidentId?: string;
  workOrderId?: string;
  isExamAffected?: boolean;
  alternativeRoomSuggestion?: {
    roomCode: string;
    roomName: string;
    capacity: number;
    equipment: string[];
    suitabilityScore: number;
  };
}

export interface RoomRecommendation {
  room: Room;
  score: number;
  matchReasons: string[];
  conflictFree: boolean;
  isNearby: boolean;
  capacityFitPercent: number;
}

export type InsightType = 'repeated-complaint' | 'maintenance-risk' | 'low-stock' | 'room-conflict';

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  buildingName: string;
  severity: 'critical' | 'warning' | 'advisory';
  summary: string;
  rootCause: string;
  confidenceScore: number;
  recommendedAction: string;
  actionPayload?: {
    actionType: 'create_work_order' | 'reorder_stock' | 'reallocate_room' | 'inspect_building';
    targetId: string;
  };
  detectedTimeAgo: string;
}

export interface ActivityItem {
  id: string;
  actor: string;
  actorRole: string;
  avatar: string;
  action: string;
  target: string;
  category: 'incident' | 'maintenance' | 'inventory' | 'approval' | 'system';
  timestamp: string;
  badgeText: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  title: string;
  category: string;
  requestType?: 'procurement' | 'room_booking' | 'room_relocation' | 'general';
  requesterId?: string;
  requesterName: string;
  requesterRole: string;
  department: string;
  estimatedCost: string;
  urgency: 'high' | 'medium' | 'normal';
  status: ApprovalStatus;
  submittedAt: string;
  reason: string;
  entityId?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Building {
  id: string;
  name: string;
  shortName: string;
  code: string;
  category: 'Academic' | 'Administrative' | 'Residential' | 'Facility' | 'Service' | 'Sports';
  openIncidents: number;
  activeWorkOrders: number;
  healthScore: number;
  floors: string;
  status: 'optimal' | 'warning' | 'alert';
  position: [number, number, number]; // 3D coordinates
  blenderObject?: string;
  aliases?: string[];
}

export type OfficialAppRole =
  | 'student_faculty'
  | 'technician'
  | 'department_manager'
  | 'facilities_administrator'
  | 'procurement_approver'
  | 'system_administrator';

export type CampusRole = OfficialAppRole;

export type LegacyAppRole = 'coo' | 'director' | 'engineer' | 'liaison';

export type LegacyRole =
  | 'coo'
  | 'director'
  | 'engineer'
  | 'Chief Operations Officer'
  | 'Director of Facilities'
  | 'Lead Maintenance Engineer'
  | 'Student Affairs Liaison';

export type AppRole = OfficialAppRole | LegacyAppRole;

export interface UserProfile {
  id: string;
  name: string;
  fullName?: string;
  role: CampusRole | LegacyRole | string;
  email: string;
  avatar?: string;
  avatarUrl?: string;
  department: string;
  departmentId?: string;
  isActive?: boolean;
}

// ─── PHASE 2.6: INTELLIGENT CLASSROOM OCCUPANCY ──────────────────────────────
export type OccupancyStatus = 
  | 'occupied' 
  | 'scheduled' 
  | 'available' 
  | 'unknown' 
  | 'under_maintenance';

export type OccupancyDataSource = 
  | 'faculty_checkin' 
  | 'timetable' 
  | 'booking' 
  | 'sensor_iot' 
  | 'manual_inspection';

export interface ClassroomOccupancy {
  id: string;
  roomCode: string;
  roomName: string;
  buildingId: string;
  buildingCode: string;
  buildingName: string;
  floor: number;
  capacity: number;
  equipment: string[];
  status: OccupancyStatus;
  dataSource: OccupancyDataSource;
  confidenceLevel: 'high' | 'medium' | 'low';
  lastUpdated: string;
  currentClass?: {
    courseCode: string;
    courseName: string;
    facultyName: string;
    startTime: string;
    endTime: string;
    isCheckedIn: boolean;
    expectedStudents: number;
  };
  upcomingClasses: {
    courseCode: string;
    courseName: string;
    facultyName: string;
    startTime: string;
    endTime: string;
  }[];
  maintenanceIssue?: string;
  sensorMeta?: {
    sensorId: string;
    sensorType: string;
    occupancyValue: string;
    lastSignalAt: string;
    connectionStatus: 'online' | 'standby' | 'offline';
  };
}

export interface SensorDevice {
  id: string;
  sensorId: string;
  roomId: string;
  roomCode: string;
  sensorType: 'pir' | 'mmwave_radar' | 'ble_beacon' | 'esp32_gateway';
  occupancyValue: 'motion_detected' | 'vacant' | 'offline';
  lastSignalAt: string;
  connectionStatus: 'online' | 'standby' | 'offline';
  hardwareSpecs: string;
}

export interface SmartFinderCriteria {
  buildingCode?: string;
  floor?: number;
  minCapacity?: number;
  requiredEquipment?: string[];
  timeSlot?: string;
}
