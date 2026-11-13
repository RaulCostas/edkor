import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTrabajoAsignadoDto {
    @IsNotEmpty()
    @IsNumber()
    iddetalle_orden_trabajo: number;

    @IsNotEmpty()
    @IsString()
    idpersonal: string;

    @IsNotEmpty()
    @IsDateString()
    fecha_asignado: string;

    @IsOptional()
    @IsDateString()
    fecha_entrega?: string;

    @IsOptional()
    @IsNumber()
    monto?: number;

    @IsOptional()
    @IsBoolean()
    cancelado?: boolean;

    @IsOptional()
    @IsNumber()
    tiempo_estimado?: number;

    @IsOptional()
    @IsNumber()
    costo_arancel?: number;

    @IsOptional()
    @IsNumber()
    idusuario?: number;
}
