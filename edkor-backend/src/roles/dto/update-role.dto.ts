import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';
import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
    @IsOptional()
    @IsString()
    @IsIn(['activo', 'inactivo'])
    estado?: string;
}
