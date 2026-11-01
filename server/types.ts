import { Request } from 'express';

export type OfficialAppRole =
  | 'student_faculty'
  | 'technician'
  | 'department_manager'
  | 'facilities_administrator'
  | 'procurement_approver'
  | 'system_administrator';

export type CampusRole = OfficialAppRole;

export type LegacyAppRole = 'coo' | 'director' | 'engineer' | 'liaison';

export type AppRole = OfficialAppRole | LegacyAppRole;

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  fullName: string;
  role: AppRole;
  department: string;
  departmentId?: string | null;
  departmentName?: string | null;
  assignedBuildings?: string[];
  avatar?: string;
  isActive: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
