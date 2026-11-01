import { IncidentLifecycleStatus } from '../types';
import { AppRole } from '../types/auth';

export interface TransitionRule {
  allowedNext: IncidentLifecycleStatus[];
  allowedRoles: AppRole[];
  description: string;
}

export const LIFECYCLE_TRANSITIONS: Record<IncidentLifecycleStatus, TransitionRule> = {
  reported: {
    allowedNext: ['triaged', 'assigned', 'cancelled'],
    allowedRoles: ['coo', 'director'],
    description: 'Triage priority and assess safety/impact, or assign directly',
  },
  triaged: {
    allowedNext: ['assigned', 'in_progress', 'cancelled'],
    allowedRoles: ['coo', 'director'],
    description: 'Assign qualified maintenance engineer or dispatch directly',
  },
  assigned: {
    allowedNext: ['acknowledged', 'in_progress', 'triaged'],
    allowedRoles: ['coo', 'director', 'engineer'],
    description: 'Engineer acknowledges ticket receipt and begins scheduling',
  },
  acknowledged: {
    allowedNext: ['in_progress', 'assigned'],
    allowedRoles: ['coo', 'director', 'engineer'],
    description: 'Work commences on-site or diagnosis begins',
  },
  in_progress: {
    allowedNext: ['resolved', 'acknowledged'],
    allowedRoles: ['coo', 'director', 'engineer'],
    description: 'Technical repair completed; ready for sign-off',
  },
  resolved: {
    allowedNext: ['closed', 'in_progress'],
    allowedRoles: ['coo', 'director'],
    description: 'Operations director or COO confirms quality and closes ticket',
  },
  closed: {
    allowedNext: [],
    allowedRoles: ['coo'],
    description: 'Terminal state. Ticket archived with full audit history',
  },
  cancelled: {
    allowedNext: ['reported'],
    allowedRoles: ['coo', 'director'],
    description: 'Ticket rejected or cancelled due to duplicate/invalid report',
  },
};

/**
 * Checks if a status transition is permitted given the current state and role
 */
export function isTransitionAllowed(
  currentStatus: IncidentLifecycleStatus,
  targetStatus: IncidentLifecycleStatus,
  userRole: AppRole
): { allowed: boolean; reason?: string } {
  const rule = LIFECYCLE_TRANSITIONS[currentStatus];
  if (!rule) {
    return { allowed: false, reason: `Unknown current status: ${currentStatus}` };
  }

  if (!rule.allowedNext.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Cannot transition from '${currentStatus}' to '${targetStatus}'. Allowed: ${rule.allowedNext.join(', ')}`,
    };
  }

  // Check role authorization
  if (!rule.allowedRoles.includes(userRole)) {
    return {
      allowed: false,
      reason: `Role '${userRole}' is not authorized to transition from '${currentStatus}' to '${targetStatus}'. Required: ${rule.allowedRoles.join(', ')}`,
    };
  }

  return { allowed: true };
}

/**
 * Human-readable label & styling for lifecycle statuses
 */
export const LIFECYCLE_BADGES: Record<
  IncidentLifecycleStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  reported: { label: 'Reported', bg: '#FDF0F6', text: '#BA3D6E', border: '#F8DCE8' },
  triaged: { label: 'Triaged', bg: '#FFF2E7', text: '#C06B33', border: '#FFE4CF' },
  assigned: { label: 'Assigned', bg: '#F2F4FF', text: '#6878CA', border: '#E6E9FF' },
  acknowledged: { label: 'Acknowledged', bg: '#E9DDFB', text: '#5D4586', border: '#D8C5F7' },
  in_progress: { label: 'In Progress', bg: '#FFE4CF', text: '#C06B33', border: '#FED7B0' },
  resolved: { label: 'Resolved', bg: '#E9F9F2', text: '#2E8B67', border: '#D5F3E8' },
  closed: { label: 'Closed', bg: '#F6F0E5', text: '#74788C', border: '#E7E2DD' },
  cancelled: { label: 'Cancelled', bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' },
};
