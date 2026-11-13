import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaServicioService } from './categoria-servicio.service';
import { CategoriaServicioController } from './categoria-servicio.controller';
import { CategoriaServicio } from './entities/categoria-servicio.entity';

@Module({
    imports: [TypeOrmModule.forFeature([CategoriaServicio])],
    controllers: [CategoriaServicioController],
    providers: [CategoriaServicioService],
})
export class CategoriaServicioModule { }
