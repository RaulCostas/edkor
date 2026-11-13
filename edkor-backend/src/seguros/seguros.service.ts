import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSeguroDto } from './dto/create-seguro.dto';
import { UpdateSeguroDto } from './dto/update-seguro.dto';
import { Seguro } from './entities/seguro.entity';

@Injectable()
export class SegurosService {
    constructor(
        @InjectRepository(Seguro)
        private readonly seguroRepository: Repository<Seguro>,
    ) { }

    create(createSeguroDto: CreateSeguroDto) {
        const seguro = this.seguroRepository.create(createSeguroDto);
        return this.seguroRepository.save(seguro);
    }

    findAll() {
        return this.seguroRepository.find();
    }

    findOne(id: string) {
        return this.seguroRepository.findOneBy({ id: +id });
    }

    update(id: string, updateSeguroDto: UpdateSeguroDto) {
        return this.seguroRepository.update(+id, updateSeguroDto);
    }

    remove(id: string) {
        return this.seguroRepository.update(+id, { estado: 'inactivo' });
    }
}
