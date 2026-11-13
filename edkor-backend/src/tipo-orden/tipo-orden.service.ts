import { Injectable, NotFoundException } from '@nestjs/common';
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

    create(createTipoOrdenDto: CreateTipoOrdenDto) {
        const tipoOrden = this.tipoOrdenRepository.create(createTipoOrdenDto);
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
