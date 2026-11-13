import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { MarcaAuto } from './entities/marca-auto.entity';
import { CreateMarcaAutoDto } from './dto/create-marca-auto.dto';
import { UpdateMarcaAutoDto } from './dto/create-marca-auto.dto';

@Injectable()
export class MarcaAutoService {
    constructor(
        @InjectRepository(MarcaAuto)
        private readonly marcaAutoRepository: Repository<MarcaAuto>,
    ) { }

    async create(createMarcaAutoDto: CreateMarcaAutoDto): Promise<MarcaAuto> {
        const marca = this.marcaAutoRepository.create(createMarcaAutoDto);
        return await this.marcaAutoRepository.save(marca);
    }

    async findAll(search?: string, limit?: number, offset?: number): Promise<{ data: MarcaAuto[], total: number }> {
        const where = search ? [
            { marca: ILike(`%${search}%`) },
            { estado: ILike(`%${search}%`) }
        ] : {};

        const [data, total] = await this.marcaAutoRepository.findAndCount({
            where,
            order: { id: 'DESC' },
            take: limit,
            skip: offset,
        });

        return { data, total };
    }

    async findAllMarcas(): Promise<MarcaAuto[]> {
        return await this.marcaAutoRepository.find({
            order: { marca: 'ASC' },
        });
    }


    async findOne(id: number): Promise<MarcaAuto> {
        const marca = await this.marcaAutoRepository.findOne({ where: { id } });
        if (!marca) {
            throw new NotFoundException(`Marca de auto con ID ${id} no encontrada`);
        }
        return marca;
    }

    async update(id: number, updateMarcaAutoDto: UpdateMarcaAutoDto): Promise<MarcaAuto> {
        const marca = await this.findOne(id);
        Object.assign(marca, updateMarcaAutoDto);
        return await this.marcaAutoRepository.save(marca);
    }

    async remove(id: number): Promise<void> {
        const marca = await this.findOne(id);
        marca.estado = 'inactivo';
        await this.marcaAutoRepository.save(marca);
    }

    async reactivate(id: number): Promise<MarcaAuto> {
        const marca = await this.findOne(id);
        marca.estado = 'activo';
        return await this.marcaAutoRepository.save(marca);
    }
}
