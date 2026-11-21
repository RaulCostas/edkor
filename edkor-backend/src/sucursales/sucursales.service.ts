import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { Sucursal } from './entities/sucursal.entity';

@Injectable()
export class SucursalesService {
    constructor(
        @InjectRepository(Sucursal)
        private readonly sucursalRepository: Repository<Sucursal>,
    ) {}

    async create(createSucursalDto: CreateSucursalDto): Promise<Sucursal> {
        const nombre = createSucursalDto.nombre?.trim();
        if (!nombre) {
            throw new BadRequestException('El nombre de la sucursal es obligatorio.');
        }

        const existing = await this.sucursalRepository
            .createQueryBuilder('s')
            .where('LOWER(TRIM(s.nombre)) = LOWER(:nombre)', { nombre })
            .getOne();

        if (existing) {
            if (existing.estado === 'inactivo') {
                throw new BadRequestException(`La sucursal "${nombre}" ya existe en estado inactivo. Puede reactivarla desde el listado.`);
            }
            throw new BadRequestException(`Ya existe una sucursal con el nombre "${nombre}".`);
        }

        const sucursal = this.sucursalRepository.create({
            ...createSucursalDto,
            nombre,
        });
        return await this.sucursalRepository.save(sucursal);
    }

    async findAll(): Promise<Sucursal[]> {
        return await this.sucursalRepository.find({
            order: {
                nombre: 'ASC',
            },
        });
    }

    async findOne(id: number): Promise<Sucursal> {
        const sucursal = await this.sucursalRepository.findOne({ where: { id } });
        if (!sucursal) {
            throw new NotFoundException(`Sucursal with ID ${id} not found`);
        }
        return sucursal;
    }

    async update(id: number, updateSucursalDto: UpdateSucursalDto): Promise<Sucursal> {
        const sucursal = await this.findOne(id);

        if (updateSucursalDto.nombre) {
            const nombre = updateSucursalDto.nombre.trim();
            if (!nombre) {
                throw new BadRequestException('El nombre de la sucursal no puede estar vacío.');
            }

            const existing = await this.sucursalRepository
                .createQueryBuilder('s')
                .where('LOWER(TRIM(s.nombre)) = LOWER(:nombre)', { nombre })
                .andWhere('s.id != :id', { id })
                .getOne();

            if (existing) {
                throw new BadRequestException(`Ya existe otra sucursal con el nombre "${nombre}".`);
            }
            updateSucursalDto.nombre = nombre;
        }

        this.sucursalRepository.merge(sucursal, updateSucursalDto);
        return await this.sucursalRepository.save(sucursal);
    }

    async remove(id: number): Promise<void> {
        const sucursal = await this.findOne(id);
        await this.sucursalRepository.save({ ...sucursal, estado: 'inactivo' });
    }
}
