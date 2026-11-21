import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
        const nombre = createMarcaAutoDto.marca?.trim();
        if (!nombre) {
            throw new BadRequestException('El nombre de la marca es obligatorio.');
        }

        const existing = await this.marcaAutoRepository
            .createQueryBuilder('m')
            .where('LOWER(TRIM(m.marca)) = LOWER(:nombre)', { nombre })
            .getOne();

        if (existing) {
            if (existing.estado === 'inactivo') {
                throw new BadRequestException(`La marca "${nombre}" ya existe en estado inactivo. Puede reactivarla desde el listado.`);
            }
            throw new BadRequestException(`Ya existe una marca con el nombre "${nombre}".`);
        }

        const marca = this.marcaAutoRepository.create({
            ...createMarcaAutoDto,
            marca: nombre,
        });
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

        if (updateMarcaAutoDto.marca) {
            const nombre = updateMarcaAutoDto.marca.trim();
            if (!nombre) {
                throw new BadRequestException('El nombre de la marca no puede estar vacío.');
            }

            const existing = await this.marcaAutoRepository
                .createQueryBuilder('m')
                .where('LOWER(TRIM(m.marca)) = LOWER(:nombre)', { nombre })
                .andWhere('m.id != :id', { id })
                .getOne();

            if (existing) {
                throw new BadRequestException(`Ya existe otra marca con el nombre "${nombre}".`);
            }
            updateMarcaAutoDto.marca = nombre;
        }

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
