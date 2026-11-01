import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import app from '../index';
import {
  resolveBuildingCode,
  THREE_BUILDING_COORDINATES,
  parseFloorLevel,
  getFloorsForBuilding,
} from '../../src/utils/campus3dMapping';
import { evaluateIncidentPriority, IncidentEvaluationInput } from '../services/priorityEngine';
import { CAMPUS_ASSETS_REGISTRY } from '../../src/data/assetMappingData';
import {
  resolveIncidentLocalization,
  TEMPORARY_DEMO_ROOM_MAPPINGS,
  createDemo3DIncidents,
} from '../../src/utils/incidentRoomLocalization';

describe('CampusOps 3D Incident & Building-Level Issue Mapping Test Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  it('Setup: Spins up test server', async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
    assert.ok(baseUrl, 'Server URL should be initialized');
  });

  it('1. Asset Registry Integrity: Verified campus assets with coordinates and history', () => {
    assert.ok(CAMPUS_ASSETS_REGISTRY.length >= 8, 'Asset registry should have multiple mapped assets');

    const fan02 = CAMPUS_ASSETS_REGISTRY.find((a) => a.id === 'asset-acb-201-fan-02');
    assert.ok(fan02, 'Ceiling Fan 02 should exist in registry');
    assert.strictEqual(fan02?.room, 'Room 201');
    assert.strictEqual(fan02?.buildingName, 'Academic Block');
    assert.ok(fan02?.annotationCoordinates, 'Fan 02 should have photo annotation coordinates');
    assert.strictEqual(typeof fan02?.annotationCoordinates.x, 'number');
    assert.strictEqual(typeof fan02?.annotationCoordinates.y, 'number');
    assert.ok(fan02?.maintenanceHistory && fan02.maintenanceHistory.length > 0, 'Fan 02 should have maintenance history');
  });

  it('2. 3D Coordinates & Building Code Resolution for All 14 Facilities', () => {
    const testCases: [string, string][] = [
      ['it-block', 'ITB'],
      ['ITB', 'ITB'],
      ['a9', 'ITB'],
      ['academic-block', 'ACB'],
      ['a1', 'ACB'],
      ['central-library', 'LIB'],
      ['workshop', 'WSH'],
      ['hostel', 'HST'],
      ['admin-block', 'ADM'],
      ['science-block', 'SCB'],
      ['cafeteria', 'CAF'],
      ['health-centre', 'HEC'],
      ['mess', 'MES'],
      ['sports-ground', 'SPG'],
      ['parking', 'PRK'],
    ];

    for (const [input, expectedCode] of testCases) {
      const resolved = resolveBuildingCode(input);
      assert.strictEqual(resolved, expectedCode, `Failed to resolve ${input} to ${expectedCode}`);
      const coords = THREE_BUILDING_COORDINATES[resolved];
      assert.ok(coords, `Missing 3D coordinates for ${resolved}`);
      assert.strictEqual(coords.center.length, 3, `Invalid center coordinates length for ${resolved}`);
      assert.ok(coords.roofY > 0, `Roof height must be positive for ${resolved}`);
    }
  });

  it('3. Floor Parsing and Layout Definitions', () => {
    assert.strictEqual(parseFloorLevel('Ground Floor'), 0);
    assert.strictEqual(parseFloorLevel('Floor 1'), 1);
    assert.strictEqual(parseFloorLevel('Room 201'), 2);
    assert.strictEqual(parseFloorLevel('Floor 3 Seminar Hall'), 3);
    assert.strictEqual(parseFloorLevel('Basement Archives'), -1);

    const acbFloors = getFloorsForBuilding('ACB');
    assert.ok(acbFloors.length >= 4, 'Academic Block should have at least 4 floors');
    assert.ok(acbFloors.some((f: any) => f.rooms.includes('Room 201')), 'Academic Block Floor 2 should include Room 201');
  });

  it('4. API: Report Incident with Full Physical Asset & Coordinate Mapping', async () => {
    const payload = {
      title: 'Ceiling Fan 02 Wobble and Motor Noise',
      description: 'Loud bearing squeal and visible wobble during morning lecture in Room 201.',
      buildingId: 'A1',
      buildingName: 'Academic Block',
      floor: 'Floor 2',
      room: 'Room 201',
      category: 'HVAC',
      severity: 'high',
      reportedBy: 'Prof. Ramesh Sharma',
      reportedRole: 'faculty',
      assetId: 'asset-acb-201-fan-02',
      assetName: 'Ceiling Fan 02',
      assetCategory: 'HVAC / Ventilation',
      annotationCoordinates: { x: 58.4, y: 24.2 },
      mappedLocationLevel: 'asset',
    };

    const res = await fetch(`${baseUrl}/api/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-token-coo',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201, 'Should return 201 Created');
    assert.strictEqual(data.success, true);
    assert.ok(data.incident, 'Incident must be returned');
    assert.strictEqual(data.incident.assetId, 'asset-acb-201-fan-02');
    assert.strictEqual(data.incident.assetName, 'Ceiling Fan 02');
    assert.strictEqual(data.incident.mappedLocationLevel, 'asset');
    assert.deepStrictEqual(data.incident.annotationCoordinates, { x: 58.4, y: 24.2 });
    assert.ok(data.incident.ticketNumber, 'Ticket number must be generated');
  });

  it('5. API: Report Incident with Unmapped/General Room Issue Gracefully Falls Back', async () => {
    const payload = {
      title: 'Water Leak near Classroom 102 entrance',
      description: 'Puddle forming near doorway from pipe overhead.',
      buildingId: 'A1',
      buildingName: 'Academic Block',
      floor: 'Ground Floor',
      room: 'Interactive Classroom 102',
      category: 'Plumbing',
      severity: 'medium',
      reportedBy: 'Kavita Nair',
      reportedRole: 'staff',
      mappedLocationLevel: 'room',
    };

    const res = await fetch(`${baseUrl}/api/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-token-coo',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(data.incident.mappedLocationLevel, 'room');
    assert.strictEqual(data.incident.assetId, undefined);
    assert.strictEqual(data.incident.room, 'Interactive Classroom 102');
  });

  it('6. Priority Engine: Deterministic 7-Factor Score Drives 3D Marker Styling', () => {
    const criticalIncident: IncidentEvaluationInput = {
      id: 'test-crit-1',
      ticketNumber: 'INC-CRIT',
      title: 'Transformer Sparking and Toxic Smoke in Substation',
      description: 'Major electrical arcing observed near main feeder.',
      category: 'Electrical',
      severity: 'critical',
      safetyRisk: 'hazardous',
      disruptionLevel: 'severe',
      peopleAffected: 300,
      buildingId: 'WSH',
      buildingName: 'Workshop & Mechanical Systems',
      room: 'Substation B Switchgear',
      createdAt: new Date().toISOString(),
    };

    const critResult = evaluateIncidentPriority(criticalIncident, [criticalIncident]);
    assert.ok(critResult.totalScore >= 75, `Critical incident should score >= 75, got ${critResult.totalScore}`);
    assert.strictEqual(critResult.tier, 'CRITICAL');

    const lowIncident: IncidentEvaluationInput = {
      id: 'test-low-1',
      ticketNumber: 'INC-LOW',
      title: 'Loose door hinge in storage room',
      description: 'Hinge squeaks slightly upon opening.',
      category: 'Carpentry',
      severity: 'low',
      safetyRisk: 'low',
      disruptionLevel: 'none',
      peopleAffected: 1,
      buildingId: 'ADM',
      buildingName: 'Administration Block',
      room: 'Storage 01',
      createdAt: new Date().toISOString(),
    };

    const lowResult = evaluateIncidentPriority(lowIncident, [lowIncident]);
    assert.ok(lowResult.totalScore < 45, `Low incident should score < 45, got ${lowResult.totalScore}`);
    assert.strictEqual(lowResult.tier, 'LOW');
  });

  it('7. Incident Lifecycle: Status Transition and Querying for 3D View', async () => {
    // Fetch all incidents
    const res = await fetch(`${baseUrl}/api/incidents`, {
      headers: { Authorization: 'Bearer demo-token-coo' },
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(data.incidents));

    // Find the created Fan 02 incident
    const fanInc = data.incidents.find((i: any) => i.assetId === 'asset-acb-201-fan-02');
    assert.ok(fanInc, 'Should find Fan 02 incident');

    // Transition status to in_progress via authorized state machine
    const patchRes = await fetch(`${baseUrl}/api/incidents/${fanInc.id}/transition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer demo-token-coo',
      },
      body: JSON.stringify({
        targetStatus: 'in_progress',
        remarks: 'Technician dispatched with replacement bearing',
      }),
    });

    const patchData = await patchRes.json();
    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchData.newStatus, 'in_progress');
    assert.strictEqual(patchData.incident.lifecycleStatus, 'in_progress');
  });

  it('8. Temporary Demo Room Mapping & Localization Integrity', () => {
    // INC-001 -> Floor 1 -> Room A-102 -> Electrical issue
    const inc1 = resolveIncidentLocalization({ ticketNumber: 'INC-001' } as any);
    assert.ok(inc1);
    assert.strictEqual(inc1?.buildingCode, 'ADM');
    assert.strictEqual(inc1?.floorLevel, 1);
    assert.strictEqual(inc1?.room, 'Room A-102');
    assert.strictEqual(inc1?.issueDescription, 'Electrical issue');
    assert.strictEqual(inc1?.hasExactRoom, true);

    // INC-002 -> Floor 2 -> Room A-204 -> HVAC issue
    const inc2 = resolveIncidentLocalization({ ticketNumber: 'INC-002' } as any);
    assert.ok(inc2);
    assert.strictEqual(inc2?.buildingCode, 'ADM');
    assert.strictEqual(inc2?.floorLevel, 2);
    assert.strictEqual(inc2?.room, 'Room A-204');
    assert.strictEqual(inc2?.issueDescription, 'HVAC issue');
    assert.strictEqual(inc2?.hasExactRoom, true);

    // INC-003 -> Floor 3 -> Room A-305 -> Water leakage
    const inc3 = resolveIncidentLocalization({ ticketNumber: 'INC-003' } as any);
    assert.ok(inc3);
    assert.strictEqual(inc3?.buildingCode, 'ADM');
    assert.strictEqual(inc3?.floorLevel, 3);
    assert.strictEqual(inc3?.room, 'Room A-305');
    assert.strictEqual(inc3?.issueDescription, 'Water leakage');
    assert.strictEqual(inc3?.hasExactRoom, true);
  });

  it('9. Unknown Room Fallback: Never invents fake room for real incidents', () => {
    const unmappedIncident = {
      id: 'real-inc-exterior-1',
      ticketNumber: 'INC-999',
      buildingId: 'ADM',
      room: '',
      floor: '',
    };
    const loc = resolveIncidentLocalization(unmappedIncident as any);
    assert.ok(loc);
    assert.strictEqual(loc?.buildingCode, 'ADM');
    assert.strictEqual(loc?.room, null);
    assert.strictEqual(loc?.hasExactRoom, false);
  });

  it('10. Building Floor Registry: Administrative Block has 4 mapped floors with specified rooms', () => {
    const admFloors = getFloorsForBuilding('ADM');
    assert.strictEqual(admFloors.length, 4);

    const f1 = admFloors.find((f) => f.floorLevel === 1);
    assert.ok(f1?.rooms.includes('Room A-102'), 'Floor 1 must contain Room A-102');

    const f2 = admFloors.find((f) => f.floorLevel === 2);
    assert.ok(f2?.rooms.includes('Room A-204'), 'Floor 2 must contain Room A-204');

    const f3 = admFloors.find((f) => f.floorLevel === 3);
    assert.ok(f3?.rooms.includes('Room A-305'), 'Floor 3 must contain Room A-305');
  });

  it('11. Active vs Resolved Counting: Resolved incidents strictly excluded from indicator count', () => {
    const demoIncs = createDemo3DIncidents();
    // 3 active incidents in Administrative Block (INC-001, INC-002, INC-003) + 1 unmapped exterior (INC-004)
    const activeIncs = demoIncs.filter((i) => i.status !== 'resolved' && i.lifecycleStatus !== 'resolved');
    assert.strictEqual(activeIncs.length, 4);

    // When INC-001 is marked resolved
    const updated = demoIncs.map((i) => (i.ticketNumber === 'INC-001' ? { ...i, status: 'resolved', lifecycleStatus: 'resolved' } : i));
    const activeUpdated = updated.filter((i) => i.status !== 'resolved' && i.lifecycleStatus !== 'resolved');
    assert.strictEqual(activeUpdated.length, 3, 'Resolved incident must be excluded from active count');
  });

  it('Teardown: Closes test server', async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });
});

