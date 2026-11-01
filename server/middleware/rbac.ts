import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AppRole } from '../types';
import { normalizeServerRole } from './auth';

export function requireRole(allowedRoles: AppRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized: Authentication required.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const userRole = req.user.role;
    const normalizedUser = normalizeServerRole(userRole);
    const normalizedAllowed = allowedRoles.map((r) => normalizeServerRole(r));

    const isMatch =
      (allowedRoles as string[]).includes(userRole) ||
      (allowedRoles as string[]).includes(normalizedUser) ||
      (normalizedAllowed as string[]).includes(userRole) ||
      normalizedAllowed.includes(normalizedUser);

    if (!isMatch) {
      res.status(403).json({
        error: `Forbidden: Operational role "${userRole}" does not hold required privileges. Required: [${allowedRoles.join(', ')}]`,
        code: 'INSUFFICIENT_PRIVILEGES',
      });
      return;
    }

    next();
  };
}

/**
 * Role escalation prevention: only System Administrator (or legacy COO) can assign or modify roles
 */
export function preventRoleEscalation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    return;
  }

  const role = normalizeServerRole(req.user.role);
  if (role !== 'system_administrator') {
    res.status(403).json({
      error: 'Privilege escalation rejected: Only System Administrators can assign or modify operational roles.',
      code: 'PRIVILEGE_ESCALATION_BLOCKED',
    });
    return;
  }

  // Validate that requested role is a recognized app_role enum
  const targetRole = req.body?.role;
  const validRoles = [
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
  ];

  if (targetRole && !validRoles.includes(targetRole)) {
    res.status(400).json({
      error: `Invalid role specified: "${targetRole}". Must be one of the official PS2 roles.`,
      code: 'INVALID_ROLE',
    });
    return;
  }

  next();
}

/**
 * Separation of Duties: Users cannot approve their own requisitions or requests
 */
export function checkSelfApproval(requesterId: string, currentUserId: string): boolean {
  return requesterId === currentUserId;
}

/**
 * Technical governance boundary: System Administrator cannot approve procurement requests
 */
export function isProcurementApprovalPermitted(role: AppRole): boolean {
  const norm = normalizeServerRole(role);
  // Strictly denied for system_administrator, student_faculty, technician
  return norm === 'procurement_approver' || role === 'coo'; // legacy fallback
}
