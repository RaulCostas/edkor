import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @MinLength(1)
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    @IsOptional()
    password?: string;

    @IsString()
    @IsOptional()
    foto?: string;

    @IsString()
    @IsOptional()
    estado?: string;

    @IsOptional()
    rol_id?: number;

    @IsOptional()
    personal_id?: number;

    @IsOptional()
    sucursal_id?: number;
}
