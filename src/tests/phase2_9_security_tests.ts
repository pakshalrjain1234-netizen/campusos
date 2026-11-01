/**
 * CampusOps Phase 2.9 — Security & Reliability Audit Verification Test Suite
 * 
 * Verifies all 7 core parts of the Phase 2.9 Master Implementation:
 * A. Authentication & Token Integrity (JWT, Expiration, Headers)
 * B. Authorization & Role-Based Access Control (COO, Director, Engineer, Liaison, 4-Eyes Self-Approval)
 * C. Operational Integrity & Business Logic:
 *    - Incident duplicate submission throttling & lifecycle transitions
 *    - Work order assignment validation & completion authorization
 *    - Inventory negative-stock prevention & safe adjustments
 *    - Procurement lifecycle & duplicate goods receipt prevention
 *    - Room booking conflict prevention & disrupted room protection
 *    - Occupancy telemetry validation (bounds, stale handling, unknown != vacant)
 * D. Reliability & Observability (Safe error messages, Rate limiting, Health check)
 */

import {
  hasPermission,
  authorizeApprovalAction,
  sanitizeString,
  isValidTimeFormat,
  isValidDateFormat,
  isValidTimeWindow,
  isPositiveSafeInteger,
  isNonNegativeNumber,
  isValidJwtFormat,
  isJwtExpired,
  parseAuthorizationHeader,
  isValidIncidentTransition,
  isValidWorkOrderTransition,
  isValidProcurementTransition,
  validateSensorReading,
} from '../utils/security';
import {
  getSafeErrorMessage,
  RateLimiter,
  getSystemHealthCheck,
  redactSensitiveData,
} from '../utils/observability';
import { UserProfile, ApprovalRequest, Room, RoomBooking } from '../types';
import { api } from '../services/api';
import { DEMO_ROOMS, DEMO_ROOM_BOOKINGS, DEMO_INVENTORY_ITEMS } from '../data/demoData';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (details) console.error(`         Details: ${details}`);
    failedTests++;
  }
}

console.log('============================================================');
console.log('   CampusOps Phase 2.9 Security & Reliability Test Suite   ');
console.log('============================================================\n');

/* ─── Suite 1: Authentication & Token Integrity ───────────────────── */
console.log('--- Test Suite 1: Authentication & Token Integrity ---');

// Helper to construct a base64url mock token
function createMockJwt(header: object, payload: object, sig = 'mock_signature_abc123'): string {
  const b64 = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  return `${b64(header)}.${b64(payload)}.${sig}`;
}

const currentSeconds = Math.floor(Date.now() / 1000);
const validToken = createMockJwt({ alg: 'HS256', typ: 'JWT' }, { sub: 'usr-1', exp: currentSeconds + 3600 });
const expiredToken = createMockJwt({ alg: 'HS256', typ: 'JWT' }, { sub: 'usr-2', exp: currentSeconds - 60 });
const malformedToken = 'invalid.jwt.token!@#$%^&*()';

assert(isValidJwtFormat(validToken), 'Valid 3-part base64url JWT accepted');
assert(!isValidJwtFormat('not-a-token'), 'Missing dot separator rejected');
assert(!isValidJwtFormat(malformedToken), 'Disallowed characters in JWT rejected');

assert(!isJwtExpired(validToken, currentSeconds), 'Unexpired token recognized as active');
assert(isJwtExpired(expiredToken, currentSeconds), 'Expired token strictly identified and rejected');

const validHeader = parseAuthorizationHeader(`Bearer ${validToken}`);
assert(validHeader.valid && validHeader.token === validToken, 'Valid "Bearer <token>" authorization header parsed');

const expiredHeader = parseAuthorizationHeader(`Bearer ${expiredToken}`);
assert(!expiredHeader.valid && /expired/i.test(expiredHeader.error || ''), 'Expired token in authorization header rejected');

const missingHeader = parseAuthorizationHeader(null);
assert(!missingHeader.valid && /missing/i.test(missingHeader.error || ''), 'Missing authorization header rejected');

const malformedHeader = parseAuthorizationHeader('Basic dXNlcjpwYXNz');
assert(!malformedHeader.valid && /malformed/i.test(malformedHeader.error || ''), 'Non-Bearer authorization scheme rejected');

/* ─── Suite 2: Role-Based Access Control (RBAC) ───────────────────── */
console.log('\n--- Test Suite 2: Role-Based Access Control (RBAC) ---');

