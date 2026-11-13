import { BadRequestException, Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDetalleOrdenTrabajoDto } from './dto/create-detalle-orden-trabajo.dto';
import { UpdateDetalleOrdenTrabajoDto } from './dto/update-detalle-orden-trabajo.dto';
import { DetalleOrdenTrabajo } from './entities/detalle-orden-trabajo.entity';
import { OrdenesTrabajoService } from '../ordenes-trabajo/ordenes-trabajo.service';
import { InventarioService } from '../inventario/inventario.service';

@Injectable()
export class DetalleOrdenTrabajoService {
    constructor(
        @InjectRepository(DetalleOrdenTrabajo)
        private detalleOrdenTrabajoRepository: Repository<DetalleOrdenTrabajo>,
        @Inject(forwardRef(() => OrdenesTrabajoService))
        private ordenesTrabajoService: OrdenesTrabajoService,
        private inventarioService: InventarioService,
    ) { }

    async create(createDetalleOrdenTrabajoDto: CreateDetalleOrdenTrabajoDto): Promise<DetalleOrdenTrabajo> {
        return this.createSingleDetalle(createDetalleOrdenTrabajoDto, true);
    }

    async createBulk(items: CreateDetalleOrdenTrabajoDto[]): Promise<DetalleOrdenTrabajo[]> {
        if (!items || items.length === 0) {
            throw new BadRequestException('Debe enviar al menos un ítem para cargar.');
        }

        // Validar stock total requerido por cada producto de inventario antes de persistir
        const requestedByInv = new Map<number, number>();
        for (const item of items) {
            const estadoTrabajo = item.estado_trabajo || 'confirmado';
            if (item.id_inventario && estadoTrabajo !== 'descartado') {
                const invId = Number(item.id_inventario);
                const cant = Number(item.cantidad || 0);
                if (cant <= 0) {
                    throw new BadRequestException('La cantidad de cada ítem debe ser mayor a 0.');
                }
                requestedByInv.set(invId, (requestedByInv.get(invId) || 0) + cant);
            }
        }

        for (const [invId, totalSolicitado] of requestedByInv.entries()) {
            const inv = await this.inventarioService.findOne(invId);
            const disponible = Number(inv.cantidad_existente || 0);
            if (totalSolicitado > disponible + 0.0001) {
                throw new BadRequestException(
                    `Stock insuficiente para "${inv.descripcion}". Solicitado: ${totalSolicitado}, disponible: ${disponible}.`,
                );
            }
        }

        const results: DetalleOrdenTrabajo[] = [];
        const ordenIds = new Set<number>();

        for (const item of items) {
            const created = await this.createSingleDetalle(item, false);
            results.push(created);
            ordenIds.add(Number(item.idorden_trabajo));
        }

        for (const ordenId of ordenIds) {
            await this.ordenesTrabajoService.updateTotal(ordenId);
        }

        return results;
    }

