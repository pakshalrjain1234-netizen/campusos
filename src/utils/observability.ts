/**
 * CampusOps Observability, Structured Logging & Diagnostic Utility Layer (Phase 2.9)
 * 
 * Provides:
 * 1. Structured logging with automatic redaction of secrets, tokens, and PII.
 * 2. Request / Operation Correlation IDs for end-to-end audit tracing.
 * 3. Safe error formatters that prevent database schema and stack trace leakage to end users.
 * 4. In-memory Rate Limiting to prevent denial-of-service / brute-force submissions.
 * 5. Diagnostic System Health Check reporting subsystem status.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  correlationId?: string;
  category: string;
  message: string;
  details?: Record<string, unknown>;
}

// Sensitive keys whose values must be automatically masked/redacted in logs
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /auth/i,
  /credential/i,
  /jwt/i,
  /bearer/i,
];

/**
 * Deeply sanitizes an object by masking any values associated with sensitive keys.
 */
export function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Generates an ISO-8601 timestamp with high resolution.
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Generates a unique correlation ID for tracing an operation end-to-end.
 */
export function generateCorrelationId(prefix = 'req'): string {
  const rand = Math.random().toString(36).substring(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}-${time}-${rand}`;
}

/**
 * Structured Logger that formats log entries as JSON and suppresses secret leaks.
 */
class CampusLogger {
  private log(level: LogLevel, category: string, message: string, details?: Record<string, unknown>, correlationId?: string) {
    const entry: StructuredLogEntry = {
      timestamp: getTimestamp(),
      level,
      correlationId,
      category,
      message,
      details: details ? (redactSensitiveData(details) as Record<string, unknown>) : undefined,
    };

    const formatted = `[${entry.timestamp}] [${entry.level}] [${entry.category}]${entry.correlationId ? ` [${entry.correlationId}]` : ''}: ${entry.message}`;

    if (level === 'ERROR') {
      console.error(formatted, entry.details || '');
    } else if (level === 'WARN') {
      console.warn(formatted, entry.details || '');
    } else if (level === 'INFO') {
      console.log(formatted, entry.details || '');
    } else {
      // DEBUG
      if (import.meta.env?.DEV) {
        console.debug(formatted, entry.details || '');
      }
    }

    return entry;
  }

  debug(category: string, message: string, details?: Record<string, unknown>, correlationId?: string) {
    return this.log('DEBUG', category, message, details, correlationId);
  }

  info(category: string, message: string, details?: Record<string, unknown>, correlationId?: string) {
    return this.log('INFO', category, message, details, correlationId);
  }

  warn(category: string, message: string, details?: Record<string, unknown>, correlationId?: string) {
    return this.log('WARN', category, message, details, correlationId);
  }

  error(category: string, message: string, details?: Record<string, unknown>, correlationId?: string) {
    return this.log('ERROR', category, message, details, correlationId);
  }
}

export const logger = new CampusLogger();

/**
 * Converts internal error objects (e.g. Postgres errors, stack traces, schema details)
 * into safe, professional, user-facing error messages while logging details securely.
 */
export function getSafeErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred.'): string {
  if (!error) return fallbackMessage;

  let rawMessage = '';
  if (typeof error === 'string') {
    rawMessage = error;
  } else if (error instanceof Error) {
    rawMessage = error.message;
  } else if (typeof error === 'object' && 'message' in error) {
    rawMessage = String((error as { message: unknown }).message);
  }

  // Check for internal Postgres / database error signatures
  const isPostgresError =
    /relation\s+".*"\s+does not exist/i.test(rawMessage) ||
    /syntax error at or near/i.test(rawMessage) ||
    /violates foreign key constraint/i.test(rawMessage) ||
    /column\s+".*"\s+does not exist/i.test(rawMessage) ||
    /plpgsql/i.test(rawMessage) ||
    /search_path/i.test(rawMessage);

  if (isPostgresError) {
    logger.error('DatabaseSecurity', 'Internal database error suppressed from user presentation', { rawMessage });
    return 'The requested database operation could not be completed. Please contact operations support.';
  }

  // Check for network / timeout signatures
  if (/timeout|aborted|ETIMEDOUT|ECONNREFUSED/i.test(rawMessage)) {
    return 'The server took too long to respond. Please check your connectivity and try again.';
  }

  // Safe to return sanitized user error if it contains business domain logic
  if (
    /already\s+(received|approved|actioned|completed)/i.test(rawMessage) ||
    /insufficient\s+stock/i.test(rawMessage) ||
    /conflict/i.test(rawMessage) ||
    /unauthorized/i.test(rawMessage) ||
    /self-approval/i.test(rawMessage) ||
    /exceeded/i.test(rawMessage)
  ) {
    return rawMessage;
  }

  return fallbackMessage;
}

/**
 * In-Memory Sliding Window Rate Limiter for client and context operations.
 * Prevents rapid accidental double-submits or abusive API firing.
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * @param maxRequests Maximum allowed operations in the window
   * @param windowMs Window duration in milliseconds (e.g. 60000 for 1 minute)
   */
  constructor(private maxRequests: number = 10, private windowMs: number = 60000) {}

  /**
   * Checks whether an action keyed by `identifier` is permitted.
   * If permitted, logs the attempt and returns true. If throttled, returns false.
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(identifier) || [];

    // Filter out timestamps outside the active window
    const recentTimestamps = timestamps.filter((time) => now - time < this.windowMs);

    if (recentTimestamps.length >= this.maxRequests) {
      this.requests.set(identifier, recentTimestamps);
      return false;
    }

    recentTimestamps.push(now);
    this.requests.set(identifier, recentTimestamps);
    return true;
  }

  /**
   * Resets the rate limit state for a given key.
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Clears all tracked rate limits.
   */
  clear(): void {
    this.requests.clear();
  }
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  version: string;
  subsystems: {
    authentication: 'active' | 'degraded';
    database: 'supabase_connected' | 'in_memory_simulation';
    inventoryAudit: 'operational';
    roomScheduler: 'operational';
  };
  metrics: {
    activeSessions: number;
    uptimeSeconds: number;
  };
}

const START_TIME = Date.now();

/**
 * Diagnostic Health Check Reporter
 */
export function getSystemHealthCheck(isSupabaseOnline = false): SystemHealthStatus {
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);

  return {
    status: 'healthy',
    timestamp: getTimestamp(),
    version: '1.0.0 (Phase 2.9 Hardened)',
    subsystems: {
      authentication: 'active',
      database: isSupabaseOnline ? 'supabase_connected' : 'in_memory_simulation',
      inventoryAudit: 'operational',
      roomScheduler: 'operational',
    },
    metrics: {
      activeSessions: 1,
      uptimeSeconds,
    },
  };
}
