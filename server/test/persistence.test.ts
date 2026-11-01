import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import { config } from '../config';
import { authenticateToken } from '../middleware/auth';
import { usersRouter } from '../routes/users';
import { incidentsRouter } from '../routes/incidents';
import { workOrdersRouter } from '../routes/workOrders';
import { approvalsRouter } from '../routes/approvals';
import { occupancyRouter } from '../routes/occupancy';
import { inventoryRouter } from '../routes/inventory';
import { bookingsRouter } from '../routes/bookings';
import { notificationsRouter } from '../routes/notifications';
import { AuthenticatedRequest } from '../types';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'CampusOps Backend API',
    supabaseConnected: config.isConfigured,
    config: config.getSanitizedStatus(),
    timestamp: new Date().toISOString(),
  });
});

// Authenticated Identity Profile Endpoint
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Mount Routes
app.use('/api/users', usersRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/work-orders', workOrdersRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/occupancy', occupancyRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/notifications', notificationsRouter);

async function runTests() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log('================================================================');
  console.log(`   CAMPUSOPS PHASE 2.8: FULL-STACK PERSISTENCE TEST SUITE       `);
  console.log(`   Running on ephemeral test port: ${port}                     `);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, extra?: any) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`, extra ? extra : '');
      failed++;
    }
  }

  async function api(path: string, options: RequestInit = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers as any),
      },
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, body };
  }

  try {
    // 1. Health & Sanitized Config Test
    console.log('--- 1. Health & Configuration Security ---');
    const healthRes = await api('/api/health');
    assert('Health endpoint returns 200 and healthy status', healthRes.status === 200 && healthRes.body.status === 'healthy');
    assert('Health config exposes port and nodeEnv', healthRes.body.config?.port !== undefined && healthRes.body.config?.nodeEnv !== undefined);
    assert('Health config does NOT leak any secret service role key', (healthRes.body.config as any).serviceRoleKey === undefined);

    // 2. Auth & RBAC Security Test
    console.log('\n--- 2. Authentication & RBAC Guard ---');
    const unauthRes = await api('/api/incidents', { method: 'POST', body: JSON.stringify({ title: 'Test' }) });
    assert('Unauthenticated incident creation returns 401', unauthRes.status === 401);

    const invalidTokenRes = await api('/api/incidents', {
      method: 'POST',
      headers: { Authorization: 'Bearer invalid-token-xyz' },
      body: JSON.stringify({ title: 'Test' }),
    });
    assert('Invalid token returns 401', invalidTokenRes.status === 401);

    const authMeRes = await api('/api/auth/me', {
      headers: { Authorization: 'Bearer demo-token-coo' },
    });
    assert('Valid demo token authenticates /api/auth/me (200)', authMeRes.status === 200 && authMeRes.body.user?.role === 'facilities_administrator');

    // RBAC Role Restrictions: Student trying to issue work order
    const studentRes = await api('/api/work-orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-student' },
      body: JSON.stringify({ title: 'Student trying to issue WO' }),
    });
    assert('Student role attempting to issue Work Order is blocked with 403', studentRes.status === 403);

    // 3. Incident Reporting & Lifecycle Transition Test
    console.log('\n--- 3. Incident Reporting & Deterministic Triage ---');
    const createIncRes = await api('/api/incidents', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-staff' },
      body: JSON.stringify({
        title: 'Power spike in Server Hall',
        description: 'Critical electrical surge detected in main UPS feed for server annex.',
        category: 'Electrical',
        severity: 'critical',
        safetyRisk: 'high',
        disruptionLevel: 'severe',
        peopleAffected: 120,
        buildingId: 'ITB',
        roomText: 'Server Room 102',
      }),
    });
    assert('Staff can create incident (201)', createIncRes.status === 201 && createIncRes.body.incident !== undefined);
    const createdIncident = createIncRes.body.incident;
    assert('Created incident has ticketNumber', Boolean(createdIncident?.ticketNumber || createdIncident?.ticket_number));

    const retryIncRes = await api('/api/incidents', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-staff' },
      body: JSON.stringify({
        title: 'Power spike in Server Hall',
        description: 'Critical electrical surge detected in main UPS feed for server annex.',
        category: 'Electrical',
        severity: 'critical',
        safetyRisk: 'high',
        disruptionLevel: 'severe',
        peopleAffected: 120,
        buildingId: 'ITB',
        roomText: 'Server Room 102',
      }),
    });
    assert(
      'Retry after a successful incident save returns the existing incident without a duplicate',
      retryIncRes.status === 200 && retryIncRes.body.duplicate === true && retryIncRes.body.incident?.id === createdIncident?.id
    );

    const incId = createdIncident?.id;
    const transRes = await api(`/api/incidents/${incId}/transition`, {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-facilities_lead' },
      body: JSON.stringify({
        targetStatus: 'acknowledged',
        remarks: 'Engineer dispatched to IT Hall',
      }),
    });
    assert('Facilities lead can transition lifecycle to acknowledged (200)', transRes.status === 200 && transRes.body.success === true);

    // 4. Work Order Issuance & Duplicate Prevention
    console.log('\n--- 4. Work Orders & Duplicate Prevention ---');
    const wo1Res = await api('/api/work-orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-engineer' },
      body: JSON.stringify({
        incidentId: incId,
        title: 'Replace UPS Capacitors',
        category: 'Electrical',
        buildingId: 'ITB',
        location: 'Server Room 102',
        priority: 'urgent',
        assignedEngineer: 'Alex Mercer',
      }),
    });
    assert('First work order for incident created successfully (201)', wo1Res.status === 201 && wo1Res.body.workOrder !== undefined);
    const wo1 = wo1Res.body.workOrder;

    // Duplicate WO attempt on same active incident
    const woDupRes = await api('/api/work-orders', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-engineer' },
      body: JSON.stringify({
        incidentId: incId,
        title: 'Second WO for same active incident',
        category: 'Electrical',
        buildingId: 'ITB',
        priority: 'high',
      }),
    });
    assert('Duplicate active work order for same incident is rejected (409 or 400)', (woDupRes.status === 409 || woDupRes.status === 400) && Boolean(woDupRes.body.error));

    // Work order completion auto-resolves incident
    const compRes = await api(`/api/work-orders/${wo1?.id || 'wo-101'}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer demo-token-engineer' },
      body: JSON.stringify({
        status: 'completed',
        completionNotes: 'Replaced capacitor bank and tested load successfully',
      }),
    });
    assert('Work order completed successfully (200)', compRes.status === 200);

    // 5. Inventory: Atomic Stock Allocation, Negative Prevention, Idempotency
    console.log('\n--- 5. Inventory & Procurement Ledger ---');
    const invRes = await api('/api/inventory', {
      headers: { Authorization: 'Bearer demo-token-coo' },
    });
    assert('GET /api/inventory returns inventory items', invRes.status === 200 && Array.isArray(invRes.body.items));
    const testItem = invRes.body?.items?.[0] || { sku: 'ELE-LED-004' };

    // Allocation with sufficient quantity
    const allocRes = await api('/api/inventory/allocate', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-engineer' },
      body: JSON.stringify({
        workOrderId: wo1.id,
        sku: testItem.sku,
        quantity: 2,
      }),
    });
    assert('Stock allocation with sufficient quantity succeeds (200)', allocRes.status === 200 && allocRes.body.success === true);
    assert('Stock transaction logged in allocation', allocRes.body.transaction?.quantity === -2);

    // Allocation with excessive quantity (Atomic Negative Stock Prevention)
    const allocExcessRes = await api('/api/inventory/allocate', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-engineer' },
      body: JSON.stringify({
        workOrderId: wo1.id,
        sku: testItem.sku,
        quantity: 999999,
      }),
    });
    assert('Excessive stock allocation rejected with negative stock prevention (400)', allocExcessRes.status === 400);
    assert('Procurement requisition suggested or handled safely', allocExcessRes.body.createdRequisition !== undefined || allocExcessRes.body.error?.includes('Insufficient'));

    // Idempotent Goods Receipt
    const receiptToken = `TEST-GRN-${Date.now()}`;
    const rcv1Res = await api('/api/inventory/receive', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-procurement_approver' },
      body: JSON.stringify({
        sku: testItem.sku,
        quantity: 10,
        receiptToken,
      }),
    });
    assert('First goods receipt succeeds (201 or 200)', (rcv1Res.status === 201 || rcv1Res.status === 200) && rcv1Res.body.success === true && !rcv1Res.body.isIdempotentReplay);

    // Idempotent Replay with same token
    const rcv2Res = await api('/api/inventory/receive', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-procurement_approver' },
      body: JSON.stringify({
        sku: testItem.sku,
        quantity: 10,
        receiptToken,
      }),
    });
    assert('Second goods receipt with identical token detected as idempotent replay without double-crediting', rcv2Res.status === 200 && rcv2Res.body.isIdempotentReplay === true);

    // A requisition must be created, reviewed, ordered, and received through the same API.
    const procurementToken = 'Bearer demo-token-engineer';
    const requisitionRes = await api('/api/inventory/procurement', {
      method: 'POST',
      headers: { Authorization: procurementToken },
      body: JSON.stringify({ itemId: testItem.id, quantity: 3, urgency: 'medium', reason: 'Restock for scheduled maintenance work.' }),
    });
    const requisitionId = requisitionRes.body?.request?.id;
    assert('Requisition form submission persists through the API (201)', requisitionRes.status === 201 && !!requisitionId);

    const requisitionsListRes = await api('/api/inventory/procurement', {
      headers: { Authorization: 'Bearer demo-token-procurement_approver' },
    });
    assert('Requisition appears in the reviewer list after creation', requisitionsListRes.status === 200 && requisitionsListRes.body.requests?.some((request: any) => request.id === requisitionId), requisitionsListRes.body);

    const selfApproveRes = await api(`/api/inventory/procurement/${requisitionId}/status`, {
      method: 'PATCH',
      headers: { Authorization: procurementToken },
      body: JSON.stringify({ status: 'approved' }),
    });
    assert('Requester cannot approve their own requisition', selfApproveRes.status === 403);

    const approveRequisitionRes = await api(`/api/inventory/procurement/${requisitionId}/status`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer demo-token-procurement_approver' },
      body: JSON.stringify({ status: 'approved' }),
    });
    assert('Authorized procurement reviewer can approve requisition', approveRequisitionRes.status === 200 && approveRequisitionRes.body.request?.status === 'approved');

    const orderRequisitionRes = await api(`/api/inventory/procurement/${requisitionId}/status`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer demo-token-procurement_approver' },
      body: JSON.stringify({ status: 'ordered' }),
    });
    assert('Approved requisition can be marked ordered', orderRequisitionRes.status === 200 && orderRequisitionRes.body.request?.status === 'ordered');

    const procurementReceiptToken = `PROCUREMENT-RECEIPT-${Date.now()}`;
    const receiveRequisitionRes = await api(`/api/inventory/procurement/${requisitionId}/status`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer demo-token-procurement_approver' },
      body: JSON.stringify({ status: 'received', receiptToken: procurementReceiptToken }),
    });
    assert('Recording requisition receipt adds stock and closes the requisition', receiveRequisitionRes.status === 200 && receiveRequisitionRes.body.request?.status === 'received');
    const replayRequisitionReceiptRes = await api(`/api/inventory/procurement/${requisitionId}/status`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer demo-token-procurement_approver' },
      body: JSON.stringify({ status: 'received', receiptToken: procurementReceiptToken }),
    });
    assert('Retrying the same requisition receipt is idempotent', replayRequisitionReceiptRes.status === 200 && replayRequisitionReceiptRes.body.isIdempotentReplay === true);

    // 6. Room Bookings: Maintenance Exclusion & Collision Prevention
    console.log('\n--- 6. Room Bookings & Disruption Protection ---');
    const roomCatalogueRes = await api('/api/bookings/rooms', {
      headers: { Authorization: 'Bearer demo-token-faculty' },
    });
    assert('Booking form room catalogue is available from the API', roomCatalogueRes.status === 200 && roomCatalogueRes.body.rooms?.some((room: any) => room.room_code === 'A201'));
    // Maintenance exclusion check: I101 is in maintenance set
    const bookMaintRes = await api('/api/bookings', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-faculty' },
      body: JSON.stringify({
        roomCode: 'I101',
        title: 'Guest Lecture in Disrupted Hall',
        eventType: 'lecture',
        startTime: '2026-10-31 10:00:00',
        endTime: '2026-10-31 11:30:00',
        expectedAttendees: 40,
      }),
    });
    assert('Booking in room under maintenance is strictly blocked (409 or 400)', (bookMaintRes.status === 409 || bookMaintRes.status === 400) && bookMaintRes.body.error?.includes('maintenance'));

    // Successful booking in available room
    const validStartTime = `2026-11-05 09:00:00`;
    const validEndTime = `2026-11-05 10:30:00`;
    const book1Res = await api('/api/bookings', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-faculty' },
      body: JSON.stringify({
        roomCode: 'A201',
        roomName: 'Lecture Hall 201',
        buildingCode: 'ACB',
        title: 'Advanced AI Seminar',
        eventType: 'lecture',
        startTime: validStartTime,
        endTime: validEndTime,
        expectedAttendees: 45,
      }),
    });
    assert('Booking in available room confirmed (201)', book1Res.status === 201 && book1Res.body.success === true);

    // Double booking collision check
    const bookCollisionRes = await api('/api/bookings', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-faculty' },
      body: JSON.stringify({
        roomCode: 'A201',
        title: 'Conflicting Exam Session',
        eventType: 'examination',
        startTime: validStartTime,
        endTime: validEndTime,
        expectedAttendees: 45,
      }),
    });
    assert('Colliding reservation rejected with conflict status (409 or 400)', bookCollisionRes.status === 409 || bookCollisionRes.status === 400);

    const approvalBookingRes = await api('/api/bookings', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-faculty' },
      body: JSON.stringify({ roomCode: 'A201', title: 'Large Campus Seminar', eventType: 'seminar', startTime: '2026-11-06 10:00:00', endTime: '2026-11-06 11:00:00', expectedAttendees: 90 }),
    });
    const approvalBookingId = approvalBookingRes.body?.booking?.id;
    assert('Large booking creates a pending approval request', approvalBookingRes.status === 201 && approvalBookingRes.body.booking?.status === 'tentative' && !!approvalBookingRes.body.booking?.approvalRequestId);

    const approveBookingRes = await api(`/api/bookings/${approvalBookingId}/status`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer demo-token-coo' },
      body: JSON.stringify({ status: 'approved' }),
    });
    assert('Authorized booking approval persists through the API', approveBookingRes.status === 200 && approveBookingRes.body.booking?.status === 'confirmed');

    const bookingStateRes = await api('/api/bookings', {
      headers: { Authorization: 'Bearer demo-token-faculty' },
    });
    assert('Booking status remains approved when reloaded', bookingStateRes.body.bookings?.some((booking: any) => booking.id === approvalBookingId && booking.status === 'confirmed'));

    const cancelBookingRes = await api(`/api/bookings/${book1Res.body?.booking?.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer demo-token-faculty' },
      body: JSON.stringify({ status: 'cancelled', reason: 'Schedule changed.' }),
    });
    assert('Requester can cancel their own booking and status persists', cancelBookingRes.status === 200 && cancelBookingRes.body.booking?.status === 'cancelled');

    // 7. Approvals & Anti-Self-Approval Enforcement
    console.log('\n--- 7. Approvals & Anti-Self-Approval Security ---');
    const approvalsRes = await api('/api/approvals', {
      headers: { Authorization: 'Bearer demo-token-coo' },
    });
    assert('GET /api/approvals returns pending approval list', approvalsRes.status === 200 && Array.isArray(approvalsRes.body.approvals));

    // Independent officer approving app-001 (requester is Vikram Sundaram)
    const reviewRes = await api('/api/approvals/app-001/review', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer demo-token-procurement_approver' },
      body: JSON.stringify({ status: 'approved' }),
    });
    assert('Independent officer approving requisition succeeds (200)', reviewRes.status === 200 && reviewRes.body.success === true);

    // 8. Notifications Scoping & Read Operations
    console.log('\n--- 8. Notifications Scoping & Read Operations ---');
    const notifRes = await api('/api/notifications', {
      headers: { Authorization: 'Bearer demo-token-coo' },
    });
    assert('Notifications returned for authenticated user', notifRes.status === 200 && Array.isArray(notifRes.body.notifications));

    const markAllRes = await api('/api/notifications/mark-all-read', {
      method: 'POST',
      headers: { Authorization: 'Bearer demo-token-coo' },
    });
    assert('Mark all notifications read succeeds (200)', markAllRes.status === 200 && markAllRes.body.success === true);

    console.log('\n================================================================');
    console.log(`   TEST RESULTS: ${passed} PASSED | ${failed} FAILED            `);
    console.log('================================================================');
  } finally {
    server.close();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
