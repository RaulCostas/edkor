import { PartialType } from '@nestjs/mapped-types';
import { CreateGrupoInventarioDto } from './create-grupo-inventario.dto';

export class UpdateGrupoInventarioDto extends PartialType(CreateGrupoInventarioDto) { }
