import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoOrdenService } from './tipo-orden.service';
import { TipoOrdenController } from './tipo-orden.controller';
import { TipoOrden } from './entities/tipo-orden.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TipoOrden])],
    controllers: [TipoOrdenController],
    providers: [TipoOrdenService],
})
export class TipoOrdenModule { }
