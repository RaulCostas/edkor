import { Module } from '@nestjs/common';
import { SeguimientoRepuestoService } from './seguimiento-repuesto.service';
import { SeguimientoRepuestoController } from './seguimiento-repuesto.controller';

@Module({
  controllers: [SeguimientoRepuestoController],
  providers: [SeguimientoRepuestoService],
})
export class SeguimientoRepuestoModule {}
