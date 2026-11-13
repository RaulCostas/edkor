import { Injectable } from '@nestjs/common';
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
        const tipo = this.tiposVehiculosRepository.create(createTipoVehiculoDto);
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
