import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { UnidadMedida } from './entities/unidad-medida.entity';

@Injectable()
export class UnidadMedidaService {
    constructor(
        @InjectRepository(UnidadMedida)
        private readonly unidadMedidaRepository: Repository<UnidadMedida>,
    ) { }

    create(createUnidadMedidaDto: CreateUnidadMedidaDto) {
        const unidadMedida = this.unidadMedidaRepository.create(createUnidadMedidaDto);
        return this.unidadMedidaRepository.save(unidadMedida);
    }

    findAll() {
        return this.unidadMedidaRepository.find({
            order: { medida: 'ASC' }
        });
    }

    findOne(id: string) {
        return this.unidadMedidaRepository.findOneBy({ id: +id });
    }

    update(id: string, updateUnidadMedidaDto: UpdateUnidadMedidaDto) {
        return this.unidadMedidaRepository.update(+id, updateUnidadMedidaDto);
    }

    remove(id: string) {
        return this.unidadMedidaRepository.update(+id, { estado: 'inactivo' });
    }
}
