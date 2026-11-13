import { PartialType } from '@nestjs/mapped-types';
import { CreatePrecioTallerDto } from './create-precio-taller.dto';

export class UpdatePrecioTallerDto extends PartialType(CreatePrecioTallerDto) { }
