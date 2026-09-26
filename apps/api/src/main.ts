import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** Boots the HTTP API. Port is environment-driven so containers stay 12-factor. */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
