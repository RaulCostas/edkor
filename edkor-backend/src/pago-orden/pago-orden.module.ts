import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagoOrdenService } from './pago-orden.service';
import { PagoOrdenController } from './pago-orden.controller';
import { PagoOrden } from './entities/pago-orden.entity';
import { OrdenTrabajo } from '../ordenes-trabajo/entities/orden-trabajo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PagoOrden, OrdenTrabajo])],
  controllers: [PagoOrdenController],
  providers: [PagoOrdenService],
  exports: [PagoOrdenService],
})
export class PagoOrdenModule { }
