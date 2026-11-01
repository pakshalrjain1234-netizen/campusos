import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { authenticateToken, normalizeServerRole } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const workOrdersRouter = Router();

const serverSupabase = config.isConfigured
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey)
  : null;

// In-memory demo store for work orders
export interface DemoWorkOrder {
  id: string;
  orderNumber: string;
  title: string;
  category: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  buildingId: string;
  buildingName: string;
  location: string;
  assignedEngineer: string;
  assignedEngineerId?: string;
  dueDate: string;
  slaRemaining: string;
  completionRate: number;
  status: 'unassigned' | 'in_progress' | 'awaiting_parts' | 'completed' | 'verified';
  incidentId?: string;
  partsRequired?: string[];
  repairInstructions?: string;
  diagnosis?: string;
  completionNotes?: string;
  createdAt: string;
  isOverdue?: boolean;
}

export interface TechnicianUser {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: 'technician';
  department: string;
  departmentId?: string;
  avatar?: string;
  phone?: string;
  isActive: boolean;
}

export const DEMO_TECHNICIANS: TechnicianUser[] = [
  {
    id: 'demo-tech-001',
    name: 'Vikram Sundaram',
    fullName: 'Vikram Sundaram',
    email: 'technician@campusops.demo',
    role: 'technician',
    department: 'HVAC & Maintenance Engineering',
    departmentId: 'd1000000-0000-0000-0000-000000000002',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    phone: '+91 98401 23456',
    isActive: true,
  },
  {
    id: 'demo-tech-002',
    name: 'Marcus Vance',
    fullName: 'Marcus Vance',
    email: 'marcus.vance@campusops.demo',
    role: 'technician',
    department: 'Facility Engineering & Maintenance',
    departmentId: 'd1000000-0000-0000-0000-000000000002',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    phone: '+91 98402 34567',
    isActive: true,
  },
  {
    id: 'demo-tech-003',
    name: 'Arun Karthik',
    fullName: 'Arun Karthik',
    email: 'arun.karthik@campusops.demo',
    role: 'technician',
    department: 'Power & High Voltage Systems',
    departmentId: 'd1000000-0000-0000-0000-000000000002',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    phone: '+91 98403 45678',
    isActive: true,
  },
  {
    id: 'demo-tech-004',
    name: 'Rajesh G.',
    fullName: 'Rajesh G.',
    email: 'rajesh.g@campusops.demo',
    role: 'technician',
    department: 'Civil Infrastructure & Structural Works',
    departmentId: 'd1000000-0000-0000-0000-000000000002',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=120&q=80',
    phone: '+91 98404 56789',
    isActive: true,
  },
];

