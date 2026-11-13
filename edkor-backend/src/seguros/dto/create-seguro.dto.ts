import { IsOptional, IsString, MinLength, IsEmail, ValidateIf } from 'class-validator';

export class CreateSeguroDto {
    @IsString()
    @MinLength(1)
    seguro: string;

    @IsString()
    @MinLength(1)
    nit: string;

    @IsString()
    @IsOptional()
    direccion?: string;

    @IsString()
    @IsOptional()
    telefono?: string;

    @IsString()
    @IsOptional()
    celular?: string;

    @ValidateIf((o) => o.correo !== '' && o.correo !== null && o.correo !== undefined)
    @IsEmail()
    @IsOptional()
    correo?: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
