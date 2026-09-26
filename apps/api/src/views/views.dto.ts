import { IsArray, IsNumber, IsString, IsNotEmpty, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