export const DEMO_WORK_ORDERS_STORE: DemoWorkOrder[] = [
  {
    id: 'wo-101',
    orderNumber: 'WO-8821',
    title: 'Emergency Chiller Actuator Overhaul - Server Annex Loop',
    category: 'HVAC Overhaul',
    buildingId: 'it-block',
    buildingName: 'IT Block',
    location: '4th Floor Rooftop Mechanical Room & Server Annex 401',
    priority: 'urgent',
    status: 'in_progress',
    assignedEngineer: 'Vikram Sundaram',
    assignedEngineerId: 'demo-tech-001',
    dueDate: 'Today, 2:30 PM',
    slaRemaining: '1h 18m',
    completionRate: 65,
    partsRequired: ['Belimo 24V Modulating Actuator', 'Glycol 50/50 Solution', 'Flange Gasket Kit'],
    incidentId: 'inc-001',
    repairInstructions: 'Isolate supply header valve #4. Replace failing 24V Belimo actuator motor. Rebalance flow rate to 45 GPM.',
    diagnosis: 'Actuator gear stripped due to prolonged cycling against pressure differential.',
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
  },
  {
    id: 'wo-102',
    orderNumber: 'WO-8822',
    title: 'Substation B Phase Voltage Stabilizer Calibration',
    category: 'Electrical Systems',
    buildingId: 'mechanical-block',
    buildingName: 'Mechanical Block',
    location: 'Ground Floor Substation Switchgear Room',
    priority: 'high',
    status: 'awaiting_parts',
    assignedEngineer: 'Arun Karthik',
    assignedEngineerId: 'demo-tech-003',
    dueDate: 'Today, 5:00 PM',
    slaRemaining: '3h 54m',
    completionRate: 35,
    partsRequired: ['Schneider Power Meter PM8000', 'Copper Busbar Shunt 400A'],
    incidentId: 'inc-002',
    repairInstructions: 'Lock-out tag-out Substation feeder 2. Measure phase resistance and calibrate solid-state trip unit.',
    diagnosis: 'Thermal contact oxidation on tap changer terminal lug.',
    createdAt: new Date(Date.now() - 55 * 60000).toISOString(),
  },
  {
    id: 'wo-103',
    orderNumber: 'WO-8823',
    title: 'Administrative Block Floor 3 Plenum Leak Inspection',
    category: 'Plumbing & Drainage',
    buildingId: 'ADM',
    buildingName: 'Administrative Block',
    location: 'Floor 3 Ceiling Plenum (Room A-305)',
    priority: 'urgent',
    status: 'unassigned',
    assignedEngineer: 'Unassigned',
    dueDate: 'Today, 6:00 PM',
    slaRemaining: '2h 15m',
    completionRate: 0,
    partsRequired: ['PVC Pipe Coupler 2-inch', 'Waterproof Sealant Tape'],
    incidentId: 'INC-003',
    repairInstructions: 'Inspect chilled water line above Room A-305. Replace leaking gasket joint.',
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
  },
];

const CreateWorkOrderSchema = z.object({
  title: z.string().min(5).max(180),
  category: z.string(),
  priority: z.enum(['urgent', 'high', 'medium', 'low']),
  buildingId: z.string(),
  location: z.string().optional(),
  assignedEngineerId: z.string().optional(),
  assignedEngineer: z.string().optional(),
  dueDate: z.string().optional(),
  partsRequired: z.array(z.string()).optional(),
  incidentId: z.string().optional(),
  repairInstructions: z.string().optional(),
});

const UpdateWorkOrderSchema = z.object({
  status: z.enum(['unassigned', 'in_progress', 'awaiting_parts', 'completed', 'verified']).optional(),
  completionRate: z.number().min(0).max(100).optional(),
  assignedEngineerId: z.string().optional(),
  assignedEngineer: z.string().optional(),
  diagnosis: z.string().optional(),
  completionNotes: z.string().optional(),
  inspectedBy: z.string().optional(),
});

/**
 * GET /api/work-orders
 */
workOrdersRouter.get(
  '/',
  authenticateToken,
  requireRole(['technician', 'department_manager', 'facilities_administrator', 'system_administrator', 'coo', 'director', 'engineer']),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const normRole = normalizeServerRole(user.role);

    if (!serverSupabase) {
      let filtered = [...DEMO_WORK_ORDERS_STORE];
      if (normRole === 'technician') {
        filtered = filtered.filter(
          (wo) => wo.assignedEngineerId === user.id || wo.status === 'unassigned' || !wo.assignedEngineerId
        );
      }
      res.json({
        workOrders: filtered,
        total: filtered.length,
        role: user.role,
        source: 'demo_fallback',
      });
      return;
    }

    let query = serverSupabase.from('work_orders').select('*');

    if (normRole === 'technician') {
      query = query.or(`assigned_engineer_id.eq.${user.id},status.eq.unassigned`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ workOrders: data || [] });
  }
);

/**
 * POST /api/work-orders
 * Create new work order (can link to an existing incident)
 */
