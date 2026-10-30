/**
 * CampusOps Security & Validation Utility Layer (Phase 2.9)
 * 
 * Provides:
 * 1. Role-Based Access Control (RBAC) definitions and permission checks.
 * 2. Self-Approval & Separation of Duties (4-Eyes Principle) enforcement.
 * 3. Strict Input Validation, XSS Neutralization, and string sanitization.
 * 4. Temporal boundary verification (Time & Date formats, non-overlapping windows).
 * 5. Numerical integrity safeguards (non-negative integer enforcement).
 */

import { 
  UserProfile, 
  ApprovalRequest, 
  RoomBooking, 
  IncidentStatus, 
  WorkOrderStatus, 
  ProcurementStatus 
} from '../types';

/* ─── 1. Role-Based Access Control (RBAC) ─────────────────────────── */

export type AppPermission =
  | 'manage_inventory'
  | 'approve_procurement'
  | 'approve_booking'
  | 'report_disruption'
  | 'resolve_disruption'
  | 'reallocate_booking'
  | 'create_work_order'
  | 'manage_rooms';

export const ROLE_PERMISSIONS: Record<UserProfile['role'], AppPermission[]> = {
  'Chief Operations Officer': [
    'manage_inventory',
    'approve_procurement',
    'approve_booking',
    'report_disruption',
    'resolve_disruption',
    'reallocate_booking',
    'create_work_order',
    'manage_rooms',
  ],
  'Director of Facilities': [
    'manage_inventory',
    'approve_procurement',
    'approve_booking',
    'report_disruption',
    'resolve_disruption',
    'reallocate_booking',
    'create_work_order',
    'manage_rooms',
  ],
  'Lead Maintenance Engineer': [
    'manage_inventory',
    'report_disruption',
    'create_work_order',
  ],
  'Student Affairs Liaison': [
    // Liaison represents occupants/students; can submit requests but has NO administrative or operational modification permissions
  ],
  student_faculty: [],
  technician: [
    'manage_inventory',
    'report_disruption',
    'create_work_order',
  ],
  department_manager: [
    'approve_booking',
    'report_disruption',
    'create_work_order',
  ],
  facilities_administrator: [
    'manage_inventory',
    'approve_procurement',
    'approve_booking',
    'report_disruption',
    'resolve_disruption',
    'reallocate_booking',
    'create_work_order',
    'manage_rooms',
  ],
  procurement_approver: [
    'manage_inventory',
    'approve_procurement',
  ],
  system_administrator: [
    'report_disruption',
    'manage_rooms',
  ],
};

/**
 * Checks if a given user role possesses the requested permission.
 */
