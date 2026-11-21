import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    async create(createAreaPersonalDto: CreateAreaPersonalDto) {
        const nombre = createAreaPersonalDto.area?.trim();
        if (!nombre) {
            throw new BadRequestException('El nombre del área es obligatorio.');
        }

        const existing = await this.areaPersonalRepository
            .createQueryBuilder('a')
            .where('LOWER(TRIM(a.area)) = LOWER(:area)', { area: nombre })
            .getOne();

        if (existing) {
            if (existing.estado === 'inactivo') {
                throw new BadRequestException(`El área "${nombre}" ya existe en estado inactivo. Puede reactivarla desde el listado.`);
            }
            throw new BadRequestException(`Ya existe un área con el nombre "${nombre}".`);
        }

        const areaPersonal = this.areaPersonalRepository.create({
            ...createAreaPersonalDto,
            area: nombre,
        });
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
        if (updateAreaPersonalDto.area) {
            const nombre = updateAreaPersonalDto.area.trim();
            if (!nombre) {
                throw new BadRequestException('El nombre del área no puede estar vacío.');
            }

            const existing = await this.areaPersonalRepository
                .createQueryBuilder('a')
                .where('LOWER(TRIM(a.area)) = LOWER(:area)', { area: nombre })
                .andWhere('a.id != :id', { id: +id })
                .getOne();

            if (existing) {
                throw new BadRequestException(`Ya existe otra área con el nombre "${nombre}".`);
            }
            updateAreaPersonalDto.area = nombre;
        }

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
