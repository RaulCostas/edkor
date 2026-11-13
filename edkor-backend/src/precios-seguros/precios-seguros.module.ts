import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreciosSegurosService } from './precios-seguros.service';
import { PreciosSegurosController } from './precios-seguros.controller';
import { PrecioSeguro } from './entities/precio-seguro.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PrecioSeguro])],
    controllers: [PreciosSegurosController],
    providers: [PreciosSegurosService],
    exports: [PreciosSegurosService]
})
export class PreciosSegurosModule { }
