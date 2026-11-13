import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanillasService } from './planillas.service';
import { PlanillasController } from './planillas.controller';
import { Planilla } from './entities/planilla.entity';
import { DetallePlanilla } from './entities/detalle-planilla.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Planilla, DetallePlanilla])],
  controllers: [PlanillasController],
  providers: [PlanillasService],
})
export class PlanillasModule { }
