import { IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDetalleOrdenTrabajoDto {
    @IsNotEmpty()
    @IsNumber()
    idorden_trabajo: number;

    @IsOptional()
    @IsString()
    idprecio_taller?: string;

    @IsOptional()
    @IsString()
    idprecio_seguro?: string;

    @IsNotEmpty()
    @IsNumber()
    cantidad: number;

    @IsNotEmpty()
    @IsNumber()
    precio_unitario: number;

    @IsNotEmpty()
    @IsNumber()
    total: number;

    @IsOptional()
    @IsString()
    nivel?: string;

    @IsOptional()
    @IsString()
    observaciones?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    imagenes?: string[];

    @IsOptional()
    @IsString()
    detalle?: string;

    @IsOptional()
    @IsNumber()
    id_inventario?: number;

    @IsOptional()
    @IsNumber()
    idpersonal_mecanico?: number;

    @IsOptional()
    @IsString()
    estado_trabajo?: string;

    @IsOptional()
    @IsNumber()
    tiempo_estimado?: number;

    @IsOptional()
    @IsNumber()
    precio_hora?: number;

    @IsOptional()
    @IsNumber()
    total_costo?: number;

    @IsOptional()
    @IsNumber()
    costo_tercero?: number;

    @IsOptional()
    @IsNumber()
    idusuario?: number;
}

export class CreateBulkDetalleOrdenTrabajoDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateDetalleOrdenTrabajoDto)
    items: CreateDetalleOrdenTrabajoDto[];
}