    private async createSingleDetalle(
        createDetalleOrdenTrabajoDto: CreateDetalleOrdenTrabajoDto,
        updateOrderTotal: boolean,
    ): Promise<DetalleOrdenTrabajo> {
        const estadoTrabajo = createDetalleOrdenTrabajoDto.estado_trabajo || 'confirmado';

        let tiempoEstimado = createDetalleOrdenTrabajoDto.tiempo_estimado;
        let precioHora = createDetalleOrdenTrabajoDto.precio_hora;
        let totalCosto = createDetalleOrdenTrabajoDto.total_costo;

        if (createDetalleOrdenTrabajoDto.idprecio_taller && (totalCosto === undefined || precioHora === undefined || tiempoEstimado === undefined)) {
            const precioRow = await this.detalleOrdenTrabajoRepository.manager.query(
                `SELECT tiempo_estimado, precio_hora, total_costo FROM precios_taller WHERE id = $1 LIMIT 1`,
                [+createDetalleOrdenTrabajoDto.idprecio_taller],
            );
            if (precioRow && precioRow[0]) {
                if (tiempoEstimado === undefined || tiempoEstimado === null) tiempoEstimado = Number(precioRow[0].tiempo_estimado || 0);
                if (precioHora === undefined || precioHora === null) precioHora = Number(precioRow[0].precio_hora || 0);
                if (totalCosto === undefined || totalCosto === null) {
                    totalCosto = Number((Number(tiempoEstimado || 0) * Number(precioHora || 0)).toFixed(2));
                }
            }
        }

        const costoTercero = createDetalleOrdenTrabajoDto.costo_tercero !== undefined
            ? Number(createDetalleOrdenTrabajoDto.costo_tercero || 0)
            : 0;

        if (totalCosto === undefined || totalCosto === null || totalCosto === 0) {
            if (costoTercero > 0) {
                totalCosto = costoTercero;
            } else {
                totalCosto = Number((Number(tiempoEstimado || 0) * Number(precioHora || 0)).toFixed(2));
            }
        }

        const detalle = this.detalleOrdenTrabajoRepository.create({
            ...createDetalleOrdenTrabajoDto,
            costo_tercero: costoTercero,
            tiempo_estimado: tiempoEstimado,
            precio_hora: precioHora,
            total_costo: totalCosto,
            estado_trabajo: estadoTrabajo,
            orden_trabajo: { id: createDetalleOrdenTrabajoDto.idorden_trabajo } as any,
            precio_taller: createDetalleOrdenTrabajoDto.idprecio_taller ? { id: +createDetalleOrdenTrabajoDto.idprecio_taller } as any : null,
            precio_seguro: createDetalleOrdenTrabajoDto.idprecio_seguro ? { id: +createDetalleOrdenTrabajoDto.idprecio_seguro } as any : null,
            inventario: createDetalleOrdenTrabajoDto.id_inventario ? { id: +createDetalleOrdenTrabajoDto.id_inventario } as any : null,
            personal_mecanico: createDetalleOrdenTrabajoDto.idpersonal_mecanico ? { id: +createDetalleOrdenTrabajoDto.idpersonal_mecanico } as any : null,
        });
        const saved = await this.detalleOrdenTrabajoRepository.save(detalle);

        // 1. Descontar stock por FIFO si es un producto de inventario
        if (createDetalleOrdenTrabajoDto.id_inventario && estadoTrabajo !== 'descartado') {
            try {
                await this.inventarioService.descontarStockFIFO({
                    idinventario: Number(createDetalleOrdenTrabajoDto.id_inventario),
                    cantidad: Number(createDetalleOrdenTrabajoDto.cantidad || 1),
                    idorden_trabajo: Number(createDetalleOrdenTrabajoDto.idorden_trabajo),
                    iddetalle_orden_trabajo: saved.id,
                    idusuario: createDetalleOrdenTrabajoDto.idusuario ? Number(createDetalleOrdenTrabajoDto.idusuario) : undefined,
                });
            } catch (invErr) {
                console.error('Error descontando stock FIFO:', invErr);
            }
        }

        // 2. Sync mechanic assignment to trabajos_asignados if mechanic is selected
        const fullSaved = await this.findOne(saved.id);
        if (fullSaved) {
            await this.syncTrabajoAsignado(fullSaved, true);
        }

        if (updateOrderTotal) {
            await this.ordenesTrabajoService.updateTotal(createDetalleOrdenTrabajoDto.idorden_trabajo);
        }
        return fullSaved || saved;
    }

    private async adjustInventoryStock(idInventario: number, delta: number): Promise<void> {
        try {
            await this.detalleOrdenTrabajoRepository.manager.query(
                `UPDATE inventario SET cantidad_existente = GREATEST(0, COALESCE(cantidad_existente, 0) + $1) WHERE id = $2`,
                [delta, idInventario],
            );
        } catch (err) {
            console.error('Error adjusting inventory stock:', err);
        }
    }

