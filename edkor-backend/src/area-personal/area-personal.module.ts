import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreaPersonalService } from './area-personal.service';
import { AreaPersonalController } from './area-personal.controller';
import { AreaPersonal } from './entities/area-personal.entity';

@Module({
    imports: [TypeOrmModule.forFeature([AreaPersonal])],
    controllers: [AreaPersonalController],
    providers: [AreaPersonalService],
})
export class AreaPersonalModule { }
