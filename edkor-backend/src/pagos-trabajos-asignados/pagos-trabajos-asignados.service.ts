import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { CreatePagoTrabajoAsignadoDto } from './dto/create-pagos-trabajos-asignado.dto';
import { UpdatePagosTrabajosAsignadoDto } from './dto/update-pagos-trabajos-asignado.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { PagoTrabajoAsignado } from './entities/pagos-trabajos-asignado.entity';
import { DataSource, Repository } from 'typeorm';
import { TrabajoAsignado } from '../trabajos-asignados/entities/trabajo-asignado.entity';

@Injectable()
export class PagosTrabajosAsignadosService {
  private readonly logger = new Logger(PagosTrabajosAsignadosService.name);

  constructor(
    @InjectRepository(PagoTrabajoAsignado)
    private readonly pagoRepository: Repository<PagoTrabajoAsignado>,
    private readonly dataSource: DataSource,
  ) { }

  async create(createDto: CreatePagoTrabajoAsignadoDto, sucursalId: number | null = null) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { trabajosIds, ...pagoData } = createDto;

      // 1. Create Header manually to handle date correctly
      const nuevoPago = new PagoTrabajoAsignado();
      Object.assign(nuevoPago, pagoData);
      
      if (sucursalId) {
          nuevoPago.sucursal = { id: sucursalId } as any;
      }

      // Explicitly handle date if provided as string
      if (createDto.fecha_pago) {
        // Create date and adjust for timezone if needed, or just take the date part at noon to avoid boundary issues
        const parts = createDto.fecha_pago.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1;
          const day = parseInt(parts[2]);
          // Set to noon to avoid timezone shift dropping it to previous day
          nuevoPago.fecha_pago = new Date(year, month, day, 12, 0, 0);
        } else {
          nuevoPago.fecha_pago = new Date(createDto.fecha_pago);
        }
      }

      const pagoGuardado = await queryRunner.manager.save(nuevoPago);

      // 2. Update Details (Trabajos Asignados)
      if (trabajosIds && trabajosIds.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(TrabajoAsignado)
          .set({
            cancelado: true,
            pago_trabajo: pagoGuardado
          })
          .where("id IN (:...ids)", { ids: trabajosIds })
          .execute();
      }

      await queryRunner.commitTransaction();
      return pagoGuardado;

    } catch (error) {
      this.logger.error('Error creating payment:', error);
      console.error(error); // Double log for stdout
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Error al registrar el pago de trabajos asignados. Verifique los logs.');
    } finally {
      await queryRunner.release();
    }
  }

  findAll(sucursalId: number | null = null) {
    const whereClause: any = {};
    if (sucursalId) {
        whereClause.sucursal = { id: sucursalId };
    }
    return this.pagoRepository.find({
      where: whereClause,
      order: { fecha_pago: 'DESC' },
      relations: ['personal', 'usuario', 'trabajos', 'sucursal', 'forma_pago']
    });
  }

  findOne(id: number) {
    return this.pagoRepository.findOne({
      where: { id },
      relations: [
        'personal',
        'usuario',
        'forma_pago',
        'trabajos',
        'trabajos.detalle_orden_trabajo',
        'trabajos.detalle_orden_trabajo.orden_trabajo',
        'trabajos.detalle_orden_trabajo.orden_trabajo.marca_auto'
      ]
    });
  }

  async update(id: number, updateDto: UpdatePagosTrabajosAsignadoDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { trabajosIds, ...pagoData } = updateDto;

      // 1. Update Header
      await queryRunner.manager.update(PagoTrabajoAsignado, id, pagoData);

      // 2. Sync Works (if provided)
      if (trabajosIds) {
        // A. Release removed works: Find works currently assigned to this payment BUT NOT in the new list
        // Note: checking "id NOT IN" empty array acts weird in SQL, so we handle it.
        const notInQuery = trabajosIds.length > 0 ? "id NOT IN (:...ids)" : "1=1";

        await queryRunner.manager
          .createQueryBuilder()
          .update(TrabajoAsignado)
          .set({ cancelado: false, pago_trabajo: null })
          .where("idpago_trabajo = :paymentId", { paymentId: id })
          .andWhere(notInQuery, { ids: trabajosIds })
          .execute();

        // B. Assign new works: Find works in the new list
        if (trabajosIds.length > 0) {
          await queryRunner.manager
            .createQueryBuilder()
            .update(TrabajoAsignado)
            .set({
              cancelado: true,
              // We need to fetch the entity ref or just set the ID? TypeORM usually needs the relation or ID.
              // Setting idpago_trabajo usually enough if relation mapping is correct.
              pago_trabajo: { id: id } as any
            })
            .where("id IN (:...ids)", { ids: trabajosIds })
            .execute();
        }
      }

      await queryRunner.commitTransaction();
      return this.findOne(id);
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Error al actualizar el pago');
    } finally {
      await queryRunner.release();
    }
  }

  async remove(id: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Revert Works: Set cancelado=false for all works with this payment ID
      await queryRunner.manager
        .createQueryBuilder()
        .update(TrabajoAsignado)
        .set({ cancelado: false, pago_trabajo: null })
        .where("idpago_trabajo = :id", { id })
        .execute();

      // 2. Delete Header
      await queryRunner.manager.delete(PagoTrabajoAsignado, id);

      await queryRunner.commitTransaction();
      return { message: 'Pago eliminado y trabajos revertidos correctamente' };
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Error al eliminar el pago');
    } finally {
      await queryRunner.release();
    }
  }
}
