import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { Proveedor } from './entities/proveedor.entity';

@Injectable()
export class ProveedoresService {
    constructor(
        @InjectRepository(Proveedor)
        private readonly proveedorRepository: Repository<Proveedor>,
    ) { }

    create(createProveedorDto: CreateProveedorDto) {
        const proveedor = this.proveedorRepository.create(createProveedorDto);
        return this.proveedorRepository.save(proveedor);
    }

    findAll() {
        return this.proveedorRepository.find({
            order: { proveedor: 'ASC' }
        });
    }

    findOne(id: string) {
        return this.proveedorRepository.findOneBy({ id: +id });
    }

    async update(id: string, updateProveedorDto: UpdateProveedorDto) {
        const proveedor = await this.proveedorRepository.preload({
            id: +id,
            ...updateProveedorDto,
        });
        if (!proveedor) {
            throw new NotFoundException(`Proveedor #${id} not found`);
        }
        return this.proveedorRepository.save(proveedor);
    }

    remove(id: string) {
        return this.proveedorRepository.update(+id, { estado: 'inactivo' });
    }
}
