import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateSucursalDto {
    @IsNotEmpty()
    @IsString()
    nombre: string;

    @IsNotEmpty()
    @IsString()
    direccion: string;

    @IsNotEmpty()
    @IsString()
    celular: string;

    @IsOptional()
    @IsString()
    estado?: string;
}
