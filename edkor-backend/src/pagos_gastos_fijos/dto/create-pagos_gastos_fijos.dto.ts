import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePagosGastosFijosDto {
    @IsNumber()
    gastoFijoId: number;

    @IsString()
    fecha: string;

    @IsNumber()
    @Type(() => Number)
    monto: number;

    @IsString()
    moneda: string;

    @IsNumber()
    formaPagoId: number;

    @IsOptional()
    @IsString()
    observaciones?: string;
}
