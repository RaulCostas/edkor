import { IsString, IsNumber, IsDateString, IsIn, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEgresoDto {
    @IsDateString()
    @IsNotEmpty()
    fecha: string;

    @IsString()
    @IsNotEmpty()
    detalle: string;

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    monto: number;

    @IsString()
    @IsNotEmpty()
    @IsIn(['Bolivianos', 'Dólares'])
    moneda: string;

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    formaPagoId: number;

    @IsOptional()
    @IsString()
    imagen?: string;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    idorden_trabajo?: number;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    sucursal_id?: number;
}
