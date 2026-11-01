import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../types';
import { authenticateToken, normalizeServerRole } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const incidentsRouter = Router();

const serverSupabase = config.isConfigured
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey)
  : null;

const IncidentCategoryEnum = z.enum([
  'Electrical',
  'Plumbing',
  'HVAC',
  'Structural',
  'IT / Network',
  'Safety',
  'Sanitation',
  'Pest Control',
  'Furniture & Fixtures',
  'Landscaping',
  'General',
]);

const CreateIncidentSchema = z.object({
  title: z.string().min(5).max(180),
  description: z.string().min(10),
  category: IncidentCategoryEnum,
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  safetyRisk: z.enum(['low', 'medium', 'high', 'hazardous']).optional(),
  disruptionLevel: z.enum(['none', 'minor', 'moderate', 'severe']).optional(),
  peopleAffected: z.number().min(1).max(5000).optional(),
  evidenceUrls: z.array(z.string().url().max(1_300_000)).max(8).optional(),
  buildingId: z.string(),
  floor: z.string().optional(),
  room: z.string().optional(),
  roomText: z.string().optional(),
  assetId: z.string().optional(),
  assetName: z.string().optional(),
  assetCategory: z.string().optional(),
  annotationCoordinates: z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100) }).optional(),
  mappedLocationLevel: z.enum(['building', 'floor', 'room', 'asset']).optional(),
});

const StatusTransitionSchema = z.object({
  targetStatus: z.enum([
    'reported',
    'triaged',
    'assigned',
    'acknowledged',
    'in_progress',
    'resolved',
    'closed',
    'cancelled',
  ]),
  remarks: z.string().optional(),
  assigneeId: z.string().optional(),
  assigneeName: z.string().optional(),
});

export interface DemoIncident {
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
  floor?: string;
  room?: string;
  status: 'open' | 'triaged' | 'assigned' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  lifecycleStatus?: string;
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  department?: string;
  assigneeId?: string;
  assigneeName?: string;
  assignedTo?: string;
  createdAt: string;
  evidenceUrls?: string[];
  isSlaBreached?: boolean;
  assetId?: string;
  assetName?: string;
  assetCategory?: string;
  annotationCoordinates?: { x: number; y: number };
  mappedLocationLevel?: 'building' | 'floor' | 'room' | 'asset';
}

