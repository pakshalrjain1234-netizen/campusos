import { AppRole, OfficialAppRole, Permission } from '../types/auth';

export const ROLE_LABELS: Record<AppRole, string> = {
  // Official PS2 Roles
  student_faculty: 'Student / Faculty',
  technician: 'Technician',
  department_manager: 'Department Manager',
  facilities_administrator: 'Facilities Administrator',
  procurement_approver: 'Procurement Approver',
  system_administrator: 'System Administrator',

  // Backward Compatibility Aliases
  coo: 'Facilities Administrator',
  director: 'Department Manager',
  engineer: 'Technician',
  liaison: 'Student / Faculty',
};

export const ROLE_BADGE_COLORS: Record<AppRole, { bg: string; text: string; border: string }> = {
  // Official PS2 Roles
  student_faculty: { bg: '#D5F3E8', text: '#2E8B67', border: '#A7F3D0' },
  technician: { bg: '#FFE4CF', text: '#C06B33', border: '#FED7AA' },
  department_manager: { bg: '#E9DDFB', text: '#7C5CBF', border: '#D6C7EC' },
  facilities_administrator: { bg: '#E6E9FF', text: '#4A5AA0', border: '#C8D0FA' },
  procurement_approver: { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  system_administrator: { bg: '#F1F5F9', text: '#334155', border: '#CBD5E1' },

  // Backward Compatibility Aliases
  coo: { bg: '#E6E9FF', text: '#4A5AA0', border: '#C8D0FA' },
  director: { bg: '#E9DDFB', text: '#7C5CBF', border: '#D6C7EC' },
  engineer: { bg: '#FFE4CF', text: '#C06B33', border: '#FED7AA' },
  liaison: { bg: '#D5F3E8', text: '#2E8B67', border: '#A7F3D0' },
};

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  // 1. Student / Faculty
  student_faculty: [
    'overview:personal',
    'incidents:register',
    'incidents:view_own',
    'incidents:view_permitted',
    'bookings:request',
    'bookings:view_own',
    'occupancy:view',
    'campus_3d:view',
    'copilot:access',
    'analytics:personal',
  ],

  // 2. Technician
  technician: [
    'overview:technician',
    'incidents:register',
    'incidents:view_assigned',
    'incidents:view_permitted',
    'incidents:resolve_assigned',
    'workorders:view_assigned',
    'workorders:update_assigned',
    'inventory:view',
    'inventory:consume',
    'procurement:request',
    'approvals:request',
    'occupancy:view',
    'campus_3d:view',
    'copilot:access',
    'analytics:personal',
  ],

  // 3. Department Manager
  department_manager: [
    'overview:dept',
    'incidents:register',
    'incidents:view_dept',
    'incidents:view_permitted',
    'incidents:review_dept',
    'incidents:assign_dept',
    'workorders:view_dept',
    'workorders:manage_dept',
    'inventory:view',
    'inventory:view_dept',
    'procurement:request',
    'procurement:view_dept',
    'approvals:request',
    'approvals:review_dept',
    'bookings:request',
    'bookings:manage_dept',
    'occupancy:view',
    'occupancy:view_dept',
    'campus_3d:view',
    'copilot:access',
    'analytics:dept',
  ],

  // 4. Facilities Administrator
  facilities_administrator: [
    'overview:facilities',
    'overview:org',
    'incidents:register',
    'incidents:view_all',
    'incidents:view_permitted',
    'incidents:review',
    'incidents:assign_all',
    'incidents:assign',
    'incidents:resolve',
    'incidents:override_priority',
    'workorders:create',
    'workorders:view_assigned',
    'workorders:view_dept',
    'workorders:update_assigned',
    'workorders:manage_dept',
    'workorders:manage_all',
    'inventory:view',
    'inventory:view_dept',
    'inventory:consume',
    'inventory:adjust',
    'inventory:manage',
    'assets:view',
    'assets:manage',
    'procurement:request',
    'procurement:view_all',
    'approvals:request',
    'approvals:review_dept',
    'approvals:review_org',
    'bookings:request',
    'bookings:manage_dept',
    'bookings:manage_all',
    'occupancy:view',
    'occupancy:view_dept',
    'occupancy:manage_all',
    'campus_3d:view',
    'campus_3d:manage',
    'copilot:access',
    'analytics:dept',
    'analytics:org',
  ],

  // 5. Procurement Approver
  procurement_approver: [
    'overview:procurement',
    'inventory:view',
    'procurement:view_all',
    'procurement:approve',
    'approvals:review_procurement',
    'campus_3d:view',
    'copilot:access',
    'analytics:procurement',
  ],

  // 6. System Administrator (Technical administration only - no business procurement approval)
  system_administrator: [
    'overview:system',
    'incidents:view_all',
    'incidents:view_permitted',
    'occupancy:view',
    'campus_3d:view',
    'campus_3d:manage',
    'copilot:access',
    'users:manage',
    'users:assign_role',
    'users:activate_deactivate',
    'audit:read',
    'settings:manage',
  ],

  // Legacy Compatibility Mappings
  coo: [
    'overview:facilities',
    'overview:org',
    'incidents:register',
    'incidents:view_all',
    'incidents:view_permitted',
    'incidents:review',
    'incidents:assign_all',
    'incidents:assign',
    'incidents:resolve',
    'incidents:override_priority',
    'workorders:create',
    'workorders:manage_all',
    'inventory:manage',
    'assets:manage',
    'procurement:request',
    'approvals:request',
    'bookings:manage_all',
    'occupancy:manage_all',
    'campus_3d:view',
    'campus_3d:manage',
    'copilot:access',
    'analytics:org',
  ],
  director: [
    'overview:dept',
    'incidents:register',
    'incidents:view_dept',
    'incidents:review_dept',
    'incidents:assign_dept',
    'workorders:view_dept',
    'workorders:manage_dept',
    'inventory:view_dept',
    'procurement:request',
    'approvals:request',
    'approvals:review_dept',
    'bookings:manage_dept',
    'occupancy:view_dept',
    'campus_3d:view',
    'copilot:access',
    'analytics:dept',
  ],
  engineer: [
    'overview:technician',
    'incidents:register',
    'incidents:view_assigned',
    'incidents:resolve_assigned',
    'workorders:view_assigned',
    'workorders:update_assigned',
    'inventory:view',
    'inventory:consume',
    'procurement:request',
    'approvals:request',
    'occupancy:view',
    'campus_3d:view',
    'copilot:access',
  ],
  liaison: [
    'overview:personal',
    'incidents:register',
    'incidents:view_own',
    'bookings:request',
    'bookings:view_own',
    'occupancy:view',
    'campus_3d:view',
    'copilot:access',
  ],
};