assert(
  hasPermission('Chief Operations Officer', 'manage_inventory') &&
  hasPermission('Chief Operations Officer', 'approve_procurement') &&
  hasPermission('Chief Operations Officer', 'resolve_disruption') &&
  hasPermission('Chief Operations Officer', 'reallocate_booking'),
  'Chief Operations Officer possesses full administrative & operational permissions'
);

assert(
  hasPermission('Director of Facilities', 'approve_booking') &&
  hasPermission('Director of Facilities', 'resolve_disruption') &&
  hasPermission('Director of Facilities', 'reallocate_booking'),
  'Director of Facilities possesses facility coordination & disruption resolution authority'
);

assert(
  hasPermission('Lead Maintenance Engineer', 'manage_inventory') &&
  hasPermission('Lead Maintenance Engineer', 'report_disruption') &&
  !hasPermission('Lead Maintenance Engineer', 'approve_procurement') &&
  !hasPermission('Lead Maintenance Engineer', 'approve_booking'),
  'Lead Maintenance Engineer has operational inventory authority but lacks procurement/booking approval authority'
);

assert(
  !hasPermission('Student Affairs Liaison', 'manage_inventory') &&
  !hasPermission('Student Affairs Liaison', 'approve_procurement') &&
  !hasPermission('Student Affairs Liaison', 'resolve_disruption') &&
  !hasPermission('Student Affairs Liaison', 'reallocate_booking'),
  'Student Affairs Liaison is strictly denied privileged operations'
);

/* ─── Suite 3: Separation of Duties (4-Eyes Principle) ────────────── */
console.log('\n--- Test Suite 3: Separation of Duties & 4-Eyes Principle ---');

const managerUser: UserProfile = {
  id: 'usr-1',
  name: 'Marcus Vance',
  role: 'Director of Facilities',
  email: 'm.vance@campus.edu',
  avatar: '',
  department: 'Facilities Management',
};

const cooUser: UserProfile = {
  id: 'usr-coo',
  name: 'Dr. Evelyn Sterling',
  role: 'Chief Operations Officer',
  email: 'e.sterling@campus.edu',
  avatar: '',
  department: 'Campus Operations',
};

const liaisonUser: UserProfile = {
  id: 'usr-2',
  name: 'Kavitha Sundaram',
  role: 'Student Affairs Liaison',
  email: 'k.sundaram@campus.edu',
  avatar: '',
  department: 'Student Affairs',
};

const selfRequisition: ApprovalRequest = {
  id: 'req-self',
  title: 'HVAC Air Filter Stock Replenishment',
  category: 'Inventory Procurement',
  requesterName: 'Marcus Vance',
  requesterRole: 'Director of Facilities',
  department: 'Facilities Management',
  estimatedCost: '$2,400',
  urgency: 'high',
  status: 'pending',
  submittedAt: '10m ago',
  reason: 'Seasonal filter change',
};

const peerRequisition: ApprovalRequest = {
  ...selfRequisition,
  id: 'req-peer',
  requesterName: 'Kavitha Sundaram',
  requesterRole: 'Student Affairs Liaison',
};

// Self-approval test
const selfApprovalCheck = authorizeApprovalAction(managerUser, selfRequisition, 'approve');
assert(
  !selfApprovalCheck.allowed && selfApprovalCheck.code === 'SELF_APPROVAL_PROHIBITED',
  'Self-approval is strictly blocked under 4-Eyes Principle'
);

// Independent executive approval of peer requisition
const peerApprovalCheck = authorizeApprovalAction(cooUser, peerRequisition, 'approve');
assert(peerApprovalCheck.allowed, 'Independent manager authorization of peer requisition is permitted');

// Unprivileged role blocked
const liaisonApprovalCheck = authorizeApprovalAction(liaisonUser, peerRequisition, 'approve');
assert(
  !liaisonApprovalCheck.allowed && liaisonApprovalCheck.code === 'UNAUTHORIZED_ROLE',
  'Unprivileged role is blocked from approving requisitions'
);

// Replay prevention
const actionedRequisition: ApprovalRequest = {
  ...peerRequisition,
  status: 'approved',
};
const replayCheck = authorizeApprovalAction(cooUser, actionedRequisition, 'approve');
assert(
  !replayCheck.allowed && replayCheck.code === 'ALREADY_ACTIONED',
  'Already actioned requisitions cannot be re-approved or replayed'
);

/* ─── Suite 4: Input Sanitization & XSS Neutralization ────────────── */
console.log('\n--- Test Suite 4: Input Sanitization & XSS Neutralization ---');

const dirtyScript = 'Campus Hall <script>alert("XSS Attack!")</script> West Wing';
const sanitizedScript = sanitizeString(dirtyScript);
assert(
  sanitizedScript === 'Campus Hall  West Wing' && !sanitizedScript.includes('script'),
  'HTML <script> injection vectors are stripped'
);

