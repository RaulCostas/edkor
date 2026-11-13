import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PagoPedido } from './entities/pago-pedido.entity';
import { CreatePagoPedidoDto } from './dto/create-pago-pedido.dto';
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
}
