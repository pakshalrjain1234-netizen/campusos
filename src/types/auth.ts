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
  | 'Chief Operations Officer'
  | 'Director of Facilities'
  | 'Lead Maintenance Engineer'
  | 'Student Affairs Liaison';

export type AppRole = OfficialAppRole | LegacyAppRole;

export function normalizeCampusRole(role?: string): CampusRole {
  if (!role) return 'student_faculty';
  const r = role.toLowerCase().trim().replace(/[\s-]+/g, '_');
  if (r.includes('student') || r.includes('liaison') || r.includes('faculty')) return 'student_faculty';
  if (r.includes('tech') || r.includes('engineer') || r.includes('maintenance')) return 'technician';
  if (r.includes('dept') || r.includes('department') || r.includes('manager') || r.includes('director')) return 'department_manager';
  if (r.includes('facil') || r.includes('coo') || r.includes('operations_officer') || r.includes('operations officer')) return 'facilities_administrator';
  if (r.includes('procur') || r.includes('finance') || r.includes('approv')) return 'procurement_approver';
  if (r.includes('system') || r.includes('sysadmin') || r.includes('admin')) return 'system_administrator';
  return 'student_faculty';
}

export const normalizeServerRole = normalizeCampusRole;

export interface UserProfileData {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
  departmentId?: string | null;
  departmentName?: string | null;
  assignedBuildings?: string[];
  avatarUrl?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type Permission =
  // Operational Overview
  | 'overview:personal'
  | 'overview:technician'
  | 'overview:dept'
  | 'overview:facilities'
  | 'overview:procurement'
  | 'overview:system'
  | 'overview:org'

  // Incidents & Complaints
  | 'incidents:register'
  | 'incidents:view_own'
  | 'incidents:view_assigned'
  | 'incidents:view_dept'
  | 'incidents:view_all'
  | 'incidents:view_permitted'
  | 'incidents:review_dept'
  | 'incidents:review'
  | 'incidents:assign_dept'
  | 'incidents:assign_all'
  | 'incidents:assign'
  | 'incidents:resolve_assigned'
  | 'incidents:resolve'
  | 'incidents:override_priority'

  // Maintenance & Work Orders
  | 'workorders:view_assigned'
  | 'workorders:view_dept'
  | 'workorders:update_assigned'
  | 'workorders:create'
  | 'workorders:manage_dept'
  | 'workorders:manage_all'

  // Inventory, Spare Parts & Assets
  | 'inventory:view'
  | 'inventory:view_dept'
  | 'inventory:consume'
  | 'inventory:adjust'
  | 'inventory:manage'
  | 'assets:view'
  | 'assets:manage'

  // Procurement & Approvals
  | 'procurement:request'
  | 'procurement:view_own'
  | 'procurement:view_dept'
  | 'procurement:view_all'
  | 'procurement:approve'
  | 'approvals:request'
  | 'approvals:review_dept'
  | 'approvals:review_procurement'
  | 'approvals:review_org'

  // Room Bookings & Occupancy
  | 'bookings:request'
  | 'bookings:view_own'
  | 'bookings:manage_dept'
  | 'bookings:manage_all'
  | 'occupancy:view'
  | 'occupancy:view_dept'
  | 'occupancy:manage_all'

  // 3D Campus Digital Twin
  | 'campus_3d:view'
  | 'campus_3d:manage'

  // AI Copilot
  | 'copilot:access'

  // Analytics
  | 'analytics:personal'
  | 'analytics:dept'
  | 'analytics:procurement'
  | 'analytics:org'

  // User Governance & System Settings
  | 'users:manage'
  | 'users:assign_role'
  | 'users:activate_deactivate'
  | 'audit:read'
  | 'settings:manage';

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}
