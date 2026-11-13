import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMaterialPedidoDto {
    @IsNumber()
    idproveedor: number;

    @IsDateString()
    fecha: string;

    @IsNumber()
    sub_total: number;

    @IsNumber()
    descuento: number;

    @IsNumber()
    total: number;

    @IsString()
    @IsOptional()
    observaciones?: string;

    @IsBoolean()
    @IsOptional()
    pagado?: boolean;

    @IsString()
    @IsOptional()
    estado?: string;

    @IsNumber()
    @IsOptional()
    idusuario?: number;

    @IsNumber()
    @IsOptional()
    idorden_trabajo?: number;
}

