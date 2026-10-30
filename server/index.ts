/**
 * CampusOps AI Copilot Backend Server
 * 
 * Standalone Express server providing:
 * - /api/copilot/query : Operational Copilot endpoint
 * - /api/copilot/status: Provider health and telemetry status
 * - /api/health        : Server health check
 */

import express from 'express';
import cors from 'cors';
import copilotRouter from './routes/copilot';
import { getSystemHealthCheck } from '../src/utils/observability';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/copilot', copilotRouter);

// Health Endpoint
app.get('/api/health', (req, res) => {
  const health = getSystemHealthCheck(Boolean(process.env.SUPABASE_URL));
  res.status(200).json(health);
});

// Root ping
app.get('/', (req, res) => {
  res.json({
    service: 'CampusOps Operational Copilot Service',
    status: 'online',
    version: '1.0.0',
    endpoints: ['/api/copilot/query', '/api/copilot/status', '/api/health'],
  });
});

// Safe 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.url}`,
    code: 'ROUTE_NOT_FOUND',
  });
});

// Centralized Error Handler (prevents HTML leakage on malformed requests)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'Malformed JSON payload.',
      code: 'INVALID_JSON',
    });
    return;
  }
  res.status(500).json({
    success: false,
    error: 'Internal server error.',
    code: 'SERVER_ERROR',
  });
});

// Start listener when executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[CampusOps Copilot] Server running on http://localhost:${PORT}`);
    console.log(`[CampusOps Copilot] Copilot API ready at http://localhost:${PORT}/api/copilot/query`);
  });
}

export default app;
