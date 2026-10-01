import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FlowStepDto {
  @IsString()
  @IsNotEmpty()
  connectionId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stepIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CreateFlowDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowStepDto)
  steps?: FlowStepDto[];
}

export class UpdateFlowDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowStepDto)
  steps?: FlowStepDto[];
}

export class AddFlowStepDto {
  @IsString()
  @IsNotEmpty()
  connectionId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  insertAtIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateFlowStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  stepIndex?: number;
}

export class ReorderFlowStepsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedStepIds!: string[];
}
