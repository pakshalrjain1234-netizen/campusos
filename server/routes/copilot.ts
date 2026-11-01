import { Router, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { AuthenticatedRequest } from '../types';
import { authenticateToken, normalizeServerRole } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { rankIncidents, PriorityTier } from '../services/priorityEngine';
import { queryCampusCopilot } from '../services/geminiService';
import { getCampusOperationalSnapshot } from '../services/campusDataService';
import { paginateArray, parsePaginationParams } from '../utils/pagination';

export const copilotRouter = Router();

const serverSupabase = config.isConfigured
  ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey || config.supabaseAnonKey)
  : null;

// Track manual priority overrides in-memory for auditability
interface PriorityOverride {
  incidentId: string;
  manualTier: PriorityTier;
  reason: string;
  overriddenBy: string;
  overriddenByRole: string;
  createdAt: string;
}

const PRIORITY_OVERRIDES: Map<string, PriorityOverride> = new Map();

const QuerySchema = z.object({
  query: z.string().optional(),
  question: z.string().optional(),
  userRole: z.string().optional(),
});

const OverridePrioritySchema = z.object({
  incidentId: z.string().min(1),
  manualTier: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  reason: z.string().min(5, 'A clear justification is required for manual priority override'),
});

/**
 * GET /api/ai/health
 * AI Copilot & Priority Engine Diagnostics
 */
copilotRouter.get('/health', (req, res: Response) => {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  res.json({
    status: 'operational',
    service: 'CampusOps Priority Engine & Copilot',
    engineVersion: '3.0.0-PROD',
    aiProvider: geminiConfigured ? 'gemini-1.5-flash' : 'local-heuristic-engine',
    formula: 'Safety Risk (30%) + Severity (20%) + People Affected (15%) + Facility Criticality (15%) + Operational Disruption (10%) + Waiting Time (5%) + Escalation History (5%)',
    activeOverridesCount: PRIORITY_OVERRIDES.size,
  });
});

copilotRouter.get('/status', (req, res: Response) => {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  res.json({
    status: 'operational',
    service: 'CampusOps Operational Copilot Service',
    provider: geminiConfigured ? 'gemini-1.5-flash' : 'local_deterministic',
    isFallbackActive: !geminiConfigured,
  });
});

/**
 * GET /api/ai/priority-queue
 * Ranked Campus Incidents using the Transparent 7-Factor Formula
 */
