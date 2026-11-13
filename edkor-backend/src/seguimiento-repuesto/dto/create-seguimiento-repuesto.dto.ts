import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSeguimientoRepuestoDto {
    @IsNumber()
    id_detalle_orden_trabajo: number;

    @IsOptional()
    @IsString()
    fecha_recepcion?: string;

    @IsOptional()
    @IsString()
    encargado?: string;

    @IsOptional()
    @IsString()
    recibido?: string;

    @IsOptional()
    @IsString()
    entregado?: string;
}
