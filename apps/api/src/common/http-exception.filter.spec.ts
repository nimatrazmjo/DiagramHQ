import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './http-exception.filter';

function mockHost(): { host: ArgumentsHost; status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ method: 'GET', url: '/x' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  it('formats an HttpException into the error envelope', () => {
    const { host, status, json } = mockHost();
    new AllExceptionsFilter().catch(new BadRequestException('bad input'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({ error: { code: 'BAD_REQUEST', message: 'bad input', details: undefined } });
  });

  it('hides internals for unknown errors (500 INTERNAL, no leak)', () => {
    const { host, status, json } = mockHost();
    new AllExceptionsFilter().catch(new Error('secret connection string'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  });

  it('maps a deliberately-thrown 5xx to a stable code, not the generic ERROR fallback', () => {
    const { host, status, json } = mockHost();
    new AllExceptionsFilter().catch(new ServiceUnavailableException('maintenance'), host);
    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'SERVICE_UNAVAILABLE', message: 'maintenance', details: undefined },
    });
  });

  it('does not throw when an HttpException carries a null response body', () => {
    const { host, status, json } = mockHost();
    const exception = new HttpException(null as unknown as string, HttpStatus.BAD_REQUEST);
    expect(() => new AllExceptionsFilter().catch(exception, host)).not.toThrow();
    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'BAD_REQUEST', message: exception.message, details: undefined },
    });
  });
});
