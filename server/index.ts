import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { authenticateToken } from './middleware/auth';
import { sanitizedLogger, secureHeaders, rateLimiter, requestTimeout } from './middleware/security';
import { usersRouter } from './routes/users';
import { incidentsRouter } from './routes/incidents';
import { workOrdersRouter } from './routes/workOrders';
import { approvalsRouter } from './routes/approvals';
import { occupancyRouter } from './routes/occupancy';
import { inventoryRouter } from './routes/inventory';
import { bookingsRouter } from './routes/bookings';
import { notificationsRouter } from './routes/notifications';
import { copilotRouter } from './routes/copilot';
import { AuthenticatedRequest } from './types';

const app = express();

// Global Middlewares
app.use(secureHeaders);
app.use(sanitizedLogger);
app.use(rateLimiter({ windowMs: 60000, maxRequests: 250 }));
app.use(requestTimeout(20000));
app.use(cors({ origin: true, credentials: true }));
// Incident evidence can include a compressed camera photo encoded in the request body.
app.use(express.json({ limit: '2mb' }));

// Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'CampusOps Backend API',
    supabaseConnected: config.isConfigured,
    timestamp: new Date().toISOString(),
  });
});

// Authenticated Identity Profile Endpoint
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// Mount Routes
app.use('/api/users', usersRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/work-orders', workOrdersRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/occupancy', occupancyRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/ai', copilotRouter);
app.use('/api/copilot', copilotRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}`, code: 'NOT_FOUND' });
});

// Centralized Error Handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// Start Server if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(config.port, () => {
    console.log(`🚀 CampusOps Backend API running on port ${config.port}`);
    console.log(`🔐 Supabase Connected: ${config.isConfigured ? 'YES' : 'NO (Demo Mode Active)'}`);
  });
}

export default app;

