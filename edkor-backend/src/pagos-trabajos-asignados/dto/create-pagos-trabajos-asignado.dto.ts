import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePagoTrabajoAsignadoDto {
    @IsNumber()
    idpersonal: number;

    @IsOptional()
    @IsString()
    detalle?: string;

    @IsNumber()
    sub_total: number;

    @IsNumber()
    descuento: number;

    @IsNumber()
    total: number;

    @IsOptional()
    @IsNumber()
    idusuario?: number;

    @IsOptional()
    @IsString()
    fecha_pago?: string;

    @IsOptional()
    @IsNumber()
    id_forma_pago?: number;

    @IsArray()
    @IsNumber({}, { each: true })
    trabajosIds: number[];
}
