import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoriaServicioDto } from './dto/create-categoria-servicio.dto';
import { UpdateCategoriaServicioDto } from './dto/update-categoria-servicio.dto';
import { CategoriaServicio } from './entities/categoria-servicio.entity';

@Injectable()
export class CategoriaServicioService {
    constructor(
        @InjectRepository(CategoriaServicio)
        private readonly categoriaServicioRepository: Repository<CategoriaServicio>,
    ) { }

    async create(createCategoriaServicioDto: CreateCategoriaServicioDto) {
        const nombre = createCategoriaServicioDto.categoria_servicio?.trim();
        if (!nombre) {
            throw new BadRequestException('El nombre de la categoría es obligatorio.');
        }

        const existing = await this.categoriaServicioRepository
            .createQueryBuilder('c')
            .where('LOWER(TRIM(c.categoria_servicio)) = LOWER(:nombre)', { nombre })
            .getOne();

        if (existing) {
            if (existing.estado === 'inactivo') {
                throw new BadRequestException(`La categoría de servicio "${nombre}" ya existe en estado inactivo. Puede reactivarla desde el listado.`);
            }
            throw new BadRequestException(`Ya existe una categoría de servicio con el nombre "${nombre}".`);
        }

        const categoriaServicio = this.categoriaServicioRepository.create({
            ...createCategoriaServicioDto,
            categoria_servicio: nombre,
        });
        return this.categoriaServicioRepository.save(categoriaServicio);
    }

    findAll() {
        return this.categoriaServicioRepository.find({
            order: { categoria_servicio: 'ASC' }
        });
    }

    findOne(id: string) {
        return this.categoriaServicioRepository.findOneBy({ id: +id });
    }

    async update(id: string, updateCategoriaServicioDto: UpdateCategoriaServicioDto) {
        if (updateCategoriaServicioDto.categoria_servicio) {
            const nombre = updateCategoriaServicioDto.categoria_servicio.trim();
            if (!nombre) {
                throw new BadRequestException('El nombre de la categoría no puede estar vacío.');
            }

            const existing = await this.categoriaServicioRepository
                .createQueryBuilder('c')
                .where('LOWER(TRIM(c.categoria_servicio)) = LOWER(:nombre)', { nombre })
                .andWhere('c.id != :id', { id: +id })
                .getOne();

            if (existing) {
                throw new BadRequestException(`Ya existe otra categoría de servicio con el nombre "${nombre}".`);
            }
            updateCategoriaServicioDto.categoria_servicio = nombre;
        }

        return this.categoriaServicioRepository.update(+id, updateCategoriaServicioDto);
    }

    remove(id: string) {
        return this.categoriaServicioRepository.update(+id, { estado: 'inactivo' });
    }
}
