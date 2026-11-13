import { PartialType } from '@nestjs/mapped-types';
import { CreatePagoOrdenDto } from './create-pago-orden.dto';

export class UpdatePagoOrdenDto extends PartialType(CreatePagoOrdenDto) { }