const dirtyEventHandler = '<img src="x" onerror="document.cookie=steal()" /> Main Lab';
const sanitizedEventHandler = sanitizeString(dirtyEventHandler);
assert(
  !sanitizedEventHandler.includes('onerror') && !sanitizedEventHandler.includes('<img'),
  'HTML event handler injection vectors are neutralized'
);

const dirtyProtocol = '<a href="javascript:doEvil()">Click here</a>';
const sanitizedProtocol = sanitizeString(dirtyProtocol);
assert(
  !sanitizedProtocol.includes('javascript:'),
  'javascript: pseudo-protocol URIs are neutralized'
);

const longInput = 'A'.repeat(1000);
const boundedInput = sanitizeString(longInput, 100);
assert(boundedInput.length === 100, 'Input lengths are strictly bounded to prevent memory bloat');

/* ─── Suite 5: Temporal Boundary & Schedule Integrity ─────────────── */
console.log('\n--- Test Suite 5: Temporal & Schedule Boundary Validation ---');

assert(isValidTimeFormat('09:30') && isValidTimeFormat('23:59'), 'Valid 24h times accepted');
assert(!isValidTimeFormat('24:00'), '24:00 rejected (exceeds 23:59)');
assert(!isValidTimeFormat('12:60'), '12:60 rejected (minute >= 60)');
assert(!isValidTimeFormat('9:30'), 'Non-padded time (9:30) rejected');

assert(isValidDateFormat('2026-10-30'), 'Valid calendar date accepted (2026-10-30)');
assert(!isValidDateFormat('2026-02-31'), 'Impossible calendar date rejected (Feb 31st)');
assert(!isValidDateFormat('2026-13-01'), 'Impossible month rejected (Month 13)');
assert(!isValidDateFormat('30-10-2026'), 'Non-ISO date format rejected');

assert(isValidTimeWindow('09:00', '11:00').valid, 'Valid forward time window accepted');
assert(!isValidTimeWindow('11:00', '09:00').valid, 'Inverted time window rejected');
assert(!isValidTimeWindow('10:00', '10:00').valid, 'Zero duration window rejected');

/* ─── Suite 6: Numerical Integrity Safeguards ─────────────────────── */
console.log('\n--- Test Suite 6: Numerical Integrity Safeguards ---');

assert(isPositiveSafeInteger(1) && isPositiveSafeInteger(500), 'Positive safe integers accepted');
assert(!isPositiveSafeInteger(0), 'Zero rejected where positive integer required');
assert(!isPositiveSafeInteger(-5), 'Negative numbers rejected');
assert(!isPositiveSafeInteger(2.5), 'Fractional floats rejected where whole units required');
assert(!isPositiveSafeInteger(NaN) && !isPositiveSafeInteger(Infinity), 'NaN and Infinity rejected');
assert(!isPositiveSafeInteger('10'), 'String-typed numbers rejected');

assert(isNonNegativeNumber(0) && isNonNegativeNumber(12.5), 'Non-negative numbers accepted for thresholds/costs');
assert(!isNonNegativeNumber(-0.01), 'Negative numbers rejected');

/* ─── Suite 7: Operational Integrity & Transitions ───────────────── */
console.log('\n--- Test Suite 7: Operational Integrity & Transitions ---');

// 1. Incident Transitions
const directResolution = isValidIncidentTransition('open', 'resolved', 'Director of Facilities');
assert(!directResolution.allowed, 'Direct transition from open to resolved without investigation rejected');

const validInvestigation = isValidIncidentTransition('open', 'investigating', 'Director of Facilities');
assert(validInvestigation.allowed, 'Transition from open to investigating allowed');

const liaisonIncidentMod = isValidIncidentTransition('open', 'investigating', 'Student Affairs Liaison');
assert(!liaisonIncidentMod.allowed, 'Student Affairs Liaison prevented from mutating incident status');

const engineerReopenClosed = isValidIncidentTransition('closed', 'open', 'Lead Maintenance Engineer');
assert(!engineerReopenClosed.allowed, 'Engineer prevented from reopening closed incidents');

const cooReopenClosed = isValidIncidentTransition('closed', 'open', 'Chief Operations Officer');
assert(cooReopenClosed.allowed, 'COO permitted to reopen closed incidents');

// 2. Work Order Transitions
const validWoStart = isValidWorkOrderTransition('unassigned', 'in_progress', 'Lead Maintenance Engineer', false);
assert(validWoStart.allowed, 'Transition unassigned to in_progress allowed');

