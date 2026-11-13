import { IsNotEmpty, IsNumber, IsString, IsIn, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ItemPrecioTallerDto {
    @IsNotEmpty()
    @IsString()
    detalle: string;

    @IsOptional()
    @IsNumber()
    precio: number;
}

export class CreatePrecioTallerDto {
    @IsOptional()
    @IsString()
    codigo?: string;

    @IsNotEmpty()
    @IsString()
    idcategoria_servicio: string;

    @IsNotEmpty()
    @IsString()
    detalle: string;

    @IsNotEmpty()
    @IsNumber()
    precio: number;

    @IsNotEmpty()
    @IsNumber()
    tiempo_estimado: number;

    @IsNotEmpty()
    @IsNumber()
    precio_hora: number;

    @IsOptional()
    @IsNumber()
    total_costo?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ItemPrecioTallerDto)
    items?: ItemPrecioTallerDto[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    revisiones?: string[];

    @IsNotEmpty()
    @IsString()
    @IsIn(['activo', 'inactivo'])
    estado: string;
}
