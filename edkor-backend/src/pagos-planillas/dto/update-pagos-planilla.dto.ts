import { PartialType } from '@nestjs/mapped-types';
import { CreatePagosPlanillaDto } from './create-pagos-planilla.dto';

export class UpdatePagosPlanillaDto extends PartialType(CreatePagosPlanillaDto) {}
