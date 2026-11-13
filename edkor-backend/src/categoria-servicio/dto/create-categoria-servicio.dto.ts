import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCategoriaServicioDto {
    @IsString()
    @MinLength(1)
    categoria_servicio: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
