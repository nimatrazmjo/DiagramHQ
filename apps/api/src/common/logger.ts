/**
 * Structured JSON logging per .harness/scripts/SCRIPTS.md's logger contract:
 * `{ ts, level, event, correlationId, ...ids }`. Deliberately not a logging
 * library (pino/winston) -- no dependency justifies itself yet for two call
 * sites; this is the minimal shape that contract asks for. Request-level
 * correlationId propagation (a request-scoped context/middleware spanning
 * the whole app, not specific to any one handler) is not built yet -- logged
 * as an open decision in .harness/BLOCKERS.md rather than bolted on here.
 */
export interface LogFields {
  correlationId?: string;
  [key: string]: unknown;
}

function emit(level: 'info' | 'warn' | 'error', event: string, fields: LogFields = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  (level === 'error' ? console.error : console.log)(line);
}

export const logInfo = (event: string, fields?: LogFields): void => emit('info', event, fields);
export const logWarn = (event: string, fields?: LogFields): void => emit('warn', event, fields);
export const logError = (event: string, fields?: LogFields): void => emit('error', event, fields);
