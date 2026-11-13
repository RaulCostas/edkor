import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePagosPlanillaDto } from './dto/create-pagos-planilla.dto';
import { UpdatePagosPlanillaDto } from './dto/update-pagos-planilla.dto';
import { PagoPlanilla } from './entities/pagos-planilla.entity';
import { Planilla } from '../planillas/entities/planilla.entity';

@Injectable()
export class PagosPlanillasService {
  constructor(
    @InjectRepository(PagoPlanilla)
    private readonly pagoRepository: Repository<PagoPlanilla>,
    @InjectRepository(Planilla)
    private readonly planillaRepository: Repository<Planilla>,
  ) { }

  async create(createPagosPlanillaDto: CreatePagosPlanillaDto) {
    const { planilla_id, idforma_pago, iduser, monto, observaciones, fecha_pago } = createPagosPlanillaDto;

    // 1. Create Payment Record
    const pago = this.pagoRepository.create({
      planilla: { id: planilla_id },
      forma_pago: { id: idforma_pago },
      ...(iduser ? { user: { id: iduser } } : {}),
      monto,
      observaciones,
      fecha_pago: fecha_pago || new Date().toISOString().split('T')[0]
    });

    const savedPago = await this.pagoRepository.save(pago);

    // 2. Update Planilla Status
    await this.planillaRepository.update(planilla_id, { estado: 'PAGADO' });

    return savedPago;
  }

  findAll(sucursalId: number | null = null) {
    const whereClause: any = {};
    if (sucursalId) {
        whereClause.planilla = { sucursal: { id: sucursalId } };
    }
    return this.pagoRepository.find({ where: whereClause, relations: ['planilla', 'forma_pago', 'user'] });
  }

  findOne(id: number) {
    return this.pagoRepository.findOne({ where: { id }, relations: ['planilla', 'forma_pago', 'user'] });
  }

  update(id: number, updatePagosPlanillaDto: UpdatePagosPlanillaDto) {
    return `This action updates a #${id} pagosPlanilla`;
  }

  async remove(id: number) {
    const pago = await this.pagoRepository.findOne({ where: { id }, relations: ['planilla'] });
    if (pago && pago.planilla) {
      await this.planillaRepository.update(pago.planilla.id, { estado: 'GENERADO' });
    }
    return this.pagoRepository.delete(id);
  }
}
