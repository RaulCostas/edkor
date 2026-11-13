import { IsOptional, IsNumber, IsDateString, IsBooleanString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterTrabajoAsignadoDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    personalId?: number;

    @IsOptional()
    @IsDateString()
    fechaInicio?: string;

    @IsOptional()
    @IsDateString()
    fechaFin?: string;

    @IsOptional()
    @IsBooleanString()
    terminado?: string; // 'true' or 'false'

    @IsOptional()
    @IsString()
    ordenEstado?: string;

    @IsOptional()
    @IsString()
    soloMecanicos?: string;
}
