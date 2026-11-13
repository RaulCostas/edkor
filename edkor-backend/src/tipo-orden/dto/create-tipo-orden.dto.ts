import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTipoOrdenDto {
    @IsString()
    @IsNotEmpty()
    tipo_orden: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
