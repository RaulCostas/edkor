import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateRoleDto {
    @IsNotEmpty()
    @IsString()
    nombre: string;

    @IsOptional()
    @IsObject()
    permisos?: any;
}