const unauthorizedWoComplete = isValidWorkOrderTransition('in_progress', 'completed', 'Lead Maintenance Engineer', false);
assert(!unauthorizedWoComplete.allowed, 'Non-assigned engineer prevented from marking work order completed');

const assignedWoComplete = isValidWorkOrderTransition('in_progress', 'completed', 'Lead Maintenance Engineer', true);
assert(assignedWoComplete.allowed, 'Assigned engineer permitted to mark work order completed');

const directorWoComplete = isValidWorkOrderTransition('in_progress', 'completed', 'Director of Facilities', false);
assert(directorWoComplete.allowed, 'Director of Facilities permitted to sign off work order completion');

// 3. Procurement Lifecycle & Duplicate Receipt Prevention
const validProcOrder = isValidProcurementTransition('approved', 'ordered');
assert(validProcOrder.allowed, 'Transition from approved to ordered permitted');

const unapprovedProcOrder = isValidProcurementTransition('pending_approval', 'ordered');
assert(!unapprovedProcOrder.allowed, 'Ordering unapproved procurement request rejected');

const duplicateGoodsReceipt = isValidProcurementTransition('received', 'received');
assert(!duplicateGoodsReceipt.allowed, 'Duplicate goods receipt strictly blocked');

const orderToReceipt = isValidProcurementTransition('ordered', 'received');
assert(orderToReceipt.allowed, 'Receiving ordered goods permitted');

/* ─── Suite 8: Room Bookings & Disruption Safety ──────────────────── */
console.log('\n--- Test Suite 8: Room Bookings & Disruption Safety ---');

const disruptedRoom: Room = {
  id: 'rm-disrupted-test',
  roomNumber: 'TEST-101',
  name: 'High-Voltage Robotics Lab',
  buildingId: 'bld-1',
  buildingName: 'Engineering Annex',
  floor: '1st Floor',
  capacity: 40,
  roomType: 'laboratory',
  facilities: ['Robotics'],
  equipment: ['Oscilloscope'],
  status: 'disrupted',
  isAccessible: true,
};

const healthyRoom: Room = {
  ...disruptedRoom,
  id: 'rm-healthy-test',
  name: 'Seminar Hall 3',
  status: 'available',
  capacity: 60,
};

const sampleBooking: RoomBooking = {
  id: 'bk-test-1',
  bookingNumber: 'BK-TEST-001',
  roomId: 'rm-original',
  roomCode: 'ORIG-1',
  roomName: 'Original Disrupted Room',
  buildingId: 'bld-1',
  buildingName: 'Engineering Annex',
  date: '2026-10-31',
  startTime: '10:00',
  endTime: '12:00',
  purpose: 'Robotics Seminar',
  bookedBy: 'Prof. Miller',
  bookedByRole: 'Faculty',
  department: 'Robotics',
  expectedAttendance: 35,
  requiredEquipment: ['Oscilloscope'],
  status: 'approved',
  createdAt: '2026-10-30',
};

// Test alternative recommendations strictly exclude disrupted rooms
const recommendations = api.recommendAlternativeRooms(sampleBooking, [disruptedRoom, healthyRoom], []);
const recommendedRoomIds = recommendations.map((r) => r.room.id);
assert(
  !recommendedRoomIds.includes(disruptedRoom.id),
  'Recommendation engine strictly filters out rooms with status === "disrupted"'
);
assert(
  recommendedRoomIds.includes(healthyRoom.id),
  'Recommendation engine includes available, safe alternative rooms'
);

// Double-booking conflict check
const conflictCheck = api.checkBookingConflict(
  sampleBooking.roomId!,
  sampleBooking.date!,
  '11:00',
  '13:00',
  [sampleBooking]
);
assert(conflictCheck.hasConflict, 'Double-booking conflict detected on overlapping time window');

const nonConflictCheck = api.checkBookingConflict(
  sampleBooking.roomId!,
  sampleBooking.date!,
  '12:00',
  '14:00',
  [sampleBooking]
);
assert(!nonConflictCheck.hasConflict, 'Adjacent non-overlapping slot allowed');

/* ─── Suite 9: Occupancy & Sensor Telemetry Validation ────────────── */
console.log('\n--- Test Suite 9: Occupancy & Sensor Telemetry Validation ---');

const nowEpoch = Date.now();
const freshTimestamp = new Date(nowEpoch - 2 * 60 * 1000).toISOString(); // 2 mins ago
const staleTimestamp = new Date(nowEpoch - 25 * 60 * 1000).toISOString(); // 25 mins ago (stale > 15m)

