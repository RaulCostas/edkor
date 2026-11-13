import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrupoInventarioService } from './grupo-inventario.service';
import { GrupoInventarioController } from './grupo-inventario.controller';
import { GrupoInventario } from './entities/grupo-inventario.entity';

@Module({
    imports: [TypeOrmModule.forFeature([GrupoInventario])],
    controllers: [GrupoInventarioController],
    providers: [GrupoInventarioService],
})
export class GrupoInventarioModule { }
