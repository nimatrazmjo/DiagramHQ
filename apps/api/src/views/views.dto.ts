import { IsArray, IsEnum, IsNumber, IsObject, IsOptional, IsString, IsNotEmpty, ArrayMinSize, ValidateNested, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export enum ViewKindDto {
  context = 'context',
  container = 'container',
  component = 'component',
  security = 'security',
  data = 'data',
  ownership = 'ownership',
  technology = 'technology',
  custom = 'custom',
}

export class CreateViewDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(ViewKindDto)
  kind!: ViewKindDto;

  @IsOptional()
  @IsObject()
  filter?: Record<string, unknown>;

  @IsOptional()
  isStarred?: boolean;
}

export class UpdateViewDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(ViewKindDto)
  kind?: ViewKindDto;

  @IsOptional()
  @IsObject()
  filter?: Record<string, unknown>;

  @IsOptional()
  isStarred?: boolean;
}

export class AddViewObjectDto {
  @IsString()
  @IsNotEmpty()
  objectId!: string;

  @IsOptional()
  @IsObject()
  position?: { x: number; y: number };
}

export class UpdateObjectPositionDto {
  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;
}

export class BatchObjectPositionItemDto {
  @IsString()
  @IsNotEmpty()
  objectId!: string;

  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;
}

export class BatchUpdateObjectPositionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchObjectPositionItemDto)
  positions!: BatchObjectPositionItemDto[];
}
