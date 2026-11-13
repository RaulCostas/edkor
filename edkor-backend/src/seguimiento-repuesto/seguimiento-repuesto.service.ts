import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSeguimientoRepuestoDto } from './dto/create-seguimiento-repuesto.dto';
import { UpdateSeguimientoRepuestoDto } from './dto/update-seguimiento-repuesto.dto';
import { SeguimientoRepuesto } from './entities/seguimiento-repuesto.entity';
import { DetalleOrdenTrabajo } from '../detalle-orden-trabajo/entities/detalle-orden-trabajo.entity';

@Injectable()
export class SeguimientoRepuestoService {
    constructor(
        @InjectRepository(SeguimientoRepuesto)
        private repo: Repository<SeguimientoRepuesto>,

        @InjectRepository(DetalleOrdenTrabajo)
        private detalleRepo: Repository<DetalleOrdenTrabajo>,
    ) { }

    async create(createDto: CreateSeguimientoRepuestoDto) {
        const existing = await this.repo.findOne({
            where: { detalle_orden_trabajo: { id: createDto.id_detalle_orden_trabajo } }
        });

        if (existing) {
            // Already exists, update it instead of crashing
            return this.update(existing.id, createDto);
        }

        const detalle = await this.detalleRepo.findOneBy({ id: createDto.id_detalle_orden_trabajo });
        if (!detalle) {
            throw new Error('Detalle de orden no encontrado');
        }

        const nuevoSeguimiento = this.repo.create({
            ...createDto,
            detalle_orden_trabajo: detalle,
        });
        return this.repo.save(nuevoSeguimiento);
    }

    async findAll() {
        return this.repo.find({ relations: ['detalle_orden_trabajo'] });
    }

    async findOne(id: number) {
        return this.repo.findOne({ where: { id }, relations: ['detalle_orden_trabajo'] });
    }

    async findByDetalle(idDetalle: number) {
        return this.repo.findOne({
            where: { detalle_orden_trabajo: { id: idDetalle } },
            relations: ['detalle_orden_trabajo']
        });
    }

    async update(id: number, updateDto: UpdateSeguimientoRepuestoDto) {
        await this.repo.update(id, updateDto);
        return this.findOne(id);
    }

    async remove(id: number) {
        return this.repo.delete(id);
    }
}
