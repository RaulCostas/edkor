import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrabajosAsignadosService } from './trabajos-asignados.service';
import { TrabajosAsignadosController } from './trabajos-asignados.controller';
import { TrabajoAsignado } from './entities/trabajo-asignado.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TrabajoAsignado])],
    controllers: [TrabajosAsignadosController],
    providers: [TrabajosAsignadosService],
    exports: [TrabajosAsignadosService],
})
export class TrabajosAsignadosModule { }
