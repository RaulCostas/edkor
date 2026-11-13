import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsDateString } from 'class-validator';

export class CreatePersonalDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsString()
    @IsNotEmpty()
    paterno: string;

    @IsString()
    @IsNotEmpty()
    materno: string;

    @IsString()
    @IsNotEmpty()
    ci: string;

    @IsDateString()
    @IsOptional()
    fecha_nacimiento?: string;

    @IsString()
    @IsOptional()
    direccion?: string;

    @IsString()
    @IsOptional()
    telefono?: string;

    @IsString()
    @IsOptional()
    celular?: string;

    @IsString()
    @IsOptional()
    ci_anverso?: string;

    @IsString()
    @IsOptional()
    ci_reverso?: string;

    @IsString()
    @IsNotEmpty()
    tipo: string;

    @IsString()
    @IsNotEmpty()
    areaId: string;

    @IsDateString()
    @IsOptional()
    fecha_ingreso?: string;

    @IsNumber()
    @IsOptional()
    salario?: number;

    @IsNumber()
    @IsOptional()
    precio_hora?: number;

    @IsString()
    @IsOptional()
    estado?: string;
}
