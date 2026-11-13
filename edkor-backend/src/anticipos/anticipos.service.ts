import { Injectable } from '@nestjs/common';
import { CreateAnticipoDto } from './dto/create-anticipo.dto';
import { UpdateAnticipoDto } from './dto/update-anticipo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Anticipo } from './entities/anticipo.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AnticiposService {
    constructor(
        @InjectRepository(Anticipo)
        private anticipoRepository: Repository<Anticipo>,
    ) { }

    create(createAnticipoDto: CreateAnticipoDto, sucursalId: number | null = null) {
        const anticipo = this.anticipoRepository.create({
            ...createAnticipoDto,
            sucursal: sucursalId ? { id: sucursalId } as any : null,
        });
        return this.anticipoRepository.save(anticipo);
    }

    findAll(sucursalId: number | null = null) {
        const whereClause: any = {};
        if (sucursalId) {
            whereClause.sucursal = { id: sucursalId };
        }
        return this.anticipoRepository.find({
            where: whereClause,
            order: { fecha: 'DESC' },
            relations: ['personal', 'usuario', 'sucursal']
        });
    }

    findOne(id: number) {
        return this.anticipoRepository.findOne({
            where: { id },
            relations: ['personal', 'usuario']
        });
    }

    update(id: number, updateAnticipoDto: UpdateAnticipoDto) {
        return this.anticipoRepository.update(id, updateAnticipoDto);
    }

    remove(id: number) {
        return this.anticipoRepository.delete(id);
    }
}
