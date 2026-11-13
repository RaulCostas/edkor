import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAnticipoDto {
    @IsNumber()
    personal_id: number;

    @IsDateString()
    fecha: string;

    @IsNumber()
    monto: number;

    @IsString()
    motivo: string;

    @IsString()
    @IsOptional()
    estado?: string;

    @IsString()
    @IsOptional()
    mes_aplicacion?: string;

    @IsNumber()
    @IsOptional()
    usuario_id?: number;
}
