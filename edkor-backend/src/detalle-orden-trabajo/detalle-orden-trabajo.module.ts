import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenesTrabajoModule } from '../ordenes-trabajo/ordenes-trabajo.module';
import { InventarioModule } from '../inventario/inventario.module';
import { DetalleOrdenTrabajoService } from './detalle-orden-trabajo.service';
import { DetalleOrdenTrabajoController } from './detalle-orden-trabajo.controller';
import { DetalleOrdenTrabajo } from './entities/detalle-orden-trabajo.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([DetalleOrdenTrabajo]),
        OrdenesTrabajoModule,
        InventarioModule
    ],
    controllers: [DetalleOrdenTrabajoController],
    providers: [DetalleOrdenTrabajoService],
    exports: [DetalleOrdenTrabajoService],
})
export class DetalleOrdenTrabajoModule { }
