import { IsNotEmpty, IsOptional, IsString, IsNumber, IsDateString, ValidateIf } from 'class-validator';

export class CreatePersonalDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsString()
    @IsNotEmpty()
    paterno: string;

    @IsString()
    @IsOptional()
    materno?: string;

    @IsString()
    @IsNotEmpty()
    ci: string;

    @ValidateIf((o) => o.fecha_nacimiento && String(o.fecha_nacimiento).trim() !== '')
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

    @IsNotEmpty()
    areaId: string;

    @ValidateIf((o) => o.fecha_ingreso && String(o.fecha_ingreso).trim() !== '')
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
