export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'in_progress' | 'investigating' | 'resolved' | 'closed';
export type IncidentCategory = 'Electrical' | 'Plumbing' | 'HVAC' | 'Structural' | 'IT / Network' | 'Safety' | 'General';

export interface Incident {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  buildingId: string;
  buildingName: string;
  floor: string;
  room?: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  status: IncidentStatus;
  reportedBy: string;
  reportedRole: string;
  assignedTo?: string;
  createdAt: string;
  slaDeadline: string;
  isDemo?: boolean;
}

export type PriorityLevel = 'urgent' | 'high' | 'medium' | 'low';
export type WorkOrderStatus = 'unassigned' | 'in_progress' | 'awaiting_parts' | 'completed';

export interface WorkOrder {
  id: string;
  orderNumber: string;
  title: string;
  category: string;
  buildingId: string;
  buildingName: string;
  location: string;
  priority: PriorityLevel;
  status: WorkOrderStatus;
  assignedEngineer: string;
  engineerAvatar: string;
  dueDate: string;
  slaRemaining: string;
  completionRate: number;
  partsRequired?: string[];
  allocatedParts?: WorkOrderPartAllocation[];
}

export interface StockAlert {
  id: string;
  sku: string;
  itemName: string;
  category: string;
  currentStock: number;
  minThreshold: number;
  unit: string;
  reorderStatus: 'reordered' | 'critical' | 'pending_approval';
  leadTimeDays: number;
  location: string;
}

export type StockTransactionType = 'stock_in' | 'stock_out' | 'allocation' | 'return' | 'adjustment';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  unitCost: number;
  currentStock: number;
  minThreshold: number;
  maxThreshold: number;
  location: string;
  buildingId?: string;
  supplierName: string;
  supplierContact: string;
  leadTimeDays: number;
  allocatedQuantity: number;
  status: StockStatus;
  lastRestockedAt?: string;
  compatibleEquipment?: string[];
}

export interface StockTransaction {
  id: string;
  transactionNumber: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  type: StockTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType: 'work_order' | 'procurement' | 'manual_adjustment' | 'return';
  referenceId?: string;
  reason: string;
  performedBy: string;
  timestamp: string;
}

export type ProcurementStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'received';
export type ProcurementUrgency = 'urgent' | 'high' | 'medium' | 'normal';

export interface ProcurementRequest {
  id: string;
  requestNumber: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedUnitCost: number;
  totalEstimatedCost: number;
  supplierName: string;
  supplierContact?: string;
  urgency: ProcurementUrgency;
  status: ProcurementStatus;
  reason: string;
  ruleTriggerReason?: string;
  requestedBy: string;
  approvedBy?: string;
  orderedAt?: string;
  receivedAt?: string;
  createdAt: string;
}

export interface WorkOrderPartAllocation {
  id: string;
  workOrderId: string;
  orderNumber?: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  allocatedAt: string;
  allocatedBy: string;
  status: 'allocated' | 'issued' | 'returned';
}

export interface RoomDisruption {
  id: string;
  roomCode: string;
  buildingName: string;
  issue: string;
  affectedSchedule: string;
  status: 'active' | 'mitigated' | 'resolved';
  alternativeRoom?: string;
  resolutionEta: string;
}

export type InsightType = 'repeated-complaint' | 'maintenance-risk' | 'low-stock' | 'room-conflict';

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  buildingName: string;
  severity: 'critical' | 'warning' | 'advisory';
  summary: string;
  rootCause: string;
  confidenceScore: number;
  recommendedAction: string;
  actionPayload?: {
    actionType: 'create_work_order' | 'reorder_stock' | 'reallocate_room' | 'inspect_building';
    targetId: string;
  };
  detectedTimeAgo: string;
}

export interface ActivityItem {
  id: string;
  actor: string;
  actorRole: string;
  avatar: string;
  action: string;
  target: string;
  category: 'incident' | 'maintenance' | 'inventory' | 'approval' | 'system';
  timestamp: string;
  badgeText: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  title: string;
  category: string;
  requesterName: string;
  requesterRole: string;
  department: string;
  estimatedCost: string;
  urgency: 'high' | 'medium' | 'normal';
  status: ApprovalStatus;
  submittedAt: string;
  reason: string;
}

export interface Building {
  id: string;
  name: string;
  shortName: string;
  code: string;
  category: 'Academic' | 'Administrative' | 'Residential' | 'Facility';
  openIncidents: number;
  activeWorkOrders: number;
  healthScore: number;
  floors: string;
  status: 'optimal' | 'warning' | 'alert';
  position: [number, number, number]; // 3D coordinates
}

export interface UserProfile {
  id: string;
  name: string;
  role: 'Chief Operations Officer' | 'Director of Facilities' | 'Lead Maintenance Engineer' | 'Student Affairs Liaison';
  email: string;
  avatar: string;
  department: string;
}

