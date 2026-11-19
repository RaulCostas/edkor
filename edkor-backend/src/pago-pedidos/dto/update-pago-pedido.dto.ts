import { PartialType } from '@nestjs/mapped-types';
import { CreatePagoPedidoDto } from './create-pago-pedido.dto';

export class UpdatePagoPedidoDto extends PartialType(CreatePagoPedidoDto) {}
