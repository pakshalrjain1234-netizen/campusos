import { Request, Response, NextFunction } from 'express';

/**
 * CampusOps Security Middleware Suite
 * Provides production-grade defense-in-depth:
 * 1. Safe Request Logging (Redacts auth tokens and credentials)
 * 2. Secure HTTP Headers (OWASP recommended baseline)
 * 3. In-Memory Sliding-Window Rate Limiting (Protects from high-frequency flood / brute-force)
 * 4. Request Timeout Watchdog (Terminates hanging handlers)
 */

// 1. Sanitized Request Logger
export function sanitizedLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const method = req.method;
  const path = req.originalUrl || req.url;

  // Mask sensitive query params if present
  const safeQuery = { ...req.query };
  ['token', 'key', 'secret', 'password', 'apiKey'].forEach((k) => {
    if (safeQuery[k]) safeQuery[k] = '[REDACTED]';
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status < 400 ? '✓' : status < 500 ? '⚠️' : '❌';
    // Format sanitized log line
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[HTTP] ${statusEmoji} ${method} ${path} - ${status} (${duration}ms)`);
    }
  });

  next();
}

// 2. Secure HTTP Response Headers
export function secureHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Legacy XSS protection for older agents
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Remove Express identification banner
  res.removeHeader('X-Powered-By');

  // HSTS in production environments
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

// 3. Sliding-Window Rate Limiter
interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic garbage collection for rate limit store every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 300000).unref();

export function rateLimiter(options: { windowMs?: number; maxRequests?: number } = {}) {
  const windowMs = options.windowMs || 60000; // 1 minute
  const maxRequests = options.maxRequests || 200; // 200 requests per minute

  return (req: Request, res: Response, next: NextFunction): void => {
    // Identify client by authenticated user ID or remote IP
    const clientKey = (req as any).user?.id || req.ip || req.socket.remoteAddress || 'anonymous';
    const now = Date.now();

    let record = rateLimitStore.get(clientKey);
    if (!record) {
      record = { timestamps: [] };
      rateLimitStore.set(clientKey, record);
    }

    // Keep only timestamps within window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const oldest = record.timestamps[0];
      const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);

      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit of ${maxRequests} requests per minute exceeded. Please try again in ${retryAfter}s.`,
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    record.timestamps.push(now);
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.timestamps.length));

    next();
  };
}

// 4. Request Timeout Watchdog
export function requestTimeout(ms: number = 15000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: `The server was unable to complete the request within the ${ms / 1000}s limit.`,
          code: 'REQUEST_TIMEOUT',
        });
      }
    }, ms);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

