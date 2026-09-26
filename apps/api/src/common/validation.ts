import { ValidationPipe } from '@nestjs/common';

/**
 * Edge validation for all incoming DTOs: strip unknown properties, reject extras
 * outright, and coerce primitive types. Applied globally in main.ts.
 */
export const buildValidationPipe = (): ValidationPipe =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
