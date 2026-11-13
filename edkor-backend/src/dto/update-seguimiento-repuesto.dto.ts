import { PartialType } from '@nestjs/mapped-types';
import { CreateSeguimientoRepuestoDto } from './create-seguimiento-repuesto.dto';

export class UpdateSeguimientoRepuestoDto extends PartialType(CreateSeguimientoRepuestoDto) {}
