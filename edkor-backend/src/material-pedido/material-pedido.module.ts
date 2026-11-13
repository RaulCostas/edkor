import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialPedidoService } from './material-pedido.service';
import { MaterialPedidoController } from './material-pedido.controller';
import { MaterialPedido } from './entities/material-pedido.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MaterialPedido])],
  controllers: [MaterialPedidoController],
  providers: [MaterialPedidoService],
  exports: [MaterialPedidoService]
})
export class MaterialPedidoModule { }
