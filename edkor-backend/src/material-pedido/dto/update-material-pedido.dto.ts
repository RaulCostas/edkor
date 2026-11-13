import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialPedidoDto } from './create-material-pedido.dto';

export class UpdateMaterialPedidoDto extends PartialType(CreateMaterialPedidoDto) {}
