import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDetalleMaterialPedidoDto } from './dto/create-detalle-material-pedido.dto';
import { UpdateDetalleMaterialPedidoDto } from './dto/update-detalle-material-pedido.dto';
import { DetalleMaterialPedido } from './entities/detalle-material-pedido.entity';
import { Inventario } from '../inventario/entities/inventario.entity';
import { InventarioService } from '../inventario/inventario.service';

@Injectable()
export class DetalleMaterialPedidoService {
  constructor(
    @InjectRepository(DetalleMaterialPedido)
    private readonly detalleRepository: Repository<DetalleMaterialPedido>,
    @InjectRepository(Inventario)
    private readonly inventarioRepository: Repository<Inventario>,
    private readonly inventarioService: InventarioService,
  ) { }

  async create(createDetalleDto: CreateDetalleMaterialPedidoDto) {
    const detalle = this.detalleRepository.create(createDetalleDto);
    const savedDetalle = await this.detalleRepository.save(detalle);

    // Registrar lote de compra y actualizar inventario con Kardex
    try {
      await this.inventarioService.registrarIngresoLote({
        idinventario: Number(createDetalleDto.idinventario),
        idmaterial_pedido: createDetalleDto.idmaterial_pedido ? Number(createDetalleDto.idmaterial_pedido) : undefined,
        iddetalle_material_pedido: savedDetalle.id,
        cantidad: Number(createDetalleDto.cantidad),
        costo_unitario: Number(createDetalleDto.precio_unitario),
        precio_venta_sugerido: createDetalleDto.precio_venta_sugerido ? Number(createDetalleDto.precio_venta_sugerido) : undefined,
        nro_lote: `LOTE-COMPRA-${createDetalleDto.idmaterial_pedido}`,
        observaciones: `Ingreso por Pedido #${createDetalleDto.idmaterial_pedido}`,
      });
    } catch (err) {
      console.error('Error registrando ingreso de lote:', err);
    }

    return savedDetalle;
  }

  async findAllByPedido(pedidoId: number) {
    return await this.detalleRepository.find({
      where: { idmaterial_pedido: pedidoId },
      relations: ['inventario', 'material_pedido'],
    });
  }

  async findOne(id: number) {
    const detalle = await this.detalleRepository.findOneBy({ id });
    if (!detalle) {
      throw new NotFoundException(`Detalle #${id} not found`);
    }
    return detalle;
  }

  async update(id: number, updateDto: UpdateDetalleMaterialPedidoDto) {
    const detalle = await this.findOne(id);
    const oldCantidad = Number(detalle.cantidad || 0);
    this.detalleRepository.merge(detalle, updateDto);
    const saved = await this.detalleRepository.save(detalle);

    const inventario = await this.inventarioRepository.findOneBy({ id: saved.idinventario });
    if (inventario) {
      if (updateDto.cantidad !== undefined) {
        const diff = Number(updateDto.cantidad) - oldCantidad;
        inventario.cantidad_existente = Number(inventario.cantidad_existente || 0) + diff;
      }
      if (updateDto.precio_unitario !== undefined) {
        inventario.precio_compra = Number(updateDto.precio_unitario);
      }
      if (updateDto.precio_venta_sugerido && Number(updateDto.precio_venta_sugerido) > 0) {
        inventario.precio_venta = Number(updateDto.precio_venta_sugerido);
      }
      await this.inventarioRepository.save(inventario);
    }

    return saved;
  }

  async remove(id: number) {
    const detalle = await this.findOne(id);
    const inventario = await this.inventarioRepository.findOneBy({ id: detalle.idinventario });
    if (inventario) {
      inventario.cantidad_existente = Math.max(0, Number(inventario.cantidad_existente || 0) - Number(detalle.cantidad || 0));
      await this.inventarioRepository.save(inventario);
    }
    return await this.detalleRepository.remove(detalle);
  }
}
