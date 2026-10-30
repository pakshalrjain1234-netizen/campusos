/**
 * CampusOps AI Copilot — Security, RBAC & PS2 Compatibility Test Suite
 * 
 * Verifies:
 * 1. Operational Queries (All 8 mandatory questions):
 *    - Active complaints count & severity breakdown
 *    - Critical complaint identification
 *    - Critical classification rationale
 *    - Building incident distribution
 *    - Pending work orders
 *    - Low stock inventory items
 *    - Pending procurement approvals
 *    - Daily executive management priorities
 * 2. Natural Language Understanding (NLU) Aliases
 * 3. Security, Zero-Trust Authorization & PS2 Compliance:
 *    - Role Header Spoofing Prevention (x-user-role rejected/ignored; token-verified profile enforced)
 *    - Expired Session Token Rejection (401 TOKEN_EXPIRED)
 *    - Missing Authentication Rejection (401 UNAUTHENTICATED)
 *    - Unauthorized Procurement Access Denial (student_faculty blocked from financial records)
 *    - Cross-Department Data Isolation (department_manager restricted to department records)
 *    - Separation of Duties / Self-Approval Block (facilities_administrator / approver self-approval blocked)
 *    - System Administrator Business Approval Restriction (commercial authority restricted)
 *    - Data Source Transparency (Explicit labeling for live Supabase vs baseline dataset)
 */

import { processDeterministicQuery } from '../../server/services/deterministicEngine';
import { geminiService } from '../../server/services/geminiService';
import { campusDataService } from '../../server/services/campusDataService';
import { copilotAuthMiddleware, AuthenticatedRequest, TRUSTED_USER_PROFILES } from '../../server/middleware/auth';
import { UserProfile } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (details) console.error(`         Details: ${details}`);
    failed++;
  }
}

// 6 Official CampusOps User Profiles
const studentUser: UserProfile = TRUSTED_USER_PROFILES['usr-student-01'];
const technicianUser: UserProfile = TRUSTED_USER_PROFILES['usr-tech-01'];
const deptManagerUser: UserProfile = TRUSTED_USER_PROFILES['usr-deptmgr-01'];
const facAdminUser: UserProfile = TRUSTED_USER_PROFILES['usr-facadmin-01'];
const procurerUser: UserProfile = TRUSTED_USER_PROFILES['usr-procurer-01'];
const sysAdminUser: UserProfile = TRUSTED_USER_PROFILES['usr-sysadmin-01'];

