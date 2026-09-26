import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';

interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

// Structural types — avoids a hard dependency on express typings.
interface HttpResponseLike {
  status(code: number): { json(body: unknown): void };
}
interface HttpRequestLike {
  method: string;
  url: string;
}

const CODE_BY_STATUS: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
  500: 'INTERNAL',
  501: 'NOT_IMPLEMENTED',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

/**
 * Translates every thrown error into one stable envelope:
 *   { error: { code, message, details? } }
 * HttpExceptions keep their status and message; anything else becomes a 500 with a
 * generic message, so stack traces and internal details never leak past the edge.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<HttpResponseLike>();
    const request = http.getRequest<HttpRequestLike>();
    const { status, body } = this.toEnvelope(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(`${request.method} ${request.url} -> ${status}`, stack);
    }
    response.status(status).json(body);
  }

  private toEnvelope(exception: unknown): { status: number; body: ErrorEnvelope } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      return {
        status,
        body: {
          error: {
            code: CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL' : 'ERROR'),
            message: this.extractMessage(raw, exception.message),
            details: this.extractDetails(raw),
          },
        },
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { error: { code: 'INTERNAL', message: 'Internal server error' } },
    };
  }

  private extractMessage(raw: unknown, fallback: string): string {
    if (typeof raw === 'string') return raw;
    if (raw == null || typeof raw !== 'object') return fallback;
    const message = (raw as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.length > 0) return 'Validation failed';
    return fallback;
  }

  private extractDetails(raw: unknown): unknown {
    if (raw == null || typeof raw !== 'object') return undefined;
    const message = (raw as { message?: unknown }).message;
    return Array.isArray(message) ? message : undefined;
  }
}
