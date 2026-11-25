import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrdenTrabajoDto } from './dto/create-orden-trabajo.dto';
import { UpdateOrdenTrabajoDto } from './dto/update-orden-trabajo.dto';
import { OrdenTrabajo } from './entities/orden-trabajo.entity';
import { DetalleOrdenTrabajo } from '../detalle-orden-trabajo/entities/detalle-orden-trabajo.entity';
import { getBoliviaDateParts, getBoliviaDateString } from '../utils/date-utils';

@Injectable()
export class OrdenesTrabajoService {
    constructor(
        @InjectRepository(OrdenTrabajo)
        private ordenesTrabajoRepository: Repository<OrdenTrabajo>,
    ) { }

    async onModuleInit() {
        try {
            await this.ordenesTrabajoRepository.manager.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'ordenes_trabajo' AND column_name = 'fecha_terminado'
                    ) THEN
                        ALTER TABLE ordenes_trabajo ADD COLUMN fecha_terminado TIMESTAMP;
                        UPDATE ordenes_trabajo 
                        SET fecha_terminado = COALESCE(fecha_cancelado, fecha_registro) 
                        WHERE estado IN ('terminado', 'cerrada') AND fecha_terminado IS NULL;
                    END IF;
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'ordenes_trabajo' AND column_name = 'fecha_entrega'
                    ) THEN
                        ALTER TABLE ordenes_trabajo ADD COLUMN fecha_entrega TIMESTAMP;
                    END IF;
                END $$;
            `);
        } catch (err) {
            console.error('Error asegurando columnas fecha_terminado/fecha_entrega en ordenes_trabajo:', err);
        }
    }

    async create(createOrdenTrabajoDto: CreateOrdenTrabajoDto, sucursalId: number | null = null): Promise<OrdenTrabajo> {
        const { detalles, ...ordenData } = createOrdenTrabajoDto;

        return await this.ordenesTrabajoRepository.manager.transaction(async (transactionalEntityManager) => {
            const raw: any = ordenData;

            // 1. Create Orden
            const orden = transactionalEntityManager.create(OrdenTrabajo, {
                cliente_nombre: ordenData.cliente_nombre ?? raw.cliente ?? '',
                cliente_telefono: ordenData.cliente_telefono ?? raw.celular ?? '',
                idmarca_auto: ordenData.idmarca_auto ? +ordenData.idmarca_auto : undefined,
                marca_auto: ordenData.idmarca_auto ? ({ id: +ordenData.idmarca_auto } as any) : null,
                vehiculo_modelo: ordenData.vehiculo_modelo ?? raw.modelo ?? '',
                vehiculo_placa: (ordenData.vehiculo_placa ?? raw.placa ?? '').toUpperCase(),
                vehiculo_color: ordenData.vehiculo_color ?? raw.color ?? '',
                vehiculo_kilometraje:
                    ordenData.vehiculo_kilometraje !== undefined && ordenData.vehiculo_kilometraje !== null
                        ? String(ordenData.vehiculo_kilometraje)
                        : raw.km_ingreso !== undefined && raw.km_ingreso !== null
                        ? String(raw.km_ingreso)
                        : '',
                vehiculo_chasis: ordenData.vehiculo_chasis ?? raw.chasis ?? '',
                plazo_entrega: ordenData.plazo_entrega,
                moneda: ordenData.moneda || 'Bolivianos',
                sub_total: ordenData.sub_total ?? 0,
                descuento: ordenData.descuento ?? 0,
                total: ordenData.total ?? 0,
                total_pagado: 0,
                saldo: ordenData.total ?? 0,
                facturado: Boolean(ordenData.facturado ?? raw.facturado),
                nro_factura: ordenData.nro_factura ?? raw.nro_factura ?? null,
                fecha_facturado: (ordenData.fecha_facturado ?? raw.fecha_facturado) ? String(ordenData.fecha_facturado ?? raw.fecha_facturado).split('T')[0] : null,
                fecha_cancelado: ordenData.cancelado ? new Date() : null,
                observaciones: ordenData.observaciones,
                cancelado: ordenData.cancelado ?? false,
                estado: ordenData.estado || 'en_proceso',
                id_hoja_recepcion: ordenData.id_hoja_recepcion,
                id_cotizacion: ordenData.id_cotizacion,
                usuario: ordenData.idusuario ? ({ id: +ordenData.idusuario } as any) : null,
                sucursal: sucursalId ? ({ id: sucursalId } as any) : null,
            });
            const savedOrden = await transactionalEntityManager.save(orden);

            // 2. Create Detalles if any
            if (detalles && detalles.length > 0) {
                const detallesEntities = detalles.map(d => {
                    return transactionalEntityManager.create(DetalleOrdenTrabajo, {
                        ...d,
                        idorden_trabajo: savedOrden.id,
                        orden_trabajo: savedOrden,
                        precio_taller: d.idprecio_taller ? { id: +d.idprecio_taller } as any : null,
                        precio_seguro: d.idprecio_seguro ? { id: +d.idprecio_seguro } as any : null
                    });
                });
                const savedDetalles = await transactionalEntityManager.save(detallesEntities);

                // Sincronizar mecánicos asignados a trabajos_asignados
                const fechaAsig = savedOrden.fecha_registro ? getBoliviaDateString(new Date(savedOrden.fecha_registro)) : getBoliviaDateString();
                for (const d of savedDetalles) {
                    if (d.idpersonal_mecanico && d.estado_trabajo !== 'descartado') {
                        const totalCosto = Number(d.total_costo || 0);
                        await transactionalEntityManager.query(
                            `INSERT INTO trabajos_asignados (iddetalle_orden_trabajo, idpersonal, fecha_asignado, monto, cancelado, idusuario) VALUES ($1, $2, $3, $4, false, $5)`,
                            [d.id, d.idpersonal_mecanico, fechaAsig, totalCosto, d.idusuario || null],
                        );
                    }
                }
            }

            // 3. Update HojaRecepcion status if linked
            if (ordenData.id_hoja_recepcion) {
                await transactionalEntityManager.query(
                    `UPDATE hoja_recepcion SET estado = 'Orden Creada' WHERE id = $1`,
                    [ordenData.id_hoja_recepcion]
                );
            }

            // 4. Update Cotizacion status if linked
            if (ordenData.id_cotizacion) {
                await transactionalEntityManager.query(
                    `UPDATE cotizaciones SET estado = 'aprobada' WHERE id = $1`,
                    [ordenData.id_cotizacion]
                );
            }

            return savedOrden;
        });
    }

    async findAll(sucursalId: number | null = null): Promise<OrdenTrabajo[]> {
        console.log('Fetching all ordenes_trabajo...');
        
        const whereClause: any = {};
        if (sucursalId) {
            whereClause.sucursal = { id: sucursalId };
        }

        try {
            const data = await this.ordenesTrabajoRepository.find({
                where: whereClause,
                relations: ['sucursal', 'hoja_recepcion', 'hoja_recepcion.tipo_orden', 'hoja_recepcion.seguro', 'hoja_recepcion.inspector', 'marca_auto', 'usuario'],
                order: { fecha_registro: 'DESC' },
            });
            console.log(`Successfully fetched ${data.length} ordenes`);
            return data;
        } catch (error) {
            console.error('Error in OrdenesTrabajoService.findAll:', error);
            throw error;
        }
    }

    async findOne(id: number): Promise<OrdenTrabajo | null> {
        return await this.ordenesTrabajoRepository.findOne({
            where: { id },
            relations: ['hoja_recepcion', 'hoja_recepcion.tipo_orden', 'hoja_recepcion.seguro', 'hoja_recepcion.inspector', 'hoja_recepcion.asesor', 'sucursal', 'marca_auto', 'usuario']
        });
    }

    async findByPlaca(placa: string): Promise<OrdenTrabajo | null> {
        return await this.ordenesTrabajoRepository.findOne({
            where: { vehiculo_placa: placa.toUpperCase() },
            relations: ['hoja_recepcion', 'hoja_recepcion.tipo_orden', 'hoja_recepcion.seguro', 'hoja_recepcion.inspector', 'marca_auto', 'usuario'],
            order: { fecha_registro: 'DESC' }
        });
    }

    private mapOrdenEstadoToHojaEstado(ordenEstado?: string): string {
        switch ((ordenEstado || '').toLowerCase()) {
            case 'activo':
            case 'en_proceso':
                return 'En Proceso';
            case 'terminado':
            case 'finalizado':
                return 'Finalizado';
            case 'entregado':
            case 'entregado_con_saldo':
            case 'entregado con saldo':
            case 'entregado_por_pagar':
            case 'entregado por pagar':
                return 'Entregado por Pagar';
            case 'cerrada':
            case 'orden_cerrada':
            case 'orden cerrada':
                return 'Orden Cerrada';
            case 'inactivo':
            case 'anulado':
            case 'anulada':
                return 'Anulada';
            case 'pendiente':
            default:
                return 'Pendiente';
        }
    }

    private async syncHojaRecepcionFromOrden(orden: OrdenTrabajo | null, motivoAnulacion?: string | null): Promise<void> {
        if (!orden || !orden.id_hoja_recepcion) return;
        try {
            const hojaEstado = this.mapOrdenEstadoToHojaEstado(orden.estado);
            const motivo = motivoAnulacion !== undefined ? motivoAnulacion : (orden.motivo_anulacion || null);
            await this.ordenesTrabajoRepository.manager.query(
                `UPDATE hoja_recepcion
                 SET estado = $1,
                     motivo_anulacion = $2,
                     cliente_nombre = COALESCE(NULLIF($3, ''), cliente_nombre),
                     cliente_telefono = COALESCE(NULLIF($4, ''), cliente_telefono),
                     idmarca_auto = COALESCE($5, idmarca_auto),
                     vehiculo_marca = COALESCE(NULLIF($6, ''), vehiculo_marca),
                     vehiculo_modelo = COALESCE(NULLIF($7, ''), vehiculo_modelo),
                     vehiculo_placa = COALESCE(NULLIF($8, ''), vehiculo_placa),
                     vehiculo_color = COALESCE(NULLIF($9, ''), vehiculo_color),
                     vehiculo_kilometraje = COALESCE(NULLIF($10, ''), vehiculo_kilometraje),
                     vehiculo_chasis = COALESCE(NULLIF($11, ''), vehiculo_chasis)
                 WHERE id = $12`,
                [
                    hojaEstado,
                    motivo,
                    orden.cliente_nombre || '',
                    orden.cliente_telefono || '',
                    orden.idmarca_auto || null,
                    orden.marca_auto?.marca || '',
                    orden.vehiculo_modelo || '',
                    orden.vehiculo_placa || '',
                    orden.vehiculo_color || '',
                    orden.vehiculo_kilometraje || '',
                    orden.vehiculo_chasis || '',
                    orden.id_hoja_recepcion,
                ],
            );
        } catch (err) {
            console.error('Error syncing HojaRecepcion from OrdenTrabajo:', err);
        }
    }

    async update(id: number, updateOrdenTrabajoDto: UpdateOrdenTrabajoDto): Promise<OrdenTrabajo | null> {
        const existingOrden = await this.findOne(id);
        const raw: any = updateOrdenTrabajoDto;
        const {
            idmarca_auto,
            idusuario,
            detalles,
            fecha_recepcion,
            cliente,
            celular,
            modelo,
            placa,
            color,
            chasis,
            km_ingreso,
            idseguro,
            idinspector,
            idtipo_vehiculo,
            direccion,
            nit,
            correo,
            anio,
            motor,
            km_egreso,
            codigo_pintura,
            ...rest
        } = raw;

        const updateData: any = { ...rest };

        if (existingOrden?.estado === 'pendiente' && (!updateData.estado || updateData.estado === 'pendiente')) {
            updateData.estado = 'en_proceso';
        }

        if (updateData.estado === 'terminado' && existingOrden?.cancelado) {
            updateData.estado = 'cerrada';
        }

        if (updateOrdenTrabajoDto.cliente_nombre !== undefined || cliente !== undefined) {
            updateData.cliente_nombre = updateOrdenTrabajoDto.cliente_nombre ?? cliente;
        }
        if (updateOrdenTrabajoDto.cliente_telefono !== undefined || celular !== undefined) {
            updateData.cliente_telefono = updateOrdenTrabajoDto.cliente_telefono ?? celular;
        }
        if (updateOrdenTrabajoDto.vehiculo_modelo !== undefined || modelo !== undefined) {
            updateData.vehiculo_modelo = updateOrdenTrabajoDto.vehiculo_modelo ?? modelo;
        }
        if (updateOrdenTrabajoDto.vehiculo_placa !== undefined || placa !== undefined) {
            updateData.vehiculo_placa = (updateOrdenTrabajoDto.vehiculo_placa ?? placa ?? '').toUpperCase();
        }
        if (updateOrdenTrabajoDto.vehiculo_color !== undefined || color !== undefined) {
            updateData.vehiculo_color = updateOrdenTrabajoDto.vehiculo_color ?? color;
        }
        if (updateOrdenTrabajoDto.vehiculo_kilometraje !== undefined || km_ingreso !== undefined) {
            updateData.vehiculo_kilometraje = String(updateOrdenTrabajoDto.vehiculo_kilometraje ?? km_ingreso ?? '');
        }
        if (updateOrdenTrabajoDto.vehiculo_chasis !== undefined || chasis !== undefined) {
            updateData.vehiculo_chasis = updateOrdenTrabajoDto.vehiculo_chasis ?? chasis;
        }

        if (raw.facturado !== undefined) {
            updateData.facturado = Boolean(raw.facturado);
        }
        if (raw.nro_factura !== undefined) {
            updateData.nro_factura = raw.nro_factura || null;
        }
        if (raw.fecha_facturado !== undefined) {
            updateData.fecha_facturado = raw.fecha_facturado ? String(raw.fecha_facturado).split('T')[0] : null;
        }
        if (raw.cancelado !== undefined) {
            updateData.cancelado = Boolean(raw.cancelado);
            if (updateData.cancelado && !existingOrden?.cancelado) {
                updateData.fecha_cancelado = raw.fecha_cancelado ? new Date(raw.fecha_cancelado) : new Date();
            } else if (!updateData.cancelado) {
                updateData.fecha_cancelado = null;
            }
        } else if (raw.fecha_cancelado !== undefined) {
            updateData.fecha_cancelado = raw.fecha_cancelado ? new Date(raw.fecha_cancelado) : null;
        }

        if (idmarca_auto) {
            updateData.idmarca_auto = +idmarca_auto;
            delete updateData.marca_auto;
        }
        if (idusuario) {
            updateData.idusuario = +idusuario;
            delete updateData.usuario;
        }

        // Eliminar propiedades que no pertenecen a la tabla ordenes_trabajo
        delete updateData.vehiculo_marca;
        delete updateData.marca;
        delete updateData.cliente;
        delete updateData.celular;
        delete updateData.modelo;
        delete updateData.placa;
        delete updateData.color;
        delete updateData.chasis;
        delete updateData.km_ingreso;
        delete updateData.nro_hoja;
        delete updateData.tipo_orden;
        delete updateData.id_tipo_orden;
        delete updateData.seguro;
        delete updateData.idseguro;
        delete updateData.inspector;
        delete updateData.idinspector;
        delete updateData.particular_seguro;

        const isTerminadoOrCerrada = updateData.estado && (
            updateData.estado.toLowerCase().startsWith('terminad') ||
            updateData.estado.toLowerCase().startsWith('finaliz') ||
            updateData.estado.toLowerCase().includes('cerrad') ||
            updateData.estado.toLowerCase().includes('entregad')
        );

        if (isTerminadoOrCerrada) {
            if (!updateData.fecha_terminado && !existingOrden?.fecha_terminado) {
                updateData.fecha_terminado = new Date();
            }
        }

        if (updateData.estado && updateData.estado.toLowerCase().includes('entregad')) {
            if (!updateData.fecha_entrega && !existingOrden?.fecha_entrega) {
                updateData.fecha_entrega = new Date();
            }
        }

        await this.ordenesTrabajoRepository.update(id, updateData);

        // Si la orden pasa a terminado o entregado, registrar fecha_entrega en trabajos_asignados
        if (updateData.estado && (updateData.estado.toLowerCase().startsWith('terminad') || updateData.estado.toLowerCase().startsWith('finaliz') || updateData.estado.toLowerCase().includes('cerrad') || updateData.estado.toLowerCase().includes('entregad'))) {
            await this.ordenesTrabajoRepository.manager.query(
                `UPDATE trabajos_asignados 
                 SET fecha_entrega = CURRENT_DATE 
                 WHERE iddetalle_orden_trabajo IN (
                     SELECT id FROM detalle_orden_trabajo WHERE idorden_trabajo = $1
                 ) AND fecha_entrega IS NULL`,
                [id]
            );
        }

        if (updateData.id_cotizacion) {
            await this.ordenesTrabajoRepository.manager.query(
                `UPDATE cotizaciones SET estado = 'aprobada' WHERE id = $1`,
                [updateData.id_cotizacion]
            );
        }
        const updatedOrden = await this.findOne(id);
        await this.syncHojaRecepcionFromOrden(updatedOrden);
        return updatedOrden;
    }

    async remove(id: number, motivo?: string): Promise<void> {
        const updateData: any = { estado: 'anulada' };
        if (motivo) {
            updateData.motivo_anulacion = motivo;
        }
        await this.ordenesTrabajoRepository.update(id, updateData);
        const orden = await this.findOne(id);
        if (orden?.id_cotizacion) {
            await this.ordenesTrabajoRepository.manager.query(
                `UPDATE cotizaciones SET estado = 'activo' WHERE id = $1`,
                [orden.id_cotizacion]
            );
        }
        await this.syncHojaRecepcionFromOrden(orden, motivo);
    }

    async reactivate(id: number): Promise<void> {
        const existing = await this.findOne(id);
        const restoredEstado = existing?.cancelado ? 'cerrada' : 'en_proceso';
        await this.ordenesTrabajoRepository.update(id, { estado: restoredEstado, motivo_anulacion: null as any });
        const orden = await this.findOne(id);
        if (orden?.id_cotizacion) {
            await this.ordenesTrabajoRepository.manager.query(
                `UPDATE cotizaciones SET estado = 'aprobada' WHERE id = $1`,
                [orden.id_cotizacion]
            );
        }
        await this.syncHojaRecepcionFromOrden(orden, null);
    }

    async updateTotal(id: number): Promise<void> {
        const orden = await this.findOne(id);
        if (!orden) return;

        // Only sum confirmed/pending items (exclude items discarded by the client)
        const result = await this.ordenesTrabajoRepository.manager
            .createQueryBuilder()
            .select('SUM(detalle.total)', 'sum')
            .from('detalle_orden_trabajo', 'detalle')
            .where('detalle.idorden_trabajo = :id', { id })
            .andWhere("(detalle.estado_trabajo IS NULL OR detalle.estado_trabajo != 'descartado')")
            .getRawOne();

        const subTotal = parseFloat(result.sum || '0');
        const total = subTotal - (Number(orden.descuento) || 0);
        const finalTotal = total > 0 ? total : 0;
        const totalPagado = Number(orden.total_pagado) || 0;
        const saldo = Math.max(0, finalTotal - totalPagado);

        const nextFields: any = {
            sub_total: subTotal,
            total: finalTotal,
            saldo: saldo,
            cancelado: saldo <= 0.05 && totalPagado > 0,
        };
        if (subTotal > 0 && orden.estado === 'pendiente') {
            nextFields.estado = 'en_proceso';
        }

        await this.ordenesTrabajoRepository.update(id, nextFields);
        if (nextFields.estado) {
            const updatedOrden = await this.findOne(id);
            await this.syncHojaRecepcionFromOrden(updatedOrden);
        }
    }

    async getUtilidadOrden(id: number) {
        const orden = await this.findOne(id);
        if (!orden) {
            return null;
        }

        const manager = this.ordenesTrabajoRepository.manager;

        // 1. Obtener todos los detalles aprobados/pendientes de la orden (excluyendo descartados)
        const detallesRows = await manager.query(
            `SELECT 
                d.id,
                d.detalle,
                d.observaciones,
                d.nivel,
                d.cantidad,
                d.precio_unitario,
                d.total,
                d.estado_trabajo,
                d.tiempo_estimado,
                d.precio_hora,
                d.total_costo,
                d.costo_tercero,
                d.id_inventario,
                d.idpersonal_mecanico,
                d.idprecio_taller,
                d.idprecio_seguro,
                inv.codigo AS inv_codigo,
                inv.descripcion AS inv_descripcion,
                inv.precio_compra AS inv_precio_compra,
                inv.precio_venta AS inv_precio_venta,
                pt.detalle AS pt_detalle,
                pt.items AS pt_items,
                pt.tiempo_estimado AS pt_tiempo_estimado,
                pt.precio_hora AS pt_precio_hora,
                pt.total_costo AS pt_total_costo,
                cat.categoria_servicio AS pt_categoria,
                p_det.nombre AS mec_det_nombre,
                p_det.paterno AS mec_det_paterno,
                p_det.materno AS mec_det_materno,
                ta.id AS ta_id,
                ta.monto AS ta_monto,
                ta.cancelado AS ta_cancelado,
                ta.costo_arancel AS ta_costo_arancel,
                ta.tiempo_estimado AS ta_tiempo_estimado,
                p_ta.nombre AS mec_ta_nombre,
                p_ta.paterno AS mec_ta_paterno,
                p_ta.materno AS mec_ta_materno
             FROM detalle_orden_trabajo d
             LEFT JOIN inventario inv ON inv.id = d.id_inventario
             LEFT JOIN precios_taller pt ON pt.id = d.idprecio_taller
             LEFT JOIN categoria_servicio cat ON cat.id = pt.idcategoria_servicio
             LEFT JOIN personal p_det ON p_det.id = d.idpersonal_mecanico
             LEFT JOIN trabajos_asignados ta ON ta.iddetalle_orden_trabajo = d.id
             LEFT JOIN personal p_ta ON p_ta.id = ta.idpersonal
             WHERE d.idorden_trabajo = $1
               AND (d.estado_trabajo IS NULL OR d.estado_trabajo != 'descartado')
             ORDER BY d.id ASC`,
            [id],
        );

        // 2. Obtener movimientos FIFO de salida de inventario para esta orden
        const movsRows = await manager.query(
            `SELECT 
                m.iddetalle_orden_trabajo,
                m.idinventario,
                m.cantidad,
                m.costo_unitario,
                l.nro_lote
             FROM inventario_movimientos m
             LEFT JOIN inventario_lotes l ON l.id = m.idlote
             WHERE m.idorden_trabajo = $1
               AND m.tipo_movimiento = 'SALIDA_ORDEN'
             ORDER BY m.id ASC`,
            [id],
        );

        const movsByDetalle = new Map<number, any[]>();
        for (const m of movsRows) {
            if (m.iddetalle_orden_trabajo) {
                const detId = Number(m.iddetalle_orden_trabajo);
                if (!movsByDetalle.has(detId)) {
                    movsByDetalle.set(detId, []);
                }
                movsByDetalle.get(detId)!.push(m);
            }
        }

        // 3. Procesar cada ítem en Servicios/Mano de Obra y Repuestos/Materiales
        const servicios: any[] = [];
        const repuestos: any[] = [];

        let totalIngresoServicios = 0;
        let totalIngresoRepuestos = 0;
        let totalPagoMecanicos = 0;
        let totalPagoMecanicosPagado = 0;
        let totalPagoMecanicosPendiente = 0;
        let totalCostoRepuestos = 0;
        let totalCostoTerceros = 0;

        // Identificar qué idprecio_taller son grupos con desglose de sub-trabajos
        const countByPrecioTaller = new Map<number, number>();
        for (const r of detallesRows) {
            if (!r.id_inventario && r.idprecio_taller) {
                const ptId = Number(r.idprecio_taller);
                countByPrecioTaller.set(ptId, (countByPrecioTaller.get(ptId) || 0) + 1);
            }
        }

        const gruposMap = new Map<number, any>();

        for (const row of detallesRows) {
            const detId = Number(row.id);
            const cantidad = Number(row.cantidad || 1);
            const precioUnitarioVenta = Number(row.precio_unitario || 0);
            const ingresoTotal = Number(row.total || (cantidad * precioUnitarioVenta));
            const esRepuesto = Boolean(row.id_inventario);

            // Nombre del mecánico
            const mecNombre = row.mec_ta_nombre
                ? `${row.mec_ta_nombre} ${row.mec_ta_paterno || ''} ${row.mec_ta_materno || ''}`.trim()
                : row.mec_det_nombre
                ? `${row.mec_det_nombre} ${row.mec_det_paterno || ''} ${row.mec_det_materno || ''}`.trim()
                : null;

            // Tiempo estimado y precio hora reales (evitando que 0.00 por defecto en trabajos_asignados oculte el tiempo global)
            const tiempoEst =
                Number(row.ta_tiempo_estimado) > 0
                    ? Number(row.ta_tiempo_estimado)
                    : Number(row.tiempo_estimado) > 0
                    ? Number(row.tiempo_estimado)
                    : Number(row.pt_tiempo_estimado || 0);
            const precioHora =
                Number(row.precio_hora) > 0
                    ? Number(row.precio_hora)
                    : Number(row.pt_precio_hora || 0);
            const costoBaseTaller =
                Number(row.total_costo) > 0
                    ? Number(row.total_costo)
                    : Number((tiempoEst * precioHora).toFixed(2)) > 0
                    ? Number((tiempoEst * precioHora).toFixed(2))
                    : Number(row.pt_total_costo || 0);

            const catNombre = String(row.pt_categoria || '').toLowerCase();
            const esTrabajoTercero =
                catNombre.includes('tercero') ||
                catNombre.includes('chaper') ||
                Number(row.costo_tercero) > 0;
            const costoTercero = Number(row.costo_tercero) > 0
                ? Number(row.costo_tercero)
                : esTrabajoTercero && Number(row.total_costo) > 0
                ? Number(row.total_costo)
                : esTrabajoTercero && Number(row.pt_total_costo) > 0
                ? Number(row.pt_total_costo)
                : 0;

            let costoMecanico = 0;
            if (esTrabajoTercero) {
                costoMecanico = 0;
            } else if (row.ta_id) {
                costoMecanico =
                    Number(row.ta_monto) > 0
                        ? Number(row.ta_monto)
                        : Number(row.ta_costo_arancel) > 0
                        ? Number(row.ta_costo_arancel)
                        : costoBaseTaller;
            } else if (row.idpersonal_mecanico || !esRepuesto) {
                costoMecanico = costoBaseTaller;
            }
            costoMecanico = Number(costoMecanico.toFixed(2));
            const mecanicoPagado = Boolean(row.ta_cancelado);

            if (esRepuesto) {
                // Calcular costo de compra del repuesto (FIFO si existe, sino precio_compra de inventario)
                const movs = movsByDetalle.get(detId) || [];
                let costoCompraTotal = 0;
                let costoCompraUnitario = Number(row.inv_precio_compra || 0);
                const lotesUsados: string[] = [];

                if (movs.length > 0) {
                    costoCompraTotal = movs.reduce(
                        (acc, m) => acc + Number(m.cantidad || 0) * Number(m.costo_unitario || 0),
                        0,
                    );
                    costoCompraTotal = Number(costoCompraTotal.toFixed(2));
                    costoCompraUnitario = cantidad > 0 ? Number((costoCompraTotal / cantidad).toFixed(2)) : costoCompraUnitario;
                    for (const m of movs) {
                        if (m.nro_lote && !lotesUsados.includes(m.nro_lote)) {
                            lotesUsados.push(m.nro_lote);
                        }
                    }
                } else {
                    costoCompraTotal = Number((cantidad * costoCompraUnitario).toFixed(2));
                }

                const costoMecEnRepuesto = row.idpersonal_mecanico || row.ta_id ? costoMecanico : 0;
                const utilidadItem = Number((ingresoTotal - costoCompraTotal - costoMecEnRepuesto).toFixed(2));

                totalIngresoRepuestos += ingresoTotal;
                totalCostoRepuestos += costoCompraTotal;
                if (costoMecEnRepuesto > 0) {
                    totalPagoMecanicos += costoMecEnRepuesto;
                    if (mecanicoPagado) {
                        totalPagoMecanicosPagado += costoMecEnRepuesto;
                    } else {
                        totalPagoMecanicosPendiente += costoMecEnRepuesto;
                    }
                }

                repuestos.push({
                    id: detId,
                    codigo: row.inv_codigo || null,
                    detalle: row.detalle || row.inv_descripcion || 'Repuesto',
                    cantidad,
                    precio_venta_unitario: precioUnitarioVenta,
                    ingreso_total: Number(ingresoTotal.toFixed(2)),
                    costo_compra_unitario: costoCompraUnitario,
                    costo_compra_total: costoCompraTotal,
                    lotes: lotesUsados,
                    mecanico: mecNombre,
                    costo_mecanico: costoMecEnRepuesto,
                    mecanico_pagado: mecanicoPagado,
                    utilidad: utilidadItem,
                });
            } else {
                const ptId = row.idprecio_taller ? Number(row.idprecio_taller) : 0;
                const ptItemsArr = Array.isArray(row.pt_items) ? row.pt_items : [];
                const esGrupoDesglose =
                    ptId > 0 &&
                    (ptItemsArr.length > 0 || (countByPrecioTaller.get(ptId) || 0) > 1);

                totalIngresoServicios += ingresoTotal;

                if (esGrupoDesglose) {
                    // Agrupar todos los sub-trabajos del mismo mantenimiento/grupo para aplicar el tiempo y costo global una sola vez
                    let grupo = gruposMap.get(ptId);
                    if (!grupo) {
                        const tiempoGlobal =
                            tiempoEst > 0
                                ? tiempoEst
                                : Number(row.pt_tiempo_estimado || 0);
                        const precioHoraGlobal =
                            precioHora > 0
                                ? precioHora
                                : Number(row.pt_precio_hora || 0);
                        const costoGlobal =
                            Number(row.total_costo) > 0
                                ? Number(row.total_costo)
                                : Number((tiempoGlobal * precioHoraGlobal).toFixed(2)) > 0
                                ? Number((tiempoGlobal * precioHoraGlobal).toFixed(2))
                                : Number(row.pt_total_costo || 0);

                        const costoMecGrupo =
                            row.idpersonal_mecanico || row.ta_id || costoGlobal > 0
                                ? costoGlobal
                                : 0;

                        totalPagoMecanicos += costoMecGrupo;
                        if (mecanicoPagado) {
                            totalPagoMecanicosPagado += costoMecGrupo;
                        } else {
                            totalPagoMecanicosPendiente += costoMecGrupo;
                        }

                        grupo = {
                            id: detId,
                            detalle: row.pt_detalle || row.detalle || 'Grupo de Mantenimiento',
                            es_grupo: true,
                            sub_items: [],
                            nivel: row.nivel || null,
                            cantidad: 1,
                            precio_unitario: 0,
                            ingreso_total: 0,
                            mecanico: mecNombre || 'Sin asignar',
                            tiene_mecanico: Boolean(mecNombre),
                            tiempo_estimado: tiempoGlobal,
                            precio_hora: precioHoraGlobal,
                            costo_mecanico: Number(costoMecGrupo.toFixed(2)),
                            mecanico_pagado: mecanicoPagado,
                            utilidad: 0,
                        };
                        gruposMap.set(ptId, grupo);
                        servicios.push(grupo);
                    } else {
                        if (!grupo.tiene_mecanico && mecNombre) {
                            grupo.mecanico = mecNombre;
                            grupo.tiene_mecanico = true;
                        }
                        if (mecanicoPagado && !grupo.mecanico_pagado) {
                            grupo.mecanico_pagado = true;
                            totalPagoMecanicosPendiente = Math.max(0, totalPagoMecanicosPendiente - grupo.costo_mecanico);
                            totalPagoMecanicosPagado += grupo.costo_mecanico;
                        }
                    }

                    grupo.sub_items.push({
                        id: detId,
                        detalle: row.detalle || 'Sub-trabajo',
                        cantidad,
                        precio_unitario: precioUnitarioVenta,
                        ingreso_total: Number(ingresoTotal.toFixed(2)),
                    });
                    grupo.ingreso_total = Number((grupo.ingreso_total + ingresoTotal).toFixed(2));
                    grupo.precio_unitario = grupo.ingreso_total;
                    grupo.utilidad = Number((grupo.ingreso_total - grupo.costo_mecanico).toFixed(2));
                } else if (esTrabajoTercero) {
                    const utilidadItem = Number((ingresoTotal - costoTercero).toFixed(2));
                    totalCostoTerceros += costoTercero;

                    servicios.push({
                        id: detId,
                        detalle: row.detalle || 'Trabajo de Terceros',
                        es_grupo: false,
                        es_tercero: true,
                        sub_items: [],
                        nivel: row.nivel || null,
                        cantidad,
                        precio_unitario: precioUnitarioVenta,
                        ingreso_total: Number(ingresoTotal.toFixed(2)),
                        mecanico: 'Trabajo Externo (Tercero)',
                        tiene_mecanico: false,
                        tiempo_estimado: 0,
                        precio_hora: 0,
                        costo_mecanico: 0,
                        costo_tercero: costoTercero,
                        mecanico_pagado: false,
                        utilidad: utilidadItem,
                    });
                } else {
                    const utilidadItem = Number((ingresoTotal - costoMecanico).toFixed(2));
                    totalPagoMecanicos += costoMecanico;
                    if (mecanicoPagado) {
                        totalPagoMecanicosPagado += costoMecanico;
                    } else {
                        totalPagoMecanicosPendiente += costoMecanico;
                    }

                    servicios.push({
                        id: detId,
                        detalle: row.detalle || 'Trabajo / Servicio',
                        es_grupo: false,
                        es_tercero: false,
                        costo_tercero: 0,
                        sub_items: [],
                        nivel: row.nivel || null,
                        cantidad,
                        precio_unitario: precioUnitarioVenta,
                        ingreso_total: Number(ingresoTotal.toFixed(2)),
                        mecanico: mecNombre || 'Sin asignar',
                        tiene_mecanico: Boolean(mecNombre),
                        tiempo_estimado: tiempoEst,
                        precio_hora: precioHora,
                        costo_mecanico: costoMecanico,
                        mecanico_pagado: mecanicoPagado,
                        utilidad: utilidadItem,
                    });
                }
            }
        }

        // 4. Verificar si existen materiales adicionales en material_utilizado para esta orden
        const matAdicionalesRows = await manager.query(
            `SELECT 
                mu.id,
                mu.cantidad,
                mu.precio,
                inv.codigo AS inv_codigo,
                inv.descripcion AS inv_descripcion,
                inv.precio_compra AS inv_precio_compra
             FROM material_utilizado mu
             LEFT JOIN inventario inv ON inv.id = mu.id_inventario
             WHERE mu.idorden_trabajo = $1
             ORDER BY mu.id ASC`,
            [id],
        );

        for (const mu of matAdicionalesRows) {
            const cant = Number(mu.cantidad || 1);
            const costoUnit = Number(mu.inv_precio_compra || mu.precio || 0);
            const costoTot = Number((cant * costoUnit).toFixed(2));
            totalCostoRepuestos += costoTot;
            repuestos.push({
                id: `MU-${mu.id}`,
                codigo: mu.inv_codigo || null,
                detalle: `${mu.inv_descripcion || 'Material utilizado'} (Insumo Taller)`,
                cantidad: cant,
                precio_venta_unitario: 0,
                ingreso_total: 0,
                costo_compra_unitario: costoUnit,
                costo_compra_total: costoTot,
                lotes: [],
                mecanico: null,
                costo_mecanico: 0,
                mecanico_pagado: false,
                utilidad: Number((-costoTot).toFixed(2)),
            });
        }

        // 5. Obtener pagos de la orden y posibles comisiones de tarjeta
        const pagosRows = await manager.query(
            `SELECT 
                po.id,
                po.fecha,
                po.monto,
                po.moneda,
                po.monto_comision,
                fp.forma_pago
             FROM pago_orden po
             LEFT JOIN forma_pago fp ON fp.id = po.idforma_pago
             WHERE po.idorden_trabajo = $1
             ORDER BY po.fecha ASC, po.id ASC`,
            [id],
        );

        const totalComisionesTarjeta = Number(
            pagosRows
                .reduce((acc: number, p: any) => acc + Number(p.monto_comision || 0), 0)
                .toFixed(2),
        );
        const totalPagadoCliente = Number(
            pagosRows
                .reduce((acc: number, p: any) => acc + Number(p.monto || 0), 0)
                .toFixed(2),
        );

        const subTotalOrden = Number((totalIngresoServicios + totalIngresoRepuestos).toFixed(2));
        const descuentoOrden = Number(Number(orden.descuento || 0).toFixed(2));
        const ingresoNetoOrden = Number(Math.max(0, subTotalOrden - descuentoOrden).toFixed(2));

        totalPagoMecanicos = Number(totalPagoMecanicos.toFixed(2));
        totalPagoMecanicosPagado = Number(totalPagoMecanicosPagado.toFixed(2));
        totalPagoMecanicosPendiente = Number(totalPagoMecanicosPendiente.toFixed(2));
        totalCostoRepuestos = Number(totalCostoRepuestos.toFixed(2));
        totalCostoTerceros = Number(totalCostoTerceros.toFixed(2));

        const totalCostos = Number(
            (totalPagoMecanicos + totalCostoRepuestos + totalCostoTerceros + totalComisionesTarjeta).toFixed(2),
        );
        const utilidadNeta = Number((ingresoNetoOrden - totalCostos).toFixed(2));
        const margenPorcentaje =
            ingresoNetoOrden > 0
                ? Number(((utilidadNeta / ingresoNetoOrden) * 100).toFixed(1))
                : 0;

        return {
            orden: {
                id: orden.id,
                nro_orden: String(
                    orden.hoja_recepcion?.nro || orden.id_hoja_recepcion || orden.id,
                ).padStart(6, '0'),
                fecha_registro: orden.fecha_registro,
                cliente: orden.cliente_nombre || (orden as any).cliente || 'S/N',
                placa: (orden.vehiculo_placa || (orden as any).placa || 'S/P').toUpperCase(),
                vehiculo: `${orden.marca_auto?.marca || ''} ${orden.vehiculo_modelo || ''}`.trim() || 'N/A',
                tipo_orden:
                    orden.hoja_recepcion?.tipo_orden?.tipo_orden ||
                    (orden.hoja_recepcion as any)?.tipo_orden ||
                    'Particular',
                asesor: orden.hoja_recepcion?.asesor
                    ? `${orden.hoja_recepcion.asesor.nombre} ${orden.hoja_recepcion.asesor.paterno || ''}`.trim()
                    : null,
                estado: orden.estado,
                moneda: orden.moneda || 'Bolivianos',
                facturado: Boolean(orden.facturado),
                nro_factura: orden.nro_factura || null,
            },
            servicios,
            repuestos,
            pagos_cliente: pagosRows,
            resumen: {
                ingreso_servicios: Number(totalIngresoServicios.toFixed(2)),
                ingreso_repuestos: Number(totalIngresoRepuestos.toFixed(2)),
                sub_total: subTotalOrden,
                descuento: descuentoOrden,
                ingreso_neto_orden: ingresoNetoOrden,
                total_pagado_cliente: totalPagadoCliente,
                saldo_cliente: Number(Math.max(0, ingresoNetoOrden - totalPagadoCliente).toFixed(2)),
                costo_mecanicos: totalPagoMecanicos,
                costo_mecanicos_pagado: totalPagoMecanicosPagado,
                costo_mecanicos_pendiente: totalPagoMecanicosPendiente,
                costo_repuestos: totalCostoRepuestos,
                costo_terceros: totalCostoTerceros,
                comisiones_tarjeta: totalComisionesTarjeta,
                total_costos: totalCostos,
                utilidad_neta: utilidadNeta,
                margen_porcentaje: margenPorcentaje,
            },
        };
    }

    async getAsesoresConRecepcion(): Promise<any[]> {
        const rows = await this.ordenesTrabajoRepository.manager.query(`
            SELECT DISTINCT 
                p.id, 
                p.nombre, 
                p.paterno, 
                p.materno,
                TRIM(CONCAT(COALESCE(p.nombre, ''), ' ', COALESCE(p.paterno, ''), ' ', COALESCE(p.materno, ''))) AS nombre_completo
            FROM personal p
            INNER JOIN hoja_recepcion hr ON hr.asesor_id = p.id
            WHERE hr.asesor_id IS NOT NULL
        `);

        // Respaldo por si en el entorno aún no se asignaron asesores en hojas de recepción
        if (!rows || rows.length === 0) {
            const fallback = await this.ordenesTrabajoRepository.manager.query(`
                SELECT 
                    p.id, 
                    p.nombre, 
                    p.paterno, 
                    p.materno,
                    TRIM(CONCAT(COALESCE(p.nombre, ''), ' ', COALESCE(p.paterno, ''), ' ', COALESCE(p.materno, ''))) AS nombre_completo
                FROM personal p
                LEFT JOIN areas_personal a ON a.id = p.area_id
                WHERE a.area ILIKE '%asesor%' OR p.tipo ILIKE '%asesor%'
            `);
            const sortedFallback = (fallback || []).sort((a: any, b: any) =>
                (a.nombre_completo || '').localeCompare(b.nombre_completo || '')
            );
            return sortedFallback;
        }

        return rows.sort((a: any, b: any) =>
            (a.nombre_completo || '').localeCompare(b.nombre_completo || '')
        );
    }

    async getUtilidadMensual(
        mes?: string,
        desde?: string,
        hasta?: string,
        sucursalId?: number | null,
        estado?: string,
        asesorId?: number | string | null,
    ) {
        let fechaInicio: string;
        let fechaFin: string;

        if (desde && hasta) {
            fechaInicio = `${desde} 00:00:00`;
            fechaFin = `${hasta} 23:59:59`;
        } else if (mes) {
            const [y, m] = mes.split('-').map(Number);
            const lastDay = new Date(y, m, 0).getDate();
            fechaInicio = `${mes}-01 00:00:00`;
            fechaFin = `${mes}-${String(lastDay).padStart(2, '0')} 23:59:59`;
        } else {
            const { year: y, month: mNum } = getBoliviaDateParts();
            const m = String(mNum).padStart(2, '0');
            const lastDay = new Date(y, mNum, 0).getDate();
            fechaInicio = `${y}-${m}-01 00:00:00`;
            fechaFin = `${y}-${m}-${String(lastDay).padStart(2, '0')} 23:59:59`;
        }

        const qb = this.ordenesTrabajoRepository.createQueryBuilder('ot')
            .leftJoinAndSelect('ot.marca_auto', 'marca_auto')
            .leftJoinAndSelect('ot.hoja_recepcion', 'hr')
            .leftJoinAndSelect('hr.tipo_orden', 'tipo_orden')
            .leftJoinAndSelect('hr.asesor', 'asesor')
            .where('ot.fecha_registro >= :fechaInicio AND ot.fecha_registro <= :fechaFin', { fechaInicio, fechaFin })
            .orderBy('ot.id', 'DESC');

        if (sucursalId) {
            qb.andWhere('(ot.sucursal_id = :sucursalId OR ot.sucursal_id IS NULL)', { sucursalId });
        }

        if (asesorId && asesorId !== 'todos' && asesorId !== '') {
            qb.andWhere('hr.asesor_id = :asesorId', { asesorId: Number(asesorId) });
        }

        if (estado && estado !== 'todos' && estado !== '') {
            const est = estado.toLowerCase();
            if (est.includes('entregad')) {
                qb.andWhere("LOWER(ot.estado) LIKE '%entregad%'");
            } else if (est.includes('terminad')) {
                qb.andWhere("(LOWER(ot.estado) IN ('terminado', 'finalizado') AND (ot.cancelado IS NULL OR ot.cancelado = false))");
            } else if (est.includes('cerrad')) {
                qb.andWhere("(LOWER(ot.estado) IN ('cerrada', 'orden_cerrada') OR ot.cancelado = true)");
            } else if (est.includes('proceso')) {
                qb.andWhere("(LOWER(ot.estado) LIKE '%proceso%' OR LOWER(ot.estado) = 'activo')");
            } else {
                qb.andWhere('LOWER(ot.estado) = LOWER(:estado)', { estado });
            }
        }

        const ordenes = await qb.getMany();

        let totalIngresoOrdenes = 0;
        let totalSubtotal = 0;
        let totalDescuento = 0;
        let totalIngresoServicios = 0;
        let totalIngresoRepuestos = 0;
        let totalCostoMecanicos = 0;
        let totalCostoMecanicosPagado = 0;
        let totalCostoMecanicosPendiente = 0;
        let totalCostoRepuestos = 0;
        let totalCostoTerceros = 0;
        let totalComisionesTarjeta = 0;
        let totalCostos = 0;
        let totalUtilidadNeta = 0;

        const ordenesResumen: any[] = [];

        for (const ot of ordenes) {
            const util = await this.getUtilidadOrden(ot.id);
            if (!util) continue;

            const res = util.resumen;
            totalIngresoOrdenes += res.ingreso_neto_orden;
            totalSubtotal += res.sub_total;
            totalDescuento += res.descuento;
            totalIngresoServicios += res.ingreso_servicios;
            totalIngresoRepuestos += res.ingreso_repuestos;
            totalCostoMecanicos += res.costo_mecanicos;
            totalCostoMecanicosPagado += res.costo_mecanicos_pagado;
            totalCostoMecanicosPendiente += res.costo_mecanicos_pendiente;
            totalCostoRepuestos += res.costo_repuestos;
            totalCostoTerceros += res.costo_terceros;
            totalComisionesTarjeta += res.comisiones_tarjeta;
            totalCostos += res.total_costos;
            totalUtilidadNeta += res.utilidad_neta;

            const asesorNombre = ot.hoja_recepcion?.asesor
                ? `${ot.hoja_recepcion.asesor.nombre} ${ot.hoja_recepcion.asesor.paterno || ''}`.trim()
                : util.orden.asesor || null;

            ordenesResumen.push({
                id: ot.id,
                nro_orden: util.orden.nro_orden,
                fecha_registro: ot.fecha_registro,
                cliente: util.orden.cliente,
                placa: util.orden.placa,
                vehiculo: util.orden.vehiculo,
                tipo_orden: util.orden.tipo_orden,
                estado: ot.estado,
                asesor: asesorNombre || 'Sin asesor',
                asesor_id: ot.hoja_recepcion?.asesor_id || null,
                moneda: util.orden.moneda,
                facturado: util.orden.facturado,
                nro_factura: util.orden.nro_factura,
                sub_total: res.sub_total,
                descuento: res.descuento,
                ingreso_neto: res.ingreso_neto_orden,
                ingreso_servicios: res.ingreso_servicios,
                ingreso_repuestos: res.ingreso_repuestos,
                costo_mecanicos: res.costo_mecanicos,
                costo_mecanicos_pagado: res.costo_mecanicos_pagado,
                costo_mecanicos_pendiente: res.costo_mecanicos_pendiente,
                costo_repuestos: res.costo_repuestos,
                costo_terceros: res.costo_terceros,
                total_costos: res.total_costos,
                utilidad_neta: res.utilidad_neta,
                margen_porcentaje: res.margen_porcentaje,
            });
        }

        totalIngresoOrdenes = Number(totalIngresoOrdenes.toFixed(2));
        totalSubtotal = Number(totalSubtotal.toFixed(2));
        totalDescuento = Number(totalDescuento.toFixed(2));
        totalIngresoServicios = Number(totalIngresoServicios.toFixed(2));
        totalIngresoRepuestos = Number(totalIngresoRepuestos.toFixed(2));
        totalCostoMecanicos = Number(totalCostoMecanicos.toFixed(2));
        totalCostoMecanicosPagado = Number(totalCostoMecanicosPagado.toFixed(2));
        totalCostoMecanicosPendiente = Number(totalCostoMecanicosPendiente.toFixed(2));
        totalCostoRepuestos = Number(totalCostoRepuestos.toFixed(2));
        totalCostoTerceros = Number(totalCostoTerceros.toFixed(2));
        totalComisionesTarjeta = Number(totalComisionesTarjeta.toFixed(2));
        totalCostos = Number(totalCostos.toFixed(2));
        totalUtilidadNeta = Number(totalUtilidadNeta.toFixed(2));

        const margenGeneral = totalIngresoOrdenes > 0
            ? Number(((totalUtilidadNeta / totalIngresoOrdenes) * 100).toFixed(1))
            : 0;

        return {
            periodo: {
                mes: mes || fechaInicio.slice(0, 7),
                desde: fechaInicio.split(' ')[0],
                hasta: fechaFin.split(' ')[0],
            },
            resumen_general: {
                total_ordenes: ordenesResumen.length,
                ingreso_neto_ordenes: totalIngresoOrdenes,
                sub_total: totalSubtotal,
                descuento: totalDescuento,
                ingreso_servicios: totalIngresoServicios,
                ingreso_repuestos: totalIngresoRepuestos,
                costo_mecanicos: totalCostoMecanicos,
                costo_mecanicos_pagado: totalCostoMecanicosPagado,
                costo_mecanicos_pendiente: totalCostoMecanicosPendiente,
                costo_repuestos: totalCostoRepuestos,
                costo_terceros: totalCostoTerceros,
                comisiones_tarjeta: totalComisionesTarjeta,
                total_costos: totalCostos,
                utilidad_neta: totalUtilidadNeta,
                margen_porcentaje: margenGeneral,
            },
            ordenes: ordenesResumen,
        };
    }

    async findTrabajosRechazadosByPlaca(placa: string): Promise<any[]> {
        const cleanPlaca = (placa || '').toUpperCase().trim();
        if (!cleanPlaca) return [];

        try {
            const rows = await this.ordenesTrabajoRepository.manager.query(
                `SELECT 
                    dot.id,
                    dot.idorden_trabajo,
                    ot.fecha_registro as fecha_orden,
                    ot.vehiculo_placa,
                    ot.cliente_nombre,
                    ot.moneda,
                    COALESCE(NULLIF(dot.detalle, ''), pt.detalle, ps.detalle, inv.descripcion, inv.nombre, 'Sin descripción') as detalle,
                    dot.cantidad,
                    dot.precio_unitario,
                    dot.total,
                    dot.observaciones,
                    dot.idprecio_taller,
                    dot.idprecio_seguro,
                    dot.id_inventario,
                    COALESCE(cs_pt.categoria_servicio, cs_ps.categoria_servicio, CASE WHEN dot.id_inventario IS NOT NULL THEN 'Repuesto' ELSE 'Servicio' END) as categoria,
                    inv.codigo as codigo_repuesto
                 FROM detalle_orden_trabajo dot
                 INNER JOIN ordenes_trabajo ot ON ot.id = dot.idorden_trabajo
                 LEFT JOIN precios_taller pt ON pt.id = dot.idprecio_taller
                 LEFT JOIN categoria_servicio cs_pt ON cs_pt.id = pt.idcategoria_servicio
                 LEFT JOIN precios_seguros ps ON ps.id = dot.idprecio_seguro
                 LEFT JOIN categoria_servicio cs_ps ON cs_ps.id = ps.idcategoria_servicio
                 LEFT JOIN inventario inv ON inv.id = dot.id_inventario
                 WHERE UPPER(TRIM(ot.vehiculo_placa)) = $1
                   AND dot.estado_trabajo = 'descartado'
                   AND (ot.estado IS NULL OR LOWER(ot.estado) != 'anulado')
                 ORDER BY ot.fecha_registro DESC, dot.id DESC`,
                [cleanPlaca],
            );
            return rows || [];
        } catch (err) {
            console.error('Error querying trabajos rechazados by placa:', err);
            return [];
        }
    }
}
