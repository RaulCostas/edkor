import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialPedidoService } from './material-pedido.service';
import { MaterialPedidoController } from './material-pedido.controller';
import { MaterialPedido } from './entities/material-pedido.entity';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MaterialPedido]),
    InventarioModule,
  ],
  controllers: [MaterialPedidoController],
  providers: [MaterialPedidoService],
  exports: [MaterialPedidoService]
})
export class MaterialPedidoModule { }
