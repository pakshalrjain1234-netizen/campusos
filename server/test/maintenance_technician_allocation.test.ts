import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../index';
import { DEMO_TECHNICIANS, DEMO_WORK_ORDERS_STORE } from '../routes/workOrders';

let server: http.Server;
let baseUrl: string;

const FACILITIES_ADMIN_TOKEN = 'demo-token-facilities';
const TECHNICIAN_TOKEN = 'demo-token-technician';
const STUDENT_TOKEN = 'demo-token-student';

describe('CampusOps — Maintenance Personnel & Technician Allocation Test Suite', () => {
  before(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. Multiple technicians appear in the dropdown: Endpoint returns active maintenance personnel', async () => {
    const res = await fetch(`${baseUrl}/api/work-orders/technicians`, {
      headers: {
        Authorization: `Bearer ${FACILITIES_ADMIN_TOKEN}`,
      },
    });

    assert.strictEqual(res.status, 200, 'Technician endpoint must return 200 OK');
    const json = await res.json();
    assert.ok(Array.isArray(json.technicians), 'Must return an array of technicians');
    assert.ok(json.technicians.length >= 2, `Must return multiple technicians (found ${json.technicians.length})`);

    // Verify properties required by dropdown: id, name / fullName, role, department
    for (const tech of json.technicians) {
      assert.ok(tech.id, 'Technician must have an id');
      assert.ok(tech.name || tech.fullName, 'Technician must have a name / fullName for display');
      assert.strictEqual(tech.role, 'technician', 'Role must strictly normalize to technician');
      assert.ok(tech.department, 'Technician must have department context');
    }
  });

  it('1b. Accessible by maintenance roles: Technician user can query technician directory', async () => {
    const res = await fetch(`${baseUrl}/api/work-orders/technicians`, {
      headers: {
        Authorization: `Bearer ${TECHNICIAN_TOKEN}`,
      },
    });

    assert.strictEqual(res.status, 200, 'Technician role must be authorized to fetch technician list');
    const json = await res.json();
    assert.ok(json.technicians.length > 0, 'Technicians must be returned');
  });

  it('2 & 3. Role-based query boundary: Student cannot access administrative user directory without role parameter', async () => {
    const res = await fetch(`${baseUrl}/api/users`, {
      headers: {
        Authorization: `Bearer ${STUDENT_TOKEN}`,
      },
    });

    assert.strictEqual(res.status, 403, 'Unprivileged student must be blocked with 403 from broad user directory');
  });

  it('4. A valid technician can be allocated: Persists to the maintenance work order', async () => {
    const validTech = DEMO_TECHNICIANS[1]; // Marcus Vance
    const targetWoId = 'wo-103'; // Initially unassigned

    const res = await fetch(`${baseUrl}/api/work-orders/${targetWoId}/allocate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FACILITIES_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        technicianId: validTech.id,
        technicianName: validTech.fullName,
      }),
    });

    assert.strictEqual(res.status, 200, 'Allocating valid technician must succeed with 200 OK');
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.workOrder.assignedEngineerId, validTech.id);
    assert.strictEqual(json.workOrder.assignedEngineer, validTech.fullName);
    assert.strictEqual(json.workOrder.status, 'in_progress', 'Unassigned work order must transition to in_progress');
  });

  it('5. Invalid or unauthorized users cannot be allocated: Non-technician rejected with 400 Bad Request', async () => {
    const nonTechUserId = 'demo-student-001'; // Student / Faculty role
    const targetWoId = 'wo-101';

    const res = await fetch(`${baseUrl}/api/work-orders/${targetWoId}/allocate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FACILITIES_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        technicianId: nonTechUserId,
        technicianName: 'Aarav Sharma (Student)',
      }),
    });

    assert.strictEqual(res.status, 400, 'Allocating non-technician role must be rejected with 400');
    const json = await res.json();
    assert.strictEqual(json.code, 'INVALID_TECHNICIAN_ROLE');
  });

  it('5b. Non-existent technician ID rejected with 400 Bad Request', async () => {
    const targetWoId = 'wo-101';

    const res = await fetch(`${baseUrl}/api/work-orders/${targetWoId}/allocate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FACILITIES_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        technicianId: 'non-existent-user-id-999',
      }),
    });

    assert.strictEqual(res.status, 400, 'Non-existent user must be rejected with 400');
  });

  it('6. Allocation persists after refresh: Subsequent GET /api/work-orders reflects assignment', async () => {
    const targetWoId = 'wo-103';
    const allocatedTech = DEMO_TECHNICIANS[1];

    const res = await fetch(`${baseUrl}/api/work-orders`, {
      headers: {
        Authorization: `Bearer ${FACILITIES_ADMIN_TOKEN}`,
      },
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    const wo = json.workOrders.find((w: any) => w.id === targetWoId);
    assert.ok(wo, 'Target work order must exist');
    assert.strictEqual(wo.assignedEngineerId, allocatedTech.id, 'Assigned engineer ID must persist');
    assert.strictEqual(wo.assignedEngineer, allocatedTech.fullName, 'Assigned engineer name must persist');
    assert.strictEqual(wo.status, 'in_progress', 'Status must remain in_progress');
  });

  it('7. Existing maintenance workflows remain functional: Work order creation and status transition', async () => {
    // Create new work order with allocated technician
    const createRes = await fetch(`${baseUrl}/api/work-orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FACILITIES_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Calibrate HVAC Damper Sensor in Lab 202',
        category: 'HVAC Overhaul',
        priority: 'medium',
        buildingId: 'ADM',
        location: 'Room 202 Lab',
        assignedEngineerId: DEMO_TECHNICIANS[0].id,
        assignedEngineer: DEMO_TECHNICIANS[0].fullName,
      }),
    });

    assert.strictEqual(createRes.status, 201, 'Work order creation must succeed with 201 Created');
    const createdJson = await createRes.json();
    assert.ok(createdJson.workOrder.orderNumber, 'Must generate order number');
    assert.strictEqual(createdJson.workOrder.assignedEngineer, DEMO_TECHNICIANS[0].fullName);

    // Update status to completed
    const patchRes = await fetch(`${baseUrl}/api/work-orders/${createdJson.workOrder.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${FACILITIES_ADMIN_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'completed',
        completionRate: 100,
        completionNotes: 'Replaced actuator sensor. Calibrated flow rate.',
      }),
    });

    assert.strictEqual(patchRes.status, 200, 'Work order completion must succeed with 200');
  });
});

