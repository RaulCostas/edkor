import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTrabajoAsignadoDto } from './dto/create-trabajo-asignado.dto';
import { UpdateTrabajoAsignadoDto } from './dto/update-trabajo-asignado.dto';
import { TrabajoAsignado } from './entities/trabajo-asignado.entity';

@Injectable()
export class TrabajosAsignadosService {
    constructor(
        @InjectRepository(TrabajoAsignado)
        private trabajosAsignadosRepository: Repository<TrabajoAsignado>,
    ) { }

    async create(createTrabajoAsignadoDto: CreateTrabajoAsignadoDto): Promise<TrabajoAsignado> {
        const { iddetalle_orden_trabajo, idpersonal, ...rest } = createTrabajoAsignadoDto;
        const trabajo = this.trabajosAsignadosRepository.create({
            ...rest,
            detalle_orden_trabajo: { id: +iddetalle_orden_trabajo } as any,
            personal: { id: +idpersonal } as any,
        });
        const saved = await this.trabajosAsignadosRepository.save(trabajo);

        // Fetch with relations to return complete object
        const result = await this.trabajosAsignadosRepository.findOne({
            where: { id: saved.id },
            relations: ['detalle_orden_trabajo', 'personal'],
        });

        if (!result) {
            throw new Error('Failed to retrieve created trabajo asignado');
        }

        return result;
    }

    async findAll(): Promise<TrabajoAsignado[]> {
        return await this.trabajosAsignadosRepository.find({
            relations: ['detalle_orden_trabajo', 'personal'],
        });
    }

    async findByDetalle(idDetalle: number): Promise<TrabajoAsignado | null> {
        return await this.trabajosAsignadosRepository.findOne({
            where: { iddetalle_orden_trabajo: idDetalle } as any,
            relations: ['detalle_orden_trabajo', 'personal'],
        });
    }

    async findOne(id: number): Promise<TrabajoAsignado | null> {
        return await this.trabajosAsignadosRepository.findOne({
            where: { id },
            relations: ['detalle_orden_trabajo', 'personal'],
        });
    }

    async update(id: number, updateTrabajoAsignadoDto: UpdateTrabajoAsignadoDto): Promise<TrabajoAsignado | null> {
        const updateData: any = { ...updateTrabajoAsignadoDto };

        if (updateTrabajoAsignadoDto.iddetalle_orden_trabajo) {
            updateData.detalle_orden_trabajo = { id: +updateTrabajoAsignadoDto.iddetalle_orden_trabajo };
            delete updateData.iddetalle_orden_trabajo;
        }

        if (updateTrabajoAsignadoDto.idpersonal) {
            updateData.personal = { id: +updateTrabajoAsignadoDto.idpersonal };
            delete updateData.idpersonal;
        }

        await this.trabajosAsignadosRepository.update(id, updateData);

        // Fetch with relations to return complete object
        return await this.trabajosAsignadosRepository.findOne({
            where: { id },
            relations: ['detalle_orden_trabajo', 'personal'],
        });
    }

    async findByFilter(filters: any): Promise<TrabajoAsignado[]> {
        const { personalId, fechaInicio, fechaFin, terminado, ordenEstado, soloMecanicos } = filters;
        const query = this.trabajosAsignadosRepository.createQueryBuilder('trabajo')
            .leftJoinAndSelect('trabajo.detalle_orden_trabajo', 'detalle')
            .leftJoinAndSelect('detalle.precio_taller', 'precio_taller')
            .leftJoinAndSelect('detalle.orden_trabajo', 'orden')
            .leftJoinAndSelect('orden.marca_auto', 'marca')
            .leftJoinAndSelect('trabajo.personal', 'personal')
            .leftJoinAndSelect('personal.area', 'area')
            .leftJoinAndSelect('trabajo.pago_trabajo', 'pago')
            .leftJoinAndSelect('pago.forma_pago', 'forma_pago')
            .leftJoinAndSelect('trabajo.planilla', 'planilla')
            .where("(detalle.estado_trabajo IS NULL OR detalle.estado_trabajo != 'descartado')");

        if (personalId) {
            query.andWhere('personal.id = :personalId', { personalId });
        }

        if (fechaInicio) {
            query.andWhere('COALESCE(trabajo.fecha_entrega, trabajo.fecha_asignado, DATE(orden.fecha_registro)) >= :fechaInicio', { fechaInicio });
        }

        if (fechaFin) {
            query.andWhere('COALESCE(trabajo.fecha_entrega, trabajo.fecha_asignado, DATE(orden.fecha_registro)) <= :fechaFin', { fechaFin });
        }

        if (terminado !== undefined && terminado !== 'all' && terminado !== '') {
            if (terminado === 'true') {
                query.andWhere('(trabajo.fecha_entrega IS NOT NULL OR orden.estado = :term OR orden.estado = :cerrada)', { term: 'terminado', cerrada: 'cerrada' });
            } else if (terminado === 'false') {
                query.andWhere('trabajo.fecha_entrega IS NULL');
            }
        }

        if (ordenEstado) {
            if (ordenEstado === 'terminado' || ordenEstado === 'terminados') {
                query.andWhere('(LOWER(orden.estado) LIKE :term1 OR LOWER(orden.estado) LIKE :term2 OR LOWER(orden.estado) LIKE :term3)', {
                    term1: 'terminad%',
                    term2: 'finaliz%',
                    term3: '%cerrad%'
                });
            } else {
                query.andWhere('LOWER(orden.estado) = :ordEst', { ordEst: ordenEstado.toLowerCase() });
            }
        }

        if (soloMecanicos === true || soloMecanicos === 'true') {
            query.andWhere('(LOWER(area.area) LIKE :mec1 OR LOWER(area.area) LIKE :mec2)', {
                mec1: '%mecanic%',
                mec2: '%mecánic%'
            });
        }

        return await query.orderBy('trabajo.id', 'DESC').getMany();
    }

    async remove(id: number): Promise<void> {
        const existing = await this.findOne(id);
        if (existing?.cancelado || existing?.idplanilla) {
            throw new BadRequestException('No se puede eliminar este trabajo asignado porque ya fue pagado en planilla.');
        }
        await this.trabajosAsignadosRepository.delete(id);
    }
}
