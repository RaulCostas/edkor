import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateInventarioDto {
    @IsOptional()
    @IsString()
    codigo?: string;

    @IsNotEmpty()
    @IsString()
    descripcion: string;

    @IsNotEmpty()
    @IsNumber()
    cantidad_existente: number;

    @IsOptional()
    @IsNumber()
    stock_inicial?: number;

    @IsOptional()
    @IsNumber()
    entradas?: number;

    @IsOptional()
    @IsNumber()
    salidas?: number;

    @IsNotEmpty()
    @IsNumber()
    stock_minimo: number;

    @IsOptional()
    @IsNumber()
    precio_compra?: number;

    @IsOptional()
    @IsNumber()
    precio_venta?: number;

    @IsOptional()
    @IsString()
    estado?: string;

    @IsNotEmpty()
    @IsString()
    idunidad_medida: string;

    @IsNotEmpty()
    @IsString()
    id_grupo_inventario: string;

    @IsOptional()
    @IsNumber()
    idusuario?: number;
}
