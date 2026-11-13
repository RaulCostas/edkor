import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoriaServicioDto } from './dto/create-categoria-servicio.dto';
import { UpdateCategoriaServicioDto } from './dto/update-categoria-servicio.dto';
import { CategoriaServicio } from './entities/categoria-servicio.entity';

@Injectable()
export class CategoriaServicioService {
    constructor(
        @InjectRepository(CategoriaServicio)
        private readonly categoriaServicioRepository: Repository<CategoriaServicio>,
    ) { }

    create(createCategoriaServicioDto: CreateCategoriaServicioDto) {
        const categoriaServicio = this.categoriaServicioRepository.create(createCategoriaServicioDto);
        return this.categoriaServicioRepository.save(categoriaServicio);
    }

    findAll() {
        return this.categoriaServicioRepository.find();
    }

    findOne(id: string) {
        return this.categoriaServicioRepository.findOneBy({ id: +id });
    }

    update(id: string, updateCategoriaServicioDto: UpdateCategoriaServicioDto) {
        return this.categoriaServicioRepository.update(+id, updateCategoriaServicioDto);
    }

    remove(id: string) {
        return this.categoriaServicioRepository.update(+id, { estado: 'inactivo' });
    }
}
