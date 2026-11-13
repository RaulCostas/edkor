import { Module } from '@nestjs/common';
import { FaltasService } from './faltas.service';
import { FaltasController } from './faltas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Falta } from './entities/falta.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Falta])],
    controllers: [FaltasController],
    providers: [FaltasService],
})
export class FaltasModule { }
