import { PartialType } from '@nestjs/mapped-types';
import { CreateOtroIngresoDto } from './create-otro-ingreso.dto';

export class UpdateOtroIngresoDto extends PartialType(CreateOtroIngresoDto) {}
