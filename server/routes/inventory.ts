import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { authenticateToken, normalizeServerRole } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const inventoryRouter = Router();

const serverSupabase = config.isConfigured
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey)
  : null;

// In-memory persistent state for demo mode / testing
interface InventoryRecord {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  unit: string;
  unitCost: number;
  leadTimeDays: number;
  location: string;
  reorderStatus: 'optimal' | 'critical' | 'reordered' | 'pending_approval';
}

interface StockTransaction {
  id: string;
  sku: string;
  itemName: string;
  quantity: number;
  type: 'allocation' | 'receipt' | 'adjustment';
  balanceBefore: number;
  balanceAfter: number;
  referenceId?: string; // workOrderId or purchaseOrderId
  actorId: string;
  actorName: string;
  createdAt: string;
}

// Canonical Demo Inventory
export const DEMO_INVENTORY_ITEMS: InventoryRecord[] = [
  {
    id: 'item-001',
    sku: 'ELE-LED-004',
    name: '4ft 36W LED Troffer Fixture Panel',
    category: 'Electrical',
    currentStock: 8,
    minThreshold: 25,
    unit: 'pcs',
    unitCost: 1250,
    leadTimeDays: 4,
    location: 'Central Stores Bay C-14',
    reorderStatus: 'critical',
  },
  {
    id: 'item-002',
    sku: 'PLM-VAL-019',
    name: '3/4" Brass Full-Port Ball Valve',
    category: 'Plumbing',
    currentStock: 12,
    minThreshold: 30,
    unit: 'pcs',
    unitCost: 680,
    leadTimeDays: 3,
    location: 'Plumbing Crib Rack 3',
    reorderStatus: 'pending_approval',
  },
  {
    id: 'item-003',
    sku: 'HVC-ACT-001',
    name: 'Belimo 24V Modulating Actuator',
    category: 'HVAC',
    currentStock: 0, // Depleted for testing
    minThreshold: 2,
    unit: 'pcs',
    unitCost: 34500,
    leadTimeDays: 1,
    location: 'HVAC Store Mez-2',
    reorderStatus: 'critical',
  },
  {
    id: 'item-004',
    sku: 'HVC-FLT-088',
    name: 'MERV 13 Pleated Air Filter 24x24x2',
    category: 'HVAC',
    currentStock: 15,
    minThreshold: 40,
    unit: 'pcs',
    unitCost: 850,
    leadTimeDays: 7,
    location: 'HVAC Store Mez-2',
    reorderStatus: 'reordered',
  },
  {
    id: 'item-005',
    sku: 'NET-CAT-006',
    name: 'Cat6 UTP CMR Solid Bulk Cable (305m)',
    category: 'Networking',
    currentStock: 2,
    minThreshold: 8,
    unit: 'spools',
    unitCost: 6200,
    leadTimeDays: 2,
    location: 'IT Annex Wire Storage',
    reorderStatus: 'critical',
  },
];

let inventoryStore = [...DEMO_INVENTORY_ITEMS];
let stockTransactions: StockTransaction[] = [
  {
    id: 'tx-init-01',
    sku: 'ELE-LED-004',
    itemName: '4ft 36W LED Troffer Fixture Panel',
    quantity: -4,
    type: 'allocation',
    balanceBefore: 12,
    balanceAfter: 8,
    referenceId: 'WO-8815',
    actorId: 'usr-001',
    actorName: 'Dr. Jennifer Rao',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: 'tx-init-02',
    sku: 'PLM-VAL-019',
    itemName: '3/4" Brass Full-Port Ball Valve',
    quantity: 15,
    type: 'receipt',
    balanceBefore: 5,
    balanceAfter: 20,
    referenceId: 'GRN-2026-9041',
    actorId: 'usr-002',
    actorName: 'Central Stores Receiving',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

// Idempotency token register
const processedReceipts = new Set<string>(['GRN-2026-9041']);

// Schemas
const AllocateStockSchema = z.object({
  sku: z.string(),
  quantity: z.number().int().positive(),
  workOrderId: z.string(),
});

const ReceiveGoodsSchema = z.object({
  sku: z.string(),
  quantity: z.number().int().positive(),
  receiptToken: z.string().min(5),
  purchaseOrderId: z.string().optional(),
  supplierName: z.string().optional(),
});

const CreateProcurementSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().positive(),
  reason: z.string().trim().min(5).max(1000),
  urgency: z.enum(['urgent', 'high', 'medium', 'normal']).default('medium'),
});

