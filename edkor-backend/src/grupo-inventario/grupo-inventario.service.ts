import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGrupoInventarioDto } from './dto/create-grupo-inventario.dto';
import { UpdateGrupoInventarioDto } from './dto/update-grupo-inventario.dto';
import { GrupoInventario } from './entities/grupo-inventario.entity';

@Injectable()
export class GrupoInventarioService {
    constructor(
        @InjectRepository(GrupoInventario)
        private readonly grupoInventarioRepository: Repository<GrupoInventario>,
    ) { }

    async create(createGrupoInventarioDto: CreateGrupoInventarioDto) {
        const nombre = createGrupoInventarioDto.grupo?.trim();
        if (!nombre) {
            throw new BadRequestException('El nombre del grupo es obligatorio.');
        }

        const existing = await this.grupoInventarioRepository
            .createQueryBuilder('g')
            .where('LOWER(TRIM(g.grupo)) = LOWER(:grupo)', { grupo: nombre })
            .getOne();

        if (existing) {
            if (existing.estado === 'inactivo') {
                throw new BadRequestException(`El grupo de inventario "${nombre}" ya existe en estado inactivo. Puede reactivarlo desde el listado.`);
            }
            throw new BadRequestException(`Ya existe un grupo de inventario con el nombre "${nombre}".`);
        }

        const grupoInventario = this.grupoInventarioRepository.create({
            ...createGrupoInventarioDto,
            grupo: nombre,
        });
        return this.grupoInventarioRepository.save(grupoInventario);
    }

    findAll() {
        return this.grupoInventarioRepository.find({
            order: { grupo: 'ASC' }
        });
    }

    findOne(id: string) {
        return this.grupoInventarioRepository.findOneBy({ id: +id });
    }

    async update(id: string, updateGrupoInventarioDto: UpdateGrupoInventarioDto) {
        if (updateGrupoInventarioDto.grupo) {
            const nombre = updateGrupoInventarioDto.grupo.trim();
            if (!nombre) {
                throw new BadRequestException('El nombre del grupo no puede estar vacío.');
            }

            const existing = await this.grupoInventarioRepository
                .createQueryBuilder('g')
                .where('LOWER(TRIM(g.grupo)) = LOWER(:grupo)', { grupo: nombre })
                .andWhere('g.id != :id', { id: +id })
                .getOne();

            if (existing) {
                throw new BadRequestException(`Ya existe otro grupo de inventario con el nombre "${nombre}".`);
            }
            updateGrupoInventarioDto.grupo = nombre;
        }

        return this.grupoInventarioRepository.update(+id, updateGrupoInventarioDto);
    }

    remove(id: string) {
        return this.grupoInventarioRepository.update(+id, { estado: 'inactivo' });
    }
}
