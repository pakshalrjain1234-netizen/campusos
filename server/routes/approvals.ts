import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { authenticateToken, normalizeServerRole } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const approvalsRouter = Router();

const serverSupabase = config.isConfigured
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey)
  : null;

const ReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

// Demo approval store for standalone testing and fallback
export interface DemoApproval {
  id: string;
  title: string;
  category: string;
  requestType: 'procurement' | 'room_booking' | 'room_relocation' | 'general';
  requesterId: string;
  requesterName: string;
  requesterRole: string;
  department: string;
  estimatedCost: string;
  urgency: 'high' | 'medium' | 'normal';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reason: string;
  entityId?: string;
}

export const DEMO_APPROVALS_STORE: DemoApproval[] = [
  {
    id: 'app-001',
    title: 'Emergency Procurement: Belimo HVAC Actuator Motor 24V',
    category: 'Spares & Machinery',
    requestType: 'procurement',
    requesterId: 'demo-engineer-003', // Vikram Sundaram
    requesterName: 'Vikram Sundaram',
    requesterRole: 'Senior HVAC Lead',
    department: 'Facility Engineering',
    estimatedCost: '₹34,500',
    urgency: 'high',
    status: 'pending',
    submittedAt: '32m ago',
    reason: 'Critical component needed for IT Block Server Annex chiller bypass repair today.',
    entityId: 'item-003',
  },
  {
    id: 'app-002',
    title: 'Cat6 CMR Cable Bulk Spool Restock (10 Spools)',
    category: 'Consumables',
    requestType: 'procurement',
    requesterId: 'demo-director-002', // Marcus Vance
    requesterName: 'Marcus Vance',
    requesterRole: 'Director of Facilities',
    department: 'Computing Services',
    estimatedCost: '₹62,000',
    urgency: 'high',
    status: 'pending',
    submittedAt: '1h 15m ago',
    reason: 'Depot stock at 3 spools, insufficient for scheduled First Year Block lab rewiring this weekend.',
    entityId: 'item-005',
  },
  {
    id: 'app-005',
    title: 'Emergency Relocation Approval: CS301 Practical Exam',
    category: 'Room Disruption',
    requestType: 'room_relocation',
    requesterId: 'demo-director-002', // Marcus Vance
    requesterName: 'Marcus Vance',
    requesterRole: 'Director of Facilities',
    department: 'Academic Affairs',
    estimatedCost: '₹0',
    urgency: 'high',
    status: 'pending',
    submittedAt: '20m ago',
    reason: 'Exam in I101 cannot proceed due to chiller loop pressure fault. Relocation to A101 requested.',
    entityId: 'book-001',
  },
  {
    id: 'app-proc-self',
    title: 'Requisition: Bulk Ethernet Cabling',
    category: 'Consumables',
    requestType: 'procurement',
    requesterId: 'demo-procurement-005', // Sunita Deshmukh
    requesterName: 'Sunita Deshmukh',
    requesterRole: 'procurement_approver',
    department: 'Finance & Procurement Directorate',
    estimatedCost: '₹18,500',
    urgency: 'medium',
    status: 'pending',
    submittedAt: '15m ago',
    reason: 'Self-submitted requisition to verify separation-of-duties check.',
    entityId: 'item-009',
  },
];

/**
 * GET /api/approvals
 */
approvalsRouter.get(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const norm = normalizeServerRole(user.role);

    if (!serverSupabase) {
      // Role-scoped visibility
      const isReviewer = [
        'procurement_approver',
        'facilities_administrator',
        'department_manager',
        'system_administrator',
        'coo',
        'director',
      ].includes(norm);

      const filtered = isReviewer
        ? DEMO_APPROVALS_STORE
        : DEMO_APPROVALS_STORE.filter((a) => a.requesterId === user.id);
      res.json({ approvals: filtered });
      return;
    }

    let query = serverSupabase.from('approvals').select('*');

    // Only review roles see all requests; technicians and student_faculty only see their own requests
    const isReviewer = [
      'procurement_approver',
      'facilities_administrator',
      'department_manager',
      'system_administrator',
      'coo',
      'director',
    ].includes(norm);

    if (!isReviewer) {
      query = query.eq('requester_id', user.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ approvals: data });
  }
);