/**
 * Route access policy mapping for the 6 official PS2 roles
 */
export const ROUTE_ACCESS: Record<string, AppRole[]> = {
  '/dashboard': [
    'student_faculty',
    'technician',
    'department_manager',
    'facilities_administrator',
    'procurement_approver',
    'system_administrator',
    'coo',
    'director',
    'engineer',
    'liaison',
  ],
  '/incidents': [
    'student_faculty',
    'technician',
    'department_manager',
    'facilities_administrator',
    'system_administrator',
    'coo',
    'director',
    'engineer',
    'liaison',
  ],
  '/campus-3d': [
    'student_faculty',
    'technician',
    'department_manager',
    'facilities_administrator',
    'procurement_approver',
    'system_administrator',
    'coo',
    'director',
    'engineer',
    'liaison',
  ],
  '/bookings': [
    'student_faculty',
    'department_manager',
    'facilities_administrator',
    'system_administrator',
    'coo',
    'director',
    'liaison',
  ],
  '/occupancy': [
    'student_faculty',
    'technician',
    'department_manager',
    'facilities_administrator',
    'system_administrator',
    'coo',
    'director',
    'engineer',
    'liaison',
  ],
  '/maintenance': [
    'technician',
    'department_manager',
    'facilities_administrator',
    'system_administrator',
    'coo',
    'director',
    'engineer',
  ],
  '/inventory': [
    'technician',
    'department_manager',
    'facilities_administrator',
    'procurement_approver',
    'system_administrator',
    'coo',
    'director',
    'engineer',
  ],
  '/spare-parts': [
    'technician',
    'facilities_administrator',
    'procurement_approver',
    'system_administrator',
    'coo',
    'director',
    'engineer',
  ],
  '/approvals': [
    'technician',
    'department_manager',
    'facilities_administrator',
    'procurement_approver',
    'coo',
    'director',
    'engineer',
  ],
  '/risk-radar': [
    'department_manager',
    'facilities_administrator',
    'system_administrator',
    'coo',
    'director',
  ],
  '/analytics': [
    'department_manager',
    'facilities_administrator',
    'procurement_approver',
    'system_administrator',
    'coo',
    'director',
  ],
  '/users': [
    'system_administrator',
    'coo', // legacy support
  ],
  '/settings': [
    'student_faculty',
    'technician',
    'department_manager',
    'facilities_administrator',
    'procurement_approver',
    'system_administrator',
    'coo',
    'director',
    'engineer',
    'liaison',
  ],
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  const norm = normalizeRole(role);
  return ROLE_PERMISSIONS[norm]?.includes(permission) ?? ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAccessRoute(role: AppRole, path: string): boolean {
  const normalizedPath = path.split('?')[0].split('#')[0];
  const allowed = ROUTE_ACCESS[normalizedPath];
  if (!allowed) return true; // Unrestricted by default
  const norm = normalizeRole(role);
  return allowed.includes(norm) || allowed.includes(role);
}

/**
 * Normalizes any role string safely to one of the 6 canonical official roles
 */
export function normalizeRole(roleStr?: string | null): OfficialAppRole {
  if (!roleStr) return 'student_faculty';
  const lower = roleStr.toLowerCase().trim().replace(/[\s-]+/g, '_');

  // Exact official match
  if (lower === 'student_faculty') return 'student_faculty';
  if (lower === 'technician') return 'technician';
  if (lower === 'department_manager') return 'department_manager';
  if (lower === 'facilities_administrator') return 'facilities_administrator';
  if (lower === 'procurement_approver') return 'procurement_approver';
  if (lower === 'system_administrator') return 'system_administrator';

  // Student / Faculty matches
  if (
    lower.includes('student') ||
    lower.includes('faculty') ||
    lower.includes('liaison') ||
    lower.includes('scholar') ||
    lower.includes('professor')
  ) {
    return 'student_faculty';
  }

  // Technician matches
  if (
    lower.includes('technician') ||
    lower.includes('engineer') ||
    lower.includes('mechanic') ||
    lower.includes('electrician') ||
    lower.includes('plumber') ||
    lower.includes('tech')
  ) {
    return 'technician';
  }

  // Procurement Approver matches (check before manager/admin)
  if (
    lower.includes('procurement') ||
    lower.includes('purchase') ||
    lower.includes('approver') ||
    lower.includes('buyer')
  ) {
    return 'procurement_approver';
  }

  // Department Manager matches
  if (
    lower.includes('department_manager') ||
    lower.includes('director') ||
    lower.includes('dept_manager') ||
    lower.includes('head_of_department') ||
    lower.includes('hod') ||
    lower.includes('manager')
  ) {
    return 'department_manager';
  }

  // Facilities Administrator matches
  if (
    lower.includes('facilities_administrator') ||
    lower.includes('facilities') ||
    lower.includes('facility') ||
    lower.includes('coo') ||
    lower.includes('operations_head') ||
    lower.includes('chief_operations')
  ) {
    return 'facilities_administrator';
  }

  // System Administrator matches
  if (
    lower.includes('system_administrator') ||
    lower.includes('system_admin') ||
    lower.includes('sysadmin') ||
    lower.includes('sys_admin') ||
    lower.includes('administrator') ||
    lower.includes('admin')
  ) {
    return 'system_administrator';
  }

  return 'student_faculty';
}

export function getRoleBadge(role: AppRole) {
  const norm = normalizeRole(role);
  return ROLE_BADGE_COLORS[norm] || ROLE_BADGE_COLORS.student_faculty;
}

export function getRoleLabel(role: AppRole): string {
  const norm = normalizeRole(role);
  return ROLE_LABELS[norm] || 'Campus User';
}
