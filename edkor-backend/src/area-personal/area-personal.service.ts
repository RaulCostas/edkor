import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAreaPersonalDto } from './dto/create-area-personal.dto';
import { UpdateAreaPersonalDto } from './dto/update-area-personal.dto';
import { AreaPersonal } from './entities/area-personal.entity';

@Injectable()
export class AreaPersonalService {
    constructor(
        @InjectRepository(AreaPersonal)
        private readonly areaPersonalRepository: Repository<AreaPersonal>,
    ) { }

    create(createAreaPersonalDto: CreateAreaPersonalDto) {
        const areaPersonal = this.areaPersonalRepository.create(createAreaPersonalDto);
        return this.areaPersonalRepository.save(areaPersonal);
    }

    findAll() {
        return this.areaPersonalRepository.find({
            order: { area: 'ASC' }
        });
    }

    findOne(id: string) {
        return this.areaPersonalRepository.findOneBy({ id: +id });
    }

    async update(id: string, updateAreaPersonalDto: UpdateAreaPersonalDto) {
        const areaPersonal = await this.areaPersonalRepository.preload({
            id: +id,
            ...updateAreaPersonalDto,
        });
        if (!areaPersonal) {
            throw new NotFoundException(`AreaPersonal #${id} not found`);
        }
        return this.areaPersonalRepository.save(areaPersonal);
    }

    remove(id: string) {
        return this.areaPersonalRepository.update(+id, { estado: 'inactivo' });
    }
}
