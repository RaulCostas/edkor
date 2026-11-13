import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioService } from './inventario.service';
import { InventarioController } from './inventario.controller';
import { Inventario } from './entities/inventario.entity';
import { InventarioLote } from './entities/inventario-lote.entity';
import { InventarioMovimiento } from './entities/inventario-movimiento.entity';
import { InventarioDevolucion } from './entities/inventario-devolucion.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Inventario, InventarioLote, InventarioMovimiento, InventarioDevolucion])],
    controllers: [InventarioController],
    providers: [InventarioService],
    exports: [InventarioService],
})
export class InventarioModule { }
