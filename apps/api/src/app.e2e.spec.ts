import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { Body, Controller, Module, Post } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { buildValidationPipe } from './common/validation';
import { PrismaService } from './database/prisma.service';

// A throwaway DTO-validated route, wired only into this test's module — proves
// the global ValidationPipe rejects bad payloads through the real HTTP
// pipeline without adding a permanent endpoint to the app (domain CRUD routes
// land in F003/F004, out of scope here).
class SampleDto {
  @IsString() name!: string;
  @IsInt() @Min(1) count!: number;
}

@Controller('__test-only')
class SampleController {
  @Post()
  echo(@Body() body: SampleDto): SampleDto {
    return body;
  }
}

@Module({ controllers: [SampleController] })
class SampleModule {}

describe('API edge foundation (F007)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, SampleModule],
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

  it('GET /health reports ok with a healthy database', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.checks.database).toBe('up');
  });

  it('an unknown route returns the structured error envelope, not a raw 404 page', async () => {
    const res = await request(app.getHttpServer()).get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('a valid request passes the global ValidationPipe through', async () => {
    const res = await request(app.getHttpServer())
      .post('/__test-only')
      .send({ name: 'orders', count: 2 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ name: 'orders', count: 2 });
  });

  it('an invalid request is rejected with the structured error envelope', async () => {
    const res = await request(app.getHttpServer())
      .post('/__test-only')
      .send({ name: 42, count: 0, rogue: 'field' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });
});