const ProcurementStatusSchema = z.object({
  status: z.enum(['approved', 'rejected', 'ordered', 'received']),
  receiptToken: z.string().min(8).max(120).optional(),
});

interface ProcurementRecord {
  id: string; request_number: string; item_id: string; item_sku: string; item_name: string;
  category: string; quantity: number; unit: string; estimated_unit_cost: number;
  total_estimated_cost: number; supplier_name: string; supplier_contact?: string;
  urgency: string; status: string; reason: string; rule_trigger_reason?: string;
  requested_by: string; requested_by_user_id?: string; department?: string; approved_by?: string; created_at: string; ordered_at?: string; received_at?: string; receipt_token?: string;
}
const procurementRequestsStore: ProcurementRecord[] = [];

inventoryRouter.get('/procurement', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  if (serverSupabase) {
    const user = req.user!;
    const role = normalizeServerRole(user.role);
    let query = serverSupabase.from('procurement_requests').select('*').order('created_at', { ascending: false });
    if (!['procurement_approver', 'facilities_administrator', 'system_administrator', 'department_manager'].includes(role)) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)) {
        res.json({ requests: [], source: 'supabase_postgres' });
        return;
      }
      query = query.eq('requested_by_user_id', user.id);
    } else if (role === 'department_manager') {
      const { data: profile, error: profileError } = await serverSupabase.from('profiles').select('department_id').eq('id', user.id).maybeSingle();
      if (profileError) { res.status(500).json({ error: 'Requisition scope lookup failed', message: profileError.message }); return; }
      if (!profile?.department_id) query = query.eq('requested_by_user_id', user.id);
      else {
        const { data: departmentUsers, error: departmentError } = await serverSupabase.from('profiles').select('id').eq('department_id', profile.department_id);
        if (departmentError) { res.status(500).json({ error: 'Requisition department lookup failed', message: departmentError.message }); return; }
        const departmentUserIds = (departmentUsers || []).map((profileRow) => profileRow.id);
        query = departmentUserIds.length ? query.in('requested_by_user_id', departmentUserIds) : query.eq('requested_by_user_id', user.id);
      }
    }
    const { data, error } = await query;
    if (error) { res.status(500).json({ error: 'Requisition query failed', message: error.message }); return; }
    res.json({ requests: data || [], source: 'supabase_postgres' });
    return;
  }
  const user = req.user!;
  const role = normalizeServerRole(user.role);
  const requests = ['procurement_approver', 'facilities_administrator', 'system_administrator'].includes(role)
    ? procurementRequestsStore
    : role === 'department_manager'
      ? procurementRequestsStore.filter((request) => request.department === user.department)
      : procurementRequestsStore.filter((request) => request.requested_by_user_id === user.id);
  res.json({ requests, source: 'demo_fallback' });
});

inventoryRouter.post(
  '/procurement',
  authenticateToken,
  requireRole(['student_faculty', 'technician', 'department_manager', 'facilities_administrator', 'procurement_approver']),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = CreateProcurementSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid requisition payload', details: parsed.error.format() }); return; }
    const user = req.user!;
    if (serverSupabase) {
      try {
        const { data, error } = await serverSupabase.rpc('campusops_create_procurement_request', {
          p_item_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.data.itemId) ? parsed.data.itemId : null,
          p_quantity: parsed.data.quantity,
          p_reason: parsed.data.reason,
          p_urgency: parsed.data.urgency,
          p_requested_by_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id) ? user.id : null,
          p_requested_by: user.fullName,
          p_requested_by_role: user.role,
          p_department: user.department || 'Operations',
        });
        if (error) { res.status(400).json({ error: error.message, code: 'REQUISITION_CREATE_FAILED' }); return; }
        res.status(201).json({ success: true, request: data?.request || data, approval: data?.approval, source: 'supabase_postgres' });
        return;
      } catch (err: unknown) {
        res.status(500).json({ error: 'Requisition could not be saved', message: err instanceof Error ? err.message : 'Unknown database error' });
        return;
      }
    }
    const item = inventoryStore.find((entry) => entry.id === parsed.data.itemId || entry.sku === parsed.data.itemId);
    if (!item) { res.status(404).json({ error: 'Inventory item not found.' }); return; }
    const total = item.unitCost * parsed.data.quantity;
    const request: ProcurementRecord = {
      id: `pr-${Date.now()}`, request_number: `REQ-${Date.now()}`, item_id: item.id,
      item_sku: item.sku, item_name: item.name, category: item.category, quantity: parsed.data.quantity,
      unit: item.unit, estimated_unit_cost: item.unitCost, total_estimated_cost: total,
      supplier_name: 'Campus Procurement', urgency: parsed.data.urgency, status: 'pending_approval',
      reason: parsed.data.reason, requested_by: user.fullName, requested_by_user_id: user.id, department: user.department,
      rule_trigger_reason: `Stock is ${item.currentStock} ${item.unit} against minimum ${item.minThreshold}.`,
      created_at: new Date().toISOString(),
    };
    procurementRequestsStore.unshift(request);
    res.status(201).json({ success: true, request, source: 'demo_fallback' });
  },
);

