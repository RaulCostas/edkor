import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposVehiculosService } from './tipos-vehiculos.service';
import { TiposVehiculosController } from './tipos-vehiculos.controller';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TipoVehiculo])],
    controllers: [TiposVehiculosController],
    providers: [TiposVehiculosService],
})
export class TiposVehiculosModule { }
