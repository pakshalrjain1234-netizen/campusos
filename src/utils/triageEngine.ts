import { 
  IncidentCategory, 
  IncidentSeverity, 
  SafetyRiskLevel, 
  DisruptionLevel, 
  TriageDetails 
} from '../types';

export interface TriageInput {
  category: IncidentCategory;
  severity: IncidentSeverity;
  safetyRisk?: SafetyRiskLevel;
  disruptionLevel?: DisruptionLevel;
  peopleAffected?: number;
  buildingId: string;
  room?: string;
  title: string;
  description: string;
}

const CRITICAL_KEYWORDS = [
  'fire', 'smoke', 'gas leak', 'spark', 'explosion', 'flood', 'seepage',
  'high voltage', 'server down', 'blackout', 'chiller failure', 'hazard', 'toxic'
];

/**
 * Facility Criticality Classifier
 */
export function getFacilityCriticality(buildingId: string, room?: string): 'critical' | 'high' | 'medium' | 'standard' {
  const roomLower = (room || '').toLowerCase();
  if (
    roomLower.includes('server') || 
    roomLower.includes('substation') || 
    roomLower.includes('data center') ||
    roomLower.includes('chemical') ||
    roomLower.includes('archives')
  ) {
    return 'critical';
  }
  if (buildingId === 'it-block' || buildingId === 'mechanical-block') {
    return 'high';
  }
  if (buildingId === 'main-block' || buildingId === 'central-library') {
    return 'medium';
  }
  return 'standard';
}

/**
 * Deterministic multi-factor incident triage algorithm
 */
export function calculateTriageScore(input: TriageInput): TriageDetails {
  const safetyRisk = input.safetyRisk || 'low';
  const disruptionLevel = input.disruptionLevel || 'none';
  const peopleAffected = input.peopleAffected || 1;
  const facilityCriticality = getFacilityCriticality(input.buildingId, input.room);

  // 1. Base Severity Weight (up to 40 pts)
  let severityScore = 8;
  if (input.severity === 'critical') severityScore = 40;
  else if (input.severity === 'high') severityScore = 28;
  else if (input.severity === 'medium') severityScore = 18;

  // 2. Safety Risk Score (up to 25 pts)
  let safetyScore = 2;
  if (safetyRisk === 'hazardous') safetyScore = 25;
  else if (safetyRisk === 'high') safetyScore = 18;
  else if (safetyRisk === 'medium') safetyScore = 10;

  // 3. Operational Disruption Score (up to 15 pts)
  let disruptionScore = 0;
  if (disruptionLevel === 'severe') disruptionScore = 15;
  else if (disruptionLevel === 'moderate') disruptionScore = 10;
  else if (disruptionLevel === 'minor') disruptionScore = 5;

  // 4. People Impact Score (up to 10 pts)
  let peopleScore = 1;
  if (peopleAffected >= 100) peopleScore = 10;
  else if (peopleAffected >= 25) peopleScore = 7;
  else if (peopleAffected >= 5) peopleScore = 4;

  // 5. Facility Criticality Score (up to 10 pts)
  let facilityScore = 2;
  if (facilityCriticality === 'critical') facilityScore = 10;
  else if (facilityCriticality === 'high') facilityScore = 7;
  else if (facilityCriticality === 'medium') facilityScore = 4;

  // Keyword urgency boost (+5 if keyword matches emergency situations)
  const fullText = `${input.title} ${input.description}`.toLowerCase();
  const matchedKeywords = CRITICAL_KEYWORDS.filter((kw) => fullText.includes(kw));
  const keywordBoost = matchedKeywords.length > 0 ? 5 : 0;

  const rawScore = Math.min(100, severityScore + safetyScore + disruptionScore + peopleScore + facilityScore + keywordBoost);

  // Determine computed priority level
  let priority: IncidentSeverity = 'low';
  let ackTargetMinutes = 480; // 8 hours
  let resolutionTargetHours = 72; // 3 days

  if (rawScore >= 75 || safetyRisk === 'hazardous') {
    priority = 'critical';
    ackTargetMinutes = 15; // 15 mins
    resolutionTargetHours = 2; // 2 hrs
  } else if (rawScore >= 55) {
    priority = 'high';
    ackTargetMinutes = 60; // 1 hour
    resolutionTargetHours = 8; // 8 hrs
  } else if (rawScore >= 30) {
    priority = 'medium';
    ackTargetMinutes = 240; // 4 hrs
    resolutionTargetHours = 24; // 24 hrs
  }

  // Construct readable explanation
  const reasons: string[] = [];
  if (safetyScore >= 18) reasons.push(`Elevated safety risk: ${safetyRisk}`);
  if (disruptionScore >= 10) reasons.push(`High disruption level: ${disruptionLevel}`);
  if (peopleScore >= 7) reasons.push(`Broad community impact (${peopleAffected} people)`);
  if (facilityCriticality === 'critical') reasons.push(`Critical zone (${input.room || input.buildingId})`);
  if (matchedKeywords.length > 0) reasons.push(`Urgent keywords detected: [${matchedKeywords.slice(0, 2).join(', ')}]`);
  if (reasons.length === 0) reasons.push(`Standard baseline for ${input.category} routine issue`);

  const reason = reasons.join(' · ');

  return {
    score: rawScore,
    priority,
    reason,
    safetyRisk,
    disruptionLevel,
    peopleAffected,
    facilityCriticality,
    ackTargetMinutes,
    resolutionTargetHours,
    calculatedAt: new Date().toISOString(),
    isAiEnhanced: false,
  };
}

