import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, HttpStatus } from '@nestjs/common';
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
});