workOrdersRouter.post(
  '/',
  authenticateToken,
  requireRole(['technician', 'department_manager', 'facilities_administrator', 'system_administrator', 'coo', 'director', 'engineer']),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const parseResult = CreateWorkOrderSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed for work order creation.',
        details: parseResult.error.format(),
      });
      return;
    }

    const data = parseResult.data;

    // DUPLICATE WORK ORDER PREVENTION CHECK:
    if (data.incidentId) {
      if (serverSupabase) {
        const { data: activeDBWOs } = await serverSupabase
          .from('work_orders')
          .select('id, order_number, status')
          .eq('incident_id', data.incidentId)
          .not('status', 'in', '("completed","verified")');

        if (activeDBWOs && activeDBWOs.length > 0) {
          res.status(409).json({
            error: `Duplicate Work Order: Incident ${data.incidentId} already has an active work order (${activeDBWOs[0].order_number}). Duplicate creation rejected.`,
            code: 'DUPLICATE_WORK_ORDER',
            existingWorkOrder: activeDBWOs[0],
          });
          return;
        }
      }

      const existingActiveWO = DEMO_WORK_ORDERS_STORE.find(
        (wo) => wo.incidentId === data.incidentId && wo.status !== 'completed' && wo.status !== 'verified'
      );
      if (existingActiveWO) {
        res.status(409).json({
          error: `Duplicate Work Order: Incident ${data.incidentId} already has an active work order (${existingActiveWO.orderNumber}). Duplicate creation rejected.`,
          code: 'DUPLICATE_WORK_ORDER',
          existingWorkOrder: existingActiveWO,
        });
        return;
      }
    }

    const orderNumber = `WO-${Math.floor(8850 + Math.random() * 200)}`;

    if (!serverSupabase) {
      const newWO: DemoWorkOrder = {
        id: `wo-${Date.now()}`,
        orderNumber,
        title: data.title,
        category: data.category,
        priority: data.priority,
        buildingId: data.buildingId,
        buildingName: 'Campus Facility',
        location: data.location || 'General Area',
        assignedEngineer: data.assignedEngineer || 'Unassigned',
        assignedEngineerId: data.assignedEngineerId,
        dueDate: data.dueDate || 'Tomorrow, 5:00 PM',
        slaRemaining: '4h 00m',
        completionRate: 0,
        status: data.assignedEngineerId ? 'in_progress' : 'unassigned',
        incidentId: data.incidentId,
        partsRequired: data.partsRequired,
        repairInstructions: data.repairInstructions,
        createdAt: new Date().toISOString(),
      };
      DEMO_WORK_ORDERS_STORE.unshift(newWO);

      res.status(201).json({
        success: true,
        workOrder: newWO,
      });
      return;
    }

    const { data: created, error } = await serverSupabase
      .from('work_orders')
      .insert([
        {
          order_number: orderNumber,
          title: data.title,
          category: data.category,
          priority: data.priority,
          building_id: data.buildingId,
          location_details: data.location || null,
          assigned_engineer_id: data.assignedEngineerId || null,
          assigned_engineer_name: data.assignedEngineer || null,
          incident_id: data.incidentId || null,
          repair_instructions: data.repairInstructions || null,
          status: data.assignedEngineerId ? 'in_progress' : 'unassigned',
          completion_rate: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(201).json({ workOrder: created });
  }
);

/**
 * GET /api/work-orders/technicians
 * Retrieves maintenance personnel (active technicians) for allocation
 */
workOrdersRouter.get(
  '/technicians',
  authenticateToken,
  requireRole(['technician', 'department_manager', 'facilities_administrator', 'system_administrator', 'coo', 'director', 'engineer']),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!serverSupabase) {
      res.json({
        technicians: DEMO_TECHNICIANS,
        total: DEMO_TECHNICIANS.length,
        source: 'demo_fallback',
      });
      return;
    }

    const { data, error } = await serverSupabase
      .from('profiles')
      .select('id, email, full_name, role, department_id, is_active, phone, avatar_url')
      .in('role', ['technician', 'engineer'])
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const technicians: TechnicianUser[] = (data || []).map((t) => ({
      id: t.id,
      name: t.full_name,
      fullName: t.full_name,
      email: t.email,
      role: 'technician',
      department: 'Facility Engineering & Maintenance',
      departmentId: t.department_id,
      avatar: t.avatar_url || '',
      phone: t.phone || '',
      isActive: t.is_active,
    }));

    if (technicians.length === 0) {
      res.json({ technicians: DEMO_TECHNICIANS, total: DEMO_TECHNICIANS.length, source: 'fallback_seed' });
      return;
    }

    res.json({ technicians, total: technicians.length, source: 'database' });
  }
);