export const DEMO_INCIDENTS_STORE: DemoIncident[] = [
  {
    id: 'inc-001',
    ticketNumber: 'INC-2401',
    title: 'HVAC Chilled Water Loop Low Pressure in IT Block 4th Fl',
    description: 'Compressor cycling irregularly due to pressure drop in supply header. Server lab ambient temp rising to 26°C.',
    buildingId: 'A9',
    buildingName: 'IT Block',
    floor: 'Floor 4',
    room: 'Server Annex 401',
    category: 'HVAC',
    severity: 'critical',
    safetyRisk: 'high',
    disruptionLevel: 'severe',
    peopleAffected: 350,
    status: 'in_progress',
    lifecycleStatus: 'in_progress',
    reporterId: 'demo-liaison-004',
    reporterName: 'Kavitha Raman',
    reporterRole: 'liaison',
    assigneeId: 'demo-engineer-003',
    assigneeName: 'Vikram Sundaram',
    assignedTo: 'Vikram Sundaram',
    createdAt: new Date(Date.now() - 42 * 60000).toISOString(),
    isSlaBreached: false,
    evidenceUrls: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'],
    assetId: 'asset-itb-401-hvac-01',
    assetName: 'Belimo 24V Modulating Actuator Loop #4',
    assetCategory: 'HVAC Machinery',
    annotationCoordinates: { x: 53.2, y: 46.5 },
    mappedLocationLevel: 'asset',
  },
  {
    id: 'inc-002',
    ticketNumber: 'INC-2402',
    title: 'Substation B Phase Voltage Fluctuation',
    description: 'Phase B voltage dropping below 208V during heavy machine shop load cycle. Potential equipment trip risk.',
    buildingId: 'A11',
    buildingName: 'Workshop & Mechanical Systems',
    floor: 'Ground Floor',
    room: 'Heavy Machinery Lab',
    category: 'Electrical',
    severity: 'high',
    safetyRisk: 'high',
    disruptionLevel: 'moderate',
    peopleAffected: 65,
    status: 'in_progress',
    lifecycleStatus: 'assigned',
    reporterId: 'demo-liaison-004',
    reporterName: 'Prof. S. Natarajan',
    reporterRole: 'liaison',
    assigneeId: 'demo-engineer-002',
    assigneeName: 'Arun Karthik',
    assignedTo: 'Arun Karthik',
    createdAt: new Date(Date.now() - 75 * 60000).toISOString(),
    isSlaBreached: false,
    evidenceUrls: [],
    assetId: 'asset-wsh-substation-b',
    assetName: 'Substation B Phase Voltage Stabilizer',
    assetCategory: 'Electrical Switchgear',
    annotationCoordinates: { x: 61.5, y: 39.2 },
    mappedLocationLevel: 'asset',
  },
  {
    id: 'inc-003',
    ticketNumber: 'INC-2403',
    title: 'Water Seepage Detected in Central Library Archives Room',
    description: 'Minor drip noticed near historical manuscript collection shelf 4C after morning garden sprinkler cycle.',
    buildingId: 'A4',
    buildingName: 'Central Library',
    floor: 'Basement',
    room: 'Archives Special Collection',
    category: 'Plumbing',
    severity: 'high',
    safetyRisk: 'medium',
    disruptionLevel: 'moderate',
    peopleAffected: 20,
    status: 'open',
    lifecycleStatus: 'triaged',
    reporterId: 'demo-liaison-004',
    reporterName: 'Priya Narayanan',
    reporterRole: 'liaison',
    createdAt: new Date(Date.now() - 130 * 60000).toISOString(),
    isSlaBreached: true,
    evidenceUrls: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'],
    assetId: 'asset-lib-archives-valve-02',
    assetName: 'Water Riser Isolation Valve 2B',
    assetCategory: 'Plumbing Utilities',
    annotationCoordinates: { x: 42.0, y: 56.4 },
    mappedLocationLevel: 'asset',
  },
  {
    id: 'inc-004',
    ticketNumber: 'INC-2404',
    title: 'Main Auditorium Audio Mixer Ground Loop Noise',
    description: 'Loud 60Hz hum over ceiling speaker arrays ahead of afternoon symposium.',
    buildingId: 'A3',
    buildingName: 'Main Auditorium',
    floor: 'Floor 1',
    room: 'Sri Ramanujam Auditorium',
    category: 'IT / Network',
    severity: 'medium',
    safetyRisk: 'low',
    disruptionLevel: 'moderate',
    peopleAffected: 200,
    status: 'in_progress',
    lifecycleStatus: 'acknowledged',
    reporterId: 'demo-liaison-004',
    reporterName: 'Student Council President',
    reporterRole: 'liaison',
    assigneeId: 'demo-engineer-004',
    assigneeName: 'Dinesh Kumar',
    assignedTo: 'Dinesh Kumar',
    createdAt: new Date(Date.now() - 165 * 60000).toISOString(),
    isSlaBreached: false,
    evidenceUrls: [],
    assetId: 'asset-aud-sound-rack',
    assetName: 'Main Stage Audio Mixer & Ground Isolator Rack',
    assetCategory: 'IT / AV Equipment',
    annotationCoordinates: { x: 47.8, y: 44.0 },
    mappedLocationLevel: 'asset',
  },
  {
    id: 'inc-005',
    ticketNumber: 'INC-2405',
    title: 'Access Control Card Reader Malfunction at Architecture Gate',
    description: 'RFID reader intermittently declining authenticated staff smart cards.',
    buildingId: 'A1',
    buildingName: 'Academic Block',
    floor: 'Ground Floor',
    room: 'South Studio Entry',
    category: 'Safety',
    severity: 'low',
    safetyRisk: 'low',
    disruptionLevel: 'minor',
    peopleAffected: 30,
    status: 'open',
    lifecycleStatus: 'reported',
    reporterId: 'demo-liaison-004',
    reporterName: 'Security Desk',
    reporterRole: 'liaison',
    createdAt: new Date(Date.now() - 210 * 60000).toISOString(),
    isSlaBreached: false,
    evidenceUrls: [],
    mappedLocationLevel: 'building',
  },
];