inventoryRouter.patch(
  '/procurement/:id/status',
  authenticateToken,
  requireRole(['procurement_approver']),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = ProcurementStatusSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Invalid requisition status update', details: parsed.error.format() }); return; }
    const user = req.user!;
    if (serverSupabase) {
      try {
        const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
        const paramId = String(req.params.id);
        if (!isUuid(paramId)) { res.status(400).json({ error: 'Persistent requisition updates require a valid request ID.', code: 'INVALID_RECORD_ID' }); return; }
        if (parsed.data.status === 'received' && !parsed.data.receiptToken) { res.status(400).json({ error: 'Receipt token is required to receive goods.' }); return; }
        const { data, error } = await serverSupabase.rpc('campusops_update_procurement_request', {
          p_request_id: String(req.params.id),
          p_status: parsed.data.status,
          p_receipt_token: parsed.data.receiptToken || null,
          p_actor_id: isUuid(user.id) ? user.id : null,
          p_actor_name: user.fullName,
          p_actor_role: user.role,
        });
        if (error) {
          const missing = error.code === 'P0002' || /not found/i.test(error.message);
          const denied = error.code === '42501' || /self-approval|not authorized/i.test(error.message);
          res.status(missing ? 404 : denied ? 403 : 409).json({ error: error.message, code: missing ? 'REQUISITION_NOT_FOUND' : denied ? 'REQUISITION_REVIEW_FORBIDDEN' : 'REQUISITION_TRANSITION_FAILED' });
          return;
        }
        res.json({ success: true, request: data?.request || data, stock: data?.stock, isIdempotentReplay: data?.isIdempotentReplay === true, source: 'supabase_postgres' });
        return;
      } catch (err: unknown) {
        res.status(500).json({ error: 'Requisition update failed', message: err instanceof Error ? err.message : 'Unknown database error' });
        return;
      }
    }
    const request = procurementRequestsStore.find((entry) => entry.id === req.params.id);
    if (!request) { res.status(404).json({ error: 'Requisition not found.' }); return; }
    const role = normalizeServerRole(user.role);
    if (parsed.data.status === 'approved' || parsed.data.status === 'rejected') {
      if (request.requested_by === user.fullName) { res.status(403).json({ error: 'Self-approval is prohibited.', code: 'SELF_APPROVAL_PROHIBITED' }); return; }
      if (request.status !== 'pending_approval') { res.status(409).json({ error: 'Only pending requisitions can be reviewed.' }); return; }
      request.status = parsed.data.status;
      if (parsed.data.status === 'approved') request.approved_by = user.fullName;
    } else if (parsed.data.status === 'ordered') {
      if (request.status !== 'approved') { res.status(409).json({ error: 'Only approved requisitions can be ordered.' }); return; }
      request.status = 'ordered'; request.ordered_at = new Date().toISOString();
    } else {
      if (request.status === 'received' && request.receipt_token === parsed.data.receiptToken) {
        res.json({ success: true, request, isIdempotentReplay: true, source: 'demo_fallback' });
        return;
      }
      if (request.status !== 'ordered') { res.status(409).json({ error: 'Only ordered requisitions can be received.' }); return; }
      if (!parsed.data.receiptToken) { res.status(400).json({ error: 'Receipt token is required to receive goods.' }); return; }
      if (!processedReceipts.has(parsed.data.receiptToken)) {
        const item = inventoryStore.find((entry) => entry.id === request.item_id);
        if (!item) { res.status(404).json({ error: 'Inventory item not found.' }); return; }
        const before = item.currentStock; item.currentStock += request.quantity;
        processedReceipts.add(parsed.data.receiptToken);
        stockTransactions.unshift({ id: `tx-${Date.now()}`, sku: item.sku, itemName: item.name, quantity: request.quantity, type: 'receipt', balanceBefore: before, balanceAfter: item.currentStock, referenceId: request.request_number, actorId: user.id, actorName: user.fullName, createdAt: new Date().toISOString() });
      }
      request.status = 'received'; request.received_at = new Date().toISOString(); request.receipt_token = parsed.data.receiptToken;
    }
    res.json({ success: true, request, source: 'demo_fallback' });
  },
);

