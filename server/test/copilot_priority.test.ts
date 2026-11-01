import http from 'http';
import express from 'express';
import { copilotRouter } from '../routes/copilot';
import { evaluateIncidentPriority, rankIncidents, IncidentEvaluationInput } from '../services/priorityEngine';
import { executeLocalCopilotQuery } from '../services/geminiService';
import { getCampusOperationalSnapshot } from '../services/campusDataService';
import { secureHeaders, sanitizedLogger, rateLimiter, requestTimeout } from '../middleware/security';

async function runTests() {
  console.log('====================================================');
  console.log('CAMPUSOPS PHASE 3: PRIORITY ENGINE & COPILOT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}${detail ? ' — ' + detail : ''}`);
    }
  }

  // --- TEST 1: 7-Factor Priority Engine Math Verification ---
  console.log('\n--- 1. Priority Formula Math & Factor Breakdown ---');

  const criticalIncident: IncidentEvaluationInput = {
    id: 'test-inc-1',
    ticketNumber: 'INC-T1',
    title: 'Server Room Electrical Fire Alarm',
    description: 'Smoke detector active and temperature spiking in Server Annex 401',
    category: 'Electrical',
    severity: 'critical',
    safetyRisk: 'hazardous',
    disruptionLevel: 'severe',
    peopleAffected: 500,
    buildingId: 'it-block',
    room: 'Server Annex 401',
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
  };

  const criticalResult = evaluateIncidentPriority(criticalIncident);
  assert(criticalResult.totalScore >= 80, `Critical incident score >= 80 (got ${criticalResult.totalScore})`);
  assert(criticalResult.tier === 'CRITICAL', `Critical incident classified as CRITICAL (got ${criticalResult.tier})`);
  assert(criticalResult.factors.safetyRisk.score === 30, `Safety risk max weight is 30% (got ${criticalResult.factors.safetyRisk.score})`);
  assert(criticalResult.factors.severity.score === 20, `Severity max weight is 20% (got ${criticalResult.factors.severity.score})`);
  assert(criticalResult.factors.peopleAffected.score === 15, `People affected max weight is 15% (got ${criticalResult.factors.peopleAffected.score})`);
  assert(criticalResult.factors.facilityCriticality.score === 15, `Facility criticality max weight is 15% (got ${criticalResult.factors.facilityCriticality.score})`);
  assert(criticalResult.factors.operationalDisruption.score === 10, `Operational disruption max weight is 10% (got ${criticalResult.factors.operationalDisruption.score})`);

  // Low severity incident
  const lowIncident: IncidentEvaluationInput = {
    id: 'test-inc-2',
    ticketNumber: 'INC-T2',
    title: 'Loose door hinge on 3rd floor restroom',
    description: 'Restroom door squeaks when opening',
    category: 'General',
    severity: 'low',
    safetyRisk: 'low',
    disruptionLevel: 'none',
    peopleAffected: 5,
    buildingId: 'civil-block',
    room: 'Restroom 302',
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
  };

  const lowResult = evaluateIncidentPriority(lowIncident);
  assert(lowResult.totalScore < 40, `Low incident score < 40 (got ${lowResult.totalScore})`);
  assert(lowResult.tier === 'LOW', `Low incident classified as LOW (got ${lowResult.tier})`);

  // HIGH tier incident (Score 60 - 79)
  const highIncident: IncidentEvaluationInput = {
    id: 'test-inc-high',
    ticketNumber: 'INC-THIGH',
    title: 'Substation Voltage Sag in Mechanical Lab',
    description: 'Machine shop supply dropping below 208V during heavy load cycle',
    category: 'Electrical',
    severity: 'high',
    safetyRisk: 'high',
    disruptionLevel: 'moderate',
    peopleAffected: 65,
    buildingId: 'mechanical-block',
    room: 'Heavy Machinery Lab',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
  };
  const highResult = evaluateIncidentPriority(highIncident);
  assert(highResult.totalScore >= 60 && highResult.totalScore < 80, `High incident score in [60, 79] (got ${highResult.totalScore})`);
  assert(highResult.tier === 'HIGH', `High incident classified as HIGH (got ${highResult.tier})`);

  // MEDIUM tier incident (Score 40 - 59)
  const medIncident: IncidentEvaluationInput = {
    id: 'test-inc-med',
    ticketNumber: 'INC-TMED',
    title: 'Auditorium Audio Ground Loop Hum',
    description: '60Hz hum over ceiling speaker arrays ahead of symposium',
    category: 'IT / Network',
    severity: 'medium',
    safetyRisk: 'low',
    disruptionLevel: 'moderate',
    peopleAffected: 120,
    buildingId: 'main-block',
    room: 'Sri Ramanujam Auditorium',
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
  };
  const medResult = evaluateIncidentPriority(medIncident);
  assert(medResult.totalScore >= 40 && medResult.totalScore < 60, `Medium incident score in [40, 59] (got ${medResult.totalScore})`);
  assert(medResult.tier === 'MEDIUM', `Medium incident classified as MEDIUM (got ${medResult.tier})`);

  // Testing Factor 6 (Waiting Time / SLA Breached)
  const overdueIncident: IncidentEvaluationInput = {
    ...lowIncident,
    id: 'test-inc-overdue',
    isSlaBreached: true,
  };
  const overdueResult = evaluateIncidentPriority(overdueIncident);
  assert(overdueResult.factors.waitingTime.score === 5, `SLA breach gives max waiting score (got ${overdueResult.factors.waitingTime.score})`);

  // Testing Factor 7 (Escalation / Repeat Incidents)
  const contextHistory: IncidentEvaluationInput[] = [
    { ...medIncident, id: 'hist-1' },
    { ...medIncident, id: 'hist-2' },
    { ...medIncident, id: 'hist-3' },
  ];
  const repeatResult = evaluateIncidentPriority(medIncident, contextHistory);
  assert(repeatResult.factors.escalationHistory.score === 5, `Chronic repeat (3 prior tickets) gives max escalation score (got ${repeatResult.factors.escalationHistory.score})`);
  assert(repeatResult.isRepeatedIncident === true, 'Repeat incident flag is true for chronic venue');

  // --- TEST 2: Ranking & Tie-breaking ---
  console.log('\n--- 2. Priority Ranking & Deterministic Ordering ---');
  const dataset = [lowIncident, criticalIncident];
  const ranked = rankIncidents(dataset);

  assert(ranked[0].id === 'test-inc-1', 'Highest score ranked first (test-inc-1 at rank 1)');
  assert(ranked[0].rank === 1, 'First element rank === 1');
  assert(ranked[1].rank === 2, 'Second element rank === 2');

  // --- TEST 3: The 10 Mandated Copilot Queries ---
  console.log('\n--- 3. Testing 10 Mandated Copilot Operational Queries ---');
  const snapshot = await getCampusOperationalSnapshot();

  const queries = [
    { q: 'What are the critical incidents requiring immediate action?', expectedCategory: 'critical_incidents' },
    { q: 'Show department complaint volumes and breakdown', expectedCategory: 'complaint_volume' },
    { q: 'List all overdue work orders and SLA breaches', expectedCategory: 'overdue_work_orders' },
    { q: 'Which classrooms or rooms are disrupted and unavailable?', expectedCategory: 'room_disruptions' },
    { q: 'What spare parts have low stock below threshold?', expectedCategory: 'low_stock' },
    { q: 'Are there any pending approvals requiring authorization?', expectedCategory: 'pending_approvals' },
    { q: 'How many unresolved incidents do we have right now?', expectedCategory: 'unresolved_incidents' },
    { q: 'Identify repeated problem facilities and chronic failure patterns', expectedCategory: 'repeated_issues' },
    { q: 'Give me priority dispatch advice: who should we assign next?', expectedCategory: 'dispatch_advice' },
    { q: 'Check room suitability for upcoming exams and events today', expectedCategory: 'room_suitability' },
  ];

  for (let i = 0; i < queries.length; i++) {
    const item = queries[i];
    const res = executeLocalCopilotQuery(item.q, 'coo', snapshot);
    assert(
      res.category === item.expectedCategory,
      `Query ${i + 1} (${item.expectedCategory}): matched category correctly`,
      `Expected ${item.expectedCategory}, got ${res.category}`
    );
    assert(res.answer.length > 50, `Query ${i + 1}: produced detailed markdown answer (${res.answer.length} chars)`);
    if ([2, 5].includes(i) && res.dataCards.length === 0) {
      assert(res.answer.includes('0 '), `Query ${i + 1}: empty results are clearly reported when no records exist`);
    } else {
      assert(res.dataCards.length > 0, `Query ${i + 1}: returned structured data cards (${res.dataCards.length} cards)`);
    }
    assert(res.suggestedFollowUps.length >= 2, `Query ${i + 1}: provided interactive follow-ups (${res.suggestedFollowUps.length})`);
  }

  // --- TEST 4: Live HTTP API Endpoints ---
  console.log('\n--- 4. Live Express Route Verification & Security Middlewares ---');
  const testApp = express();
  testApp.use(secureHeaders);
  testApp.use(sanitizedLogger);
  testApp.use(rateLimiter({ windowMs: 60000, maxRequests: 250 }));
  testApp.use(requestTimeout(20000));
  testApp.use(express.json());
  testApp.use('/api/ai', copilotRouter);

  const server = http.createServer(testApp);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Health Check & Security Headers
    const healthRes = await fetch(`${baseUrl}/api/ai/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200, 'GET /api/ai/health returns 200 OK');
    assert(healthJson.status === 'operational', 'AI service status is operational');
    assert(healthRes.headers.get('x-content-type-options') === 'nosniff', 'secureHeaders: nosniff header present');
    assert(healthRes.headers.get('x-frame-options') === 'SAMEORIGIN', 'secureHeaders: SAMEORIGIN header present');
    assert(healthRes.headers.get('x-ratelimit-limit') === '250', 'rateLimiter: X-RateLimit-Limit header set to 250');
    assert(healthRes.headers.get('x-powered-by') === null, 'secureHeaders: X-Powered-By header stripped');

    // Priority Queue (Authenticated)
    const queueRes = await fetch(`${baseUrl}/api/ai/priority-queue`, {
      headers: { Authorization: 'Bearer demo-token-coo' },
    });
    const queueJson = await queueRes.json();
    assert(queueRes.status === 200, 'GET /api/ai/priority-queue returns 200 OK');
    assert(Array.isArray(queueJson.data), 'Returns paginated array of ranked incidents');
    assert(queueJson.countsByTier?.CRITICAL !== undefined, 'Returns countsByTier breakdown');

    // Copilot Query via API
    const queryRes = await fetch(`${baseUrl}/api/ai/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-token-coo',
      },
      body: JSON.stringify({ query: 'What critical issues exist?' }),
    });
    const queryApiJson = await queryRes.json();
    assert(queryRes.status === 200, 'POST /api/ai/query returns 200 OK');
    assert(queryApiJson.category === 'critical_incidents', 'API correctly identifies critical incidents category');

    // Manual Priority Override (COO role)
    const overrideRes = await fetch(`${baseUrl}/api/ai/override-priority`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-token-coo',
      },
      body: JSON.stringify({
        incidentId: 'inc-003',
        manualTier: 'CRITICAL',
        reason: 'Water leak is near rare manuscript shelf 4C, must elevate to critical immediately',
      }),
    });
    const overrideJson = await overrideRes.json();
    assert(overrideRes.status === 200, 'POST /api/ai/override-priority succeeds with COO role');
    assert(overrideJson.override.manualTier === 'CRITICAL', 'Override tier recorded correctly');

    // Unauthorized Override (Student / Liaison role)
    const liaisonOverrideRes = await fetch(`${baseUrl}/api/ai/override-priority`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-token-liaison',
      },
      body: JSON.stringify({
        incidentId: 'inc-004',
        manualTier: 'CRITICAL',
        reason: 'Student wants audio mixer fixed now',
      }),
    });
    assert(liaisonOverrideRes.status === 403, 'POST /api/ai/override-priority blocks unauthorized role with 403 Forbidden');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
