import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, Raw } from 'typeorm';
import { CreatePagoOrdenDto } from './dto/create-pago-orden.dto';
import { UpdatePagoOrdenDto } from './dto/update-pago-orden.dto';
import { PagoOrden } from './entities/pago-orden.entity';
import { OrdenTrabajo } from '../ordenes-trabajo/entities/orden-trabajo.entity';

@Injectable()
export class PagoOrdenService implements OnModuleInit {
    constructor(
        @InjectRepository(PagoOrden)
        private pagoOrdenRepository: Repository<PagoOrden>,
        @InjectRepository(OrdenTrabajo)
        private ordenTrabajoRepository: Repository<OrdenTrabajo>,
    ) { }

    async onModuleInit() {
        await this.syncAllOrdenesSaldo();
    }

    /**
     * Asegura la existencia de las columnas total_pagado y saldo en la tabla ordenes_trabajo
     * y sincroniza los valores históricos basados en los pagos registrados.
     */
    async syncAllOrdenesSaldo(): Promise<void> {
        try {
            await this.ordenTrabajoRepository.manager.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'ordenes_trabajo' AND column_name = 'total_pagado'
                    ) THEN
                        ALTER TABLE ordenes_trabajo ADD COLUMN total_pagado NUMERIC(12, 2) DEFAULT 0;
                    END IF;
                    
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'ordenes_trabajo' AND column_name = 'saldo'
                    ) THEN
                        ALTER TABLE ordenes_trabajo ADD COLUMN saldo NUMERIC(12, 2) DEFAULT 0;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'ordenes_trabajo' AND column_name = 'facturado'
                    ) THEN
                        ALTER TABLE ordenes_trabajo ADD COLUMN facturado BOOLEAN DEFAULT FALSE;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'ordenes_trabajo' AND column_name = 'nro_factura'
                    ) THEN
                        ALTER TABLE ordenes_trabajo ADD COLUMN nro_factura TEXT;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'ordenes_trabajo' AND column_name = 'fecha_facturado'
                    ) THEN
                        ALTER TABLE ordenes_trabajo ADD COLUMN fecha_facturado DATE;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'ordenes_trabajo' AND column_name = 'fecha_cancelado'
                    ) THEN
                        ALTER TABLE ordenes_trabajo ADD COLUMN fecha_cancelado TIMESTAMP;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'pago_orden' AND column_name = 'comprobante'
                    ) THEN
                        ALTER TABLE pago_orden ADD COLUMN comprobante TEXT;
                    END IF;
                END $$;
            `);

            // Sincronizar total_pagado y saldo para todas las órdenes con pagos
            await this.ordenTrabajoRepository.manager.query(`
                UPDATE ordenes_trabajo ot
                SET 
                    total_pagado = COALESCE(p.suma_pagado, 0),
                    saldo = GREATEST(0, ROUND((COALESCE(ot.total, 0) - COALESCE(p.suma_pagado, 0))::numeric, 2)),
                    cancelado = CASE 
                        WHEN GREATEST(0, ROUND((COALESCE(ot.total, 0) - COALESCE(p.suma_pagado, 0))::numeric, 2)) <= 0.05 AND COALESCE(p.suma_pagado, 0) > 0 
                        THEN true 
                        ELSE false 
                    END
                FROM (
                    SELECT 
                        idorden_trabajo,
                        SUM(
                            CASE 
                                WHEN moneda = 'Dólares' AND tc IS NOT NULL AND tc > 0 
                                THEN monto * tc 
                                ELSE monto 
                            END
                        ) as suma_pagado
                    FROM pago_orden
                    GROUP BY idorden_trabajo
                ) p
                WHERE ot.id = p.idorden_trabajo;
            `);

            // Para aquellas órdenes que no tienen ningún pago registrado aún:
            await this.ordenTrabajoRepository.manager.query(`
                UPDATE ordenes_trabajo
                SET 
                    total_pagado = 0, 
                    saldo = COALESCE(total, 0)
                WHERE total_pagado IS NULL OR saldo IS NULL OR id NOT IN (SELECT DISTINCT idorden_trabajo FROM pago_orden);
            `);

            // Asegurar fecha_cancelado en órdenes históricas ya canceladas
            await this.ordenTrabajoRepository.manager.query(`
                UPDATE ordenes_trabajo
                SET fecha_cancelado = COALESCE(fecha_registro, CURRENT_TIMESTAMP)
                WHERE cancelado = true AND fecha_cancelado IS NULL;
            `);
        } catch (err) {
            console.error('Error sincronizando saldo y total_pagado en ordenes_trabajo:', err);
        }
    }

    async updateOrdenCanceladoStatus(idorden_trabajo: number): Promise<void> {
        const orden = await this.ordenTrabajoRepository.findOne({ where: { id: idorden_trabajo } });
        if (!orden) return;

        const pagos = await this.pagoOrdenRepository.find({ where: { idorden_trabajo } });

        const totalPagado = pagos.reduce((sum, pago) => {
            if (pago.moneda === 'Dólares' && pago.tc) {
                return sum + (Number(pago.monto) * Number(pago.tc));
            }
            return sum + Number(pago.monto);
        }, 0);

        const saldo = Math.max(0, Number(orden.total) - totalPagado);
        const isCancelado = saldo <= 0.05 && totalPagado > 0;

        orden.total_pagado = Number(totalPagado.toFixed(2));
        orden.saldo = Number(saldo.toFixed(2));
        orden.cancelado = isCancelado;

        if (isCancelado) {
            // Asignar la fecha del último pago que liquidó la orden
            const latestPago = pagos.length > 0
                ? pagos.reduce((prev, curr) => {
                    const dPrev = prev.fecha ? new Date(prev.fecha).getTime() : 0;
                    const dCurr = curr.fecha ? new Date(curr.fecha).getTime() : 0;
                    return dCurr >= dPrev ? curr : prev;
                }, pagos[0])
                : null;
            orden.fecha_cancelado = latestPago?.fecha ? new Date(latestPago.fecha) : new Date();
        } else {
            orden.fecha_cancelado = null;
        }

        const currentEst = (orden.estado || '').toLowerCase();
        const isAnulada = currentEst === 'anulada' || currentEst === 'anulado' || currentEst === 'inactivo';

        if (!isAnulada) {
            if (isCancelado) {
                if (orden.estado !== 'cerrada') {
                    orden.estado = 'cerrada';
                }
            } else {
                if (orden.estado === 'cerrada') {
                    orden.estado = orden.fecha_entrega ? 'entregado_por_pagar' : 'terminado';
                }
            }
        }

        await this.ordenTrabajoRepository.save(orden);
        if (orden.id_hoja_recepcion) {
            const hojaEstado = orden.estado === 'cerrada'
                ? 'Orden Cerrada'
                : (orden.estado === 'entregado_con_saldo' || orden.estado === 'entregado' || orden.estado === 'entregado_por_pagar'
                    ? 'Entregado por Pagar'
                    : (orden.estado === 'terminado' ? 'Finalizado' : (orden.estado === 'en_proceso' ? 'En Proceso' : 'Orden Creada')));
            await this.ordenTrabajoRepository.manager.query(
                `UPDATE hoja_recepcion SET estado = $1 WHERE id = $2`,
                [hojaEstado, orden.id_hoja_recepcion]
            );
        }
    }

    async create(createPagoOrdenDto: CreatePagoOrdenDto, sucursalId: number | null = null): Promise<PagoOrden> {
        const pago = this.pagoOrdenRepository.create({
            ...createPagoOrdenDto,
            sucursal: sucursalId ? { id: sucursalId } as any : null,
        });
        const savedPago = await this.pagoOrdenRepository.save(pago);

        await this.updateOrdenCanceladoStatus(savedPago.idorden_trabajo);

        return savedPago;
    }

    async findAll(sucursalId: number | null = null): Promise<PagoOrden[]> {
        const whereClause: any = {};
        if (sucursalId) {
            whereClause.sucursal = { id: sucursalId };
        }
        return await this.pagoOrdenRepository.find({
            where: whereClause,
            relations: ['sucursal'],
            order: { fecha: 'DESC' },
        });
    }

    async findOne(id: number): Promise<PagoOrden> {
        const pago = await this.pagoOrdenRepository.findOne({ where: { id } });
        if (!pago) {
            throw new NotFoundException(`Pago con ID ${id} no encontrado`);
        }
        return pago;
    }

    async findByOrdenTrabajo(idorden_trabajo: number): Promise<PagoOrden[]> {
        return await this.pagoOrdenRepository.find({
            where: { idorden_trabajo },
            order: { fecha: 'DESC' },
        });
    }

    async getOrdenesConSaldo(sucursalId: number | null = null, soloConcluidas: boolean = false): Promise<any[]> {
        const whereClause: any = {
            cancelado: false
        };

        if (soloConcluidas) {
            // Para Deudas por Cobrar: solo órdenes finalizadas, entregadas o cerradas con saldo
            whereClause.estado = Raw((alias) => `LOWER(${alias}) IN ('finalizado', 'finalizada', 'cerrada', 'entregado', 'entregado_con_saldo', 'entregado_por_pagar')`);
        } else {
            // Para Registro de Pagos / Abonos: todas las órdenes activas con saldo pendiente (incluye en_proceso para anticipos)
            whereClause.estado = Not(In(['inactivo', 'anulado', 'anulada']));
        }

        if (sucursalId) {
            whereClause.sucursal = { id: sucursalId };
        }
        
        const ordenes = await this.ordenTrabajoRepository.find({
            where: whereClause,
            relations: [
                'hoja_recepcion',
                'hoja_recepcion.tipo_orden',
                'hoja_recepcion.seguro',
                'hoja_recepcion.inspector',
                'marca_auto',
                'usuario',
                'sucursal'
            ],
            order: { fecha_registro: 'DESC' },
        });

        if (!ordenes || ordenes.length === 0) {
            return [];
        }

        const ordenIds = ordenes.map(o => o.id);

        // Fetch all payments for all these orders in a single query (optimizado para evitar N+1 queries)
        const allPagos = await this.pagoOrdenRepository.find({
            where: { idorden_trabajo: In(ordenIds) },
            relations: ['forma_pago', 'usuario', 'comision_tarjeta'],
            order: { fecha: 'ASC', id: 'ASC' },
        });

        // Agrupar pagos por ID de orden
        const pagosPorOrden = new Map<number, PagoOrden[]>();
        for (const pago of allPagos) {
            if (!pagosPorOrden.has(pago.idorden_trabajo)) {
                pagosPorOrden.set(pago.idorden_trabajo, []);
            }
            pagosPorOrden.get(pago.idorden_trabajo)!.push(pago);
        }

        const ordenesConSaldo: any[] = [];

        for (const orden of ordenes) {
            const pagos = pagosPorOrden.get(orden.id) || [];
            
            let totalPagado = Number(orden.total_pagado ?? 0);
            let saldo = Number(orden.saldo ?? 0);

            // Fallback por si la orden aún no tenía el saldo inicializado
            if (orden.saldo === null || orden.saldo === undefined) {
                totalPagado = pagos.reduce((sum, pago) => {
                    if (pago.moneda === 'Dólares' && pago.tc) {
                        return sum + (Number(pago.monto) * Number(pago.tc));
                    }
                    return sum + Number(pago.monto);
                }, 0);
                saldo = Math.max(0, Number(orden.total || 0) - totalPagado);
            }

            // Solo incluir órdenes con saldo pendiente
            if (saldo > 0.05) {
                ordenesConSaldo.push({
                    ...orden,
                    total_pagado: totalPagado,
                    saldo: saldo,
                    pagos: pagos,
                });
            }
        }

        return ordenesConSaldo;
    }

    async update(id: number, updatePagoOrdenDto: UpdatePagoOrdenDto): Promise<PagoOrden> {
        const pago = await this.findOne(id);
        Object.assign(pago, updatePagoOrdenDto);
        const savedPago = await this.pagoOrdenRepository.save(pago);

        await this.updateOrdenCanceladoStatus(savedPago.idorden_trabajo);

        return savedPago;
    }

    async remove(id: number): Promise<void> {
        const pago = await this.findOne(id);
        const idOrden = pago.idorden_trabajo;
        await this.pagoOrdenRepository.remove(pago);

        await this.updateOrdenCanceladoStatus(idOrden);
    }
}
