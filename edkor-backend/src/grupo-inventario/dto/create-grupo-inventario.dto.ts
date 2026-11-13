import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGrupoInventarioDto {
    @IsString()
    @IsNotEmpty()
    grupo: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
