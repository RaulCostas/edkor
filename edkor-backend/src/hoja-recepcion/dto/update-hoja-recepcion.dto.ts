import { PartialType } from '@nestjs/mapped-types';
import { CreateHojaRecepcionDto } from './create-hoja-recepcion.dto';

export class UpdateHojaRecepcionDto extends PartialType(CreateHojaRecepcionDto) {}
