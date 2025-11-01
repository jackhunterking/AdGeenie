/**
 * Meta Graph API Logger
 * Provides consistent, structured logging for all Meta API interactions
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface GraphApiCallLog {
  timestamp: string;
  level: LogLevel;
  context: string;
  operation: string;
  endpoint?: string;
  method?: string;
  params?: Record<string, unknown>;
  tokenPrefix?: string;
  duration?: number;
  statusCode?: number;
  error?: string;
  response?: unknown;
  metadata?: Record<string, unknown>;
}

class MetaLogger {
  private isServer: boolean;

  constructor() {
    this.isServer = typeof window === 'undefined';
  }

  /**
   * Redact sensitive token information
   */
  private redactToken(token: string | undefined): string {
    if (!token) return 'NO_TOKEN';
    if (token.length < 10) return '***';
    return `${token.slice(0, 6)}...${token.slice(-4)}`;
  }

  /**
   * Format log message with consistent structure
   */
  private formatLog(log: GraphApiCallLog): string {
    const prefix = this.isServer ? '[Server]' : '[Client]';
    const parts = [
      prefix,
      `[${log.context}]`,
      log.operation,
    ];

    if (log.endpoint) parts.push(`→ ${log.endpoint}`);
    if (log.duration !== undefined) parts.push(`(${log.duration}ms)`);
    if (log.statusCode) parts.push(`[${log.statusCode}]`);

    return parts.join(' ');
  }

  /**
   * Log output based on environment
   */
  private output(log: GraphApiCallLog): void {
    const message = this.formatLog(log);
    const details = {
      ...log,
    };

    // Remove undefined values
    Object.keys(details).forEach(key => {
      if (details[key as keyof typeof details] === undefined) {
        delete details[key as keyof typeof details];
      }
    });

    switch (log.level) {
      case 'error':
        console.error(message, details);
        break;
      case 'warn':
        console.warn(message, details);
        break;
      case 'debug':
        console.debug(message, details);
        break;
      default:
        console.log(message, details);
    }
  }

  /**
   * Log before a Graph API call
   */
  logApiCallStart(params: {
    context: string;
    operation: string;
    endpoint: string;
    method?: string;
    token?: string;
    params?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'info',
      context: params.context,
      operation: `${params.operation} [START]`,
      endpoint: params.endpoint,
      method: params.method || 'GET',
      tokenPrefix: this.redactToken(params.token),
      params: params.params,
      metadata: params.metadata,
    });
  }

  /**
   * Log after a successful Graph API call
   */
  logApiCallSuccess(params: {
    context: string;
    operation: string;
    endpoint: string;
    duration: number;
    statusCode?: number;
    response?: unknown;
    metadata?: Record<string, unknown>;
  }): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'info',
      context: params.context,
      operation: `${params.operation} [SUCCESS]`,
      endpoint: params.endpoint,
      duration: params.duration,
      statusCode: params.statusCode || 200,
      response: params.response,
      metadata: params.metadata,
    });
  }

  /**
   * Log after a failed Graph API call
   */
  logApiCallError(params: {
    context: string;
    operation: string;
    endpoint: string;
    duration: number;
    statusCode?: number;
    error: string | Error;
    metadata?: Record<string, unknown>;
  }): void {
    const errorMessage = params.error instanceof Error
      ? params.error.message
      : String(params.error);

    this.output({
      timestamp: new Date().toISOString(),
      level: 'error',
      context: params.context,
      operation: `${params.operation} [ERROR]`,
      endpoint: params.endpoint,
      duration: params.duration,
      statusCode: params.statusCode,
      error: errorMessage,
      metadata: params.metadata,
    });
  }

  /**
   * Log general information
   */
  info(context: string, operation: string, metadata?: Record<string, unknown>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'info',
      context,
      operation,
      metadata,
    });
  }

  /**
   * Log warnings
   */
  warn(context: string, operation: string, metadata?: Record<string, unknown>): void {
    this.output({
      timestamp: new Date().toISOString(),
      level: 'warn',
      context,
      operation,
      metadata,
    });
  }

  /**
   * Log errors
   */
  error(context: string, operation: string, error: string | Error, metadata?: Record<string, unknown>): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.output({
      timestamp: new Date().toISOString(),
      level: 'error',
      context,
      operation,
      error: errorMessage,
      metadata,
    });
  }

  /**
   * Log debug information (only in development)
   */
  debug(context: string, operation: string, metadata?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      this.output({
        timestamp: new Date().toISOString(),
        level: 'debug',
        context,
        operation,
        metadata,
      });
    }
  }

  /**
   * Create a timing wrapper for async operations
   */
  async timeAsync<T>(
    context: string,
    operation: string,
    endpoint: string,
    fn: () => Promise<T>,
    options?: {
      token?: string;
      params?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }
  ): Promise<T> {
    const startTime = Date.now();

    this.logApiCallStart({
      context,
      operation,
      endpoint,
      token: options?.token,
      params: options?.params,
      metadata: options?.metadata,
    });

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      this.logApiCallSuccess({
        context,
        operation,
        endpoint,
        duration,
        response: result,
        metadata: options?.metadata,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logApiCallError({
        context,
        operation,
        endpoint,
        duration,
        error: error as Error,
        metadata: options?.metadata,
      });

      throw error;
    }
  }

  /**
   * Store logs in localStorage (client-side only)
   */
  storeLog(log: GraphApiCallLog): void {
    if (this.isServer) return;

    try {
      const storageKey = 'meta_api_logs';
      const existingLogs = localStorage.getItem(storageKey);
      const logs: GraphApiCallLog[] = existingLogs ? JSON.parse(existingLogs) : [];

      // Keep only last 100 logs to prevent storage bloat
      logs.push(log);
      if (logs.length > 100) {
        logs.shift();
      }

      localStorage.setItem(storageKey, JSON.stringify(logs));
    } catch (error) {
      console.error('[MetaLogger] Failed to store log in localStorage:', error);
    }
  }

  /**
   * Retrieve logs from localStorage (client-side only)
   */
  getLogs(): GraphApiCallLog[] {
    if (this.isServer) return [];

    try {
      const storageKey = 'meta_api_logs';
      const existingLogs = localStorage.getItem(storageKey);
      return existingLogs ? JSON.parse(existingLogs) : [];
    } catch (error) {
      console.error('[MetaLogger] Failed to retrieve logs from localStorage:', error);
      return [];
    }
  }

  /**
   * Clear logs from localStorage (client-side only)
   */
  clearLogs(): void {
    if (this.isServer) return;

    try {
      localStorage.removeItem('meta_api_logs');
    } catch (error) {
      console.error('[MetaLogger] Failed to clear logs from localStorage:', error);
    }
  }
}

// Export singleton instance
export const metaLogger = new MetaLogger();

// Export convenience functions
export const logGraphApiStart = (params: Parameters<typeof metaLogger.logApiCallStart>[0]) =>
  metaLogger.logApiCallStart(params);

export const logGraphApiSuccess = (params: Parameters<typeof metaLogger.logApiCallSuccess>[0]) =>
  metaLogger.logApiCallSuccess(params);

export const logGraphApiError = (params: Parameters<typeof metaLogger.logApiCallError>[0]) =>
  metaLogger.logApiCallError(params);

export const timeGraphApi = <T>(
  context: string,
  operation: string,
  endpoint: string,
  fn: () => Promise<T>,
  options?: Parameters<typeof metaLogger.timeAsync>[4]
) => metaLogger.timeAsync(context, operation, endpoint, fn, options);
