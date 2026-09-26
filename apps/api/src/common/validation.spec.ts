import { describe, expect, it } from 'vitest';
import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { IsBoolean, IsInt, IsString, Min } from 'class-validator';
import { buildValidationPipe } from './validation';

class SampleDto {
  @IsString() name!: string;
  @IsInt() @Min(1) count!: number;
}

class FlagDto {
  @IsBoolean() active!: boolean;
}

const meta: ArgumentMetadata = { type: 'body', metatype: SampleDto, data: undefined };
const flagMeta: ArgumentMetadata = { type: 'body', metatype: FlagDto, data: undefined };

describe('buildValidationPipe', () => {
  const pipe = buildValidationPipe();

  it('accepts and instantiates a valid payload', async () => {
    const out = await pipe.transform({ name: 'orders', count: 2 }, meta);
    expect(out).toBeInstanceOf(SampleDto);
    expect(out.count).toBe(2);
  });

  it('rejects unknown properties', async () => {
    await expect(pipe.transform({ name: 'orders', count: 1, rogue: true }, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects values that violate the constraints', async () => {
    await expect(pipe.transform({ name: 42, count: 0 }, meta)).rejects.toBeInstanceOf(BadRequestException);
  });

  // Without implicit conversion, a boolean field only accepts a real boolean.
  // enableImplicitConversion would coerce the string "false" via Boolean(),
  // silently flipping it to true instead of rejecting it -- exactly the
  // footgun this pipe is deliberately configured to avoid.
  it('rejects a string "false" for a boolean field instead of silently coercing it to true', async () => {
    await expect(pipe.transform({ active: 'false' }, flagMeta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts a real boolean for a boolean field', async () => {
    const out = await pipe.transform({ active: false }, flagMeta);
    expect(out.active).toBe(false);
  });
});
