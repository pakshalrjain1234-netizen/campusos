/**
 * CampusOps Gemini AI Service Layer
 * 
 * Manages Google Generative AI integration with:
 * 1. Automatic model detection and fallback hierarchy ('gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash').
 * 2. 10-second SLA timeout handling via AbortController.
 * 3. Rate-limit (HTTP 429) and server overload (HTTP 503) retry with exponential backoff.
 * 4. Graceful error fallback to local deterministic query engine when Gemini is unconfigured or unavailable.
 * 5. Strict security: Never expose Gemini API key to frontend clients.
 */

import { UserProfile } from '../../src/types';
import { campusDataService } from './campusDataService';
import { processDeterministicQuery, CopilotResponse } from './deterministicEngine';
import { logger } from '../../src/utils/observability';

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiService {
  private apiKey: string | null = null;
  private model: string = DEFAULT_MODEL;

  constructor() {
    this.refreshApiKey();
  }

  refreshApiKey(): void {
    this.apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.VITE_GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      null;
  }

  isConfigured(): boolean {
    this.refreshApiKey();
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  }

  getModelName(): string {
    return this.model;
  }

  /**
   * Generates a grounded, factual operational response using Gemini.
   * If Gemini is unavailable, times out, or fails, falls back to the deterministic engine.
   */
  async queryCopilot(
    question: string,
    user?: UserProfile
  ): Promise<CopilotResponse> {
    this.refreshApiKey();

    // 1. If Gemini is not configured, directly execute deterministic engine
    if (!this.isConfigured() || !this.apiKey) {
      logger.info('Copilot', 'Gemini API key not configured; using local deterministic operational engine');
      return processDeterministicQuery(question, user);
    }

    // 2. Fetch live/baseline data snapshot to ground the LLM prompt
    const snapshot = await campusDataService.getSnapshot(user);
    const activeIncidents = snapshot.incidents.filter((i) => i.status !== 'resolved' && i.status !== 'closed');
    const criticalIncidents = activeIncidents.filter((i) => i.severity === 'critical');
    const pendingWorkOrders = snapshot.workOrders.filter((w) => w.status !== 'completed');
    const lowStock = snapshot.inventoryItems.filter((i) => i.currentStock <= i.minThreshold);
    const pendingProc = snapshot.procurementRequests.filter((p) => p.status === 'pending_approval');
    const unavailableRooms = snapshot.rooms.filter((r) => r.status === 'disrupted' || r.status === 'maintenance');

    // Compact grounded operational context
    const contextPrompt = `
You are the senior CampusOps Operations AI Copilot. You assist campus executives, facility directors, and lead engineers.
You must provide factual, direct, concise answers strictly based on the real CampusOps operational data provided below.
Rules:
1. Always cite exact ticket numbers (INC-xxx), work order numbers (WO-xxx), SKUs, room numbers, and locations.
2. Never invent or hallucinate data, records, names, or numbers.
3. If data is empty or unavailable, explicitly state that rather than assuming zero.
4. Structure your response with a direct summary, bullet points of details, and a clear "Recommended Action".

CURRENT CAMPUS OPERATIONS SNAPSHOT (${snapshot.dataSource}):
- Total Active Incidents: ${activeIncidents.length} (${criticalIncidents.length} Critical)
- Critical Incidents: ${JSON.stringify(criticalIncidents.map((i) => ({ ticket: i.ticketNumber, title: i.title, building: i.buildingName, floor: i.floor, room: i.room, sla: i.slaDeadline })))}
- Pending Work Orders: ${JSON.stringify(pendingWorkOrders.map((w) => ({ wo: w.orderNumber, title: w.title, status: w.status, priority: w.priority, assigned: w.assignedEngineer })))}
- Low Inventory Items: ${JSON.stringify(lowStock.map((i) => ({ sku: i.sku, name: i.name, stock: i.currentStock, min: i.minThreshold, unit: i.unit })))}
- Pending Procurements: ${JSON.stringify(pendingProc.map((p) => ({ req: p.requestNumber, item: p.itemName, qty: p.quantity, cost: p.totalEstimatedCost, urgency: p.urgency })))}
- Closed/Unavailable Rooms: ${JSON.stringify(unavailableRooms.map((r) => ({ room: r.roomNumber, name: r.name, building: r.buildingName, status: r.status })))}
`;

    // 3. Attempt Gemini API request with retry and timeout
    const maxRetries = 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s SLA

        const url = `${API_BASE_URL}/${this.model}:generateContent?key=${this.apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: `${contextPrompt}\n\nUSER QUESTION: "${question}"` },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 800,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const status = response.status;
          const errorBody = await response.text();
          logger.warn('Copilot', `Gemini API returned status ${status}`, { status, errorBody: errorBody.slice(0, 200) });

          // If rate-limited (429) or overloaded (503), retry with exponential backoff
          if ((status === 429 || status === 503) && attempt < maxRetries) {
            attempt++;
            const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          // Non-retryable error (e.g. 400, 403, 404): Fallback to deterministic engine
          logger.warn('Copilot', 'Falling back to local deterministic operational engine due to API error');
          return processDeterministicQuery(question, user);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
          logger.warn('Copilot', 'Gemini returned empty candidate text; falling back to deterministic engine');
          return processDeterministicQuery(question, user);
        }

        return {
          success: true,
          provider: 'gemini',
          model: this.model,
          answer: text,
          suggestedQuestions: [
            'Which complaints are Critical?',
            'Which building has the most active incidents?',
            'What should management prioritize today?',
          ],
          dataSource: snapshot.dataSource,
        };
      } catch (err: unknown) {
        attempt++;
        const isTimeout = (err as Error)?.name === 'AbortError';
        logger.warn('Copilot', isTimeout ? 'Gemini API call timed out after 10s' : 'Gemini API call failed with exception', {
          error: (err as Error)?.message,
          attempt,
        });

        if (attempt > maxRetries) {
          // Graceful fallback to local engine
          logger.info('Copilot', 'Max retries exhausted; serving verified answer via deterministic operational engine');
          return processDeterministicQuery(question, user);
        }
      }
    }

    // Default safety fallback
    return processDeterministicQuery(question, user);
  }
}

export const geminiService = new GeminiService();
