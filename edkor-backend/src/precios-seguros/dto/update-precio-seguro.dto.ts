import { PartialType } from '@nestjs/mapped-types';
import { CreatePrecioSeguroDto } from './create-precio-seguro.dto';

export class UpdatePrecioSeguroDto extends PartialType(CreatePrecioSeguroDto) { }
