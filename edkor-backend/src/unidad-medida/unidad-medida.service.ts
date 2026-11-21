import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { UnidadMedida } from './entities/unidad-medida.entity';

@Injectable()
export class UnidadMedidaService {
    constructor(
        @InjectRepository(UnidadMedida)
        private readonly unidadMedidaRepository: Repository<UnidadMedida>,
    ) { }

    async create(createUnidadMedidaDto: CreateUnidadMedidaDto) {
        const nombre = createUnidadMedidaDto.medida?.trim();
        if (!nombre) {
            throw new BadRequestException('El nombre de la unidad de medida es obligatorio.');
        }

        const existing = await this.unidadMedidaRepository
            .createQueryBuilder('u')
            .where('LOWER(TRIM(u.medida)) = LOWER(:nombre)', { nombre })
            .getOne();

        if (existing) {
            if (existing.estado === 'inactivo') {
                throw new BadRequestException(`La unidad de medida "${nombre}" ya existe en estado inactivo. Puede reactivarla desde el listado.`);
            }
            throw new BadRequestException(`Ya existe una unidad de medida con el nombre "${nombre}".`);
        }

        const unidadMedida = this.unidadMedidaRepository.create({
            ...createUnidadMedidaDto,
            medida: nombre,
        });
        return this.unidadMedidaRepository.save(unidadMedida);
    }

    findAll() {
        return this.unidadMedidaRepository.find({
            order: { medida: 'ASC' }
        });
    }

    findOne(id: string) {
        return this.unidadMedidaRepository.findOneBy({ id: +id });
    }

    async update(id: string, updateUnidadMedidaDto: UpdateUnidadMedidaDto) {
        if (updateUnidadMedidaDto.medida) {
            const nombre = updateUnidadMedidaDto.medida.trim();
            if (!nombre) {
                throw new BadRequestException('El nombre de la unidad de medida no puede estar vacío.');
            }

            const existing = await this.unidadMedidaRepository
                .createQueryBuilder('u')
                .where('LOWER(TRIM(u.medida)) = LOWER(:nombre)', { nombre })
                .andWhere('u.id != :id', { id: +id })
                .getOne();

            if (existing) {
                throw new BadRequestException(`Ya existe otra unidad de medida con el nombre "${nombre}".`);
            }
            updateUnidadMedidaDto.medida = nombre;
        }

        return this.unidadMedidaRepository.update(+id, updateUnidadMedidaDto);
    }

    remove(id: string) {
        return this.unidadMedidaRepository.update(+id, { estado: 'inactivo' });
    }
}
