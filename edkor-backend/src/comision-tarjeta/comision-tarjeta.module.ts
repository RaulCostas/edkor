import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComisionTarjetaService } from './comision-tarjeta.service';
import { ComisionTarjetaController } from './comision-tarjeta.controller';
import { ComisionTarjeta } from './entities/comision-tarjeta.entity';

@Module({
    imports: [TypeOrmModule.forFeature([ComisionTarjeta])],
    controllers: [ComisionTarjetaController],
    providers: [ComisionTarjetaService],
})
export class ComisionTarjetaModule { }