export function hasPermission(role: UserProfile['role'], permission: AppPermission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/* ─── 2. Separation of Duties (4-Eyes Principle) ──────────────────── */

export interface ApprovalAuthorizationResult {
  allowed: boolean;
  reason?: string;
  code?: 'UNAUTHORIZED_ROLE' | 'SELF_APPROVAL_PROHIBITED' | 'ALREADY_ACTIONED' | 'INVALID_REQUEST';
}

/**
 * Validates whether the current user is authorized to approve or reject a requisition.
 * Strictly prevents self-approval (requester cannot approve their own requisition).
 */
export function authorizeApprovalAction(
  user: UserProfile,
  approval: ApprovalRequest,
  action: 'approve' | 'reject'
): ApprovalAuthorizationResult {
  if (!approval) {
    return { allowed: false, reason: 'Approval request does not exist.', code: 'INVALID_REQUEST' };
  }

  // 1. Must be currently in 'pending' state
  if (approval.status !== 'pending') {
    return {
      allowed: false,
      reason: `This request has already been ${approval.status}. Re-submitting or replay is prohibited.`,
      code: 'ALREADY_ACTIONED',
    };
  }

  // 2. Check RBAC authority
  const requiredPermission: AppPermission = approval.category.toLowerCase().includes('room')
    ? 'approve_booking'
    : 'approve_procurement';

  if (!hasPermission(user.role, requiredPermission)) {
    return {
      allowed: false,
      reason: `Role "${user.role}" does not have authority to ${action} ${approval.category.toLowerCase()} requisitions.`,
      code: 'UNAUTHORIZED_ROLE',
    };
  }

  // 3. Four-Eyes Principle: Prevent Self-Approval
  // Users cannot approve requisitions they personally initiated
  const normalizedRequester = approval.requesterName.trim().toLowerCase();
  const normalizedUserName = user.name.trim().toLowerCase();
  const normalizedUserEmail = user.email.trim().toLowerCase();

  if (action === 'approve') {
    if (
      normalizedRequester === normalizedUserName ||
      normalizedRequester === normalizedUserEmail ||
      (approval.requesterRole && approval.requesterRole === user.role && normalizedRequester.includes(normalizedUserName))
    ) {
      return {
        allowed: false,
        reason: 'Self-approval is strictly prohibited by campus compliance policy (Separation of Duties). An independent manager must review and authorize this requisition.',
        code: 'SELF_APPROVAL_PROHIBITED',
      };
    }
  }

  return { allowed: true };
}

/* ─── 3. Input Sanitization & XSS Neutralization ──────────────────── */

/**
 * Strips dangerous HTML tags, javascript: URIs, and event handlers.
 * Enforces maximum character bounds to prevent buffer bloat.
 */
export function sanitizeString(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';

  let sanitized = input
    // Strip control characters
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
    // Strip script elements and their enclosed content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Strip style elements and their enclosed content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Strip remaining HTML tags
    .replace(/<[^>]*>?/gm, '')
    // Neutralize dangerous javascript: protocol pseudo-URLs
    .replace(/javascript:/gi, '')
    // Neutralize onload, onerror, etc.
    .replace(/on\w+\s*=/gi, '')
    .trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength).trim();
  }

  return sanitized;
}

/* ─── 4. Temporal & Schedule Boundary Validation ─────────────────── */

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates HH:MM 24-hour time string format.
 */
export function isValidTimeFormat(time: string): boolean {
  if (!time || typeof time !== 'string') return false;
  return TIME_REGEX.test(time.trim());
}

/**
 * Validates YYYY-MM-DD date format and ensures it forms a valid calendar date.
 */
export function isValidDateFormat(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!DATE_REGEX.test(dateStr.trim())) return false;

  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/**
 * Verifies that the start and end times form a logical, non-inverted, positive duration window.
 */
export function isValidTimeWindow(start: string, end: string): { valid: boolean; error?: string } {
  if (!isValidTimeFormat(start)) {
    return { valid: false, error: 'Start time must be in valid 24h format (HH:MM).' };
  }
  if (!isValidTimeFormat(end)) {
    return { valid: false, error: 'End time must be in valid 24h format (HH:MM).' };
  }

  if (start >= end) {
    return { valid: false, error: 'Session end time must be strictly later than start time.' };
  }

  return { valid: true };
}

/* ─── 5. Numerical Integrity Validation ───────────────────────────── */

/**
 * Validates that an input is a finite, positive safe integer (e.g. for item stock or attendance).
 */
export function isPositiveSafeInteger(val: unknown): val is number {
  if (typeof val !== 'number') return false;
  return Number.isFinite(val) && Number.isInteger(val) && val > 0 && val <= Number.MAX_SAFE_INTEGER;
}

/**
 * Validates that an input is a finite, non-negative number (e.g. for monetary costs or zero-permitted stock).
 */
export function isNonNegativeNumber(val: unknown): val is number {
  if (typeof val !== 'number') return false;
  return Number.isFinite(val) && val >= 0;
}

/* ─── 6. Authentication & Token Integrity Verification ────────────── */

const JWT_STRUCTURE_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/**
 * Validates whether a token conforms strictly to the standard 3-part base64url JWT structure.
 */
export function isValidJwtFormat(token: unknown): boolean {
  if (typeof token !== 'string') return false;
  return JWT_STRUCTURE_REGEX.test(token.trim());
}

/**
 * Checks whether a JWT payload has expired based on its 'exp' claim.
 * @param token Raw JWT string
 * @param currentEpochSeconds Optional mock current timestamp (defaults to Date.now() in seconds)
 */
