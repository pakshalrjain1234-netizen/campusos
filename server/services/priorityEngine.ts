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
}

export interface IncidentEvaluationInput {
  id: string;
  ticketNumber: string;
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
  timeline?: any[];
  isSlaBreached?: boolean;
}

export interface RankedIncident extends IncidentEvaluationInput {
  priorityScore: number;
  priorityTier: PriorityTier;
  rank: number;
  explanation: PriorityExplanation;
  priorityAnalysis: PriorityExplanation;
}

/**
 * Determine facility criticality tier based on location attributes
 */
export function evaluateFacilityCriticality(buildingId: string, room?: string): {
  tier: 'critical' | 'high' | 'medium' | 'standard';
  weightScore: number;
  rationale: string;
} {
  const r = (room || '').toLowerCase();
  const b = (buildingId || '').toLowerCase();

  if (r.includes('server') || r.includes('substation') || r.includes('data center') || r.includes('archives')) {
    return {
      tier: 'critical',
      weightScore: 15,
      rationale: 'Core campus infrastructure / High-value archive or computing facility (Tier 1)',
    };
  }
  if (b.includes('it') || b.includes('mechanical') || r.includes('lab') || r.includes('workshop')) {
    return {
      tier: 'high',
      weightScore: 11,
      rationale: 'Active teaching laboratory / Engineering fabrication facility (Tier 2)',
    };
  }
  if (b.includes('main') || b.includes('library') || r.includes('auditorium') || r.includes('seminar')) {
    return {
      tier: 'medium',
      weightScore: 7,
      rationale: 'General academic congregation or multi-purpose hall (Tier 3)',
    };
  }
  return {
    tier: 'standard',
    weightScore: 4,
    rationale: 'Standard classroom or administrative circulation space (Tier 4)',
  };
}

/**
 * Deterministic Multi-Factor Scoring Algorithm (100% Transparent Formula)
 * - Safety risk: 30%
 * - Severity: 20%
 * - People affected: 15%
 * - Facility criticality: 15%
 * - Operational disruption: 10%
 * - Waiting time: 5%
 * - Escalation history: 5%
 */
