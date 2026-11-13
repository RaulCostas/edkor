import { Module } from '@nestjs/common';
import { AnticiposService } from './anticipos.service';
import { AnticiposController } from './anticipos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Anticipo } from './entities/anticipo.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Anticipo])],
    controllers: [AnticiposController],
    providers: [AnticiposService],
})
export class AnticiposModule { }
