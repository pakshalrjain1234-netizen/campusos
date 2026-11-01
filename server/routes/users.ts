import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, AppRole } from '../types';
import { authenticateToken } from '../middleware/auth';
import { requireRole, preventRoleEscalation } from '../middleware/rbac';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const usersRouter = Router();

const serverSupabase = config.isConfigured
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey)
  : null;

const ALL_ROLE_VALUES = [
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
] as const;

const CreateUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(100),
  role: z.enum(ALL_ROLE_VALUES),
  departmentId: z.string().uuid().optional(),
  phone: z.string().optional(),
});

const UpdateRoleSchema = z.object({
  role: z.enum(ALL_ROLE_VALUES),
});

/**
 * GET /api/users
 * Restricted to System Administrator and Facilities Administrator (and legacy COO),
 * OR maintenance roles when filtering by ?role=technician
 */
usersRouter.get(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const userRole = (user.role || '').toLowerCase();
    const requestedRole = (req.query.role as string | undefined)?.toLowerCase();

    // If filtering by role=technician, permit maintenance personnel
    const isTechQuery = requestedRole === 'technician' || requestedRole === 'engineer';
    const isMaintenanceRole = [
      'system_administrator',
      'facilities_administrator',
      'department_manager',
      'technician',
      'coo',
      'director',
      'engineer',
    ].includes(userRole);

    const isFullUserAdmin = [
      'system_administrator',
      'facilities_administrator',
      'coo',
      'director',
    ].includes(userRole);

    if (isTechQuery) {
      if (!isMaintenanceRole) {
        res.status(403).json({
          error: `Role "${userRole}" is not authorized to query technicians.`,
          code: 'FORBIDDEN_TECHNICIAN_QUERY',
        });
        return;
      }
    } else {
      if (!isFullUserAdmin) {
        res.status(403).json({
          error: `Role "${userRole}" is not authorized to access user directory.`,
          code: 'FORBIDDEN_USER_DIRECTORY',
        });
        return;
      }
    }

    if (!serverSupabase) {
      const demoUsers = [
        {
          id: 'demo-student-001',
          email: 'student@campusops.demo',
          fullName: 'Aarav Sharma',
          name: 'Aarav Sharma',
          role: 'student_faculty',
          department: 'Computer Science',
          isActive: true,
        },
        {
          id: 'demo-tech-001',
          email: 'technician@campusops.demo',
          fullName: 'Vikram Sundaram',
          name: 'Vikram Sundaram',
          role: 'technician',
          department: 'HVAC & Maintenance Engineering',
          isActive: true,
        },
        {
          id: 'demo-tech-002',
          email: 'marcus.vance@campusops.demo',
          fullName: 'Marcus Vance',
          name: 'Marcus Vance',
          role: 'technician',
          department: 'Facility Engineering & Maintenance',
          isActive: true,
        },
        {
          id: 'demo-tech-003',
          email: 'arun.karthik@campusops.demo',
          fullName: 'Arun Karthik',
          name: 'Arun Karthik',
          role: 'technician',
          department: 'Power & High Voltage Systems',
          isActive: true,
        },
        {
          id: 'demo-tech-004',
          email: 'rajesh.g@campusops.demo',
          fullName: 'Rajesh G.',
          name: 'Rajesh G.',
          role: 'technician',
          department: 'Civil Infrastructure & Structural Works',
          isActive: true,
        },
        {
          id: 'demo-mgr-001',
          email: 'manager@campusops.demo',
          fullName: 'Prof. Marcus Vance',
          name: 'Prof. Marcus Vance',
          role: 'department_manager',
          department: 'Computing Services & IT',
          isActive: true,
        },
        {
          id: 'demo-fac-001',
          email: 'facilities@campusops.demo',
          fullName: 'Dr. Jennifer Rao',
          name: 'Dr. Jennifer Rao',
          role: 'facilities_administrator',
          department: 'Campus Facilities',
          isActive: true,
        },
        {
          id: 'demo-proc-001',
          email: 'procurement@campusops.demo',
          fullName: 'Anita Patel',
          name: 'Anita Patel',
          role: 'procurement_approver',
          department: 'Procurement & Finance',
          isActive: true,
        },
        {
          id: 'demo-admin-001',
          email: 'admin@campusops.demo',
          fullName: 'Devin Kothari',
          name: 'Devin Kothari',
          role: 'system_administrator',
          department: 'IT Infrastructure',
          isActive: true,
        },
      ];

      const filtered = requestedRole
        ? demoUsers.filter((u) => u.role === requestedRole)
        : demoUsers;

      res.json({
        users: filtered,
        total: filtered.length,
        source: 'demo_fallback',
      });
      return;
    }

    let query = serverSupabase
      .from('profiles')
      .select('id, email, full_name, role, department_id, avatar_url, phone, is_active, created_at');

    if (requestedRole) {
      if (requestedRole === 'technician' || requestedRole === 'engineer') {
        query = query.in('role', ['technician', 'engineer']);
      } else {
        query = query.eq('role', requestedRole);
      }
    }

    const { data, error } = await query
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const mapped = (data || []).map((d) => ({
      id: d.id,
      email: d.email,
      fullName: d.full_name,
      name: d.full_name,
      role: d.role,
      departmentId: d.department_id,
      department: 'Facility Engineering & Maintenance',
      avatarUrl: d.avatar_url,
      avatar: d.avatar_url,
      phone: d.phone,
      isActive: d.is_active,
      createdAt: d.created_at,
    }));

    res.json({ users: mapped, total: mapped.length, source: 'database' });
  }
);

/**
 * POST /api/users
 * Provision staff account (COO only)
 */
usersRouter.post(
  '/',
  authenticateToken,
  preventRoleEscalation,
  async (req: AuthenticatedRequest, res: Response) => {
    const parseResult = CreateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed for user provisioning payload.',
        details: parseResult.error.format(),
      });
      return;
    }

    const { email, fullName, role, departmentId, phone } = parseResult.data;

    if (!serverSupabase) {
      const mockCreated = {
        id: `usr-${Date.now()}`,
        email,
        fullName,
        role,
        departmentId: departmentId || null,
        phone: phone || null,
        isActive: true,
      };
      res.status(201).json({ user: mockCreated, message: 'User provisioned in demo mode.' });
      return;
    }

    // Insert into database profiles table
    const { data, error } = await serverSupabase
      .from('profiles')
      .insert([
        {
          id: `00000000-0000-0000-0000-${Date.now().toString().slice(-12)}`,
          email,
          full_name: fullName,
          role,
          department_id: departmentId,
          phone,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ user: data, message: 'User profile created successfully.' });
  }
);

/**
 * PATCH /api/users/:id/role
 * Role assignment mutation (COO only)
 */
usersRouter.patch(
  '/:id/role',
  authenticateToken,
  preventRoleEscalation,
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const parseResult = UpdateRoleSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid role specified.',
        details: parseResult.error.format(),
      });
      return;
    }

    const { role } = parseResult.data;

    if (!serverSupabase) {
      res.json({ success: true, id, role, message: 'Role updated in demo mode.' });
      return;
    }

    const { data, error } = await serverSupabase
      .from('profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({ user: data, message: 'User role updated successfully.' });
  }
);