export function evaluateIncidentPriority(
  incident: IncidentEvaluationInput,
  allIncidents: IncidentEvaluationInput[] = []
): PriorityExplanation {
  const reasons: string[] = [];
  const recommendedActions: string[] = [];

  // 1. Safety Risk (30% weight)
  const safety = incident.safetyRisk || (incident as any).safety_risk || (incident.severity === 'critical' ? 'high' : 'low');
  let safetyScore = 6;
  let safetyReason = 'Negligible physical hazard to occupants';
  if (safety === 'hazardous') {
    safetyScore = 30;
    safetyReason = 'Immediate life-safety or environmental hazard detected (Explosion/Gas/HV Risk)';
    reasons.push('Immediate life-safety hazard flagged');
  } else if (safety === 'high') {
    safetyScore = 23;
    safetyReason = 'Substantial physical risk (live exposed electrical, toxic fluid, structural instability)';
    reasons.push('High physical hazard present on-site');
  } else if (safety === 'medium') {
    safetyScore = 14;
    safetyReason = 'Moderate safety concern; potential slip/trip/thermal injury';
  }

  // 2. Severity (20% weight)
  let severityScore = 4;
  let severityReason = 'Low operational consequence; routine service degradation';
  if (incident.severity === 'critical') {
    severityScore = 20;
    severityReason = 'Critical system outage impacting vital utility or emergency services';
    reasons.push('Primary technical service completely non-operational');
  } else if (incident.severity === 'high') {
    severityScore = 14;
    severityReason = 'Major subsystem malfunction causing active operational impairment';
    reasons.push('Subsystem malfunction degrading operations');
  } else if (incident.severity === 'medium') {
    severityScore = 9;
    severityReason = 'Moderate functional impairment with redundant capacity available';
  }

  // 3. People Affected (15% weight)
  const people = incident.peopleAffected ?? (incident as any).people_affected ?? 1;
  let peopleScore = 3;
  let peopleReason = `${people} occupant directly impacted`;
  if (people >= 100) {
    peopleScore = 15;
    peopleReason = `Mass impact event: Over ${people} campus members impacted`;
    reasons.push(`Mass impact on campus community (>100 occupants affected)`);
  } else if (people >= 30) {
    peopleScore = 11;
    peopleReason = `Cohort impact: ${people} students/faculty in session`;
    reasons.push(`Class cohort impacted (${people} people)`);
  } else if (people >= 8) {
    peopleScore = 7;
    peopleReason = `Small group impact: ${people} occupants`;
  }

  // 4. Facility Criticality (15% weight)
  const effectiveBuilding = incident.buildingId || (incident as any).building_id || '';
  const effectiveRoom = incident.room || (incident as any).room_text || '';
  const facility = evaluateFacilityCriticality(effectiveBuilding, effectiveRoom);
  const facilityScore = facility.weightScore;
  const facilityReason = facility.rationale;
  if (facility.tier === 'critical') {
    reasons.push(`Occurs within mission-critical infrastructure: ${effectiveRoom || effectiveBuilding}`);
  }

  // 5. Operational Disruption (10% weight)
  const disruption = incident.disruptionLevel || (incident as any).disruption_level || (incident.severity === 'critical' ? 'severe' : 'none');
  let disruptionScore = 2;
  let disruptionReason = 'Minimal operational interruption';
  if (disruption === 'severe') {
    disruptionScore = 10;
    disruptionReason = 'Total halt of academic examinations, research operations, or faculty events';
    reasons.push('Severe operational halt to campus schedule');
  } else if (disruption === 'moderate') {
    disruptionScore = 7;
    disruptionReason = 'Partial disruption requiring alternate routing or room relocation';
    reasons.push('Requires facility re-allocation / relocation');
  } else if (disruption === 'minor') {
    disruptionScore = 4;
    disruptionReason = 'Minor inconvenience without schedule cancellation';
  }

  // 6. Waiting Time / SLA Breached (5% weight)
  const rawCreated = incident.createdAt || (incident as any).created_at;
  const createdMs = typeof rawCreated === 'number' ? rawCreated : new Date(rawCreated).getTime();
  const waitHours = Math.max(0, (Date.now() - (isNaN(createdMs) ? Date.now() : createdMs)) / 3600000);
  let waitScore = 1;
  let waitReason = `Elapsed time: ${waitHours < 1 ? `${Math.round(waitHours * 60)}m` : `${waitHours.toFixed(1)}h`}`;
  const isOverdue = Boolean(incident.isSlaBreached || (incident as any).is_sla_breached || waitHours >= 4);

  if (waitHours >= 12 || incident.isSlaBreached) {
    waitScore = 5;
    waitReason = `Severely overdue (${waitHours.toFixed(1)}h elapsed). Target SLA breached.`;
    reasons.push('Target SLA response window breached');
  } else if (waitHours >= 3) {
    waitScore = 3;
    waitReason = `Substantial wait time (${waitHours.toFixed(1)}h elapsed without complete resolution).`;
  }

  // 7. Escalation History & Repeated Incidents (5% weight)
  const sameLocationIncidents = allIncidents.filter((other) => {
    if (other.id === incident.id) return false;
    const otherBldg = other.buildingId || (other as any).building_id;
    const otherRoom = other.room || (other as any).room_text;
    return otherBldg === effectiveBuilding && (otherRoom && effectiveRoom ? otherRoom.toLowerCase() === effectiveRoom.toLowerCase() : true);
  });
  const isRepeatedIncident = sameLocationIncidents.length >= 1;
  let escalationScore = 1;
  let escalationReason = 'First reported occurrence in this quadrant';

  if (sameLocationIncidents.length >= 3) {
    escalationScore = 5;
    escalationReason = `Chronic recurring issue: ${sameLocationIncidents.length} previous tickets logged at this location`;
    reasons.push(`Chronic recurring problem: ${sameLocationIncidents.length} related complaints on record`);
  } else if (sameLocationIncidents.length >= 1) {
    escalationScore = 3;
    escalationReason = `Repeat incident: ${sameLocationIncidents.length} prior ticket logged at same venue`;
    reasons.push(`Repeat incident at ${effectiveRoom || effectiveBuilding}`);
  }

  // Calculate Total Score (Range 0 - 100)
  const totalScore = Math.min(100, Math.round(
    safetyScore + severityScore + peopleScore + facilityScore + disruptionScore + waitScore + escalationScore
  ));

  // Determine Priority Tier
  let tier: PriorityTier = 'LOW';
  if (totalScore >= 80) tier = 'CRITICAL';
  else if (totalScore >= 60) tier = 'HIGH';
  else if (totalScore >= 40) tier = 'MEDIUM';

  // Determine Responsible Department & Dispatch Team
  let suggestedDepartment = 'Campus Operations & General Civil Works';
  const cat = (incident.category || '').toLowerCase();
  if (cat.includes('electric') || cat.includes('power')) {
    suggestedDepartment = 'Electrical Systems & Substation Operations';
  } else if (cat.includes('hvac') || cat.includes('ac') || cat.includes('air')) {
    suggestedDepartment = 'Mechanical & HVAC Engineering Division';
  } else if (cat.includes('plumb') || cat.includes('water')) {
    suggestedDepartment = 'Water Works & Sanitation Maintenance Team';
  } else if (cat.includes('it') || cat.includes('net') || cat.includes('cable')) {
    suggestedDepartment = 'Computing Infrastructure & Network Operations';
  } else if (cat.includes('safe') || cat.includes('fire')) {
    suggestedDepartment = 'Campus Security & Fire Safety Office';
  }

  // Determine Action Recommendations
  if (tier === 'CRITICAL') {
    recommendedActions.push('Immediately cordon off affected location to prevent pedestrian/student access.');
    recommendedActions.push(`Dispatch ${suggestedDepartment} on an emergency priority code.`);
    recommendedActions.push('Notify COO & Director of Facilities via emergency broadcast.');
    recommendedActions.push('If rooms are occupied or booked, trigger automated exam/class relocation.');
  } else if (tier === 'HIGH') {
    recommendedActions.push(`Issue work order to ${suggestedDepartment} with a 2-hour SLA response target.`);
    recommendedActions.push('Verify spare parts availability in Central Inventory.');
    recommendedActions.push('Notify room occupants and course faculty of scheduled maintenance.');
  } else if (tier === 'MEDIUM') {
    recommendedActions.push(`Schedule repair during the next available building maintenance window.`);
    recommendedActions.push('Queue part requisition in Approvals if inventory is low.');
  } else {
    recommendedActions.push('Log complaint and consolidate into weekly facilities sweep.');
  }

  // Escalation recommendation
  let escalationRecommendation = 'Routine dispatch to assigned facility supervisor.';
  if (tier === 'CRITICAL') {
    escalationRecommendation = 'Immediate high-priority escalation to Chief Operations Officer (COO).';
  } else if (tier === 'HIGH') {
    escalationRecommendation = 'Escalated to Director of Facilities Engineering for sign-off.';
  }

  const factors: PriorityFactorBreakdown = {
    safetyRisk: { score: safetyScore, max: 30, weightPct: 30, reason: safetyReason },
    severity: { score: severityScore, max: 20, weightPct: 20, reason: severityReason },
    peopleAffected: { score: peopleScore, max: 15, weightPct: 15, reason: peopleReason },
    facilityCriticality: { score: facilityScore, max: 15, weightPct: 15, reason: facilityReason },
    operationalDisruption: { score: disruptionScore, max: 10, weightPct: 10, reason: disruptionReason },
    waitingTime: { score: waitScore, max: 5, weightPct: 5, reason: waitReason },
    escalationHistory: { score: escalationScore, max: 5, weightPct: 5, reason: escalationReason },
  };

  return {
    totalScore,
    tier,
    reasons: reasons.length > 0 ? reasons : ['Routine maintenance requirement with standard risk profile'],
    factors,
    affectedSummary: {
      peopleCount: people,
      facilityName: incident.room ? `${incident.room} (${incident.buildingName || incident.buildingId})` : (incident.buildingName || incident.buildingId),
      criticalityTier: facility.tier,
    },
    recommendedActions,
    suggestedDepartment,
    escalationRecommendation,
    isOverdue,
    isRepeatedIncident,
    confidenceScore: 98,
  };
}

/**
 * Rank an entire incident dataset by calculated multi-factor score
 */
export function rankIncidents(incidents: IncidentEvaluationInput[]): RankedIncident[] {
  const evaluated: RankedIncident[] = incidents.map((inc) => {
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

  // Sort descending by priorityScore, break ties by waiting time
  evaluated.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return aTime - bTime;
  });

  // Assign sequential 1-based ranks
  evaluated.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return evaluated;
}
