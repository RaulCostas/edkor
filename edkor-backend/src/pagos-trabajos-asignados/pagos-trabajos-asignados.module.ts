import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagoTrabajoAsignado } from './entities/pagos-trabajos-asignado.entity';
import { PagosTrabajosAsignadosController } from './pagos-trabajos-asignados.controller';
import { PagosTrabajosAsignadosService } from './pagos-trabajos-asignados.service';

@Module({
  imports: [TypeOrmModule.forFeature([PagoTrabajoAsignado])],
  controllers: [PagosTrabajosAsignadosController],
  providers: [PagosTrabajosAsignadosService],
})
export class PagosTrabajosAsignadosModule { }
