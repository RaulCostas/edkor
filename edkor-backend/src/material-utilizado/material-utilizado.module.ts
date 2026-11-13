import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaterialUtilizado } from './entities/material-utilizado.entity';
import { MaterialUtilizadoService } from './material-utilizado.service';
import { MaterialUtilizadoController } from './material-utilizado.controller';
import { Inventario } from '../inventario/entities/inventario.entity';

@Module({
    imports: [TypeOrmModule.forFeature([MaterialUtilizado, Inventario])],
    controllers: [MaterialUtilizadoController],
    providers: [MaterialUtilizadoService],
})
export class MaterialUtilizadoModule { }
