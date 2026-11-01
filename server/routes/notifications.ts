import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, AppRole } from '../types';
import { authenticateToken, normalizeServerRole } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const notificationsRouter = Router();

const serverSupabase = config.isConfigured
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey)
  : null;

export interface BackendNotification {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'alert' | 'success' | 'info';
  category: 'incident' | 'work_order' | 'inventory' | 'procurement' | 'booking' | 'sensor';
  entityType?: 'incident' | 'work_order' | 'approval' | 'booking' | 'room' | 'inventory';
  entityId?: string;
  targetRoles: (AppRole | string)[];
  isRead: boolean;
  createdAt: string;
}

let notificationsStore: BackendNotification[] = [
  {
    id: 'notif-1',
    title: 'High Thermal Warning in IT Server Annex',
    message: 'Ambient temp exceeded 26°C. Auto-ticket INC-2401 logged. SLA: 2h resolution.',
    type: 'critical',
    category: 'incident',
    entityType: 'incident',
    entityId: 'inc-001',
    targetRoles: ['coo', 'director', 'engineer'],
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'notif-2',
    title: 'Emergency Relocation Approval Required',
    message: 'CS301 Practical Exam scheduled in I101 affected by HVAC failure. Suggested alternate: A101.',
    type: 'alert',
    category: 'booking',
    entityType: 'booking',
    entityId: 'book-001',
    targetRoles: ['coo', 'director'],
    isRead: false,
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'notif-3',
    title: 'Purchase Order Approval Needed',
    message: 'Belimo HVAC Actuator Motor requisition (₹34,500) submitted for Server Annex repair.',
    type: 'alert',
    category: 'procurement',
    entityType: 'approval',
    entityId: 'app-001',
    targetRoles: ['coo', 'director'],
    isRead: false,
    createdAt: new Date(Date.now() - 32 * 60000).toISOString(),
  },
  {
    id: 'notif-4',
    title: 'Work Order Assigned: WO-8821',
    message: 'Assigned to Senior HVAC Lead Vikram Sundaram. Chiller Actuator Overhaul scheduled.',
    type: 'info',
    category: 'work_order',
    entityType: 'work_order',
    entityId: 'wo-101',
    targetRoles: ['engineer', 'director'],
    isRead: false,
    createdAt: new Date(Date.now() - 38 * 60000).toISOString(),
  },
  {
    id: 'notif-5',
    title: 'Low Stock Threshold Reached',
    message: 'Cat6 Bulk Cable inventory below minimum reorder point (2 spools remaining).',
    type: 'alert',
    category: 'inventory',
    entityType: 'inventory',
    entityId: 'NET-CAT-006',
    targetRoles: ['coo', 'director', 'engineer'],
    isRead: false,
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
  },
];

/**
 * GET /api/notifications
 * Retrieves notifications targeted to current authenticated role or user
 */
notificationsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (serverSupabase) {
    try {
      const { data, error } = await serverSupabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},target_role.eq.${user.role},target_role.is.null`)
        .order('created_at', { ascending: false });

      if (!error && data) {
        res.json({
          notifications: data,
          unreadCount: data.filter((n: any) => !n.is_read).length,
          source: 'supabase_postgres',
        });
        return;
      }
    } catch {
      // fallback
    }
  }

  const normUserRole = normalizeServerRole(user.role);
  const filtered = notificationsStore.filter((n) =>
    (n.targetRoles as string[]).includes(user.role) ||
    n.targetRoles.map((r) => normalizeServerRole(r)).includes(normUserRole)
  );
  res.json({
    notifications: filtered,
    unreadCount: filtered.filter((n) => !n.isRead).length,
    source: 'demo_fallback',
  });
});

/**
 * PATCH /api/notifications/:id/read
 */
notificationsRouter.patch('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (serverSupabase) {
    try {
      await serverSupabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    } catch {
      // fallback
    }
  }

  const notif = notificationsStore.find((n) => n.id === id);
  if (notif) {
    notif.isRead = true;
  }
  res.json({ success: true, id });
});

/**
 * POST /api/notifications/mark-all-read
 */
notificationsRouter.post('/mark-all-read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  if (serverSupabase) {
    try {
      await serverSupabase
        .from('notifications')
        .update({ is_read: true })
        .or(`user_id.eq.${user.id},target_role.eq.${user.role}`);
    } catch {
      // fallback
    }
  }

  const normUserRole = normalizeServerRole(user.role);
  notificationsStore.forEach((n) => {
    if (
      (n.targetRoles as string[]).includes(user.role) ||
      n.targetRoles.map((r) => normalizeServerRole(r)).includes(normUserRole)
    ) {
      n.isRead = true;
    }
  });
  res.json({ success: true, message: 'All notifications marked as read.' });
});

/**
 * Helper to dispatch programmatic notifications from other workflow routes
 */
export async function dispatchCrossModuleNotification(
  notification: Omit<BackendNotification, 'id' | 'isRead' | 'createdAt'>
) {
  // Prevent duplicate spam
  const exists = notificationsStore.some(
    (n) => n.entityId === notification.entityId && n.title === notification.title
  );
  if (exists) return;

  const newNotif: BackendNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  notificationsStore.unshift(newNotif);

  // If Supabase configured, also persist to database
  if (serverSupabase) {
    try {
      for (const role of notification.targetRoles) {
        await serverSupabase.from('notifications').insert([
          {
            target_role: role,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            category: notification.category,
            entity_type: notification.entityType,
            entity_id: notification.entityId,
            is_read: false,
          },
        ]);
      }
    } catch {
      // ignore async log error
    }
  }
}