copilotRouter.get(
  '/priority-queue',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const snapshot = await getCampusOperationalSnapshot();
      let ranked = rankIncidents(snapshot.incidents);

      // Apply any manual overrides
      ranked = ranked.map((inc: any) => {
        const override = PRIORITY_OVERRIDES.get(inc.id);
        if (override) {
          return {
            ...inc,
            priorityAnalysis: {
              ...inc.priorityAnalysis,
              tier: override.manualTier,
              reasons: [
                `MANUAL OVERRIDE by ${override.overriddenByRole.toUpperCase()} (${override.overriddenBy}): "${override.reason}"`,
                ...inc.priorityAnalysis.reasons,
              ],
              isManualOverride: true,
              overrideDetails: override,
            },
          };
        }
        return inc;
      });

      // Filter by tier if specified
      const tierParam = req.query.tier as string;
      if (tierParam && tierParam !== 'all') {
        const upperTier = tierParam.toUpperCase();
        ranked = ranked.filter((inc: any) => inc.priorityAnalysis?.tier === upperTier);
      }

      // Sort criteria
      const sortBy = (req.query.sort as string) || 'priority';
      if (sortBy === 'oldest') {
        ranked.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else if (sortBy === 'affected') {
        ranked.sort((a, b) => (b.peopleAffected || 0) - (a.peopleAffected || 0));
      } else if (sortBy === 'escalated') {
        ranked.sort((a, b) => (b.priorityAnalysis?.factors?.escalationHistory?.score || 0) - (a.priorityAnalysis?.factors?.escalationHistory?.score || 0));
      }
      // 'priority' is already sorted descending by totalScore in rankIncidents

      const pagination = parsePaginationParams(req);
      const paginatedResult = paginateArray(ranked, pagination);

      // Summaries
      const countsByTier = {
        CRITICAL: ranked.filter((i) => i.priorityAnalysis?.tier === 'CRITICAL').length,
        HIGH: ranked.filter((i) => i.priorityAnalysis?.tier === 'HIGH').length,
        MEDIUM: ranked.filter((i) => i.priorityAnalysis?.tier === 'MEDIUM').length,
        LOW: ranked.filter((i) => i.priorityAnalysis?.tier === 'LOW').length,
      };

      res.json({
        ...paginatedResult,
        countsByTier,
        totalQueueLength: ranked.length,
        calculatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error in /api/ai/priority-queue:', err);
      res.status(500).json({ error: 'Failed to compute priority queue', message: err.message });
    }
  }
);

/**
 * POST /api/ai/query
 * Operations Natural Language Assistant
 */
copilotRouter.post(
  '/query',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    const parseResult = QuerySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid query payload', details: parseResult.error.format() });
      return;
    }

    try {
      const user = req.user!;
      // Strict role resolution from verified token
      const userRole = normalizeServerRole(user.role);
      const snapshot = await getCampusOperationalSnapshot();

      // Role-based data scoping for Copilot context
      if (userRole === 'student_faculty') {
        snapshot.approvals = [];
        snapshot.inventory = [];
        snapshot.workOrders = [];
        snapshot.incidents = snapshot.incidents.filter(
          (inc: any) =>
            inc.reportedBy?.id === user.id ||
            inc.reportedById === user.id ||
            inc.studentId === user.id ||
            inc.isPublic
        );
      } else if (userRole === 'technician') {
        snapshot.approvals = [];
        snapshot.workOrders = snapshot.workOrders.filter(
          (wo: any) => wo.assignedEngineerId === user.id || wo.status === 'unassigned'
        );
      } else if (userRole === 'department_manager') {
        const deptName = user.departmentName || (user as any).department;
        if (deptName) {
          snapshot.incidents = snapshot.incidents.filter(
            (inc: any) => !inc.department || inc.department.toLowerCase() === deptName.toLowerCase()
          );
        }
      }

      // Pre-rank incidents so copilot has exact priority scores
      const ranked = rankIncidents(snapshot.incidents);
      snapshot.rankedIncidents = ranked;

      const queryText = (req.body?.query || req.body?.question || parseResult.data.query || '').trim();
      if (!queryText) {
        res.status(400).json({ error: 'Query or question cannot be empty', code: 'INVALID_QUERY' });
        return;
      }
      const response = await queryCampusCopilot(queryText, userRole, snapshot);

      res.json({
        success: true,
        ...response,
      });
    } catch (err: any) {
      console.error('Error in /api/ai/query:', err);
      res.status(500).json({ error: 'Failed to process copilot query', message: err.message });
    }
  }
);

/**
 * POST /api/ai/override-priority
 * Manual override of calculated incident priority (Requires Facilities Administrator or Department Manager)
 */
copilotRouter.post(
  '/override-priority',
  authenticateToken,
  requireRole(['facilities_administrator', 'department_manager', 'coo', 'director']),
  async (req: AuthenticatedRequest, res: Response) => {
    const parseResult = OverridePrioritySchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed for priority override', details: parseResult.error.format() });
      return;
    }

    const { incidentId, manualTier, reason } = parseResult.data;
    const user = req.user!;

    const overrideRecord: PriorityOverride = {
      incidentId,
      manualTier,
      reason,
      overriddenBy: user.fullName || user.id,
      overriddenByRole: user.role,
      createdAt: new Date().toISOString(),
    };

    PRIORITY_OVERRIDES.set(incidentId, overrideRecord);

    if (serverSupabase) {
      try {
        await serverSupabase.from('incident_timeline_events').insert([
          {
            incident_id: incidentId,
            from_status: null,
            to_status: null,
            actor_id: user.id,
            actor_name: user.fullName || user.id,
            actor_role: user.role,
            remarks: `[MANUAL PRIORITY OVERRIDE] Set to ${manualTier}: "${reason}"`,
          },
        ]);
      } catch (dbErr) {
        console.warn('Failed to persist priority override audit event to Supabase:', dbErr);
      }
    }

    res.json({
      success: true,
      message: `Priority for incident ${incidentId} successfully overridden to ${manualTier}`,
      override: overrideRecord,
    });
  }
);

export default copilotRouter;
