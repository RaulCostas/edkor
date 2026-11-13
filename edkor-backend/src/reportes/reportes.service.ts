import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { PagoOrden } from '../pago-orden/entities/pago-orden.entity';
import { Egreso } from '../egresos/entities/egreso.entity';
import { PagoTrabajoAsignado } from '../pagos-trabajos-asignados/entities/pagos-trabajos-asignado.entity';
import { PagoPedido } from '../pago-pedidos/entities/pago-pedido.entity';
import { PagosGastosFijos } from '../pagos_gastos_fijos/entities/pagos_gastos_fijos.entity';
import { CompraInsumo } from '../compra-insumos/entities/compra-insumo.entity';
import { Anticipo } from '../anticipos/entities/anticipo.entity';
import { PagoPlanilla } from '../pagos-planillas/entities/pagos-planilla.entity';

@Injectable()
export class ReportesService {
    constructor(
        @InjectRepository(PagoOrden) private pagoOrdenRepo: Repository<PagoOrden>,
        @InjectRepository(Egreso) private egresoRepo: Repository<Egreso>,
        @InjectRepository(PagoTrabajoAsignado) private pagoPersonalRepo: Repository<PagoTrabajoAsignado>,
        @InjectRepository(PagoPedido) private pagoProveedorRepo: Repository<PagoPedido>,
        @InjectRepository(PagosGastosFijos) private pagoGastoFijoRepo: Repository<PagosGastosFijos>,
        @InjectRepository(CompraInsumo) private compraInsumoRepo: Repository<CompraInsumo>,
        @InjectRepository(Anticipo) private anticipoRepo: Repository<Anticipo>,
        @InjectRepository(PagoPlanilla) private pagoPlanillaRepo: Repository<PagoPlanilla>,
    ) { }

    async getHojaDiaria(fecha: string) {
        const start = `${fecha} 00:00:00`;
        const end = `${fecha} 23:59:59`;

        const [
            ingresos,
            egresos,
            pagosPersonal,
            pagosProveedor,
            pagosGastosFijos,
            insumos,
            anticipos,
            pagosPlanillas
        ] = await Promise.all([
            this.pagoOrdenRepo.find({ where: { fecha: Between(start as any, end as any) }, relations: ['forma_pago', 'orden_trabajo'] }),
            this.egresoRepo.find({ where: { fecha: Between(start as any, end as any) }, relations: ['formaPago'] }),
            this.pagoPersonalRepo.find({ where: { fecha_pago: Between(start as any, end as any) }, relations: ['personal'] }),
            this.pagoProveedorRepo.find({ where: { fecha: Between(start as any, end as any) }, relations: ['forma_pago', 'material_pedido', 'material_pedido.proveedor'] }),
            this.pagoGastoFijoRepo.find({ where: { fecha: Between(start as any, end as any) }, relations: ['formaPago', 'gastoFijo'] }),
            this.compraInsumoRepo.find({ where: { fecha: Between(start as any, end as any) }, relations: ['forma_pago', 'proveedor'] }),
            this.anticipoRepo.find({ where: { fecha: Between(start as any, end as any) }, relations: ['personal'] }),
            this.pagoPlanillaRepo.find({ where: { fecha_pago: Between(start as any, end as any) }, relations: ['forma_pago', 'planilla'] }),
        ]);

        return {
            ingresos,
            egresos,
            pagosPersonal,
            pagosProveedor,
            pagosGastosFijos,
            insumos,
            anticipos,
            pagosPlanillas
        };
    }
}
