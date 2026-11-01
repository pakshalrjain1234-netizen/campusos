export type PriorityTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface PriorityFactorBreakdown {
  safetyRisk: { score: number; max: number; weightPct: number; reason: string };
  severity: { score: number; max: number; weightPct: number; reason: string };
  peopleAffected: { score: number; max: number; weightPct: number; reason: string };
  facilityCriticality: { score: number; max: number; weightPct: number; reason: string };
  operationalDisruption: { score: number; max: number; weightPct: number; reason: string };
  waitingTime: { score: number; max: number; weightPct: number; reason: string };
  escalationHistory: { score: number; max: number; weightPct: number; reason: string };
}

export interface PriorityExplanation {
  totalScore: number;
  tier: PriorityTier;
  reasons: string[];
  factors: PriorityFactorBreakdown;
  affectedSummary: {
    peopleCount: number;
    facilityName: string;
    criticalityTier: string;
  };
  recommendedActions: string[];
  suggestedDepartment: string;
  escalationRecommendation: string;
  isOverdue: boolean;
  isRepeatedIncident: boolean;
  confidenceScore: number;
  isManualOverride?: boolean;
  overrideDetails?: any;
}

export interface IncidentEvaluationInput {
  id: string;
  ticketNumber?: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  safetyRisk?: 'low' | 'medium' | 'high' | 'hazardous';
  disruptionLevel?: 'none' | 'minor' | 'moderate' | 'severe';
  peopleAffected?: number;
  buildingId: string;
  buildingName?: string;
  room?: string;
  createdAt: string | number;
  lifecycleStatus?: string;
  status?: string;
  timeline?: any[];
  isSlaBreached?: boolean;
}

export interface ClientRankedIncident extends IncidentEvaluationInput {
  priorityScore: number;
  priorityTier: PriorityTier;
  rank: number;
  explanation: PriorityExplanation;
  priorityAnalysis?: PriorityExplanation;
}

export function evaluateFacilityCriticality(buildingId: string, room?: string): {
  tier: 'critical' | 'high' | 'medium' | 'standard';
  weightScore: number;
  rationale: string;
} {
  const r = (room || '').toLowerCase();
  const b = (buildingId || '').toLowerCase();

  if (
    r.includes('server') ||
    r.includes('substation') ||
    r.includes('switchgear') ||
    r.includes('chiller') ||
    r.includes('archives') ||
    r.includes('datacenter') ||
    r.includes('toxic')
  ) {
    return {
      tier: 'critical',
      weightScore: 15,
      rationale: 'Tier 1 Core Infrastructure / High-Hazard Asset',
    };
  }

  if (
    r.includes('lab') ||
    r.includes('auditorium') ||
    r.includes('exam') ||
    b.includes('library') ||
    b.includes('mechanical') ||
    b.includes('it-block')
  ) {
    return {
      tier: 'high',
      weightScore: 11,
      rationale: 'Tier 2 Academic Core / Scheduled Multi-Occupant Facility',
    };
  }

  if (r.includes('classroom') || r.includes('seminar') || r.includes('studio') || b.includes('academic')) {
    return {
      tier: 'medium',
      weightScore: 7,
      rationale: 'Tier 3 Standard Instructional Space',
    };
  }

  return {
    tier: 'standard',
    weightScore: 3,
    rationale: 'Tier 4 General Circulation / Administrative Space',
  };
}

