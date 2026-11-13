import { PartialType } from '@nestjs/mapped-types';
import { CreateTrabajoAsignadoDto } from './create-trabajo-asignado.dto';

export class UpdateTrabajoAsignadoDto extends PartialType(CreateTrabajoAsignadoDto) { }
