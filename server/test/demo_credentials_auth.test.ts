import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../index';
import {
  SIX_DEMO_SPECIFICATIONS,
  DEMO_TEMP_PASSWORD,
} from '../scripts/seed_demo_users';
import { authService, SIX_DEMO_CREDENTIALS, safeAuthStorage } from '../../src/services/authService';
import {
  ROLE_PERMISSIONS,
  ROUTE_ACCESS,
  normalizeRole,
  hasPermission,
  canAccessRoute,
} from '../../src/utils/permissions';
import { OfficialAppRole } from '../types';

describe('CampusOps — Six Official Demo Credentials & Authentication Verification', () => {
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

  const EXPECTED_ACCOUNTS = [
    { role: 'student_faculty', email: 'student@campusops.demo', label: 'Student / Faculty' },
    { role: 'technician', email: 'technician@campusops.demo', label: 'Technician' },
    { role: 'department_manager', email: 'manager@campusops.demo', label: 'Department Manager' },
    { role: 'facilities_administrator', email: 'facilities@campusops.demo', label: 'Facilities Administrator' },
    { role: 'procurement_approver', email: 'procurement@campusops.demo', label: 'Procurement Approver' },
    { role: 'system_administrator', email: 'admin@campusops.demo', label: 'System Administrator' },
  ];

  it('1. Specification Integrity: All 6 required accounts exist with exact emails and roles', () => {
    assert.strictEqual(SIX_DEMO_SPECIFICATIONS.length, 6);
    assert.strictEqual(SIX_DEMO_CREDENTIALS.length, 6);

    for (const exp of EXPECTED_ACCOUNTS) {
      const serverMatch = SIX_DEMO_SPECIFICATIONS.find((s) => s.email === exp.email);
      assert.ok(serverMatch, `Server spec missing email: ${exp.email}`);
      assert.strictEqual(serverMatch?.role, exp.role);

      const clientMatch = SIX_DEMO_CREDENTIALS.find((c) => c.email === exp.email);
      assert.ok(clientMatch, `Client spec missing email: ${exp.email}`);
      assert.strictEqual(clientMatch?.role, exp.role);
      assert.strictEqual(clientMatch?.password, DEMO_TEMP_PASSWORD);
    }
  });

  it('2. Authentication Success: Valid credentials for each of the 6 demo users succeed', async () => {
    for (const exp of EXPECTED_ACCOUNTS) {
      const authResult = await authService.signIn(exp.email, DEMO_TEMP_PASSWORD);
      assert.ok(authResult, `Sign-in should succeed for ${exp.email}`);
      assert.strictEqual(authResult.user.email, exp.email);
      assert.strictEqual(normalizeRole(authResult.user.role), exp.role);
      assert.ok(authResult.session.accessToken, 'Active access token must be issued');
    }
  });

  it('3. Authentication Failure: Incorrect password strictly fails', async () => {
    for (const exp of EXPECTED_ACCOUNTS) {
      await assert.rejects(
        async () => {
          await authService.signIn(exp.email, 'WrongPassword999!');
        },
        /Invalid login credentials|Incorrect password/i,
        `Wrong password for ${exp.email} must throw authentication error`
      );
    }
  });

  it('4. Authentication Failure: Unknown / unregistered email strictly fails', async () => {
    const unknownEmails = [
      'fake.intruder@unknown.com',
      'hacker@campusops.demo',
      'student@gmail.com',
    ];

    for (const email of unknownEmails) {
      await assert.rejects(
        async () => {
          await authService.signIn(email, DEMO_TEMP_PASSWORD);
        },
        /Invalid login credentials|No campus account found/i,
        `Unknown email ${email} must throw authentication error`
      );
    }
  });

  it('5. Role Normalization: Every account resolves deterministically to its official PS2 role', () => {
    for (const exp of EXPECTED_ACCOUNTS) {
      const resolved = normalizeRole(exp.role);
      assert.strictEqual(resolved, exp.role);
      assert.ok(ROLE_PERMISSIONS[resolved], `Role permissions must be defined for ${resolved}`);
    }
  });

  it('6. Granular RBAC: Each role is permitted expected operations and denied unauthorized operations', () => {
    // Student / Faculty: can report incidents and book rooms, but CANNOT consume inventory or approve requisitions
    assert.strictEqual(hasPermission('student_faculty', 'incidents:register'), true);
    assert.strictEqual(hasPermission('student_faculty', 'bookings:request'), true);
    assert.strictEqual(hasPermission('student_faculty', 'inventory:consume'), false);
    assert.strictEqual(hasPermission('student_faculty', 'procurement:approve'), false);
    assert.strictEqual(canAccessRoute('student_faculty', '/analytics'), false);

    // Technician: can update work orders and consume inventory, but CANNOT approve procurement
    assert.strictEqual(hasPermission('technician', 'workorders:update_assigned'), true);
    assert.strictEqual(hasPermission('technician', 'inventory:consume'), true);
    assert.strictEqual(hasPermission('technician', 'procurement:approve'), false);

    // Procurement Approver: can approve procurement requisitions
    assert.strictEqual(hasPermission('procurement_approver', 'procurement:approve'), true);
    assert.strictEqual(canAccessRoute('procurement_approver', '/approvals'), true);

    // System Administrator: can manage users, but CANNOT approve commercial procurement
    assert.strictEqual(hasPermission('system_administrator', 'users:manage'), true);
    assert.strictEqual(hasPermission('system_administrator', 'procurement:approve'), false);
  });

  it('7. Backend API Guard: Protected endpoints reject unauthorized roles and unauthenticated requests', async () => {
    // 1. Unauthenticated request to /api/users
    const unauthRes = await fetch(`${baseUrl}/api/users`);
    assert.strictEqual(unauthRes.status, 401);

    // 2. Student attempting to access /api/users (403 Forbidden)
    const studentRes = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: 'Bearer demo-token-student_faculty' },
    });
    assert.strictEqual(studentRes.status, 403);

    // 3. System Administrator accessing /api/users (200 OK)
    const adminRes = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: 'Bearer demo-token-system_administrator' },
    });
    assert.strictEqual(adminRes.status, 200);
  });

  it('8. Session Invalidation: Signing out removes active credentials from localStorage', async () => {
    const authResult = await authService.signIn('student@campusops.demo', DEMO_TEMP_PASSWORD);
    assert.ok(authResult);

    await authService.signOut();
    const stored = safeAuthStorage.getItem('campusops_demo_auth');
    assert.strictEqual(stored, null, 'storage should be cleared upon signOut');
  });
});

