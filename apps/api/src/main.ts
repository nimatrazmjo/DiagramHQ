import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { buildValidationPipe } from './common/validation';

/** Boots the HTTP API. Port is environment-driven so containers stay 12-factor. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
