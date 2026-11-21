import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtrosIngresosService } from './otros-ingresos.service';
import { OtrosIngresosController } from './otros-ingresos.controller';
import { OtroIngreso } from './entities/otro-ingreso.entity';
import { InventarioModule } from '../inventario/inventario.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OtroIngreso]),
    InventarioModule,
  ],
  controllers: [OtrosIngresosController],
  providers: [OtrosIngresosService],
  exports: [OtrosIngresosService],
})
export class OtrosIngresosModule {}
