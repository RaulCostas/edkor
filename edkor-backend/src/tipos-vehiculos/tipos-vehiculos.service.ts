import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTipoVehiculoDto } from './dto/create-tipo-vehiculo.dto';
import { UpdateTipoVehiculoDto } from './dto/update-tipo-vehiculo.dto';
import { TipoVehiculo } from './entities/tipo-vehiculo.entity';

@Injectable()
export class TiposVehiculosService {
    constructor(
        @InjectRepository(TipoVehiculo)
        private tiposVehiculosRepository: Repository<TipoVehiculo>,
    ) { }

    async create(createTipoVehiculoDto: CreateTipoVehiculoDto): Promise<TipoVehiculo> {
        const nombre = createTipoVehiculoDto.tipo?.trim();
        if (!nombre) {
            throw new BadRequestException('El tipo de vehículo es obligatorio.');
        }

        const existing = await this.tiposVehiculosRepository
            .createQueryBuilder('t')
            .where('LOWER(TRIM(t.tipo)) = LOWER(:nombre)', { nombre })
            .getOne();

        if (existing) {
            if (existing.estado === 'inactivo') {
                throw new BadRequestException(`El tipo de vehículo "${nombre}" ya existe en estado inactivo. Puede reactivarlo desde el listado.`);
            }
            throw new BadRequestException(`Ya existe un tipo de vehículo con el nombre "${nombre}".`);
        }

        const tipo = this.tiposVehiculosRepository.create({
            ...createTipoVehiculoDto,
            tipo: nombre,
        });
        return await this.tiposVehiculosRepository.save(tipo);
    }

    async findAll(): Promise<TipoVehiculo[]> {
        return await this.tiposVehiculosRepository.find({
            order: { tipo: 'ASC' },
        });
    }

    async findOne(id: number): Promise<TipoVehiculo | null> {
        return await this.tiposVehiculosRepository.findOne({ where: { id } });
    }

    async update(id: number, updateTipoVehiculoDto: UpdateTipoVehiculoDto): Promise<TipoVehiculo | null> {
        if (updateTipoVehiculoDto.tipo) {
            const nombre = updateTipoVehiculoDto.tipo.trim();
            if (!nombre) {
                throw new BadRequestException('El tipo de vehículo no puede estar vacío.');
            }

            const existing = await this.tiposVehiculosRepository
                .createQueryBuilder('t')
                .where('LOWER(TRIM(t.tipo)) = LOWER(:nombre)', { nombre })
                .andWhere('t.id != :id', { id })
                .getOne();

            if (existing) {
                throw new BadRequestException(`Ya existe otro tipo de vehículo con el nombre "${nombre}".`);
            }
            updateTipoVehiculoDto.tipo = nombre;
        }

        await this.tiposVehiculosRepository.update(id, updateTipoVehiculoDto);
        return this.findOne(id);
    }

    async remove(id: number): Promise<void> {
        await this.tiposVehiculosRepository.update(id, { estado: 'inactivo' });
    }

    async reactivate(id: number): Promise<void> {
        await this.tiposVehiculosRepository.update(id, { estado: 'activo' });
    }
}
