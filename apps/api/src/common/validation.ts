import { ValidationPipe } from '@nestjs/common';

/**
 * Edge validation for all incoming DTOs: strip unknown properties, reject
 * extras outright, and instantiate the DTO class. Applied globally in
 * main.ts.
 *
 * Deliberately NOT using transformOptions.enableImplicitConversion: it
 * coerces any boolean-typed field via JS `Boolean(value)`, so a query/body
 * value of the string "false" becomes `true` instead of being rejected or
 * correctly parsed -- a known class-transformer footgun. A DTO that needs
 * string->number/boolean coercion (e.g. for query params) should opt in
 * per-field with an explicit `@Type(() => Number)` / `@Transform(...)`.
 */
export const buildValidationPipe = (): ValidationPipe =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