/**
 * GET /api/incidents
 * Role-scoped retrieval
 */
incidentsRouter.get(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const norm = normalizeServerRole(user.role);

    if (!serverSupabase) {
      let filtered = [...DEMO_INCIDENTS_STORE];
      if (norm === 'student_faculty') {
        filtered = filtered.filter(
          (i) => i.reporterId === user.id || i.reporterName === user.fullName
        );
      } else if (norm === 'technician') {
        filtered = filtered.filter(
          (i) =>
            !i.assigneeId ||
            i.assigneeId === user.id ||
            i.assigneeName === user.fullName ||
            i.status === 'open'
        );
      } else if (norm === 'department_manager') {
        filtered = filtered.filter(
          (i) =>
            i.department === user.departmentName ||
            i.buildingName?.toLowerCase().includes('it') ||
            i.category === 'IT / Network'
        );
      } else if (norm === 'procurement_approver') {
        filtered = filtered.filter((i) => Boolean(i.assetId));
      }

      res.json({
        incidents: filtered,
        total: filtered.length,
        source: 'in_memory_demo',
        role: user.role,
        roleFilterApplied: norm === 'student_faculty' ? 'reporter_only' : 'scoped_view',
      });
      return;
    }

    let query = serverSupabase.from('incidents').select('*');

    // Role-based filtering:
    if (norm === 'student_faculty') {
      query = query.eq('reporter_id', user.id);
    } else if (norm === 'technician') {
      query = query.or(`assignee_id.eq.${user.id},status.eq.open,status.eq.in_progress`);
    } else if (norm === 'department_manager') {
      // incidents has no department_id column. Scope via the reporter profiles
      // belonging to the manager's department, matching the database RBAC policy.
      if (!user.departmentId) {
        res.json({ incidents: [] });
        return;
      }
      const { data: departmentProfiles, error: profilesError } = await serverSupabase
        .from('profiles')
        .select('id')
        .eq('department_id', user.departmentId);
      if (profilesError) {
        res.status(500).json({ error: profilesError.message });
        return;
      }
      const reporterIds = (departmentProfiles || []).map((profile) => profile.id);
      if (!reporterIds.length) {
        res.json({ incidents: [] });
        return;
      }
      query = query.in('reporter_id', reporterIds);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ incidents: data });
  }
);

/**
 * GET /api/incidents/stats/by-building
 * Aggregated 3D spatial incident statistics per building
 */
incidentsRouter.get(
  '/stats/by-building',
  authenticateToken,
  async (_req: AuthenticatedRequest, res: Response) => {
    if (serverSupabase) {
      const { data, error } = await serverSupabase
        .from('incidents')
        .select('building_id, severity, status');
      if (!error && Array.isArray(data)) {
        const stats: Record<string, { total: number; critical: number; high: number; open: number }> = {};
        for (const inc of data) {
          const bId = inc.building_id || 'general';
          if (!stats[bId]) stats[bId] = { total: 0, critical: 0, high: 0, open: 0 };
          stats[bId].total += 1;
          if (inc.status !== 'resolved' && inc.status !== 'closed') stats[bId].open += 1;
          if (inc.severity === 'critical') stats[bId].critical += 1;
          if (inc.severity === 'high') stats[bId].high += 1;
        }
        res.json({ success: true, stats, totalBuildings: Object.keys(stats).length });
        return;
      }
    }
    const list = DEMO_INCIDENTS_STORE;
    const stats: Record<string, { total: number; critical: number; high: number; open: number }> = {};
    for (const inc of list) {
      const bId = inc.buildingId || 'general';
      if (!stats[bId]) {
        stats[bId] = { total: 0, critical: 0, high: 0, open: 0 };
      }
      stats[bId].total += 1;
      if (inc.status !== 'resolved' && inc.status !== 'closed') {
        stats[bId].open += 1;
      }
      if (inc.severity === 'critical') stats[bId].critical += 1;
      if (inc.severity === 'high') stats[bId].high += 1;
    }
    res.json({ success: true, stats, totalBuildings: Object.keys(stats).length });
  }
);

