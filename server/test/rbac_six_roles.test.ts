import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../index';
import {
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  ROUTE_ACCESS,
  normalizeRole,
  hasPermission,
  canAccessRoute,
} from '../../src/utils/permissions';
import { OfficialAppRole } from '../types';
import { normalizeServerRole } from '../middleware/auth';
import { DEMO_WORK_ORDERS_STORE } from '../routes/workOrders';

describe('CampusOps PS2 Six-Role RBAC & Security Audit Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;

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

  const ALL_OFFICIAL_ROLES: OfficialAppRole[] = [
    'student_faculty',
    'technician',
    'department_manager',
    'facilities_administrator',
    'procurement_approver',
    'system_administrator',
  ];

  // Helper for authenticated HTTP requests
  async function apiRequest(
    method: string,
    endpoint: string,
    token?: string,
    body?: any
  ): Promise<{ status: number; data: any }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    return { status: res.status, data };
  }

  // TEST 1: Login and role resolution for all 6 roles
  it('1. Role Resolution: All 6 official roles and legacy aliases resolve deterministically', () => {
    for (const role of ALL_OFFICIAL_ROLES) {
      assert.strictEqual(normalizeRole(role), role, `Role ${role} should normalize to itself`);
      assert.strictEqual(normalizeServerRole(role), role, `Server role ${role} should normalize to itself`);
      assert.ok(ROLE_LABELS[role], `Role ${role} should have a human-readable display label`);
      assert.ok(ROLE_PERMISSIONS[role].length > 0, `Role ${role} must have assigned permissions`);
    }

    // Verify legacy alias mappings
    assert.strictEqual(normalizeRole('coo'), 'facilities_administrator');
    assert.strictEqual(normalizeRole('director'), 'department_manager');
    assert.strictEqual(normalizeRole('engineer'), 'technician');
    assert.strictEqual(normalizeRole('liaison'), 'student_faculty');
    assert.strictEqual(normalizeRole('student'), 'student_faculty');
    assert.strictEqual(normalizeRole('faculty'), 'student_faculty');

    assert.strictEqual(normalizeServerRole('coo'), 'facilities_administrator');
    assert.strictEqual(normalizeServerRole('director'), 'department_manager');
    assert.strictEqual(normalizeServerRole('engineer'), 'technician');
    assert.strictEqual(normalizeServerRole('liaison'), 'student_faculty');
  });

  // TEST 2: Dashboard and sidebar visibility permissions
  it('2. Navigation & Sidebar Permissions: Granular module scoping across roles', () => {
    // Student / Faculty
    assert.ok(hasPermission('student_faculty', 'incidents:register'));
    assert.ok(hasPermission('student_faculty', 'bookings:request'));
    assert.ok(hasPermission('student_faculty', 'campus_3d:view'));
    assert.strictEqual(hasPermission('student_faculty', 'workorders:manage_all'), false);
    assert.strictEqual(hasPermission('student_faculty', 'inventory:consume'), false);
    assert.strictEqual(hasPermission('student_faculty', 'approvals:review_procurement'), false);
    assert.strictEqual(hasPermission('student_faculty', 'users:manage'), false);

    // Technician
    assert.ok(hasPermission('technician', 'workorders:update_assigned'));
    assert.ok(hasPermission('technician', 'inventory:consume'));
    assert.strictEqual(hasPermission('technician', 'approvals:review_procurement'), false);
    assert.strictEqual(hasPermission('technician', 'users:manage'), false);

    // Procurement Approver
    assert.ok(hasPermission('procurement_approver', 'approvals:review_procurement'));
    assert.ok(hasPermission('procurement_approver', 'procurement:approve'));
    assert.strictEqual(hasPermission('procurement_approver', 'workorders:manage_all'), false);
    assert.strictEqual(hasPermission('procurement_approver', 'users:manage'), false);

    // System Administrator
    assert.ok(hasPermission('system_administrator', 'users:manage'));
    assert.ok(hasPermission('system_administrator', 'audit:read'));
    // Crucial constraint: System Administrator must NOT have procurement approval permission
    assert.strictEqual(hasPermission('system_administrator', 'approvals:review_procurement'), false);
  });

  // TEST 3: Direct URL access restriction (/maintenance, /inventory, /users)
  it('3. Direct Route Access Guard: Role-based URL enforcement', () => {
    // /maintenance (Work orders)
    assert.strictEqual(canAccessRoute('student_faculty', '/maintenance'), false);
    assert.strictEqual(canAccessRoute('procurement_approver', '/maintenance'), false);
    assert.strictEqual(canAccessRoute('technician', '/maintenance'), true);
    assert.strictEqual(canAccessRoute('facilities_administrator', '/maintenance'), true);

    // /inventory
    assert.strictEqual(canAccessRoute('student_faculty', '/inventory'), false);
    assert.strictEqual(canAccessRoute('procurement_approver', '/inventory'), true);
    assert.strictEqual(canAccessRoute('technician', '/inventory'), true);

    // /users (User Management)
    assert.strictEqual(canAccessRoute('student_faculty', '/users'), false);
    assert.strictEqual(canAccessRoute('technician', '/users'), false);
    assert.strictEqual(canAccessRoute('department_manager', '/users'), false);
    assert.strictEqual(canAccessRoute('system_administrator', '/users'), true);
  });

  // TEST 4: API authorization on Express endpoints
  it('4. API Authorization: Rejects unauthorized roles with 403 Forbidden', async () => {
    // Student trying to create work order -> 403
    const woRes = await apiRequest('POST', '/api/work-orders', 'demo-token-student_faculty', {
      title: 'Unauthorized Work Order Attempt',
      category: 'HVAC',
      priority: 'high',
      buildingId: 'it-block',
    });
    assert.strictEqual(woRes.status, 403);
    assert.strictEqual(woRes.data?.code, 'INSUFFICIENT_PRIVILEGES');

    // Technician trying to access /api/users -> 403
    const usersRes = await apiRequest('GET', '/api/users', 'demo-token-technician');
    assert.strictEqual(usersRes.status, 403);
    assert.strictEqual(usersRes.data?.code, 'FORBIDDEN_USER_DIRECTORY');

    // System Administrator accessing /api/users -> 200
    const adminRes = await apiRequest('GET', '/api/users', 'demo-token-system_administrator');
    assert.strictEqual(adminRes.status, 200);
    assert.ok(adminRes.data?.users?.length > 0);
  });

  // TEST 5: Department isolation
  it('5. Department Isolation: Department Manager receives department-scoped data', async () => {
    const res = await apiRequest('GET', '/api/incidents', 'demo-token-department_manager');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data?.incidents));
    // Verify each incident is in Computing Services / IT or general
    for (const inc of res.data.incidents) {
      if (inc.department) {
        assert.ok(
          inc.department.toLowerCase().includes('computing') ||
          inc.department.toLowerCase().includes('it') ||
          inc.department.toLowerCase().includes('computer'),
          `Incident ${inc.id} department '${inc.department}' should match manager's department`
        );
      }
    }
  });

  // TEST 6: Incident ownership scoping (student_faculty sees only own)
  it('6. Incident Scoping: Student / Faculty sees only own reported incidents', async () => {
    const res = await apiRequest('GET', '/api/incidents', 'demo-token-student_faculty');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data?.incidents));
    for (const inc of res.data.incidents) {
      const isOwner =
        inc.reportedById === 'demo-student-001' ||
        inc.reportedBy?.id === 'demo-student-001' ||
        inc.studentId === 'demo-student-001';
      assert.ok(isOwner, `Student should only view incidents they reported. Found: ${inc.id}`);
    }
  });

  // TEST 7: Work order assignment permissions (technician cannot edit others')
  it('7. Work Order Assignment Permissions: Technician cannot update another engineer\'s order', async () => {
    // Seed an assigned work order belonging to a different engineer
    DEMO_WORK_ORDERS_STORE.unshift({
      id: 'wo-test-other-eng',
      orderNumber: 'WO-9999',
      title: 'Restricted Substation Maintenance',
      category: 'Electrical',
      priority: 'high',
      buildingId: 'mechanical-block',
      buildingName: 'Mechanical Block',
      location: 'Substation B',
      assignedEngineer: 'Marcus Vance',
      assignedEngineerId: 'demo-engineer-other-99',
      dueDate: 'Tomorrow',
      slaRemaining: '5h',
      completionRate: 20,
      status: 'in_progress',
      createdAt: new Date().toISOString(),
    });

    // Technician Vikram (id: 'demo-technician-002') attempts to patch wo-test-other-eng
    const patchRes = await apiRequest('PATCH', '/api/work-orders/wo-test-other-eng', 'demo-token-technician', {
      status: 'completed',
      completionNotes: 'Unauthorized close attempt',
    });

    assert.strictEqual(patchRes.status, 403);
    assert.strictEqual(patchRes.data?.code, 'UNAUTHORIZED_WORK_ORDER_ACCESS');
  });

  // TEST 8: Inventory modification permissions
  it('8. Inventory Permissions: Technician can allocate; Student is blocked; Approver receives goods', async () => {
    // Student attempts stock allocation -> 403
    const studentAlloc = await apiRequest('POST', '/api/inventory/allocate', 'demo-token-student_faculty', {
      sku: 'ELE-LED-004',
      quantity: 1,
      workOrderId: 'WO-8821',
    });
    assert.strictEqual(studentAlloc.status, 403);

    // Technician allocates stock -> 200 / 201
    const techAlloc = await apiRequest('POST', '/api/inventory/allocate', 'demo-token-technician', {
      sku: 'ELE-LED-004',
      quantity: 1,
      workOrderId: 'WO-8821',
    });
    assert.ok(techAlloc.status === 200 || techAlloc.status === 201, `Allocation should succeed for technician: ${JSON.stringify(techAlloc.data)}`);

    // Technician attempts to receive supplier goods -> 403
    const techReceive = await apiRequest('POST', '/api/inventory/receive', 'demo-token-technician', {
      sku: 'ELE-LED-004',
      quantity: 10,
      receiptToken: `GRN-TEST-${Date.now()}`,
    });
    assert.strictEqual(techReceive.status, 403);

    // Procurement Approver receives supplier goods -> 200 / 201
    const procReceive = await apiRequest('POST', '/api/inventory/receive', 'demo-token-procurement_approver', {
      sku: 'ELE-LED-004',
      quantity: 10,
      receiptToken: `GRN-TEST-APPROVER-${Date.now()}`,
    });
    assert.ok(procReceive.status === 200 || procReceive.status === 201);
  });

  // TEST 9: Procurement approval separation (non-approver rejected; self-approval rejected)
  it('9. Procurement Approval Separation: Non-approver and Self-Approval rejected', async () => {
    // Non-approver (Student) attempts to approve request
    const studentApprove = await apiRequest('PATCH', '/api/approvals/app-001/review', 'demo-token-student_faculty', {
      status: 'approved',
      remarks: 'Student approval attempt',
    });
    assert.strictEqual(studentApprove.status, 403);

    // Self-approval prohibition check:
    // app-proc-self was submitted by 'demo-procurement-005'
    const selfApprove = await apiRequest('PATCH', '/api/approvals/app-proc-self/review', 'demo-token-procurement_approver', {
      status: 'approved',
      remarks: 'Self approval attempt',
    });
    assert.strictEqual(selfApprove.status, 403);
    assert.strictEqual(selfApprove.data?.code, 'SELF_APPROVAL_PROHIBITED');
  });

  // TEST 10: System Administrator privilege boundary (cannot approve procurement)
  it('10. System Administrator Boundary: Cannot approve commercial procurement requests', async () => {
    const adminApprove = await apiRequest('PATCH', '/api/approvals/app-001/review', 'demo-token-system_administrator', {
      status: 'approved',
      remarks: 'SysAdmin approval override attempt',
    });
    assert.strictEqual(adminApprove.status, 403);
    assert.strictEqual(adminApprove.data?.code, 'SYSADMIN_PROCUREMENT_APPROVAL_PROHIBITED');
  });

  // TEST 11: AI Copilot data isolation by role
  it('11. AI Copilot Isolation: Student receives scoped operational assistance without financial data', async () => {
    const copilotRes = await apiRequest('POST', '/api/ai/query', 'demo-token-student_faculty', {
      query: 'What pending approvals or financial requisitions are waiting for review?',
    });
    assert.strictEqual(copilotRes.status, 200);
    assert.ok(copilotRes.data?.success);
    // Student should not receive any approval data cards
    if (copilotRes.data?.dataCards) {
      const approvalCards = copilotRes.data.dataCards.filter((c: any) => c.actionType === 'view_approval');
      assert.strictEqual(approvalCards.length, 0, 'Students must never receive financial approval cards');
    }
  });

  // TEST 12: 3D Campus access by role
  it('12. 3D Campus Access: Verified for all authorized campus stakeholders', async () => {
    for (const role of ALL_OFFICIAL_ROLES) {
      const res = await apiRequest('GET', '/api/incidents/stats/by-building', `demo-token-${role}`);
      assert.strictEqual(res.status, 200, `Role ${role} should have access to 3D building statistics`);
      assert.ok(res.data?.stats, `Stats should be present for role ${role}`);
    }
  });

  // TEST 13: Disabled account rejection (is_active: false -> 403)
  it('13. Deactivated Account Guard: Inactive user accounts receive 403 Forbidden', async () => {
    const res = await apiRequest('GET', '/api/incidents', 'demo-token-disabled');
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.data?.code, 'ACCOUNT_DEACTIVATED');
  });

  // TEST 14: Missing or invalid token rejection (401)
  it('14. Authentication Guard: Missing or malformed tokens return 401 Unauthorized', async () => {
    // Missing Authorization header
    const missingRes = await apiRequest('GET', '/api/incidents');
    assert.strictEqual(missingRes.status, 401);
    assert.strictEqual(missingRes.data?.code, 'AUTH_REQUIRED');

    // Invalid / empty token
    const invalidRes = await apiRequest('GET', '/api/incidents', 'invalid-token-xyz');
    assert.strictEqual(invalidRes.status, 401);
  });
});
