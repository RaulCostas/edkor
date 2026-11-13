import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectoresService } from './inspectores.service';
import { InspectoresController } from './inspectores.controller';
import { Inspector } from './entities/inspector.entity';
import { Seguro } from '../seguros/entities/seguro.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Inspector, Seguro])],
    controllers: [InspectoresController],
    providers: [InspectoresService],
})
export class InspectoresModule { }