export function evaluateIncidentPriority(
  incident: IncidentEvaluationInput,
  contextHistory: IncidentEvaluationInput[] = []
): PriorityExplanation {
  const reasons: string[] = [];

  // 1. Safety Risk (30%)
  let safetyScore = 3;
  let safetyReason = 'Low baseline safety hazard';
  const risk = incident.safetyRisk || 'low';

  if (risk === 'hazardous') {
    safetyScore = 30;
    safetyReason = 'Hazardous condition detected — potential physical danger or life safety violation';
    reasons.push('Life-safety / severe hazard protocol active');
  } else if (risk === 'high') {
    safetyScore = 22;
    safetyReason = 'High personal injury risk or structural hazard';
    reasons.push('Elevated bodily injury or mechanical danger');
  } else if (risk === 'medium') {
    safetyScore = 14;
    safetyReason = 'Moderate physical inconvenience or minor hazard';
  } else {
    safetyScore = 6;
  }

  // 2. Severity (20%)
  let severityScore = 4;
  let severityReason = 'Low system impact';
  const sev = incident.severity || 'low';

  if (sev === 'critical') {
    severityScore = 20;
    severityReason = 'Catastrophic functional failure of core infrastructure';
    reasons.push('Complete system outage / severe equipment breakdown');
  } else if (sev === 'high') {
    severityScore = 15;
    severityReason = 'Major operational impairment requiring rapid remediation';
    reasons.push('Significant performance degradation');
  } else if (sev === 'medium') {
    severityScore = 9;
    severityReason = 'Moderate operational defect with available workaround';
  } else {
    severityScore = 4;
  }

  // 3. People Affected (15%)
  const count = incident.peopleAffected || 1;
  let peopleScore = 2;
  let peopleReason = `Isolated impact (~${count} person)`;

  if (count >= 250) {
    peopleScore = 15;
    peopleReason = `Mass campus disruption (${count} individuals affected)`;
    reasons.push(`Widespread campus population impact (${count} occupants)`);
  } else if (count >= 100) {
    peopleScore = 12;
    peopleReason = `Large cohort affected (${count} occupants)`;
    reasons.push(`High occupancy impact (${count} people)`);
  } else if (count >= 30) {
    peopleScore = 8;
    peopleReason = `Substantial group affected (${count} occupants)`;
  } else if (count >= 10) {
    peopleScore = 5;
    peopleReason = `Local group affected (${count} occupants)`;
  } else {
    peopleScore = 2;
  }

  // 4. Facility Criticality (15%)
  const facilityEval = evaluateFacilityCriticality(incident.buildingId, incident.room);
  const facilityScore = facilityEval.weightScore;
  const facilityReason = facilityEval.rationale;
  if (facilityEval.tier === 'critical') {
    reasons.push(`Core facility vulnerability: ${incident.room || incident.buildingId}`);
  }

  // 5. Operational Disruption (10%)
  const disruption = incident.disruptionLevel || 'none';
  let disruptionScore = 1;
  let disruptionReason = 'Negligible academic or schedule disruption';

  if (disruption === 'severe') {
    disruptionScore = 10;
    disruptionReason = 'Severe schedule halt / cancelled exams or key operations';
    reasons.push('Classroom/exam cancellation or scheduled event paralysis');
  } else if (disruption === 'moderate') {
    disruptionScore = 7;
    disruptionReason = 'Moderate delay or relocated activity required';
  } else if (disruption === 'minor') {
    disruptionScore = 4;
    disruptionReason = 'Minor inconvenience without academic downtime';
  } else {
    disruptionScore = 1;
  }

  // 6. Waiting Time (5%)
  const createdMs = new Date(incident.createdAt).getTime();
  const nowMs = Date.now();
  const elapsedMinutes = Math.max(0, Math.floor((nowMs - createdMs) / 60000));
  let waitingScore = 1;
  let waitingReason = `Logged recently (${elapsedMinutes}m ago)`;
  let isOverdue = Boolean(incident.isSlaBreached);

  if (elapsedMinutes > 240 || isOverdue) {
    waitingScore = 5;
    waitingReason = `Prolonged backlog wait (${Math.floor(elapsedMinutes / 60)}h elapsed) — SLA breached`;
    isOverdue = true;
    reasons.push('SLA deadline exceeded — escalating priority');
  } else if (elapsedMinutes > 120) {
    waitingScore = 4;
    waitingReason = `Substantial delay (${Math.floor(elapsedMinutes / 60)}h elapsed)`;
  } else if (elapsedMinutes > 45) {
    waitingScore = 3;
    waitingReason = `Moderate wait (${elapsedMinutes}m elapsed)`;
  } else {
    waitingScore = 1;
  }

  // 7. Escalation History (5%)
  let escalationScore = 1;
  let escalationReason = 'First logged report';
  let isRepeatedIncident = false;

  const repeatedCount = contextHistory.filter(
    (h) =>
      h.id !== incident.id &&
      h.buildingId === incident.buildingId &&
      h.category === incident.category
  ).length;

  if (repeatedCount >= 2) {
    escalationScore = 5;
    escalationReason = `Chronic recurring issue (${repeatedCount} historical events in ${incident.buildingId})`;
    isRepeatedIncident = true;
    reasons.push(`Chronic recurring defect (${repeatedCount} repeat tickets in this zone)`);
  } else if (repeatedCount === 1) {
    escalationScore = 3;
    escalationReason = `Repeated issue in this location`;
  } else {
    escalationScore = 1;
  }

  const rawTotal =
    safetyScore +
    severityScore +
    peopleScore +
    facilityScore +
    disruptionScore +
    waitingScore +
    escalationScore;

  const totalScore = Math.min(100, Math.max(5, Math.round(rawTotal)));

  let tier: PriorityTier = 'LOW';
  if (totalScore >= 80) {
    tier = 'CRITICAL';
  } else if (totalScore >= 60) {
    tier = 'HIGH';
  } else if (totalScore >= 40) {
    tier = 'MEDIUM';
  } else {
    tier = 'LOW';
  }

  const recommendedActions: string[] = [];
  if (tier === 'CRITICAL') {
    recommendedActions.push('Dispatch on-call lead specialist engineer within 15 minutes.');
    recommendedActions.push('Notify Building Administrator and secure affected perimeter.');
    recommendedActions.push('Verify emergency inventory spare availability.');
  } else if (tier === 'HIGH') {
    recommendedActions.push('Schedule same-day dispatch and issue work order.');
    recommendedActions.push('Alert department coordinator of potential localized disruption.');
  } else if (tier === 'MEDIUM') {
    recommendedActions.push('Queue for standard maintenance rotation within next 24-48 hours.');
  } else {
    recommendedActions.push('Consolidate with routine preventive maintenance sweep.');
  }

  const deptMap: Record<string, string> = {
    Electrical: 'Power Systems & Substation Engineering',
    HVAC: 'Mechanical & Climate Control Group',
    Plumbing: 'Campus Utilities & Water Treatment',
    'IT / Network': 'Computing Services & Network Operations',
    Safety: 'Campus Security & Life Safety Operations',
    Sanitation: 'Environmental Services & Housekeeping',
  };

  return {
    totalScore,
    tier,
    reasons: reasons.length > 0 ? reasons : ['Standard priority operational ticket'],
    factors: {
      safetyRisk: { score: safetyScore, max: 30, weightPct: 30, reason: safetyReason },
      severity: { score: severityScore, max: 20, weightPct: 20, reason: severityReason },
      peopleAffected: { score: peopleScore, max: 15, weightPct: 15, reason: peopleReason },
      facilityCriticality: { score: facilityScore, max: 15, weightPct: 15, reason: facilityReason },
      operationalDisruption: { score: disruptionScore, max: 10, weightPct: 10, reason: disruptionReason },
      waitingTime: { score: waitingScore, max: 5, weightPct: 5, reason: waitingReason },
      escalationHistory: { score: escalationScore, max: 5, weightPct: 5, reason: escalationReason },
    },
    affectedSummary: {
      peopleCount: count,
      facilityName: incident.room ? `${incident.buildingId} (${incident.room})` : incident.buildingId,
      criticalityTier: facilityEval.tier,
    },
    recommendedActions,
    suggestedDepartment: deptMap[incident.category] || 'General Maintenance',
    escalationRecommendation:
      tier === 'CRITICAL'
        ? 'Immediate escalation to Chief Operations Officer & Facilities Director'
        : 'Supervised at Engineering Lead level',
    isOverdue,
    isRepeatedIncident,
    confidenceScore: 0.98,
  };
}

export function rankIncidentsClient(incidents: IncidentEvaluationInput[]): ClientRankedIncident[] {
  const evaluated: ClientRankedIncident[] = incidents.map((inc) => {
    const explanation = evaluateIncidentPriority(inc, incidents);
    return {
      ...inc,
      priorityScore: explanation.totalScore,
      priorityTier: explanation.tier,
      rank: 0,
      explanation,
      priorityAnalysis: explanation,
    };
  });

  evaluated.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  evaluated.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return evaluated;
}

