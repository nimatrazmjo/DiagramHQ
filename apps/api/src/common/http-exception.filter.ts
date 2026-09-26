import { Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { logError } from './logger';

interface ErrorEnvelope {
  error: { code: string; message: string; details?: unknown };
}

/**
 * Translates every thrown error into one stable envelope:
 *   { error: { code, message, details? } }
 * HttpExceptions keep their status and (4xx only) message; anything else, or
 * any 5xx regardless of source, becomes a generic message, so stack traces
 * and internal details never leak past the edge.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const { status, body } = this.toEnvelope(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      logError('http.unhandled_error', {
        method: request.method,
        url: request.url,
        status,
        cause: exception instanceof Error ? exception.stack ?? exception.message : String(exception),
      });
    }
    response.status(status).json(body);
  }

  private toEnvelope(exception: unknown): { status: number; body: ErrorEnvelope } {
    const { status, message, details } = this.classify(exception);
    const isServerError = status >= HttpStatus.INTERNAL_SERVER_ERROR;
    return {
      status,
      body: {
        error: {
          code: (HttpStatus as unknown as Record<number, string>)[status] ?? (isServerError ? 'INTERNAL' : 'ERROR'),
          // Never forward the original message/details for a 5xx, regardless
          // of source (HttpException or not) -- a future
          // `throw new InternalServerErrorException(dbError.message)` must
          // not leak connection strings/internals just because it's an
          // HttpException. 4xx messages are about the caller's own request
          // and are safe to echo.
          message: isServerError ? 'Internal server error' : message,
          details: isServerError ? undefined : details,
        },
      },
    };
  }

  private classify(exception: unknown): { status: number; message: string; details?: unknown } {
    if (exception instanceof HttpException) {
      const rawMessage = this.extractRawMessage(exception.getResponse());
      const details = Array.isArray(rawMessage) ? rawMessage : undefined;
      const message = details ? 'Validation failed' : typeof rawMessage === 'string' ? rawMessage : exception.message;
      return { status: exception.getStatus(), message, details };
    }
    // Not every thrown error is a NestJS HttpException -- e.g. Express's
    // body-parser throws a plain Error with a legitimate `.status` (413
    // PayloadTooLarge). Honor that instead of flattening every non-HttpException
    // into a generic 500.
    const legacyStatus = this.extractLegacyStatus(exception);
    if (legacyStatus !== undefined) {
      return { status: legacyStatus, message: exception instanceof Error ? exception.message : 'Error' };
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }

  /** The `.message` field of an HttpException's response body, whatever shape that body is. */
  private extractRawMessage(raw: unknown): unknown {
    if (typeof raw === 'string') return raw;
    if (raw != null && typeof raw === 'object') return (raw as { message?: unknown }).message;
    return undefined;
  }

  private extractLegacyStatus(exception: unknown): number | undefined {
    if (exception == null || typeof exception !== 'object') return undefined;
    const candidate =
      (exception as { status?: unknown }).status ?? (exception as { statusCode?: unknown }).statusCode;
    return typeof candidate === 'number' && candidate >= 400 && candidate <= 599 ? candidate : undefined;
  }
}
