import { Injectable, BadRequestException } from '@nestjs/common';
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

  async create(createFormaPagoDto: CreateFormaPagoDto) {
    const nombre = createFormaPagoDto.forma_pago?.trim();
    if (!nombre) {
      throw new BadRequestException('El nombre de la forma de pago es obligatorio.');
    }

    const existing = await this.formaPagoRepository
      .createQueryBuilder('f')
      .where('LOWER(TRIM(f.forma_pago)) = LOWER(:nombre)', { nombre })
      .getOne();

    if (existing) {
      if (existing.estado === 'inactivo') {
        throw new BadRequestException(`La forma de pago "${nombre}" ya existe en estado inactivo. Puede reactivarla desde el listado.`);
      }
      throw new BadRequestException(`Ya existe una forma de pago con el nombre "${nombre}".`);
    }

    const formaPago = this.formaPagoRepository.create({
      ...createFormaPagoDto,
      forma_pago: nombre,
    });
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

  async update(id: string, updateFormaPagoDto: UpdateFormaPagoDto) {
    if (updateFormaPagoDto.forma_pago) {
      const nombre = updateFormaPagoDto.forma_pago.trim();
      if (!nombre) {
        throw new BadRequestException('El nombre de la forma de pago no puede estar vacío.');
      }

      const existing = await this.formaPagoRepository
        .createQueryBuilder('f')
        .where('LOWER(TRIM(f.forma_pago)) = LOWER(:nombre)', { nombre })
        .andWhere('f.id != :id', { id: +id })
        .getOne();

      if (existing) {
        throw new BadRequestException(`Ya existe otra forma de pago con el nombre "${nombre}".`);
      }
      updateFormaPagoDto.forma_pago = nombre;
    }

    return this.formaPagoRepository.update(+id, updateFormaPagoDto);
  }

  // Soft delete: cambiar estado a inactivo
  remove(id: string) {
    return this.formaPagoRepository.update(+id, { estado: 'inactivo' });
  }
}
