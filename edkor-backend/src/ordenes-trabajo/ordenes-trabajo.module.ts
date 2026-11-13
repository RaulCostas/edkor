import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';
import { OrdenesTrabajoController } from './ordenes-trabajo.controller';
import { OrdenTrabajo } from './entities/orden-trabajo.entity';

@Module({
    imports: [TypeOrmModule.forFeature([OrdenTrabajo])],
    controllers: [OrdenesTrabajoController],
    providers: [OrdenesTrabajoService],
    exports: [OrdenesTrabajoService],
})
export class OrdenesTrabajoModule { }