/**
 * AI-Ready Triage Inference Wrapper
 * Returns deterministic score with transparent AI metadata.
 * Ready to hook into Gemini 2.0 Flash when API keys are enabled.
 */
export async function evaluateWithAIReadiness(input: TriageInput): Promise<TriageDetails> {
  // Deterministic local computation ensures 100% offline uptime & predictable safety
  const baseTriage = calculateTriageScore(input);

  // When live Gemini API is configured in the environment:
  // Can be plugged directly here without breaking the interface
  return {
    ...baseTriage,
    isAiEnhanced: false, // Transparent label: rule-based engine active
  };
}

/**
 * Helper to check SLA compliance given incident timestamps
 */
export function checkSlaStatus(
  createdAtIso: string,
  ackMinutesTarget: number,
  acknowledgedAtIso?: string
): { isBreached: boolean; remainingMinutes: number; badgeColor: string; label: string } {
  const createdTime = new Date(createdAtIso).getTime();
  const now = Date.now();
  const targetMs = createdTime + ackMinutesTarget * 60 * 1000;

  if (acknowledgedAtIso) {
    const ackTime = new Date(acknowledgedAtIso).getTime();
    const wasBreached = ackTime > targetMs;
    return {
      isBreached: wasBreached,
      remainingMinutes: 0,
      badgeColor: wasBreached ? '#F8DCE8' : '#D5F3E8',
      label: wasBreached ? 'Ack SLA Breached' : 'Ack Within SLA',
    };
  }

  const remainingMinutes = Math.round((targetMs - now) / (60 * 1000));
  if (remainingMinutes < 0) {
    return {
      isBreached: true,
      remainingMinutes,
      badgeColor: '#F8DCE8',
      label: `Overdue by ${Math.abs(remainingMinutes)}m`,
    };
  } else if (remainingMinutes <= 30) {
    return {
      isBreached: false,
      remainingMinutes,
      badgeColor: '#FFE4CF',
      label: `${remainingMinutes}m remaining`,
    };
  }
  return {
    isBreached: false,
    remainingMinutes,
    badgeColor: '#D5F3E8',
    label: `${remainingMinutes}m remaining`,
  };
}

