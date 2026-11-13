import { PartialType } from '@nestjs/mapped-types';
import { CreatePagoTrabajoAsignadoDto } from './create-pagos-trabajos-asignado.dto';

export class UpdatePagosTrabajosAsignadoDto extends PartialType(CreatePagoTrabajoAsignadoDto) { }
