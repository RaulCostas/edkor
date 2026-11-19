import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PagoPedido } from './entities/pago-pedido.entity';
import { CreatePagoPedidoDto } from './dto/create-pago-pedido.dto';
import { UpdatePagoPedidoDto } from './dto/update-pago-pedido.dto';
import { MaterialPedido } from '../material-pedido/entities/material-pedido.entity';

@Injectable()
export class PagoPedidosService {
    constructor(
        @InjectRepository(PagoPedido)
        private readonly pagoPedidoRepository: Repository<PagoPedido>,
        @InjectRepository(MaterialPedido)
        private readonly materialPedidoRepository: Repository<MaterialPedido>,
    ) { }

    async create(createPagoPedidoDto: CreatePagoPedidoDto, sucursalId: number | null = null) {
        const { idmaterial_pedido, idusers, idforma_pago, ...data } = createPagoPedidoDto;
        const pago = this.pagoPedidoRepository.create({
            ...data,
            material_pedido: { id: +idmaterial_pedido },
            usuario: { id: +idusers },
            forma_pago: { id: +idforma_pago },
            sucursal: sucursalId ? { id: sucursalId } as any : null,
        });
        await this.pagoPedidoRepository.save(pago);

        // Update MaterialPedido status to pagado
        await this.materialPedidoRepository.update(+idmaterial_pedido, {
            pagado: true,
        });

        return pago;
    }

    async findAll(sucursalId: number | null = null) {
        const whereClause: any = {};
        if (sucursalId) {
            whereClause.sucursal = { id: sucursalId };
        }
        return this.pagoPedidoRepository.find({
            where: whereClause,
            relations: ['material_pedido', 'usuario', 'forma_pago', 'sucursal'],
            order: { fecha: 'DESC' },
        });
    }

    async findOne(id: string) {
        return this.pagoPedidoRepository.findOne({
            where: { id: +id },
            relations: ['material_pedido', 'usuario', 'forma_pago'],
        });
    }

    async findByPedido(pedidoId: number) {
        console.log('Backend findByPedido looking for:', pedidoId, typeof pedidoId);
        const pago = await this.pagoPedidoRepository.findOne({
            where: { material_pedido: { id: pedidoId } },
            relations: ['material_pedido', 'usuario', 'forma_pago'],
        });
        console.log('Backend found pago:', pago);
        return pago;
    }

    async update(id: number, updatePagoPedidoDto: UpdatePagoPedidoDto) {
        const pago = await this.pagoPedidoRepository.findOne({
            where: { id },
            relations: ['material_pedido', 'forma_pago', 'usuario'],
        });
        if (!pago) {
            throw new NotFoundException(`Pago con ID ${id} no encontrado`);
        }

        const { idforma_pago, idusers, idmaterial_pedido, ...data } = updatePagoPedidoDto;

        if (idforma_pago !== undefined) {
            pago.forma_pago = { id: +idforma_pago } as any;
        }
        if (idusers !== undefined) {
            pago.usuario = { id: +idusers } as any;
        }
        if (idmaterial_pedido !== undefined) {
            pago.material_pedido = { id: +idmaterial_pedido } as any;
        }

        Object.assign(pago, data);
        return this.pagoPedidoRepository.save(pago);
    }

    async remove(id: number) {
        const pago = await this.pagoPedidoRepository.findOne({
            where: { id },
            relations: ['material_pedido'],
        });
        if (!pago) {
            throw new NotFoundException(`Pago con ID ${id} no encontrado`);
        }

        const materialPedidoId = pago.material_pedido?.id;

        await this.pagoPedidoRepository.remove(pago);

        // Si el material_pedido ya no tiene ningún pago asociado, revertir su estado a pendiente (pagado: false)
        if (materialPedidoId) {
            const count = await this.pagoPedidoRepository.count({
                where: { material_pedido: { id: materialPedidoId } },
            });
            if (count === 0) {
                await this.materialPedidoRepository.update(materialPedidoId, {
                    pagado: false,
                });
            }
        }

        return { success: true, message: 'Pago eliminado correctamente' };
    }
}
