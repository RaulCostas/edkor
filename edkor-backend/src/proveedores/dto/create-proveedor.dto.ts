import { IsNotEmpty, IsOptional, IsString, IsEmail, ValidateIf } from 'class-validator';

export class CreateProveedorDto {
    @IsString()
    @IsNotEmpty()
    proveedor: string;

    @IsString()
    @IsNotEmpty()
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

    @ValidateIf((o) => o.email !== '' && o.email !== null && o.email !== undefined)
    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    contacto?: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
