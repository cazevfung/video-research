/**
 * Simple structured logger
 * Can be replaced with winston or pino in the future for production
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    // Get log level from environment or default to 'info'
    const envLogLevel = process.env.LOG_LEVEL as LogLevel;
    this.logLevel = envLogLevel || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private formatLog(level: LogLevel, message: string, data?: unknown): LogEntry {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };
    if (data) {
      logEntry.data = data;
    }
    return logEntry;
  }

  private output(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = this.formatLog(level, message, data);

    // Format output based on environment
    if (process.env.NODE_ENV === 'production') {
      // JSON format for production (structured logging)
      console.log(JSON.stringify(logEntry));
    } else {
      // Human-readable format for development
      const prefix = `[${logEntry.timestamp}] [${level.toUpperCase()}]`;
      if (data) {
        console.log(`${prefix} ${message}`, data);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }

  error(message: string, error?: unknown): void {
    this.output('error', message, error);
  }

  warn(message: string, data?: unknown): void {
    this.output('warn', message, data);
  }

  info(message: string, data?: unknown): void {
    this.output('info', message, data);
  }

  debug(message: string, data?: unknown): void {
    this.output('debug', message, data);
  }

  /**
   * Log performance metrics (API call duration, job processing time, etc.)
   */
  performance(operation: string, durationMs: number, metadata?: Record<string, unknown>): void {
    const logData: Record<string, unknown> = {
      operation,
      duration_ms: durationMs,
      duration_seconds: (durationMs / 1000).toFixed(2),
    };
    if (metadata) {
      Object.assign(logData, metadata);
    }
    this.output('info', `Performance: ${operation}`, logData);
  }

  /**
   * Log API call with duration
   */
  apiCall(
    service: string,
    endpoint: string,
    method: string,
    durationMs: number,
    statusCode?: number,
    error?: unknown
  ): void {
    const level = error || (statusCode && statusCode >= 400) ? 'error' : 'info';
    this.output(level, `API Call: ${service} ${method} ${endpoint}`, {
      service,
      endpoint,
      method,
      duration_ms: durationMs,
      status_code: statusCode,
      ...(error ? { error } : {}),
    });
  }

  /**
   * Log job lifecycle event with full context
   */
  jobEvent(
    jobId: string,
    event: string,
    status: string,
    metadata?: Record<string, unknown>
  ): void {
    this.output('info', `Job Event: ${event}`, {
      job_id: jobId,
      event,
      status,
      ...metadata,
    });
  }

  /**
   * Log structured error with full context
   */
  structuredError(
    error: Error | unknown,
    context: {
      operation?: string;
      userId?: string | null;
      jobId?: string;
      metadata?: Record<string, unknown>;
    }
  ): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'UnknownError';

    this.output('error', `Structured Error: ${errorMessage}`, {
      error: {
        name: errorName,
        message: errorMessage,
        stack: errorStack,
      },
      ...context,
    });
  }

  /**
   * Log quota violation with details
   */
  quotaViolation(
    userId: string | null,
    tier: string,
    reason: string,
    metadata?: Record<string, unknown>
  ): void {
    this.output('warn', 'Quota Violation', {
      user_id: userId,
      tier,
      reason,
      ...metadata,
    });
  }

  /**
   * Log authentication failure
   */
  authFailure(reason: string, metadata?: Record<string, unknown>): void {
    this.output('warn', 'Authentication Failure', {
      reason,
      ...metadata,
    });
  }
}

// Export singleton instance
const logger = new Logger();

export default logger;

