import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompraInsumosService } from './compra-insumos.service';
import { CompraInsumosController } from './compra-insumos.controller';
import { CompraInsumo } from './entities/compra-insumo.entity';

@Module({
    imports: [TypeOrmModule.forFeature([CompraInsumo])],
    controllers: [CompraInsumosController],
    providers: [CompraInsumosService],
})
export class CompraInsumosModule { }