async function runCopilotVerification() {
  console.log('======================================================================');
  console.log('   CampusOps AI Copilot — Security, RBAC & PS2 Verification Suite     ');
  console.log('======================================================================\n');

  /* ─── Suite 1: Mandatory Operational Questions ─────────────────── */
  console.log('--- Test Suite 1: Core Operational Questions ---');

  // Question 1: Active complaints
  const q1 = await processDeterministicQuery('How many active complaints are there?', facAdminUser);
  assert(
    q1.success && q1.provider === 'local_deterministic' && q1.dataSummary?.metricCount !== undefined && q1.dataSummary.metricCount > 0,
    'Q1: How many active complaints are there? -> Direct count & breakdown returned'
  );

  // Question 2: Critical complaint / highest priority
  const q2 = await processDeterministicQuery('Which complaint has the highest priority?', facAdminUser);
  assert(
    q2.success && (q2.answer.includes('Critical') || q2.answer.includes('#INC-')),
    'Q2: Which complaint has the highest priority? -> Critical ticket identified'
  );

  // Question 3: Why critical classification
  const q3 = await processDeterministicQuery('Why is it critical?', facAdminUser);
  assert(
    q3.success && (q3.answer.includes('Threshold') || q3.answer.includes('SLA') || q3.answer.includes('Classification Rationale')),
    'Q3: Why is it critical? -> Prioritization engine rationale explained'
  );

  // Question 4: Building incident distribution
  const q4 = await processDeterministicQuery('Which building needs attention?', facAdminUser);
  assert(
    q4.success && q4.dataSummary?.buildingNames !== undefined && q4.dataSummary.buildingNames.length > 0,
    'Q4: Which building needs attention? -> Top building incident distribution returned'
  );

  // Question 5: Pending work orders
  const q5 = await processDeterministicQuery('Which work orders are pending?', facAdminUser);
  assert(
    q5.success && q5.dataSummary?.metricCount !== undefined && q5.dataSummary.metricCount > 0,
    'Q5: Which work orders are pending? -> Active maintenance orders listed'
  );

  // Question 6: Low inventory stock
  const q6 = await processDeterministicQuery('Which inventory items are low?', facAdminUser);
  assert(
    q6.success && q6.dataSummary?.metricCount !== undefined && q6.dataSummary.metricCount > 0,
    'Q6: Which inventory items are low? -> Depleted inventory alerts listed'
  );

  // Question 7: Pending procurement approvals
  const q7 = await processDeterministicQuery('Which procurement approvals are pending?', facAdminUser);
  assert(
    q7.success && (q7.answer.includes('Four-Eyes') || q7.answer.includes('REQ-')),
    'Q7: Which procurement approvals are pending? -> Pending purchase orders with 4-eyes note returned'
  );

  // Question 8: Management daily priorities
  const q8 = await processDeterministicQuery('What should management prioritize today?', facAdminUser);
  assert(
    q8.success && q8.answer.includes('Executive Priority Briefing') && q8.answer.includes('Critical Incident Escalation'),
    'Q8: What should management prioritize today? -> Multi-domain executive briefing synthesized'
  );

  /* ─── Suite 2: Natural Language Understanding (NLU) ─────────────── */
  console.log('\n--- Test Suite 2: Natural Language Understanding (NLU) ---');

  const nlu1 = await processDeterministicQuery('What needs attention?', facAdminUser);
  assert(nlu1.success && nlu1.answer.includes('Executive Priority Briefing'), 'NLU: "What needs attention?" mapped to management priorities');

  const nlu2 = await processDeterministicQuery('What is urgent?', facAdminUser);
  assert(nlu2.success && nlu2.answer.includes('Executive Priority Briefing'), 'NLU: "What is urgent?" mapped to management priorities');

  const nlu3 = await processDeterministicQuery('Show me critical complaints', facAdminUser);
  assert(nlu3.success && nlu3.answer.includes('Critical Priority Incidents'), 'NLU: "Show me critical complaints" mapped to critical tickets');

  const nlu4 = await processDeterministicQuery('Any pending maintenance?', facAdminUser);
  assert(nlu4.success && nlu4.answer.includes('Pending Maintenance Work Orders'), 'NLU: "Any pending maintenance?" mapped to work orders');

  /* ─── Suite 3: Security, RBAC & PS2 Authorization ───────────────── */
  console.log('\n--- Test Suite 3: Security, RBAC & PS2 Zero-Trust Enforcement ---');

  // 1. Data source transparency labeling
  assert(
    q1.answer.includes('[Data Source: Verified In-Memory Baseline Dataset]') || q1.answer.includes('[Data Source: Live Supabase Database]'),
    'Data Source Labeling: Clear banner displayed in operational answer'
  );

  // 2. Role Header Spoofing Prevention
  // Client attempts to spoof 'system_administrator' role header using student token
  let spoofedErrorStatus = 0;
  let spoofedErrorCode = '';
  let spoofedUserRole = '';
  const mockReqSpoofed = {
    headers: {
      authorization: 'Bearer campusops-token-student_faculty',
      'x-user-role': 'system_administrator',
      'x-user-dept': 'Information Technology',
    },
  } as unknown as AuthenticatedRequest;
  const mockRes = {
    status: (code: number) => {
      spoofedErrorStatus = code;
      return {
        json: (data: { code: string; error: string }) => {
          spoofedErrorCode = data.code;
        },
      };
    },
  };
  await copilotAuthMiddleware(mockReqSpoofed, mockRes as any, () => {
    spoofedUserRole = mockReqSpoofed.user?.role || '';
  });
  assert(
    spoofedUserRole === 'student_faculty',
    'Header Spoofing Prevention: Client header "x-user-role: system_administrator" ignored; token role "student_faculty" strictly enforced'
  );

  // 3. Header Spoofing with Missing Token
  let unauthStatus = 0;
  let unauthCode = '';
  const mockReqNoToken = {
    headers: {
      'x-user-role': 'facilities_administrator',
    },
  } as unknown as AuthenticatedRequest;
  await copilotAuthMiddleware(mockReqNoToken, {
    status: (code: number) => {
      unauthStatus = code;
      return { json: (d: any) => { unauthCode = d.code; } };
    },
  } as any, () => {});
  assert(
    unauthStatus === 401 && unauthCode === 'UNAUTHENTICATED',
    'Zero-Trust: Role header alone without Bearer token rejected with 401 UNAUTHENTICATED'
  );

  // 4. Expired Token Handling
  let expiredStatus = 0;
  let expiredCode = '';
  const expiredMockToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3ItZmFjYWRtaW4tMDEiLCJleHAiOjE1MDAwMDAwMDB9.mock_sig';
  const mockReqExpired = {
    headers: { authorization: `Bearer ${expiredMockToken}` },
  } as unknown as AuthenticatedRequest;
  await copilotAuthMiddleware(mockReqExpired, {
    status: (code: number) => {
      expiredStatus = code;
      return { json: (d: any) => { expiredCode = d.code; } };
    },
  } as any, () => {});
  assert(
    expiredStatus === 401 && expiredCode === 'TOKEN_EXPIRED',
    'Session Security: Expired JWT token strictly rejected with 401 TOKEN_EXPIRED'
  );

  // 5. Unauthorized Procurement Access (student_faculty)
  const studentProcurement = await processDeterministicQuery('Which procurement requests await approval?', studentUser);
  assert(
    studentProcurement.success && /access denied/i.test(studentProcurement.answer),
    'RBAC (student_faculty): Student/Faculty prohibited from viewing financial procurement requisitions'
  );

  // 6. Private Record Protection (student_faculty cannot view internal work orders)
  const studentWorkOrders = await processDeterministicQuery('Which work orders are pending?', studentUser);
  assert(
    studentWorkOrders.success && /access denied/i.test(studentWorkOrders.answer),
    'Privacy (student_faculty): Students/Faculty blocked from internal maintenance work orders'
  );

  // 7. Technician Assignment Scoping
  const techSnapshot = await campusDataService.getSnapshot(technicianUser);
  const techWorkOrders = techSnapshot.workOrders;
  const otherTechAssigned = techWorkOrders.filter((w) => w.assignedEngineer && !w.assignedEngineer.includes('Vikram') && w.status !== 'unassigned');
  assert(
    otherTechAssigned.length === 0,
    'Scoping (technician): Technician only accesses assigned work orders or unassigned queues'
  );

  // 8. Cross-Department Data Isolation (department_manager)
  // Mechanical Engineering manager queries records; Computer Science / IT records must be isolated
  const deptSnapshot = await campusDataService.getSnapshot(deptManagerUser);
  const hasOtherDeptProcurement = deptSnapshot.procurementRequests.some((p) => p.category.includes('Networking Infrastructure'));
  assert(
    !hasOtherDeptProcurement,
    'Department Scoping (department_manager): Mechanical Engineering manager cannot view Computer Science networking procurement'
  );

  // 9. Dual-Control Separation of Duties: Self-Approval Prevention
  // Facilities Administrator Dr. Jennifer Rao querying procurement
  // If a request was created by Jennifer Rao, self-approval must be blocked
  const mockSelfReqUser: UserProfile = {
    id: 'usr-self',
    name: 'A. Subrahmanyam',
    role: 'facilities_administrator',
    email: 'subrahmanyam@campus.edu',
    avatar: '',
    department: 'Campus Facilities',
  };
  const selfProcurement = await campusDataService.getSnapshot(mockSelfReqUser);
  const selfBlocked = selfProcurement.procurementRequests.find((p) => p.requestedBy.includes('Subrahmanyam'));
  assert(
    selfBlocked?.selfApprovalBlocked === true && selfBlocked?.canApprove === false,
    'Separation of Duties: Requisition creator is strictly prohibited from approving own request'
  );

  // 10. System Administrator Business Approval Restriction
  const sysAdminProcurement = await processDeterministicQuery('Which procurement requests await approval?', sysAdminUser);
  assert(
    sysAdminProcurement.success && sysAdminProcurement.answer.includes('Separation of Duties Notice'),
    'Business Governance (system_administrator): System Administrator restricted from commercial procurement approvals'
  );

  console.log('\n======================================================================');
  console.log(`Copilot Verification Finished: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runCopilotVerification().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
