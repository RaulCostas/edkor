import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagoPedidosService } from './pago-pedidos.service';
import { PagoPedidosController } from './pago-pedidos.controller';
import { PagoPedido } from './entities/pago-pedido.entity';
import { MaterialPedido } from '../material-pedido/entities/material-pedido.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PagoPedido, MaterialPedido])],
    controllers: [PagoPedidosController],
    providers: [PagoPedidosService],
})
export class PagoPedidosModule { }
