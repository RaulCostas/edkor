import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMaterialPedidoDto } from './dto/create-material-pedido.dto';
import { UpdateMaterialPedidoDto } from './dto/update-material-pedido.dto';
import { MaterialPedido } from './entities/material-pedido.entity';

@Injectable()
export class MaterialPedidoService {
  constructor(
    @InjectRepository(MaterialPedido)
    private readonly materialPedidoRepository: Repository<MaterialPedido>,
  ) { }

  async create(createMaterialPedidoDto: CreateMaterialPedidoDto, sucursalId: number | null = null) {
    const pedido = this.materialPedidoRepository.create({
        ...createMaterialPedidoDto,
        sucursal: sucursalId ? { id: sucursalId } as any : null,
    });
    return await this.materialPedidoRepository.save(pedido);
  }

  async findAll(sucursalId: number | null = null) {
    const whereClause: any = {};
    if (sucursalId) {
        whereClause.sucursal = { id: sucursalId };
    }
    return await this.materialPedidoRepository.find({
      where: whereClause,
      relations: ['sucursal'],
      order: {
        fecha: 'DESC',
        id: 'DESC',
      },
    });
  }

  async findOne(id: number) {
    const pedido = await this.materialPedidoRepository.findOneBy({ id });
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
    // Soft delete usually means setting status to inactive, assuming 'estado' field usage
    pedido.estado = 'inactivo';
    return await this.materialPedidoRepository.save(pedido);
  }
}
