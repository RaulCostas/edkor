import { IsNotEmpty, IsOptional, IsString, IsUUID, IsEmail, ValidateIf } from 'class-validator';

export class CreateInspectorDto {
    @IsNotEmpty()
    @IsString()
    seguroId: string;

    @IsString()
    @IsNotEmpty()
    inspector: string;

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
