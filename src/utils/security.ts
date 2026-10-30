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

import { UserProfile, ApprovalRequest, RoomBooking } from '../types';

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
