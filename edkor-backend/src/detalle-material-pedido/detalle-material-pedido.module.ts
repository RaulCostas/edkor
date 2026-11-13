import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetalleMaterialPedidoService } from './detalle-material-pedido.service';
import { DetalleMaterialPedidoController } from './detalle-material-pedido.controller';
import { DetalleMaterialPedido } from './entities/detalle-material-pedido.entity';
import { Inventario } from '../inventario/entities/inventario.entity';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DetalleMaterialPedido, Inventario]),
    InventarioModule,
  ],
  controllers: [DetalleMaterialPedidoController],
  providers: [DetalleMaterialPedidoService],
})
export class DetalleMaterialPedidoModule { }
