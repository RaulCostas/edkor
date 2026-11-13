import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFormaPagoDto } from './dto/create-forma-pago.dto';
import { UpdateFormaPagoDto } from './dto/update-forma-pago.dto';
import { FormaPago } from './entities/forma-pago.entity';

@Injectable()
export class FormaPagoService {
  constructor(
    @InjectRepository(FormaPago)
    private readonly formaPagoRepository: Repository<FormaPago>,
  ) { }

  create(createFormaPagoDto: CreateFormaPagoDto) {
    const formaPago = this.formaPagoRepository.create(createFormaPagoDto);
    return this.formaPagoRepository.save(formaPago);
  }

  findAll() {
    return this.formaPagoRepository.find({
      order: { forma_pago: 'ASC' }
    });
  }

  findOne(id: string) {
    return this.formaPagoRepository.findOneBy({ id: +id });
  }

  update(id: string, updateFormaPagoDto: UpdateFormaPagoDto) {
    return this.formaPagoRepository.update(+id, updateFormaPagoDto);
  }

  // Soft delete: cambiar estado a inactivo
  remove(id: string) {
    return this.formaPagoRepository.update(+id, { estado: 'inactivo' });
  }
}
