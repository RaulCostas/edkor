import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateDetalleOrdenTrabajoDto } from './create-detalle-orden-trabajo.dto';

export class UpdateDetalleOrdenTrabajoDto extends PartialType(CreateDetalleOrdenTrabajoDto) {
    @IsOptional()
    @IsString()
    origen?: string;

    @IsOptional()
    @IsString()
    usuario_nombre?: string;
}
