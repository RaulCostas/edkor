import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateComisionTarjetaDto } from './dto/create-comision-tarjeta.dto';
import { UpdateComisionTarjetaDto } from './dto/update-comision-tarjeta.dto';
import { ComisionTarjeta } from './entities/comision-tarjeta.entity';

@Injectable()
export class ComisionTarjetaService {
    constructor(
        @InjectRepository(ComisionTarjeta)
        private readonly comisionTarjetaRepository: Repository<ComisionTarjeta>,
    ) { }

    async create(createComisionTarjetaDto: CreateComisionTarjetaDto): Promise<ComisionTarjeta> {
        const comisionTarjeta = this.comisionTarjetaRepository.create(createComisionTarjetaDto);
        return await this.comisionTarjetaRepository.save(comisionTarjeta);
    }

    async findAll(): Promise<ComisionTarjeta[]> {
        return await this.comisionTarjetaRepository.find({
            order: {
                red_banco: 'ASC',
            },
        });
    }

    async findOne(id: number): Promise<ComisionTarjeta> {
        const comisionTarjeta = await this.comisionTarjetaRepository.findOne({ where: { id } });
        if (!comisionTarjeta) {
            throw new NotFoundException(`ComisionTarjeta with ID ${id} not found`);
        }
        return comisionTarjeta;
    }

    async update(id: number, updateComisionTarjetaDto: UpdateComisionTarjetaDto): Promise<ComisionTarjeta> {
        const comisionTarjeta = await this.findOne(id);
        this.comisionTarjetaRepository.merge(comisionTarjeta, updateComisionTarjetaDto);
        return await this.comisionTarjetaRepository.save(comisionTarjeta);
    }

    async remove(id: number): Promise<void> {
        const comisionTarjeta = await this.findOne(id);
        await this.comisionTarjetaRepository.save({ ...comisionTarjeta, estado: 'inactivo' });
    }
}
