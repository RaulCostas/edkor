import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUnidadMedidaDto {
    @IsString()
    @IsNotEmpty()
    medida: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
