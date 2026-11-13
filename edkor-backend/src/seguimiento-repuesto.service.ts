import { Injectable } from '@nestjs/common';
import { CreateSeguimientoRepuestoDto } from './dto/create-seguimiento-repuesto.dto';
import { UpdateSeguimientoRepuestoDto } from './dto/update-seguimiento-repuesto.dto';

@Injectable()
export class SeguimientoRepuestoService {
  create(createSeguimientoRepuestoDto: CreateSeguimientoRepuestoDto) {
    return 'This action adds a new seguimientoRepuesto';
  }

  findAll() {
    return `This action returns all seguimientoRepuesto`;
  }

  findOne(id: number) {
    return `This action returns a #${id} seguimientoRepuesto`;
  }

  update(id: number, updateSeguimientoRepuestoDto: UpdateSeguimientoRepuestoDto) {
    return `This action updates a #${id} seguimientoRepuesto`;
  }

  remove(id: number) {
    return `This action removes a #${id} seguimientoRepuesto`;
  }
}
