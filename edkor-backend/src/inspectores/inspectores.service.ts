import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInspectorDto } from './dto/create-inspector.dto';
import { UpdateInspectorDto } from './dto/update-inspector.dto';
import { Inspector } from './entities/inspector.entity';
import { Seguro } from '../seguros/entities/seguro.entity';

@Injectable()
export class InspectoresService {
    constructor(
        @InjectRepository(Inspector)
        private readonly inspectorRepository: Repository<Inspector>,
        @InjectRepository(Seguro)
        private readonly seguroRepository: Repository<Seguro>,
    ) { }

    async create(createInspectorDto: CreateInspectorDto) {
        const seguro = await this.seguroRepository.findOneBy({ id: +createInspectorDto.seguroId });
        if (!seguro) {
            throw new NotFoundException('Seguro no encontrado');
        }

        const inspector = this.inspectorRepository.create({
            ...createInspectorDto,
            seguro,
        });
        return this.inspectorRepository.save(inspector);
    }

    findAll() {
        return this.inspectorRepository.find({
            relations: ['seguro'],
            order: { inspector: 'ASC' }
        });
    }

    findOne(id: string) {
        return this.inspectorRepository.findOne({
            where: { id: +id },
            relations: ['seguro']
        });
    }

    async update(id: string, updateInspectorDto: UpdateInspectorDto) {
        const inspector = await this.inspectorRepository.findOneBy({ id: +id });
        if (!inspector) {
            throw new NotFoundException('Inspector no encontrado');
        }

        if (updateInspectorDto.seguroId) {
            const seguro = await this.seguroRepository.findOneBy({ id: +updateInspectorDto.seguroId });
            if (!seguro) {
                throw new NotFoundException('Seguro no encontrado');
            }
            inspector.seguro = seguro;
        }

        Object.assign(inspector, updateInspectorDto);
        return this.inspectorRepository.save(inspector);
    }

    remove(id: string) {
        return this.inspectorRepository.update(+id, { estado: 'inactivo' });
    }
}
