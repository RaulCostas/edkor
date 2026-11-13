import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCorreoDto {
    @IsString()
    @IsNotEmpty()
    remitente_id: string;

    @IsString()
    @IsNotEmpty()
    destinatario_id: string;

    @IsString()
    @IsOptional()
    copia_id?: string;

    @IsString()
    @IsNotEmpty()
    asunto: string;

    @IsString()
    @IsNotEmpty()
    mensaje: string;
}
