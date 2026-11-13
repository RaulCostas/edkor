import { PartialType } from '@nestjs/mapped-types';
import { CreateDetalleMaterialPedidoDto } from './create-detalle-material-pedido.dto';

export class UpdateDetalleMaterialPedidoDto extends PartialType(CreateDetalleMaterialPedidoDto) {}
