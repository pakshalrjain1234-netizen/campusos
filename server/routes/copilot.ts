/**
 * CampusOps AI Copilot Express Routes
 * 
 * Endpoints:
 * - POST /api/copilot/query : Submits an operational query to the AI engine or deterministic fallback
 * - GET  /api/copilot/status: Reports the active AI provider status (Gemini vs Local Deterministic)
 */

import { Router, Response } from 'express';
import { copilotAuthMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { geminiService } from '../services/geminiService';
import { processDeterministicQuery } from '../services/deterministicEngine';
import { sanitizeString } from '../../src/utils/security';
import { logger } from '../../src/utils/observability';

const router = Router();

/**
 * POST /api/copilot/query
 * Securely handles natural language queries with role-based filtering and automatic AI-to-Local fallback.
 */
router.post('/query', copilotAuthMiddleware, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rawQuestion = req.body?.question;

    if (!rawQuestion || typeof rawQuestion !== 'string' || rawQuestion.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Please enter a valid question regarding campus operations.',
        code: 'INVALID_QUERY',
      });
      return;
    }

    const cleanQuestion = sanitizeString(rawQuestion, 500);

    // Process through GeminiService (which seamlessly delegates to deterministic engine if Gemini is unconfigured or unavailable)
    const result = await geminiService.queryCopilot(cleanQuestion, req.user);

    res.status(200).json(result);
  } catch (error: unknown) {
    const errorMsg = (error as Error)?.message || 'An unexpected server error occurred.';
    logger.error('CopilotRoute', 'Exception processing Copilot query', { error: errorMsg });

    // Defensive fallback: If everything else fails, fall back to the deterministic engine
    try {
      const fallbackResult = await processDeterministicQuery(req.body?.question || '', req.user);
      res.status(200).json(fallbackResult);
    } catch {
      // Meaningful explanation rather than generic "Unable to complete inquiry"
      res.status(500).json({
        success: false,
        provider: 'local_deterministic',
        error: 'The Operations Copilot encountered an unexpected data evaluation issue. Please retry with a standard operational inquiry.',
        suggestedQuestions: [
          'How many active complaints exist?',
          'Which complaints are Critical?',
          'What should management prioritize today?',
        ],
      });
    }
  }
});

/**
 * GET /api/copilot/status
 * Informs the frontend whether Gemini cloud intelligence or the local deterministic engine is active.
 */
router.get('/status', (req, res: Response) => {
  const isConfigured = geminiService.isConfigured();
  res.status(200).json({
    success: true,
    activeProvider: isConfigured ? 'gemini' : 'local_deterministic',
    geminiConfigured: isConfigured,
    model: isConfigured ? geminiService.getModelName() : 'Deterministic Operations Engine v1.0',
    capabilities: [
      'Incident Triage',
      'Work Order Tracking',
      'Inventory Restock Alerts',
      'Room Disruption Reallocation',
      'Executive Standup Priorities',
    ],
  });
});

export default router;
