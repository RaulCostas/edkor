import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesService } from './reportes.service';
import { PagoOrden } from '../pago-orden/entities/pago-orden.entity';
import { Egreso } from '../egresos/entities/egreso.entity';
import { PagoTrabajoAsignado } from '../pagos-trabajos-asignados/entities/pagos-trabajos-asignado.entity';
import { PagoPedido } from '../pago-pedidos/entities/pago-pedido.entity';
import { PagosGastosFijos } from '../pagos_gastos_fijos/entities/pagos_gastos_fijos.entity';
import { CompraInsumo } from '../compra-insumos/entities/compra-insumo.entity';
import { Anticipo } from '../anticipos/entities/anticipo.entity';
import { PagoPlanilla } from '../pagos-planillas/entities/pagos-planilla.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            PagoOrden,
            Egreso,
            PagoTrabajoAsignado,
            PagoPedido,
            PagosGastosFijos,
            CompraInsumo,
            Anticipo,
            PagoPlanilla,
        ]),
    ],
    providers: [ReportesService],
    exports: [ReportesService],
})
export class ReportesModule { }