const AllocateWorkOrderSchema = z.object({
  technicianId: z.string().min(1, 'technicianId is required'),
  technicianName: z.string().optional(),
});

/**
 * POST /api/work-orders/:id/allocate
 * Allocate a technician to a maintenance work order with role validation
 */
workOrdersRouter.post(
  '/:id/allocate',
  authenticateToken,
  requireRole(['technician', 'department_manager', 'facilities_administrator', 'system_administrator', 'coo', 'director', 'engineer']),
  async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const parseResult = AllocateWorkOrderSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed for technician allocation.',
        details: parseResult.error.format(),
      });
      return;
    }

    const { technicianId, technicianName } = parseResult.data;

    if (!serverSupabase) {
      const match = DEMO_TECHNICIANS.find((t) => t.id === technicianId);
      if (!match) {
        res.status(400).json({
          error: `User "${technicianId}" is not a recognized technician. Only users with the technician role can be allocated to work orders.`,
          code: 'INVALID_TECHNICIAN_ROLE',
        });
        return;
      }

      const existing = DEMO_WORK_ORDERS_STORE.find((w) => w.id === id);
      if (!existing) {
        res.status(404).json({ error: `Work order "${id}" not found.` });
        return;
      }

      existing.assignedEngineerId = technicianId;
      existing.assignedEngineer = technicianName || match.fullName;
      if (existing.status === 'unassigned') {
        existing.status = 'in_progress';
      }

      res.json({
        success: true,
        workOrder: existing,
        message: `Successfully allocated work order to ${existing.assignedEngineer}`,
      });
      return;
    }

    // Supabase mode: verify target user profile and technician role
    const { data: profile, error: profErr } = await serverSupabase
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', technicianId)
      .single();

    if (profErr || !profile) {
      res.status(400).json({
        error: `Technician "${technicianId}" does not exist in user directory.`,
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    const normalizedRole = normalizeServerRole(profile.role);
    if (normalizedRole !== 'technician') {
      res.status(400).json({
        error: `User "${profile.full_name}" has role "${profile.role}", which is not authorized for maintenance allocation. Only technicians can be allocated.`,
        code: 'INVALID_TECHNICIAN_ROLE',
      });
      return;
    }

    const assignedName = technicianName || profile.full_name;

    const { data: updatedWO, error: updateErr } = await serverSupabase
      .from('work_orders')
      .update({
        assigned_engineer_id: technicianId,
        assigned_engineer_name: assignedName,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr || !updatedWO) {
      res.status(500).json({ error: updateErr?.message || 'Failed to update work order allocation' });
      return;
    }

    res.json({
      success: true,
      workOrder: updatedWO,
      message: `Successfully allocated work order to ${assignedName}`,
    });
  }
);

/**
 * PATCH /api/work-orders/:id
 * Update status, diagnosis, completion notes
 */
workOrdersRouter.patch(
  '/:id',
  authenticateToken,
  requireRole(['technician', 'department_manager', 'facilities_administrator', 'system_administrator', 'coo', 'director', 'engineer']),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const normRole = normalizeServerRole(user.role);
    const { id } = req.params;
    const parseResult = UpdateWorkOrderSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.format(),
      });
      return;
    }

    const updateData = parseResult.data;

    if (!serverSupabase) {
      const existing = DEMO_WORK_ORDERS_STORE.find((wo) => wo.id === id);
      if (!existing) {
        res.status(404).json({ error: `Work order ${id} not found.` });
        return;
      }

      // Technicians cannot edit other technicians' assigned work orders
      if (
        normRole === 'technician' &&
        existing.assignedEngineerId &&
        existing.assignedEngineerId !== user.id
      ) {
        res.status(403).json({
          error: 'Technicians can only update work orders assigned to them.',
          code: 'UNAUTHORIZED_WORK_ORDER_ACCESS',
          assignedTo: existing.assignedEngineerId,
          currentUser: user.id,
        });
        return;
      }

      if (updateData.assignedEngineerId) {
        const techMatch = DEMO_TECHNICIANS.find((t) => t.id === updateData.assignedEngineerId);
        if (!techMatch) {
          res.status(400).json({
            error: `User "${updateData.assignedEngineerId}" does not have the technician role. Only technicians can be allocated to work orders.`,
            code: 'INVALID_TECHNICIAN_ROLE',
          });
          return;
        }
        existing.assignedEngineerId = updateData.assignedEngineerId;
        existing.assignedEngineer = updateData.assignedEngineer || techMatch.fullName;
        if (existing.status === 'unassigned') existing.status = 'in_progress';
      } else if (updateData.assignedEngineer) {
        existing.assignedEngineer = updateData.assignedEngineer;
      }

      if (updateData.status) existing.status = updateData.status;
      if (updateData.completionRate !== undefined) existing.completionRate = updateData.completionRate;
      if (updateData.diagnosis) existing.diagnosis = updateData.diagnosis;
      if (updateData.completionNotes) existing.completionNotes = updateData.completionNotes;

      res.json({
        success: true,
        id,
        workOrder: existing,
        updatedFields: updateData,
        updatedBy: user.id,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Supabase mode: first fetch existing work order to check ownership
    const { data: existingWO, error: fetchErr } = await serverSupabase
      .from('work_orders')
      .select('id, assigned_engineer_id, status')
      .eq('id', id)
      .single();

    if (fetchErr || !existingWO) {
      res.status(404).json({ error: `Work order ${id} not found.` });
      return;
    }

    if (
      normRole === 'technician' &&
      existingWO.assigned_engineer_id &&
      existingWO.assigned_engineer_id !== user.id
    ) {
      res.status(403).json({
        error: 'Technicians can only update work orders assigned to them.',
        code: 'UNAUTHORIZED_WORK_ORDER_ACCESS',
        assignedTo: existingWO.assigned_engineer_id,
        currentUser: user.id,
      });
      return;
    }

    const dbPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updateData.assignedEngineerId) {
      const { data: techProf } = await serverSupabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('id', updateData.assignedEngineerId)
        .single();

      if (!techProf || normalizeServerRole(techProf.role) !== 'technician') {
        res.status(400).json({
          error: `User "${updateData.assignedEngineerId}" does not have the technician role. Only technicians can be allocated to work orders.`,
          code: 'INVALID_TECHNICIAN_ROLE',
        });
        return;
      }
      dbPayload.assigned_engineer_id = updateData.assignedEngineerId;
      dbPayload.assigned_engineer_name = updateData.assignedEngineer || techProf.full_name;
      if (existingWO.status === 'unassigned') dbPayload.status = 'in_progress';
    } else if (updateData.assignedEngineer) {
      dbPayload.assigned_engineer_name = updateData.assignedEngineer;
    }

    if (updateData.status) dbPayload.status = updateData.status;
    if (updateData.completionRate !== undefined) dbPayload.completion_rate = updateData.completionRate;
    if (updateData.diagnosis) dbPayload.diagnosis = updateData.diagnosis;
    if (updateData.completionNotes) dbPayload.completion_notes = updateData.completionNotes;

    const { data: updated, error } = await serverSupabase
      .from('work_orders')
      .update(dbPayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Automatically resolve linked incident in database
    if (updated.incident_id && (updateData.status === 'completed' || updateData.status === 'verified')) {
      try {
        await serverSupabase
          .from('incidents')
          .update({
            lifecycle_status: 'resolved',
            status: 'resolved',
            resolved_at: new Date().toISOString(),
          })
          .eq('id', updated.incident_id);

        await serverSupabase.from('incident_timeline_events').insert([
          {
            incident_id: updated.incident_id,
            to_status: 'resolved',
            actor_id: user.id.startsWith('demo-') ? null : user.id,
            actor_name: user.fullName,
            actor_role: user.role,
            remarks: `Resolved via completion of Work Order ${updated.order_number}: ${updateData.completionNotes || 'Maintenance completed.'}`,
          },
        ]);
      } catch {
        // continue
      }
    }

    res.json({ workOrder: updated });
  }
);

