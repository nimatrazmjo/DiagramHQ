import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/http-exception.filter';
import { buildValidationPipe } from '../common/validation';
import { PrismaService } from '../database/prisma.service';

describe('Auth Endpoints & Guards (F002)', () => {
  let app: INestApplication;
  let validToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: vi.fn().mockResolvedValue([{ result: 1 }]) })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(buildValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/token exchanges valid credentials for a signed token and user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/token')
      .send({ email: 'developer@diagramhq.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toMatchObject({
      email: 'developer@diagramhq.com',
      name: 'developer',
    });
    expect(res.body.user.id.startsWith('usr_')).toBe(true);

    validToken = res.body.token;
  });

  it('POST /auth/token rejects invalid credentials with 401 error envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/token')
      .send({ email: 'developer@diagramhq.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
        details: undefined,
      },
    });
  });

  it('POST /auth/token rejects malformed input at the edge with 400 error envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/token')
      .send({ email: 'not-an-email', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toBe('Validation failed');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('GET /auth/me returns 401 when no token is supplied', async () => {
    const res = await request(app.getHttpServer()).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication token missing',
        details: undefined,
      },
    });
  });

  it('GET /auth/me returns 401 when an invalid Bearer token is supplied', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer forged.token.value');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired authentication token',
        details: undefined,
      },
    });
  });

  it('GET /auth/me returns 200 and authenticated user profile with valid Bearer token', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: 'developer@diagramhq.com',
      name: 'developer',
    });
    expect(typeof res.body.user.sub).toBe('string');
  });
});
