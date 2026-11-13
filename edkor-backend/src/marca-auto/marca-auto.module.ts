import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarcaAutoService } from './marca-auto.service';
import { MarcaAutoController } from './marca-auto.controller';
import { MarcaAuto } from './entities/marca-auto.entity';

@Module({
    imports: [TypeOrmModule.forFeature([MarcaAuto])],
    controllers: [MarcaAutoController],
    providers: [MarcaAutoService],
    exports: [MarcaAutoService],
})
export class MarcaAutoModule { }
