import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalService } from './personal.service';
import { PersonalController } from './personal.controller';
import { Personal } from './entities/personal.entity';
import { AreaPersonal } from '../area-personal/entities/area-personal.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Personal, AreaPersonal])],
    controllers: [PersonalController],
    providers: [PersonalService],
})
export class PersonalModule { }