/**
 * PATCH /api/approvals/:id/review
 * Approves or rejects request.
 * Enforces NO SELF-APPROVAL constraint and SEPARATION OF DUTIES.
 * System Administrator cannot approve procurement requests solely through technical role.
 */
approvalsRouter.patch(
  '/:id/review',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const norm = normalizeServerRole(user.role);
    const { id } = req.params;

    // System Administrator cannot approve procurement
    if (norm === 'system_administrator') {
      res.status(403).json({
        error:
          'Forbidden: System Administrator is a technical governance role and does not hold commercial procurement approval authority.',
        code: 'SYSADMIN_PROCUREMENT_APPROVAL_PROHIBITED',
      });
      return;
    }

    // Role verification: Must be Procurement Approver, Department Manager, or Facilities Administrator
    const allowedReviewRoles = [
      'procurement_approver',
      'department_manager',
      'facilities_administrator',
      'coo',
      'director',
    ];

    if (!allowedReviewRoles.includes(norm)) {
      res.status(403).json({
        error: `Forbidden: Role "${user.role}" does not have approval review authority.`,
        code: 'INSUFFICIENT_PRIVILEGES',
      });
      return;
    }

    const parseResult = ReviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Status must be "approved" or "rejected".' });
      return;
    }

    const { status } = parseResult.data;

    if (!serverSupabase) {
      const existing = DEMO_APPROVALS_STORE.find((a) => a.id === id);
      if (!existing) {
        res.status(404).json({ error: 'Approval request not found.' });
        return;
      }

      // Procurement separation of duties: procurement requests require Procurement Approver
      if (existing.requestType === 'procurement' && norm !== 'procurement_approver' && user.role !== 'coo') {
        res.status(403).json({
          error: 'Forbidden: Only designated Procurement Approvers can authorize equipment procurement requests.',
          code: 'PROCUREMENT_APPROVER_REQUIRED',
        });
        return;
      }

      // Self-approval prevention check in demo mode
      if (existing.requesterId === user.id) {
        res.status(403).json({
          error: 'Forbidden: Self-approval is strictly prohibited. An independent approver must review your request.',
          code: 'SELF_APPROVAL_PROHIBITED',
        });
        return;
      }

      existing.status = status;
      res.json({ success: true, id, status, reviewer: user.fullName });
      return;
    }

    // 1. Fetch current approval to check requester identity and request type
    const { data: existing, error: fetchError } = await serverSupabase
      .from('approvals')
      .select('id, requester_id, request_type')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      res.status(404).json({ error: 'Approval request not found.' });
      return;
    }

    // Procurement separation of duties
    if (existing.request_type === 'procurement' && norm !== 'procurement_approver' && user.role !== 'coo') {
      res.status(403).json({
        error: 'Forbidden: Only designated Procurement Approvers can authorize equipment procurement requests.',
        code: 'PROCUREMENT_APPROVER_REQUIRED',
      });
      return;
    }

    // 2. Self-approval prevention check
    if (existing.requester_id === user.id) {
      res.status(403).json({
        error: 'Forbidden: Self-approval is strictly prohibited. An independent approver must review your request.',
        code: 'SELF_APPROVAL_PROHIBITED',
      });
      return;
    }

    // 3. Update approval status with stamped reviewer information
    const { data, error } = await serverSupabase
      .from('approvals')
      .update({
        status,
        reviewer_id: user.id,
        reviewer_name: user.fullName,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // 4. Cross-module database updates on approval
    if (status === 'approved' && data) {
      try {
        if (data.entity_type === 'inventory' && data.entity_id) {
          await serverSupabase
            .from('inventory_items')
            .update({ reorder_status: 'reordered', updated_at: new Date().toISOString() })
            .eq('id', data.entity_id);
        } else if (data.entity_type === 'booking' && data.entity_id) {
          await serverSupabase
            .from('room_disruptions')
            .update({ status: 'mitigated' })
            .eq('booking_id', data.entity_id);
        }
      } catch {
        // ignore secondary update failure
      }
    }

    res.json({ approval: data, message: `Request successfully ${status}.` });
  }
);

/**
 * POST /api/approvals/:id/review (Alias for PATCH /api/approvals/:id/review)
 */
approvalsRouter.post(
  '/:id/review',
  authenticateToken,
  (req, res, next) => {
    // Re-route to PATCH handler logic
    (approvalsRouter as any).handle({ ...req, method: 'PATCH' }, res, next);
  }
);

