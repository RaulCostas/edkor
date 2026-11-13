import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFaltaDto {
    @IsNumber()
    personal_id: number;

    @IsDateString()
    fecha: string;

    @IsDateString()
    @IsOptional()
    fecha_fin?: string;

    @IsNumber()
    @IsOptional()
    dias?: number;

    @IsString()
    motivo: string;

    @IsString()
    @IsOptional()
    observaciones?: string;

    @IsNumber()
    @IsOptional()
    usuario_id?: number;
}
