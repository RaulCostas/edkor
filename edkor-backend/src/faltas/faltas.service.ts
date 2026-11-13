import { Injectable } from '@nestjs/common';
import { CreateFaltaDto } from './dto/create-falta.dto';
import { UpdateFaltaDto } from './dto/update-falta.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Falta } from './entities/falta.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FaltasService {
    constructor(
        @InjectRepository(Falta)
        private faltaRepository: Repository<Falta>,
    ) { }

    create(createFaltaDto: CreateFaltaDto, sucursalId: number | null = null) {
        const falta = this.faltaRepository.create({
            ...createFaltaDto,
            sucursal: sucursalId ? { id: sucursalId } as any : null,
        });
        return this.faltaRepository.save(falta);
    }

    findAll(sucursalId: number | null = null) {
        const whereClause: any = {};
        if (sucursalId) {
            whereClause.sucursal = { id: sucursalId };
        }
        return this.faltaRepository.find({
            where: whereClause,
            order: { fecha: 'DESC' },
            relations: ['personal', 'usuario', 'sucursal']
        });
    }

    findOne(id: number) {
        return this.faltaRepository.findOne({
            where: { id },
            relations: ['personal', 'usuario']
        });
    }

    update(id: number, updateFaltaDto: UpdateFaltaDto) {
        return this.faltaRepository.update(id, updateFaltaDto);
    }

    remove(id: number) {
        return this.faltaRepository.delete(id);
    }
}
