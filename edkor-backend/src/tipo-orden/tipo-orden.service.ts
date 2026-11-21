import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTipoOrdenDto } from './dto/create-tipo-orden.dto';
import { UpdateTipoOrdenDto } from './dto/update-tipo-orden.dto';
import { TipoOrden } from './entities/tipo-orden.entity';

@Injectable()
export class TipoOrdenService {
    constructor(
        @InjectRepository(TipoOrden)
        private readonly tipoOrdenRepository: Repository<TipoOrden>,
    ) { }

    async create(createTipoOrdenDto: CreateTipoOrdenDto) {
        const nombre = createTipoOrdenDto.tipo_orden?.trim();
        if (!nombre) {
            throw new BadRequestException('El nombre del tipo de orden es obligatorio.');
        }

        const existing = await this.tipoOrdenRepository
            .createQueryBuilder('t')
            .where('LOWER(TRIM(t.tipo_orden)) = LOWER(:nombre)', { nombre })
            .getOne();

        if (existing) {
            if (existing.estado === 'inactivo') {
                throw new BadRequestException(`El tipo de orden "${nombre}" ya existe en estado inactivo. Puede reactivarlo desde el listado.`);
            }
            throw new BadRequestException(`Ya existe un tipo de orden con el nombre "${nombre}".`);
        }

        const tipoOrden = this.tipoOrdenRepository.create({
            ...createTipoOrdenDto,
            tipo_orden: nombre,
        });
        return this.tipoOrdenRepository.save(tipoOrden);
    }

    findAll() {
        return this.tipoOrdenRepository.find({
            order: { tipo_orden: 'ASC' }
        });
    }

    async findEnHojasRecepcion() {
        const rows = await this.tipoOrdenRepository.manager.query(
            `SELECT DISTINCT t.id, t.tipo_orden, t.estado
             FROM tipos_orden t
             INNER JOIN hoja_recepcion h ON h.tipo_orden_id = t.id
             ORDER BY t.tipo_orden ASC`
        );
        return rows;
    }

    findOne(id: string) {
        return this.tipoOrdenRepository.findOneBy({ id: +id });
    }

    async update(id: string, updateTipoOrdenDto: UpdateTipoOrdenDto) {
        if (updateTipoOrdenDto.tipo_orden) {
            const nombre = updateTipoOrdenDto.tipo_orden.trim();
            if (!nombre) {
                throw new BadRequestException('El nombre del tipo de orden no puede estar vacío.');
            }

            const existing = await this.tipoOrdenRepository
                .createQueryBuilder('t')
                .where('LOWER(TRIM(t.tipo_orden)) = LOWER(:nombre)', { nombre })
                .andWhere('t.id != :id', { id: +id })
                .getOne();

            if (existing) {
                throw new BadRequestException(`Ya existe otro tipo de orden con el nombre "${nombre}".`);
            }
            updateTipoOrdenDto.tipo_orden = nombre;
        }

        const tipoOrden = await this.tipoOrdenRepository.preload({
            id: +id,
            ...updateTipoOrdenDto,
        });
        if (!tipoOrden) {
            throw new NotFoundException(`TipoOrden #${id} not found`);
        }
        return this.tipoOrdenRepository.save(tipoOrden);
    }

    remove(id: string) {
        return this.tipoOrdenRepository.update(+id, { estado: 'inactivo' });
    }
}