/**
 * POST /api/incidents
 * Authenticated submission with tamper-proof reporter identity stamping
 */
incidentsRouter.post(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const parseResult = CreateIncidentSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed for incident creation.',
        details: parseResult.error.format(),
      });
      return;
    }

    const incidentData = parseResult.data;
    const recentCutoff = new Date(Date.now() - 60_000).toISOString();

    // A client may lose the HTTP response after the database committed. Return
    // the saved record on retry instead of creating a second incident.
    if (!serverSupabase) {
      const existing = DEMO_INCIDENTS_STORE.find((incident) =>
        incident.reporterId === user.id &&
        incident.buildingId === incidentData.buildingId &&
        incident.title.trim().toLowerCase() === incidentData.title.trim().toLowerCase() &&
        incident.createdAt >= recentCutoff
      );
      if (existing) {
        res.status(200).json({ success: true, duplicate: true, incident: existing });
        return;
      }
    } else {
      const { data: existing, error: duplicateCheckError } = await serverSupabase
        .from('incidents')
        .select('*')
        .eq('reporter_id', user.id)
        .eq('building_id', incidentData.buildingId)
        .eq('title', incidentData.title.trim())
        .gte('created_at', recentCutoff)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (duplicateCheckError) {
        res.status(500).json({ error: duplicateCheckError.message });
        return;
      }
      if (existing) {
        res.status(200).json({ success: true, duplicate: true, incident: existing });
        return;
      }
    }

    const ticketNumber = `INC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (!serverSupabase) {
      const newInc: DemoIncident = {
        ...incidentData,
        room: incidentData.room || incidentData.roomText,
        id: `inc-${Date.now()}`,
        ticketNumber,
        status: 'open',
        lifecycleStatus: 'reported',
        reporterId: user.id,
        reporterName: user.fullName,
        reporterRole: user.role,
        createdAt: new Date().toISOString(),
      };
      DEMO_INCIDENTS_STORE.unshift(newInc);
      res.status(201).json({
        success: true,
        incident: newInc,
      });
      return;
    }

    const { data, error } = await serverSupabase
      .from('incidents')
      .insert([
        {
          ticket_number: ticketNumber,
          title: incidentData.title,
          description: incidentData.description,
          category: incidentData.category,
          severity: incidentData.severity,
          safety_risk: incidentData.safetyRisk || 'low',
          disruption_level: incidentData.disruptionLevel || 'none',
          people_affected: incidentData.peopleAffected || 1,
          building_id: incidentData.buildingId,
          floor: incidentData.floor || null,
          room_text: incidentData.roomText || incidentData.room || null,
          reporter_id: user.id,
          reporter_name: user.fullName,
          reporter_role: user.role,
          status: 'open',
          evidence_urls: incidentData.evidenceUrls || [],
          asset_id: incidentData.assetId || null,
          asset_name: incidentData.assetName || null,
          asset_category: incidentData.assetCategory || null,
          annotation_coordinates: incidentData.annotationCoordinates || null,
          mapped_location_level: incidentData.mappedLocationLevel || 'building',
        },
      ])
      .select()
      .single();

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    // Record initial timeline event
    await serverSupabase.from('incident_timeline_events').insert([
      {
        incident_id: data.id,
        from_status: null,
        to_status: 'reported',
        actor_id: user.id,
        actor_name: user.fullName,
        actor_role: user.role,
        remarks: 'Incident logged by reporter',
      },
    ]);

    res.status(201).json({ success: true, incident: data });
  }
);

/**
 * POST /api/incidents/:id/transition
 * Strict State Machine Transition Enforcement with Audit Stamping
 */
incidentsRouter.post(
  '/:id/transition',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const incidentId = req.params.id;

    const parseResult = StatusTransitionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid transition payload',
        details: parseResult.error.format(),
      });
      return;
    }

    const { targetStatus, remarks, assigneeId, assigneeName } = parseResult.data;
    const norm = normalizeServerRole(user.role);

    // Role verification: Student / Faculty cannot triage, assign, acknowledge, or resolve
    if (norm === 'student_faculty' && targetStatus !== 'cancelled') {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Student and Faculty users can only submit or cancel their own tickets.',
      });
      return;
    }

    // Technicians can only acknowledge, start in_progress, or resolve tickets assigned to them
    if (norm === 'technician' && !['acknowledged', 'in_progress', 'resolved'].includes(targetStatus)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Technicians may only transition tickets to acknowledged, in_progress, or resolved.',
      });
      return;
    }

    if (!serverSupabase) {
      // In demo mode, mutate the record in DEMO_INCIDENTS_STORE
      const target = DEMO_INCIDENTS_STORE.find((i) => i.id === incidentId);
      if (target) {
        target.lifecycleStatus = targetStatus;
        target.status =
          targetStatus === 'resolved'
            ? 'resolved'
            : targetStatus === 'closed'
            ? 'closed'
            : 'in_progress';
      }

      res.json({
        success: true,
        incidentId,
        newStatus: targetStatus,
        incident: target,
        actor: { id: user.id, name: user.fullName, role: user.role },
        remarks: remarks || `Status moved to ${targetStatus}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Live Supabase update
    const updatePayload: Record<string, any> = {
      status: targetStatus === 'resolved' ? 'resolved' : targetStatus === 'closed' ? 'closed' : 'in_progress',
      lifecycle_status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    if (assigneeId) {
      updatePayload.assignee_id = assigneeId;
      if (assigneeName) updatePayload.assigned_name = assigneeName;
    }
    if (targetStatus === 'acknowledged') {
      updatePayload.acknowledged_at = new Date().toISOString();
    } else if (targetStatus === 'resolved') {
      updatePayload.resolved_at = new Date().toISOString();
    } else if (targetStatus === 'closed') {
      updatePayload.closed_at = new Date().toISOString();
      updatePayload.closed_by = user.id;
    }

    const { data: updatedIncident, error: updateError } = await serverSupabase
      .from('incidents')
      .update(updatePayload)
      .eq('id', incidentId)
      .select()
      .single();

    if (updateError) {
      res.status(400).json({ error: updateError.message });
      return;
    }

    // Insert timeline audit event
    await serverSupabase.from('incident_timeline_events').insert([
      {
        incident_id: incidentId,
        to_status: targetStatus,
        actor_id: user.id,
        actor_name: user.fullName,
        actor_role: user.role,
        remarks: remarks || `Transitioned to ${targetStatus}`,
      },
    ]);

    res.json({ success: true, incident: updatedIncident });
  }
);

/**
 * GET /api/incidents/:id/timeline
 * Retrieve state transition audit log
 */
incidentsRouter.get(
  '/:id/timeline',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const incidentId = req.params.id;

    if (!serverSupabase) {
      res.json({
        timeline: [
          {
            id: 'evt-1',
            incident_id: incidentId,
            from_status: null,
            to_status: 'reported',
            actor_name: 'Campus Liaison',
            actor_role: 'liaison',
            remarks: 'Initial complaint recorded with evidence attachment',
            created_at: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
      });
      return;
    }

    const { data, error } = await serverSupabase
      .from('incident_timeline_events')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ timeline: data });
  }
);
