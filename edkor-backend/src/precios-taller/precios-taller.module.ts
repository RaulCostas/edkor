import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PreciosTallerService } from './precios-taller.service';
import { PreciosTallerController } from './precios-taller.controller';
import { PrecioTaller } from './entities/precio-taller.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PrecioTaller])],
    controllers: [PreciosTallerController],
    providers: [PreciosTallerService],
})
export class PreciosTallerModule { }