    private async syncTrabajoAsignado(detalle: DetalleOrdenTrabajo, notifyMechanic = false): Promise<void> {
        try {
            const manager = this.detalleOrdenTrabajoRepository.manager;
            const existingRows = await manager.query(
                `SELECT id, cancelado FROM trabajos_asignados WHERE iddetalle_orden_trabajo = $1 LIMIT 1`,
                [detalle.id],
            );

            if (detalle.estado_trabajo === 'descartado' || !detalle.idpersonal_mecanico) {
                if (existingRows.length > 0 && !existingRows[0].cancelado) {
                    await manager.query(`DELETE FROM trabajos_asignados WHERE id = $1`, [existingRows[0].id]);
                }
                return;
            }

            const tiempoVal = Number(detalle.tiempo_estimado ?? detalle.precio_taller?.tiempo_estimado ?? 0);
            const precioHoraVal = Number(detalle.precio_hora ?? detalle.precio_taller?.precio_hora ?? 0);
            let totalCosto = detalle.total_costo !== undefined && detalle.total_costo !== null && Number(detalle.total_costo) > 0
                ? Number(detalle.total_costo)
                : Number((tiempoVal * precioHoraVal).toFixed(2));
            const ptId = detalle.precio_taller?.id;
            const ordenId = detalle.orden_trabajo?.id;
            const ptItems = Array.isArray((detalle.precio_taller as any)?.items)
                ? (detalle.precio_taller as any).items
                : [];

            if (ptId && ordenId && ptItems.length > 0) {
                const siblingRows = await manager.query(
                    `SELECT id FROM detalle_orden_trabajo
                     WHERE idorden_trabajo = $1 AND idprecio_taller = $2
                       AND idpersonal_mecanico IS NOT NULL
                       AND (estado_trabajo IS NULL OR estado_trabajo != 'descartado')
                     ORDER BY id ASC`,
                    [ordenId, ptId],
                );
                if (siblingRows.length > 0 && Number(siblingRows[0].id) !== Number(detalle.id)) {
                    totalCosto = 0;
                }
            }

            if (existingRows.length > 0) {
                // Si el trabajo ya fue pagado o liquidado por planilla, proteger y no sobreescribir ni mecánico ni monto
                if (existingRows[0].cancelado || existingRows[0].idplanilla) {
                    return;
                }
                await manager.query(
                    `UPDATE trabajos_asignados SET idpersonal = $1, monto = $2 WHERE id = $3`,
                    [detalle.idpersonal_mecanico, totalCosto, existingRows[0].id],
                );
            } else {
                const fechaAsig = detalle.orden_trabajo?.fecha_registro
                    ? new Date(detalle.orden_trabajo.fecha_registro).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0];
                const estadoOT = (detalle.orden_trabajo?.estado || '').toLowerCase();
                const isTerminada = estadoOT.startsWith('terminad') || estadoOT.startsWith('finaliz') || estadoOT.includes('cerrad');
                const fechaEntrega = isTerminada ? new Date().toISOString().split('T')[0] : null;

                await manager.query(
                    `INSERT INTO trabajos_asignados (iddetalle_orden_trabajo, idpersonal, fecha_asignado, fecha_entrega, monto, cancelado, idusuario) VALUES ($1, $2, $3, $4, $5, false, $6)`,
                    [detalle.id, detalle.idpersonal_mecanico, fechaAsig, fechaEntrega, totalCosto, detalle.idusuario || null],
                );
            }
        } catch (err) {
            console.error('Error syncing TrabajoAsignado:', err);
        }
    }

    async findAll(): Promise<DetalleOrdenTrabajo[]> {
        return await this.detalleOrdenTrabajoRepository.find({
            order: { id: 'DESC' },
        });
    }

    async findRepuestosCargados(sucursalId?: number): Promise<DetalleOrdenTrabajo[]> {
        const qb = this.detalleOrdenTrabajoRepository.createQueryBuilder('detalle')
            .leftJoinAndSelect('detalle.orden_trabajo', 'orden')
            .leftJoinAndSelect('orden.hoja_recepcion', 'hoja')
            .leftJoinAndSelect('orden.marca_auto', 'marca')
            .leftJoinAndSelect('detalle.inventario', 'inventario')
            .leftJoinAndSelect('inventario.unidad_medida', 'unidad')
            .where('detalle.id_inventario IS NOT NULL')
            .orderBy('detalle.id', 'DESC');

        if (sucursalId) {
            qb.andWhere('orden.sucursal_id = :sucursalId', { sucursalId });
        }

        return await qb.getMany();
    }

    async findByOrden(idorden: number): Promise<DetalleOrdenTrabajo[]> {
        return await this.detalleOrdenTrabajoRepository.find({
            where: { orden_trabajo: { id: idorden } },
            relations: ['seguimiento', 'inventario', 'personal_mecanico', 'trabajo_asignado', 'trabajo_asignado.planilla'],
            order: { id: 'ASC' },
        });
    }

    async findOne(id: number): Promise<DetalleOrdenTrabajo | null> {
        return await this.detalleOrdenTrabajoRepository.findOne({
            where: { id },
            relations: ['orden_trabajo', 'inventario', 'personal_mecanico', 'precio_taller', 'precio_seguro', 'trabajo_asignado', 'trabajo_asignado.planilla'],
        });
    }

    async update(id: number, updateDetalleOrdenTrabajoDto: UpdateDetalleOrdenTrabajoDto): Promise<DetalleOrdenTrabajo | null> {
        const existingDetalle = await this.findOne(id);
        if (!existingDetalle) return null;

        // Protección: Si este trabajo ya fue pagado/liquidado en planilla, proteger mecánico, estado y costos
        const existingTrabajo = await this.detalleOrdenTrabajoRepository.manager.query(
            `SELECT id, cancelado, idplanilla FROM trabajos_asignados WHERE iddetalle_orden_trabajo = $1 LIMIT 1`,
            [id],
        );
        const isTrabajoPagado = existingTrabajo.length > 0 && (Boolean(existingTrabajo[0].cancelado) || existingTrabajo[0].idplanilla !== null);

        if (isTrabajoPagado) {
            if (
                updateDetalleOrdenTrabajoDto.idpersonal_mecanico !== undefined &&
                Number(updateDetalleOrdenTrabajoDto.idpersonal_mecanico) !== Number(existingDetalle.idpersonal_mecanico)
            ) {
                throw new BadRequestException('Este trabajo ya fue liquidado y pagado en planilla al mecánico. No se puede reasignar a otro mecánico.');
            }
            if (updateDetalleOrdenTrabajoDto.estado_trabajo === 'descartado') {
                throw new BadRequestException('Este trabajo ya fue liquidado y pagado en planilla. No se puede descartar.');
            }
            // Proteger tiempo_estimado, precio_hora y total_costo para no alterar el trabajo pagado
            delete updateDetalleOrdenTrabajoDto.tiempo_estimado;
            delete updateDetalleOrdenTrabajoDto.precio_hora;
            delete updateDetalleOrdenTrabajoDto.total_costo;
        }

        const oldEstado = existingDetalle.estado_trabajo || 'confirmado';
        const newEstado = updateDetalleOrdenTrabajoDto.estado_trabajo || oldEstado;
        const oldCant = Number(existingDetalle.cantidad || 1);
        const newCant = updateDetalleOrdenTrabajoDto.cantidad !== undefined ? Number(updateDetalleOrdenTrabajoDto.cantidad) : oldCant;
        const invId = updateDetalleOrdenTrabajoDto.id_inventario !== undefined ? updateDetalleOrdenTrabajoDto.id_inventario : existingDetalle.id_inventario;

        const fromOT = updateDetalleOrdenTrabajoDto.origen === 'ot';
        const solicitaId = updateDetalleOrdenTrabajoDto.idusuario ?? existingDetalle.idusuario ?? null;
        const solicitaNombre = updateDetalleOrdenTrabajoDto.usuario_nombre || null;

        // Handle inventory stock transitions with FIFO tracking
        if (invId || existingDetalle.id_inventario) {
            const oldInvId = existingDetalle.id_inventario;
            const newInvId = updateDetalleOrdenTrabajoDto.id_inventario !== undefined
                ? updateDetalleOrdenTrabajoDto.id_inventario
                : oldInvId;
            const prodChanged = updateDetalleOrdenTrabajoDto.id_inventario !== undefined && Number(newInvId) !== Number(oldInvId);
            const cantChanged = newCant !== oldCant;

            const targetOrdenId = Number(existingDetalle.orden_trabajo?.id || updateDetalleOrdenTrabajoDto.idorden_trabajo || 0);
            const targetSucursalId = existingDetalle.orden_trabajo?.sucursal_id ?? null;

            if (oldEstado !== 'descartado' && newEstado === 'descartado' && oldInvId) {
                if (fromOT) {
                    await this.inventarioService.crearDevolucionPendiente({
                        idinventario: Number(oldInvId),
                        idorden_trabajo: targetOrdenId || null,
                        iddetalle_orden_trabajo: id,
                        sucursal_id: targetSucursalId,
                        detalle_descripcion: existingDetalle.inventario?.descripcion || existingDetalle.detalle,
                        cantidad: oldCant,
                        motivo: 'Marcado como descartado en Orden de Trabajo',
                        observaciones_asesor: existingDetalle.observaciones || null,
                        idusuario_solicita: solicitaId,
                        usuario_solicita_nombre: solicitaNombre,
                    });
                } else {
                    await this.inventarioService.revertirConsumoOrden(id);
                }
            } else if (oldEstado === 'descartado' && newEstado !== 'descartado' && newInvId) {
                const cancelledPending = fromOT
                    ? await this.inventarioService.cancelarDevolucionPendientePorDetalle(id)
                    : false;
                if (!cancelledPending) {
                    await this.inventarioService.descontarStockFIFO({
                        idinventario: Number(newInvId),
                        cantidad: newCant,
                        idorden_trabajo: targetOrdenId,
                        iddetalle_orden_trabajo: id,
                        idusuario: updateDetalleOrdenTrabajoDto.idusuario,
                    });
                }
            } else if (oldEstado !== 'descartado' && newEstado !== 'descartado' && (cantChanged || prodChanged)) {
                if (fromOT) {
                    if (prodChanged) {
                        if (oldInvId) {
                            await this.inventarioService.crearDevolucionPendiente({
                                idinventario: Number(oldInvId),
                                idorden_trabajo: targetOrdenId || null,
                                iddetalle_orden_trabajo: id,
                                sucursal_id: targetSucursalId,
                                detalle_descripcion: existingDetalle.inventario?.descripcion || existingDetalle.detalle,
                                cantidad: oldCant,
                                motivo: 'Cambio de repuesto en Orden de Trabajo',
                                observaciones_asesor: existingDetalle.observaciones || null,
                                idusuario_solicita: solicitaId,
                                usuario_solicita_nombre: solicitaNombre,
                            });
                        }
                        if (newInvId) {
                            await this.inventarioService.descontarStockFIFO({
                                idinventario: Number(newInvId),
                                cantidad: newCant,
                                idorden_trabajo: targetOrdenId,
                                iddetalle_orden_trabajo: id,
                                idusuario: updateDetalleOrdenTrabajoDto.idusuario,
                            });
                        }
                    } else if (newInvId && newCant < oldCant) {
                        await this.inventarioService.crearDevolucionPendiente({
                            idinventario: Number(newInvId),
                            idorden_trabajo: targetOrdenId || null,
                            iddetalle_orden_trabajo: id,
                            sucursal_id: targetSucursalId,
                            detalle_descripcion: existingDetalle.inventario?.descripcion || existingDetalle.detalle,
                            cantidad: Number((oldCant - newCant).toFixed(4)),
                            motivo: `Reducción de cantidad en O.T. (de ${oldCant} a ${newCant})`,
                            observaciones_asesor: existingDetalle.observaciones || null,
                            idusuario_solicita: solicitaId,
                            usuario_solicita_nombre: solicitaNombre,
                        });
                    } else if (newInvId && newCant > oldCant) {
                        await this.inventarioService.descontarStockFIFO({
                            idinventario: Number(newInvId),
                            cantidad: Number((newCant - oldCant).toFixed(4)),
                            idorden_trabajo: targetOrdenId,
                            iddetalle_orden_trabajo: id,
                            idusuario: updateDetalleOrdenTrabajoDto.idusuario,
                        });
                    }
                } else {
                    await this.inventarioService.revertirConsumoOrden(id);
                    if (newInvId) {
                        await this.inventarioService.descontarStockFIFO({
                            idinventario: Number(newInvId),
                            cantidad: newCant,
                            idorden_trabajo: targetOrdenId,
                            iddetalle_orden_trabajo: id,
                            idusuario: updateDetalleOrdenTrabajoDto.idusuario,
                        });
                    }
                }
            }
        }

        const mechanicChanged =
            updateDetalleOrdenTrabajoDto.idpersonal_mecanico !== undefined &&
            Number(updateDetalleOrdenTrabajoDto.idpersonal_mecanico) !== Number(existingDetalle.idpersonal_mecanico);

        const updateData: any = { ...updateDetalleOrdenTrabajoDto };
        delete updateData.origen;
        delete updateData.usuario_nombre;

        if (
            updateDetalleOrdenTrabajoDto.precio_hora !== undefined ||
            updateDetalleOrdenTrabajoDto.tiempo_estimado !== undefined
        ) {
            const finalTiempo = updateDetalleOrdenTrabajoDto.tiempo_estimado !== undefined
                ? Number(updateDetalleOrdenTrabajoDto.tiempo_estimado || 0)
                : Number(existingDetalle.tiempo_estimado ?? existingDetalle.precio_taller?.tiempo_estimado ?? 0);
            const finalPrecioHora = updateDetalleOrdenTrabajoDto.precio_hora !== undefined
                ? Number(updateDetalleOrdenTrabajoDto.precio_hora || 0)
                : Number(existingDetalle.precio_hora ?? existingDetalle.precio_taller?.precio_hora ?? 0);

            if (updateDetalleOrdenTrabajoDto.total_costo === undefined) {
                updateData.total_costo = Number((finalTiempo * finalPrecioHora).toFixed(2));
            }
        }

        if (updateDetalleOrdenTrabajoDto.costo_tercero !== undefined) {
            updateData.costo_tercero = Number(updateDetalleOrdenTrabajoDto.costo_tercero || 0);
            if (updateData.costo_tercero > 0 && (updateDetalleOrdenTrabajoDto.total_costo === undefined || Number(updateDetalleOrdenTrabajoDto.total_costo) === 0)) {
                updateData.total_costo = updateData.costo_tercero;
            }
        }

        if (updateDetalleOrdenTrabajoDto.idorden_trabajo) {
            updateData.orden_trabajo = { id: updateDetalleOrdenTrabajoDto.idorden_trabajo };
            delete updateData.idorden_trabajo;
        }
        if (updateDetalleOrdenTrabajoDto.idprecio_taller !== undefined) {
            updateData.precio_taller = updateDetalleOrdenTrabajoDto.idprecio_taller ? { id: +updateDetalleOrdenTrabajoDto.idprecio_taller } : null;
            delete updateData.idprecio_taller;
        }
        if (updateDetalleOrdenTrabajoDto.idprecio_seguro !== undefined) {
            updateData.precio_seguro = updateDetalleOrdenTrabajoDto.idprecio_seguro ? { id: +updateDetalleOrdenTrabajoDto.idprecio_seguro } : null;
            delete updateData.idprecio_seguro;
        }
        if (updateDetalleOrdenTrabajoDto.id_inventario !== undefined) {
            updateData.inventario = updateDetalleOrdenTrabajoDto.id_inventario ? { id: +updateDetalleOrdenTrabajoDto.id_inventario } : null;
        }
        if (updateDetalleOrdenTrabajoDto.idpersonal_mecanico !== undefined) {
            updateData.personal_mecanico = updateDetalleOrdenTrabajoDto.idpersonal_mecanico ? { id: +updateDetalleOrdenTrabajoDto.idpersonal_mecanico } : null;
        }

        await this.detalleOrdenTrabajoRepository.update(id, updateData);

        const updatedFull = await this.findOne(id);
        if (updatedFull) {
            await this.syncTrabajoAsignado(updatedFull, mechanicChanged);
        }

        await this.ordenesTrabajoService.updateTotal(existingDetalle.orden_trabajo.id);
        if (updateDetalleOrdenTrabajoDto.idorden_trabajo && updateDetalleOrdenTrabajoDto.idorden_trabajo !== existingDetalle.orden_trabajo.id) {
            await this.ordenesTrabajoService.updateTotal(updateDetalleOrdenTrabajoDto.idorden_trabajo);
        }

        return updatedFull;
    }

    async remove(
        id: number,
        options?: { origen?: string; idusuario?: number; usuarioNombre?: string },
    ): Promise<void> {
        const detalle = await this.findOne(id);
        if (detalle) {
            // Protección: Si este trabajo ya fue pagado/liquidado en planilla, no permitir eliminar
            const existingTrabajo = await this.detalleOrdenTrabajoRepository.manager.query(
                `SELECT id, cancelado, idplanilla FROM trabajos_asignados WHERE iddetalle_orden_trabajo = $1 LIMIT 1`,
                [id],
            );
            if (existingTrabajo && existingTrabajo.length > 0 && (Boolean(existingTrabajo[0].cancelado) || existingTrabajo[0].idplanilla !== null)) {
                throw new BadRequestException('No se puede eliminar este trabajo porque ya fue liquidado y pagado en planilla al mecánico.');
            }

            if (detalle.id_inventario && detalle.estado_trabajo !== 'descartado') {
                try {
                    if (options?.origen === 'ot') {
                        await this.inventarioService.crearDevolucionPendiente({
                            idinventario: Number(detalle.id_inventario),
                            idorden_trabajo: detalle.orden_trabajo?.id ?? null,
                            iddetalle_orden_trabajo: id,
                            sucursal_id: detalle.orden_trabajo?.sucursal_id ?? null,
                            detalle_descripcion: detalle.inventario?.descripcion || detalle.detalle,
                            cantidad: Number(detalle.cantidad || 1),
                            motivo: 'Eliminado desde Orden de Trabajo',
                            observaciones_asesor: detalle.observaciones || null,
                            idusuario_solicita: options.idusuario ?? detalle.idusuario ?? null,
                            usuario_solicita_nombre: options.usuarioNombre || null,
                        });
                    } else {
                        await this.inventarioService.revertirConsumoOrden(id);
                    }
                } catch (invErr) {
                    console.error('Error procesando devolución de inventario:', invErr);
                }
            }
            await this.detalleOrdenTrabajoRepository.manager.query(
                `DELETE FROM trabajos_asignados WHERE iddetalle_orden_trabajo = $1 AND cancelado = false`,
                [id],
            );
            await this.detalleOrdenTrabajoRepository.delete(id);
            if (detalle.orden_trabajo) {
                await this.ordenesTrabajoService.updateTotal(detalle.orden_trabajo.id);
            }
        }
    }
}
