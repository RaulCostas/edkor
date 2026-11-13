import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HojaRecepcionService } from './hoja-recepcion.service';
import { HojaRecepcionController } from './hoja-recepcion.controller';
import { HojaRecepcion } from './entities/hoja-recepcion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HojaRecepcion])],
  controllers: [HojaRecepcionController],
  providers: [HojaRecepcionService],
  exports: [HojaRecepcionService],
})
export class HojaRecepcionModule {}