export function isJwtExpired(token: string, currentEpochSeconds?: number): boolean {
  if (!isValidJwtFormat(token)) return true;

  try {
    const parts = token.split('.');
    // Decode standard base64url payload
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);

    if (typeof parsed.exp !== 'number') {
      return false; // No expiration claim defined
    }

    const now = currentEpochSeconds ?? Math.floor(Date.now() / 1000);
    return parsed.exp < now;
  } catch {
    return true; // Malformed payload is treated as expired/invalid
  }
}

/**
 * Safely parses and validates an HTTP Authorization header.
 * Enforces standard 'Bearer <token>' pattern.
 */
export function parseAuthorizationHeader(authHeader: unknown): {
  valid: boolean;
  token?: string;
  error?: string;
} {
  if (!authHeader || typeof authHeader !== 'string') {
    return { valid: false, error: 'Missing or empty Authorization header.' };
  }

  const trimmed = authHeader.trim();
  const match = /^Bearer\s+(\S+)$/i.exec(trimmed);

  if (!match) {
    return { valid: false, error: 'Malformed Authorization header. Format must be "Bearer <token>".' };
  }

  const token = match[1];
  if (!isValidJwtFormat(token)) {
    return { valid: false, error: 'Authorization token contains invalid JWT formatting.' };
  }

  if (isJwtExpired(token)) {
    return { valid: false, error: 'Authorization token has expired. Re-authentication required.' };
  }

  return { valid: true, token };
}

/* ─── 7. Operational State Transition Validators ──────────────────── */

/**
 * Validates Incident Lifecycle State Transitions:
 * - 'open' -> 'investigating' | 'in_progress'
 * - 'investigating' -> 'in_progress' | 'resolved'
 * - 'in_progress' -> 'resolved'
 * - 'resolved' -> 'closed' | 'in_progress' (reopened)
 * - 'closed' -> 'open' (only COO or Director of Facilities can reopen a closed ticket)
 * Direct resolution from 'open' without investigation is strictly prohibited.
 */
export function isValidIncidentTransition(
  currentStatus: IncidentStatus,
  nextStatus: IncidentStatus,
  userRole: UserProfile['role']
): { allowed: boolean; reason?: string } {
  if (currentStatus === nextStatus) {
    return { allowed: false, reason: `Incident is already in status "${currentStatus}".` };
  }

  // Student Affairs Liaison / student_faculty cannot mutate incident status
  if (userRole === 'Student Affairs Liaison' || userRole === 'student_faculty') {
    return {
      allowed: false,
      reason: 'Role does not have permission to modify incident status.',
    };
  }

  if (currentStatus === 'open') {
    if (nextStatus === 'resolved' || nextStatus === 'closed') {
      return {
        allowed: false,
        reason: 'Direct transition from "open" to "resolved" without an investigation phase is prohibited.',
      };
    }
    if (nextStatus === 'investigating' || nextStatus === 'in_progress') {
      return { allowed: true };
    }
  }

  if (currentStatus === 'investigating') {
    if (nextStatus === 'in_progress' || nextStatus === 'resolved') {
      return { allowed: true };
    }
  }

  if (currentStatus === 'in_progress') {
    if (nextStatus === 'resolved' || nextStatus === 'investigating') {
      return { allowed: true };
    }
  }

  if (currentStatus === 'resolved') {
    if (nextStatus === 'closed') {
      return { allowed: true };
    }
    if (nextStatus === 'in_progress') {
      return { allowed: true }; // Reopening
    }
  }

  if (currentStatus === 'closed') {
    // Only Executive/Director/Facilities Administrator can reopen closed incidents
    if (
      userRole === 'Chief Operations Officer' ||
      userRole === 'Director of Facilities' ||
      userRole === 'facilities_administrator'
    ) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Only Chief Operations Officer or Director of Facilities can reopen closed incidents.',
    };
  }

  return { allowed: false, reason: `Invalid transition from "${currentStatus}" to "${nextStatus}".` };
}

/**
 * Validates Work Order Lifecycle State Transitions:
 * - 'unassigned' -> 'in_progress' (requires valid engineer assignment)
 * - 'in_progress' -> 'awaiting_parts' | 'completed'
 * - 'awaiting_parts' -> 'in_progress' | 'completed'
 * Completion authorization:
 * - Only the assigned engineer, Director of Facilities, or Chief Operations Officer can mark as completed.
 */
