import { describe, expect, it } from 'vitest';
import { BadRequestException, type ArgumentMetadata } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import { buildValidationPipe } from './validation';

class SampleDto {
  @IsString() name!: string;
  @IsInt() @Min(1) count!: number;
}

const meta: ArgumentMetadata = { type: 'body', metatype: SampleDto, data: undefined };

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
});
