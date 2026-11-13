import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeguimientoRepuestoService } from './seguimiento-repuesto.service';
import { SeguimientoRepuestoController } from './seguimiento-repuesto.controller';
import { SeguimientoRepuesto } from './entities/seguimiento-repuesto.entity';
import { DetalleOrdenTrabajo } from '../detalle-orden-trabajo/entities/detalle-orden-trabajo.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SeguimientoRepuesto, DetalleOrdenTrabajo])],
    controllers: [SeguimientoRepuestoController],
    providers: [SeguimientoRepuestoService],
    exports: [SeguimientoRepuestoService],
})
export class SeguimientoRepuestoModule { }