/**
 * GET /api/inventory
 */
inventoryRouter.get(
  '/',
  authenticateToken,
  requireRole(['technician', 'department_manager', 'facilities_administrator', 'procurement_approver', 'system_administrator', 'coo', 'director', 'engineer']),
  async (_req: AuthenticatedRequest, res: Response) => {
  if (!serverSupabase) {
    res.json({
      items: inventoryStore,
      lowStockAlertCount: inventoryStore.filter((i) => i.currentStock <= i.minThreshold).length,
      source: 'demo_fallback',
    });
    return;
  }

  try {
    const { data, error } = await serverSupabase
      .from('inventory_items')
      .select('*')
      .order('item_name', { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({
      items: data,
      lowStockAlertCount: data.filter((i: any) => i.current_stock <= i.min_threshold).length,
      source: 'supabase_postgres',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Database query failed', message: err.message });
  }
});

/**
 * POST /api/inventory/allocate
 */
inventoryRouter.post(
  '/allocate',
  authenticateToken,
  requireRole(['technician', 'facilities_administrator', 'department_manager', 'coo', 'director', 'engineer']),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const parse = AllocateStockSchema.safeParse(req.body);

    if (!parse.success) {
      res.status(400).json({ error: 'Invalid allocation payload', details: parse.error.format() });
      return;
    }

    const { sku, quantity, workOrderId } = parse.data;

    // The database RPC locks the inventory row and commits the balance plus ledger entry atomically.
    if (serverSupabase) {
      try {
        const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
        const { data, error } = await serverSupabase.rpc('campusops_apply_stock_movement', {
          p_sku: sku,
          p_quantity: quantity,
          p_movement: 'allocation',
          p_work_order_id: isUuid(workOrderId) ? workOrderId : null,
          p_receipt_token: null,
          p_actor_id: isUuid(user.id) ? user.id : null,
          p_actor_name: user.fullName,
        });
        if (error) {
          const insufficient = /INSUFFICIENT_STOCK/i.test(error.message);
          res.status(insufficient ? 400 : 500).json({
            error: error.message,
            code: insufficient ? 'INSUFFICIENT_STOCK' : 'STOCK_TRANSACTION_FAILED',
          });
          return;
        }
        res.json({ ...data, message: `Allocated ${quantity} units of ${sku} to Work Order ${workOrderId}.`, source: 'supabase_postgres' });
        return;
      } catch (err: unknown) {
        res.status(500).json({ error: 'Database allocation failed', message: err instanceof Error ? err.message : 'Unknown database error' });
        return;
      }
    }

    // Demo fallback path
    const itemIndex = inventoryStore.findIndex((i) => i.sku.toLowerCase() === sku.toLowerCase());
    if (itemIndex === -1) {
      res.status(404).json({ error: `Inventory item with SKU ${sku} not found.` });
      return;
    }

    const item = inventoryStore[itemIndex];
    if (item.currentStock < quantity) {
      res.status(400).json({
        error: `Insufficient stock for ${item.name}. Requested: ${quantity}, Available: ${item.currentStock}`,
        code: 'INSUFFICIENT_STOCK',
        availableStock: item.currentStock,
        requiredStock: quantity,
        shortage: quantity - item.currentStock,
        suggestion: 'Create a linked procurement request in Approvals to restock this part.',
      });
      return;
    }

    const balanceBefore = item.currentStock;
    const balanceAfter = balanceBefore - quantity;
    item.currentStock = balanceAfter;
    if (item.currentStock <= item.minThreshold) {
      item.reorderStatus = 'critical';
    }

    const tx: StockTransaction = {
      id: `tx-${Date.now()}`,
      sku: item.sku,
      itemName: item.name,
      quantity: -quantity,
      type: 'allocation',
      balanceBefore,
      balanceAfter,
      referenceId: workOrderId,
      actorId: user.id,
      actorName: user.fullName,
      createdAt: new Date().toISOString(),
    };
    stockTransactions.unshift(tx);

    res.json({
      success: true,
      message: `Allocated ${quantity} ${item.unit} of ${item.name} to Work Order ${workOrderId}.`,
      item,
      transaction: tx,
      source: 'demo_fallback',
    });
  }
);

/**
 * POST /api/inventory/receive
 */
inventoryRouter.post(
  '/receive',
  authenticateToken,
  requireRole(['facilities_administrator', 'procurement_approver', 'system_administrator', 'coo', 'director']),
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const parse = ReceiveGoodsSchema.safeParse(req.body);

    if (!parse.success) {
      res.status(400).json({ error: 'Invalid goods receipt payload', details: parse.error.format() });
      return;
    }

    const { sku, quantity, receiptToken, purchaseOrderId } = parse.data;

    // The database RPC serializes receipt tokens and stock changes in one transaction.
    if (serverSupabase) {
      try {
        const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
        const { data, error } = await serverSupabase.rpc('campusops_apply_stock_movement', {
          p_sku: sku,
          p_quantity: quantity,
          p_movement: 'receipt',
          p_receipt_token: receiptToken,
          p_work_order_id: null,
          p_actor_id: isUuid(user.id) ? user.id : null,
          p_actor_name: user.fullName,
        });
        if (error) {
          res.status(500).json({ error: 'Database goods receipt failed', message: error.message });
          return;
        }
        const replay = data?.isIdempotentReplay === true;
        res.status(replay ? 200 : 201).json({ ...data, success: true, receiptToken, source: 'supabase_postgres' });
        return;
      } catch (err: unknown) {
        res.status(500).json({ error: 'Database goods receipt failed', message: err instanceof Error ? err.message : 'Unknown database error' });
        return;
      }
    }

    // Demo fallback path
    if (processedReceipts.has(receiptToken)) {
      res.status(200).json({
        success: true,
        isIdempotentReplay: true,
        message: `Goods receipt ${receiptToken} has already been processed. Stock was NOT duplicated.`,
        receiptToken,
        source: 'demo_fallback',
      });
      return;
    }

    const item = inventoryStore.find((i) => i.sku.toLowerCase() === sku.toLowerCase());
    if (!item) {
      res.status(404).json({ error: `Inventory item with SKU ${sku} not found.` });
      return;
    }

    const balanceBefore = item.currentStock;
    const balanceAfter = balanceBefore + quantity;
    item.currentStock = balanceAfter;
    if (item.currentStock > item.minThreshold) {
      item.reorderStatus = 'optimal';
    }

    processedReceipts.add(receiptToken);

    const tx: StockTransaction = {
      id: `tx-rcv-${Date.now()}`,
      sku: item.sku,
      itemName: item.name,
      quantity,
      type: 'receipt',
      balanceBefore,
      balanceAfter,
      referenceId: purchaseOrderId || receiptToken,
      actorId: user.id,
      actorName: user.fullName,
      createdAt: new Date().toISOString(),
    };
    stockTransactions.unshift(tx);

    res.status(201).json({
      success: true,
      message: `Successfully received and inventoried ${quantity} ${item.unit} of ${item.name}.`,
      item,
      transaction: tx,
      source: 'demo_fallback',
    });
  }
);

/**
 * GET /api/inventory/transactions
 */
inventoryRouter.get(
  '/transactions',
  authenticateToken,
  requireRole(['technician', 'department_manager', 'facilities_administrator', 'procurement_approver', 'system_administrator', 'coo', 'director', 'engineer']),
  async (_req: AuthenticatedRequest, res: Response) => {
    if (serverSupabase) {
      const { data, error } = await serverSupabase
        .from('stock_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        res.json({ transactions: data, source: 'supabase_postgres' });
        return;
      }
    }
    res.json({ transactions: stockTransactions, source: 'demo_fallback' });
  }
);
