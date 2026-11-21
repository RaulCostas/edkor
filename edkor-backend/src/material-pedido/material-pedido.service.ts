import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMaterialPedidoDto } from './dto/create-material-pedido.dto';
import { UpdateMaterialPedidoDto } from './dto/update-material-pedido.dto';
import { MaterialPedido } from './entities/material-pedido.entity';
import { InventarioService } from '../inventario/inventario.service';

@Injectable()
export class MaterialPedidoService {
  constructor(
    @InjectRepository(MaterialPedido)
    private readonly materialPedidoRepository: Repository<MaterialPedido>,
    private readonly inventarioService: InventarioService,
  ) { }

  async create(createMaterialPedidoDto: CreateMaterialPedidoDto, sucursalId: number | null = null) {
    const pedido = this.materialPedidoRepository.create({
        ...createMaterialPedidoDto,
        sucursal: sucursalId ? { id: sucursalId } as any : null,
    });
    return await this.materialPedidoRepository.save(pedido);
  }

  async findAll(sucursalId: number | null = null) {
    const whereClause: any = { estado: 'activo' };
    if (sucursalId) {
        whereClause.sucursal = { id: sucursalId };
    }
    return await this.materialPedidoRepository.find({
      where: whereClause,
      relations: ['sucursal', 'detalles', 'detalles.inventario', 'detalles.inventario.unidad_medida'],
      order: {
        fecha: 'DESC',
        id: 'DESC',
      },
    });
  }

  async findOne(id: number) {
    const pedido = await this.materialPedidoRepository.findOne({
      where: { id },
      relations: ['sucursal', 'detalles', 'detalles.inventario', 'detalles.inventario.unidad_medida'],
    });
    if (!pedido) {
      throw new NotFoundException(`MaterialPedido #${id} not found`);
    }
    return pedido;
  }

  async update(id: number, updateMaterialPedidoDto: UpdateMaterialPedidoDto) {
    const pedido = await this.findOne(id);
    this.materialPedidoRepository.merge(pedido, updateMaterialPedidoDto);
    return await this.materialPedidoRepository.save(pedido);
  }

  async remove(id: number) {
    const pedido = await this.findOne(id);

    // 1. Revertir inventario (lotes, stock acumulado y kardex)
    await this.inventarioService.revertirIngresoCompra(id);

    // 2. Marcar pedido como inactivo
    pedido.estado = 'inactivo';
    return await this.materialPedidoRepository.save(pedido);
  }
}
