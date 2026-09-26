import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum ObjectKindDto {
  system = 'system',
  application = 'application',
  store = 'store',
  component = 'component',
  actor = 'actor',
  group = 'group',
}

export enum ConnectionKindDto {
  sync = 'sync',
  async = 'async',
  data = 'data',
  dependency = 'dependency',
  deploys_to = 'deploys_to',
}

export class CreateArchitectureDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateArchitectureDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateModelObjectDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEnum(ObjectKindDto, {
    message: 'kind must be one of: system, application, store, component, actor, group',
  })
  kind!: ObjectKindDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  versionId?: string;
}

export class UpdateModelObjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(ObjectKindDto)
  kind?: ObjectKindDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateModelConnectionDto {
  @IsString()
  @IsNotEmpty()
  sourceObjectId!: string;

  @IsString()
  @IsNotEmpty()
  targetObjectId!: string;

  @IsOptional()
  @IsEnum(ConnectionKindDto)
  kind?: ConnectionKindDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  versionId?: string;
}

export class UpdateModelConnectionDto {
  @IsOptional()
  @IsEnum(ConnectionKindDto)
  kind?: ConnectionKindDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
