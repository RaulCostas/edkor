import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OtroIngreso } from './entities/otro-ingreso.entity';
import { CreateOtroIngresoDto } from './dto/create-otro-ingreso.dto';
import { UpdateOtroIngresoDto } from './dto/update-otro-ingreso.dto';
import { InventarioService } from '../inventario/inventario.service';

@Injectable()
export class OtrosIngresosService {
  constructor(
    @InjectRepository(OtroIngreso)
    private readonly otrosIngresosRepository: Repository<OtroIngreso>,
    private readonly inventarioService: InventarioService,
  ) {}

  async create(
    createDto: CreateOtroIngresoDto,
    sucursalId?: number | null,
    userId?: number | null,
  ): Promise<OtroIngreso> {
    const finalSucursalId = sucursalId || createDto.sucursal_id || null;
    const finalUserId = userId || createDto.idusuario || null;

    // Calcular siguiente Nro consecutivo
    let nextNro = createDto.nro;
    if (!nextNro) {
      const qb = this.otrosIngresosRepository.createQueryBuilder('oi');
      if (finalSucursalId) {
        qb.where('oi.sucursal_id = :sucursalId', { sucursalId: finalSucursalId });
      }
      const maxRow = await qb.select('MAX(oi.nro)', 'max').getRawOne();
      nextNro = (Number(maxRow?.max) || 0) + 1;
    }

    const nuevo = this.otrosIngresosRepository.create({
      ...createDto,
      nro: nextNro,
      sucursal_id: finalSucursalId || undefined,
      idusuario: finalUserId || undefined,
      asesor_id: createDto.asesor_id || undefined,
      forma_pago_id: createDto.forma_pago_id || undefined,
      idinventario: createDto.idinventario || undefined,
      cantidad: createDto.cantidad ? Number(createDto.cantidad) : 1,
      descontar_stock: Boolean(createDto.descontar_stock),
      monto: Number(createDto.monto || 0),
    });

    const guardado = await this.otrosIngresosRepository.save(nuevo);

    // Si se seleccionó inventario y se solicitó descontar stock
    if (guardado.idinventario && guardado.descontar_stock) {
      try {
        await this.inventarioService.descontarStockDirecto({
          idinventario: guardado.idinventario,
          cantidad: guardado.cantidad,
          idusuario: finalUserId,
          motivo: `Venta directa #${guardado.nro} - ${guardado.motivo}`,
          precio_venta: Number(guardado.monto) / Number(guardado.cantidad || 1),
        });
      } catch (err) {
        console.error('Error al descontar stock para OtroIngreso:', err);
      }
    }

    return this.findOne(guardado.id, finalSucursalId);
  }

  async findAll(sucursalId?: number | null): Promise<OtroIngreso[]> {
    const where: any = {};
    if (sucursalId) {
      where.sucursal_id = sucursalId;
    }

    return this.otrosIngresosRepository.find({
      where,
      relations: ['asesor', 'forma_pago', 'sucursal', 'inventario', 'usuario'],
      order: {
        fecha: 'DESC',
        id: 'DESC',
      },
    });
  }

  async findOne(id: number, sucursalId?: number | null): Promise<OtroIngreso> {
    const where: any = { id };
    if (sucursalId) {
      where.sucursal_id = sucursalId;
    }

    const item = await this.otrosIngresosRepository.findOne({
      where,
      relations: ['asesor', 'forma_pago', 'sucursal', 'inventario', 'usuario'],
    });

    if (!item) {
      throw new NotFoundException(`Ingreso #${id} no encontrado`);
    }

    return item;
  }

  async update(
    id: number,
    updateDto: UpdateOtroIngresoDto,
    sucursalId?: number | null,
    userId?: number | null,
  ): Promise<OtroIngreso> {
    const existing = await this.findOne(id, sucursalId);

    // Si cambió inventario o cantidad y ya había descontado stock, manejar restitución/nuevo descuento
    const cantidadAnterior = Number(existing.cantidad || 0);
    const idInventarioAnterior = existing.idinventario;
    const descontabaAnterior = existing.descontar_stock;

    const nuevaCantidad = updateDto.cantidad !== undefined ? Number(updateDto.cantidad) : cantidadAnterior;
    const nuevoIdInventario = updateDto.idinventario !== undefined ? updateDto.idinventario : idInventarioAnterior;
    const nuevoDescontar = updateDto.descontar_stock !== undefined ? Boolean(updateDto.descontar_stock) : descontabaAnterior;

    // Si antes descontó y ahora ya no o cambió de producto
    if (descontabaAnterior && idInventarioAnterior) {
      if (!nuevoDescontar || nuevoIdInventario !== idInventarioAnterior || nuevaCantidad !== cantidadAnterior) {
        // Restituir anterior
        try {
          await this.inventarioService.restituirStockDirecto({
            idinventario: idInventarioAnterior,
            cantidad: cantidadAnterior,
            idusuario: userId || existing.idusuario,
            motivo: `Ajuste por edición de Otro Ingreso #${existing.nro}`,
          });
        } catch (e) {
          console.error('Error al restituir stock por update:', e);
        }
      }
    }

    // Si ahora debe descontar
    if (nuevoDescontar && nuevoIdInventario) {
      if (!descontabaAnterior || nuevoIdInventario !== idInventarioAnterior || nuevaCantidad !== cantidadAnterior) {
        try {
          await this.inventarioService.descontarStockDirecto({
            idinventario: nuevoIdInventario,
            cantidad: nuevaCantidad,
            idusuario: userId || existing.idusuario,
            motivo: `Venta directa #${existing.nro} (editado)`,
            precio_venta: Number(updateDto.monto ?? existing.monto) / Number(nuevaCantidad || 1),
          });
        } catch (e) {
          console.error('Error al re-descontar stock por update:', e);
        }
      }
    }

    await this.otrosIngresosRepository.update(id, {
      ...updateDto,
      monto: updateDto.monto !== undefined ? Number(updateDto.monto) : undefined,
      cantidad: updateDto.cantidad !== undefined ? Number(updateDto.cantidad) : undefined,
    });

    return this.findOne(id, sucursalId);
  }

  async remove(id: number, sucursalId?: number | null, userId?: number | null): Promise<void> {
    const existing = await this.findOne(id, sucursalId);

    // Si descontó de inventario, restituir
    if (existing.descontar_stock && existing.idinventario) {
      try {
        await this.inventarioService.restituirStockDirecto({
          idinventario: existing.idinventario,
          cantidad: Number(existing.cantidad || 0),
          idusuario: userId || existing.idusuario,
          motivo: `Restitución por eliminación de Otro Ingreso #${existing.nro}`,
        });
      } catch (e) {
        console.error('Error al restituir stock al eliminar:', e);
      }
    }

    await this.otrosIngresosRepository.delete(id);
  }
}
