import { Module } from '@nestjs/common';
import { PagosPlanillasService } from './pagos-planillas.service';
import { PagosPlanillasController } from './pagos-planillas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagoPlanilla } from './entities/pagos-planilla.entity';
import { Planilla } from '../planillas/entities/planilla.entity';
import { FormaPago } from '../forma-pago/entities/forma-pago.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PagoPlanilla, Planilla, FormaPago, User])],
  controllers: [PagosPlanillasController],
  providers: [PagosPlanillasService],
})
export class PagosPlanillasModule { }
