import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrecioSeguro } from './entities/precio-seguro.entity';
import { CreatePrecioSeguroDto } from './dto/create-precio-seguro.dto';
import { UpdatePrecioSeguroDto } from './dto/update-precio-seguro.dto';

@Injectable()
export class PreciosSegurosService {
    constructor(
        @InjectRepository(PrecioSeguro)
        private readonly precioSeguroRepository: Repository<PrecioSeguro>,
    ) { }

    async create(createPrecioSeguroDto: CreatePrecioSeguroDto): Promise<PrecioSeguro> {
        const { idseguro, idcategoria_servicio, ...rest } = createPrecioSeguroDto;
        const precio = this.precioSeguroRepository.create({
            ...rest,
            seguro: { id: +idseguro },
            categoria: { id: +idcategoria_servicio }
        });
        return await this.precioSeguroRepository.save(precio);
    }

    async findAll(): Promise<PrecioSeguro[]> {
        return await this.precioSeguroRepository.find({
            relations: ['seguro', 'categoria'],
            order: { detalle: 'ASC' }
        });
    }

    async findOne(id: string): Promise<PrecioSeguro> {
        const precio = await this.precioSeguroRepository.findOne({
            where: { id: +id },
            relations: ['seguro', 'categoria']
        });
        if (!precio) {
            throw new NotFoundException(`Precio de seguro con ID ${id} no encontrado`);
        }
        return precio;
    }

    async update(id: string, updatePrecioSeguroDto: UpdatePrecioSeguroDto): Promise<PrecioSeguro> {
        const precio = await this.findOne(id);
        const { idseguro, idcategoria_servicio, ...rest } = updatePrecioSeguroDto;

        Object.assign(precio, rest);

        if (idseguro) {
            precio.seguro = { id: +idseguro } as any;
        }
        if (idcategoria_servicio) {
            precio.categoria = { id: +idcategoria_servicio } as any;
        }

        return await this.precioSeguroRepository.save(precio);
    }

    async remove(id: string): Promise<void> {
        const precio = await this.findOne(id);
        precio.estado = 'inactivo';
        await this.precioSeguroRepository.save(precio);
    }

    async reactivate(id: string): Promise<void> {
        const precio = await this.findOne(id);
        precio.estado = 'activo';
        await this.precioSeguroRepository.save(precio);
    }
}
