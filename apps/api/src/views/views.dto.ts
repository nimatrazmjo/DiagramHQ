import { IsNumber } from 'class-validator';

export class UpdateObjectPositionDto {
  @IsNumber()
  x!: number;

  @IsNumber()
  y!: number;
}