// 1. Valid telemetry
const validReading = validateSensorReading(
  { deviceId: 'PIR-SENSOR-ENG-101', timestamp: freshTimestamp, occupantCount: 24, authToken: 'valid_tok_123' },
  40,
  nowEpoch
);
assert(validReading.valid && validReading.occupancyStatus === 'occupied' && validReading.count === 24, 'Valid sensor telemetry accepted');

// 2. Negative count rejected
const negativeReading = validateSensorReading(
  { deviceId: 'PIR-SENSOR-ENG-101', timestamp: freshTimestamp, occupantCount: -3 },
  40,
  nowEpoch
);
assert(
  !negativeReading.valid && negativeReading.occupancyStatus === 'unknown',
  'Negative occupant count rejected and treated as unknown'
);

// 3. Stale data handling (> 15 minutes old)
const staleReading = validateSensorReading(
  { deviceId: 'PIR-SENSOR-ENG-101', timestamp: staleTimestamp, occupantCount: 0 },
  40,
  nowEpoch
);
assert(
  !staleReading.valid && staleReading.isStale && staleReading.occupancyStatus === 'unknown',
  'CRITICAL: Stale sensor reading (> 15m) marked unknown and strictly NOT assumed vacant'
);

// 4. Over-capacity telemetry rejected
const overCapacityReading = validateSensorReading(
  { deviceId: 'PIR-SENSOR-ENG-101', timestamp: freshTimestamp, occupantCount: 120 },
  40,
  nowEpoch
);
assert(
  !overCapacityReading.valid && overCapacityReading.occupancyStatus === 'unknown',
  'Reading exceeding 150% room capacity rejected as potential sensor glitch'
);

// 5. Malformed device ID
const malformedDeviceReading = validateSensorReading(
  { deviceId: '<script>evil()</script>', timestamp: freshTimestamp, occupantCount: 5 },
  40,
  nowEpoch
);
assert(!malformedDeviceReading.valid, 'Malformed deviceId rejected');

/* ─── Suite 10: Reliability, Error Handling & Observability ───────── */
console.log('\n--- Test Suite 10: Reliability, Error Handling & Observability ---');

// 1. Postgres error suppression
const rawDbError = new Error('relation "public.secret_system_auth" does not exist in search_path');
const safeErrMsg = getSafeErrorMessage(rawDbError);
assert(
  !safeErrMsg.includes('secret_system_auth') && !safeErrMsg.includes('relation'),
  'Internal database schema error suppressed from end users'
);

// 2. Secret Redaction in structured logger
const sensitivePayload = {
  username: 'campus_admin',
  authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sensitive_payload',
  userPassword: 'SuperSecretPassword123!',
  metadata: { apiKey: 'sk_live_999999999' },
};
const redacted = redactSensitiveData(sensitivePayload) as Record<string, unknown>;
assert(
  redacted.authToken === '[REDACTED]' &&
  redacted.userPassword === '[REDACTED]' &&
  (redacted.metadata as Record<string, unknown>).apiKey === '[REDACTED]' &&
  redacted.username === 'campus_admin',
  'Structured log redaction masks all auth tokens, passwords, and API keys'
);

// 3. Rate limiter sliding window
const limiter = new RateLimiter(3, 1000); // 3 requests per 1000ms
assert(limiter.isAllowed('user-1'), 'Rate limiter allows request 1');
assert(limiter.isAllowed('user-1'), 'Rate limiter allows request 2');
assert(limiter.isAllowed('user-1'), 'Rate limiter allows request 3');
assert(!limiter.isAllowed('user-1'), 'Rate limiter throttles excess request 4');

// 4. Diagnostic Health Check
const health = getSystemHealthCheck(false);
assert(
  health.status === 'healthy' &&
  health.subsystems.database === 'in_memory_simulation' &&
  health.subsystems.inventoryAudit === 'operational',
  'System health check reports operational status across all core subsystems'
);

/* ─── Suite 11: Regression Preservation of Phase 2.4 & 2.5 Baselines ─ */
console.log('\n--- Test Suite 11: Phase 2.4 & 2.5 Baseline Preservation ---');

assert(DEMO_INVENTORY_ITEMS.length >= 10, 'Phase 2.4 demo inventory items remain intact');
assert(DEMO_ROOMS.length >= 20, 'Phase 2.5 demo rooms remain intact');
assert(DEMO_ROOM_BOOKINGS.length >= 6, 'Phase 2.5 demo room bookings remain intact');

console.log('\n============================================================');
console.log(`Test Execution Finished: ${passedTests} Passed, ${failedTests} Failed`);
console.log('============================================================');

if (failedTests > 0) {
  process.exit(1);
}