export function isValidWorkOrderTransition(
  currentStatus: WorkOrderStatus,
  nextStatus: WorkOrderStatus,
  userRole: UserProfile['role'],
  isAssignedEngineer: boolean
): { allowed: boolean; reason?: string } {
  if (currentStatus === nextStatus) {
    return { allowed: false, reason: `Work Order is already in status "${currentStatus}".` };
  }

  // Liaison / student_faculty cannot alter work order progression
  if (userRole === 'Student Affairs Liaison' || userRole === 'student_faculty') {
    return {
      allowed: false,
      reason: 'Role does not have authority to alter work orders.',
    };
  }

  if (nextStatus === 'completed') {
    const isAuthorized =
      isAssignedEngineer ||
      userRole === 'Director of Facilities' ||
      userRole === 'Chief Operations Officer' ||
      userRole === 'facilities_administrator';

    if (!isAuthorized) {
      return {
        allowed: false,
        reason: 'Unauthorized: Only the assigned maintenance engineer, Director of Facilities, or COO can sign off and mark a work order as completed.',
      };
    }
  }

  if (currentStatus === 'unassigned') {
    if (nextStatus === 'in_progress') {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Unassigned orders must first be moved to "in_progress".' };
  }

  if (currentStatus === 'in_progress') {
    if (nextStatus === 'awaiting_parts' || nextStatus === 'completed') {
      return { allowed: true };
    }
  }

  if (currentStatus === 'awaiting_parts') {
    if (nextStatus === 'in_progress' || nextStatus === 'completed') {
      return { allowed: true };
    }
  }

  if (currentStatus === 'completed') {
    // Cannot alter completed orders without Director or COO
    if (userRole === 'Chief Operations Officer' || userRole === 'Director of Facilities') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Work order is already completed and signed off. Reopening requires Director or COO authorization.',
    };
  }

  return { allowed: false, reason: `Invalid transition from "${currentStatus}" to "${nextStatus}".` };
}

/**
 * Validates Procurement Lifecycle Progression:
 * - 'draft' -> 'pending_approval'
 * - 'pending_approval' -> 'approved' | 'rejected'
 * - 'approved' -> 'ordered'
 * - 'ordered' -> 'received'
 * Skipping steps (e.g. receiving an unapproved order) is prohibited.
 */
export function isValidProcurementTransition(
  currentStatus: ProcurementStatus,
  nextStatus: ProcurementStatus
): { allowed: boolean; reason?: string } {
  if (currentStatus === nextStatus) {
    return { allowed: false, reason: `Procurement request is already in status "${currentStatus}".` };
  }

  if (currentStatus === 'draft' && nextStatus === 'pending_approval') {
    return { allowed: true };
  }

  if (currentStatus === 'pending_approval' && (nextStatus === 'approved' || nextStatus === 'rejected')) {
    return { allowed: true };
  }

  if (currentStatus === 'approved' && nextStatus === 'ordered') {
    return { allowed: true };
  }

  if (currentStatus === 'ordered' && nextStatus === 'received') {
    return { allowed: true };
  }

  if (currentStatus === 'received') {
    return {
      allowed: false,
      reason: 'Stock has already been received. Duplicate goods receipt is strictly prevented.',
    };
  }

  return {
    allowed: false,
    reason: `Invalid procurement lifecycle transition from "${currentStatus}" to "${nextStatus}". Requisitions must follow: pending_approval -> approved -> ordered -> received.`,
  };
}

/* ─── 8. Occupancy & Sensor Telemetry Validation ──────────────────── */

export interface SensorReadingInput {
  deviceId: string;
  timestamp: string; // ISO-8601 string
  occupantCount: number;
  authToken?: string;
}

export interface SensorValidationResult {
  valid: boolean;
  occupancyStatus: 'vacant' | 'occupied' | 'unknown';
  count: number;
  isStale: boolean;
  error?: string;
  diagnosticNote?: string;
}

const MAX_STALE_AGE_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Validates occupancy telemetry readings defensive against invalid bounds, malformed data, and stale sensors.
 * CRITICAL RELIABILITY RULE: Unknown occupancy is treated as 'unknown', NEVER assumed vacant!
 * DISCLAIMER: This validates incoming software telemetry; no active physical IoT hardware communication is claimed.
 */
