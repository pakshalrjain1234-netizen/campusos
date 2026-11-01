import { Building, Incident } from '../types';

const CLOSED_INCIDENT_STATUSES = new Set(['resolved', 'closed', 'cancelled']);

function normalizeBuildingKey(value?: string | null): string {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function getActiveBuildingIncidents(building: Building, incidents: Incident[]): Incident[] {
  const buildingKeys = new Set(
    [building.id, building.code, building.name, building.shortName, ...(building.aliases || [])]
      .map(normalizeBuildingKey)
      .filter(Boolean)
  );

  return incidents.filter((incident) => {
    if (CLOSED_INCIDENT_STATUSES.has(String(incident.status || '').toLowerCase())) return false;
    if (incident.lifecycleStatus && CLOSED_INCIDENT_STATUSES.has(String(incident.lifecycleStatus).toLowerCase())) return false;

    const incidentKeys = [incident.buildingId, incident.buildingName, incident.building]
      .map(normalizeBuildingKey)
      .filter(Boolean);
    return incidentKeys.some((key) => buildingKeys.has(key));
  });
}

/** Health is based on current active incidents: 100 for clear, minus 6 per issue. */
export function calculateBuildingHealthScore(building: Building, incidents: Incident[]): number {
  return Math.max(0, 100 - getActiveBuildingIncidents(building, incidents).length * 6);
}
