import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePrecioSeguroDto {
    @IsNotEmpty()
    @IsString()
    idseguro: string;

    @IsNotEmpty()
    @IsString()
    idcategoria_servicio: string;

    @IsNotEmpty()
    @IsString()
    detalle: string;

    @IsOptional()
    @IsNumber()
    nivel1?: number;

    @IsOptional()
    @IsNumber()
    nivel2?: number;

    @IsOptional()
    @IsNumber()
    nivel3?: number;

    @IsOptional()
    @IsNumber()
    pintado?: number;

    @IsOptional()
    @IsNumber()
    instalacion?: number;

    @IsOptional()
    @IsString()
    estado?: string;
}