export function validateSensorReading(
  reading: unknown,
  roomCapacity?: number,
  currentEpochMs = Date.now()
): SensorValidationResult {
  if (!reading || typeof reading !== 'object') {
    return {
      valid: false,
      occupancyStatus: 'unknown',
      count: 0,
      isStale: true,
      error: 'Sensor payload is null, undefined, or non-object.',
      diagnosticNote: 'Treated as unknown occupancy (not assumed vacant).',
    };
  }

  const { deviceId, timestamp, occupantCount, authToken } = reading as Record<string, unknown>;

  // 1. Validate Device Identifier
  if (typeof deviceId !== 'string' || deviceId.trim().length === 0 || !/^[A-Za-z0-9_-]{3,64}$/.test(deviceId.trim())) {
    return {
      valid: false,
      occupancyStatus: 'unknown',
      count: 0,
      isStale: true,
      error: 'Invalid or missing deviceId format.',
      diagnosticNote: 'Unauthenticated/unknown device telemetry rejected.',
    };
  }

  // 2. Validate Optional Auth Token format
  if (authToken !== undefined) {
    if (typeof authToken !== 'string' || authToken.trim().length < 8) {
      return {
        valid: false,
        occupancyStatus: 'unknown',
        count: 0,
        isStale: true,
        error: 'Invalid device authentication token.',
      };
    }
  }

  // 3. Validate Timestamp and Check for Stale Data (> 15 minutes)
  if (typeof timestamp !== 'string') {
    return {
      valid: false,
      occupancyStatus: 'unknown',
      count: 0,
      isStale: true,
      error: 'Missing or non-string sensor reading timestamp.',
    };
  }

  const parsedTime = Date.parse(timestamp);
  if (Number.isNaN(parsedTime)) {
    return {
      valid: false,
      occupancyStatus: 'unknown',
      count: 0,
      isStale: true,
      error: 'Invalid ISO-8601 timestamp in sensor reading.',
    };
  }

  const ageMs = currentEpochMs - parsedTime;
  if (ageMs > MAX_STALE_AGE_MS) {
    return {
      valid: false,
      occupancyStatus: 'unknown', // DO NOT treat stale data as vacant!
      count: 0,
      isStale: true,
      error: `Sensor reading is stale (${Math.round(ageMs / 60000)} minutes old, exceeds 15-minute SLA).`,
      diagnosticNote: 'Marked as unknown occupancy to prevent false vacancy reporting.',
    };
  }

  // Future timestamp defense (clock drift > 5 minutes)
  if (parsedTime - currentEpochMs > 5 * 60 * 1000) {
    return {
      valid: false,
      occupancyStatus: 'unknown',
      count: 0,
      isStale: true,
      error: 'Sensor timestamp is in the future beyond acceptable clock drift.',
    };
  }

  // 4. Validate Occupant Count Bounds
  if (typeof occupantCount !== 'number' || !Number.isFinite(occupantCount) || !Number.isInteger(occupantCount)) {
    return {
      valid: false,
      occupancyStatus: 'unknown',
      count: 0,
      isStale: false,
      error: 'Occupant count must be a finite integer.',
    };
  }

  if (occupantCount < 0) {
    return {
      valid: false,
      occupancyStatus: 'unknown',
      count: 0,
      isStale: false,
      error: 'Negative occupant count detected (sensor calibration error).',
      diagnosticNote: 'Negative readings rejected and treated as unknown.',
    };
  }

  if (roomCapacity !== undefined && roomCapacity > 0 && occupantCount > roomCapacity * 1.5) {
    return {
      valid: false,
      occupancyStatus: 'unknown',
      count: 0,
      isStale: false,
      error: `Reading count (${occupantCount}) exceeds 150% of rated room capacity (${roomCapacity}). Potential sensor glitch.`,
      diagnosticNote: 'Over-capacity reading rejected for manual calibration.',
    };
  }

  // Reading is fully validated
  return {
    valid: true,
    occupancyStatus: occupantCount > 0 ? 'occupied' : 'vacant',
    count: occupantCount,
    isStale: false,
  };
}

