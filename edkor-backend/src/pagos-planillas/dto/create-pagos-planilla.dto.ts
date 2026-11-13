import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePagosPlanillaDto {
    @IsNumber()
    planilla_id: number;

    @IsNumber()
    idforma_pago: number;

    @IsOptional()
    @IsNumber()
    iduser?: number;

    @IsNumber()
    monto: number;

    @IsOptional()
    @IsString()
    fecha_pago?: string;

    @IsOptional()
    @IsString()
    observaciones?: string;
}
