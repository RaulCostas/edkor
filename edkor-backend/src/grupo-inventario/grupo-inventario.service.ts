import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGrupoInventarioDto } from './dto/create-grupo-inventario.dto';
import { UpdateGrupoInventarioDto } from './dto/update-grupo-inventario.dto';
import { GrupoInventario } from './entities/grupo-inventario.entity';

@Injectable()
export class GrupoInventarioService {
    constructor(
        @InjectRepository(GrupoInventario)
        private readonly grupoInventarioRepository: Repository<GrupoInventario>,
    ) { }

    create(createGrupoInventarioDto: CreateGrupoInventarioDto) {
        const grupoInventario = this.grupoInventarioRepository.create(createGrupoInventarioDto);
        return this.grupoInventarioRepository.save(grupoInventario);
    }

    findAll() {
        return this.grupoInventarioRepository.find({
            order: { grupo: 'ASC' }
        });
    }

    findOne(id: string) {
        return this.grupoInventarioRepository.findOneBy({ id: +id });
    }

    update(id: string, updateGrupoInventarioDto: UpdateGrupoInventarioDto) {
        return this.grupoInventarioRepository.update(+id, updateGrupoInventarioDto);
    }

    remove(id: string) {
        return this.grupoInventarioRepository.update(+id, { estado: 'inactivo' });
    }
}
