import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Inventario } from './entities/inventario.entity';
import { InventarioLote } from './entities/inventario-lote.entity';
import { InventarioMovimiento } from './entities/inventario-movimiento.entity';
import { InventarioDevolucion, type LoteDevolucionSnapshot } from './entities/inventario-devolucion.entity';
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { UpdateInventarioDto } from './dto/update-inventario.dto';

@Injectable()
export class InventarioService implements OnModuleInit {
    constructor(
        @InjectRepository(Inventario)
        private inventarioRepository: Repository<Inventario>,
        @InjectRepository(InventarioLote)
        private loteRepository: Repository<InventarioLote>,
        @InjectRepository(InventarioMovimiento)
        private movimientoRepository: Repository<InventarioMovimiento>,
        @InjectRepository(InventarioDevolucion)
        private devolucionRepository: Repository<InventarioDevolucion>,
    ) { }

    async onModuleInit() {
        try {
            const manager = this.inventarioRepository.manager;
            await manager.query(`
                ALTER TABLE inventario ADD COLUMN IF NOT EXISTS stock_inicial DOUBLE PRECISION DEFAULT 0;
                ALTER TABLE inventario ADD COLUMN IF NOT EXISTS entradas DOUBLE PRECISION DEFAULT 0;
                ALTER TABLE inventario ADD COLUMN IF NOT EXISTS salidas DOUBLE PRECISION DEFAULT 0;
                UPDATE inventario SET stock_inicial = COALESCE(cantidad_existente, 0) WHERE stock_inicial IS NULL OR stock_inicial = 0;
                UPDATE inventario SET entradas = 0 WHERE entradas IS NULL;
                UPDATE inventario SET salidas = 0 WHERE salidas IS NULL;
            `);
        } catch (e) {
            console.warn('Inventario auto-migration notice:', e);
        }
    }

    async create(createInventarioDto: CreateInventarioDto, sucursalId: number | null = null): Promise<Inventario> {
        const stockInicial = Number(createInventarioDto.stock_inicial ?? createInventarioDto.cantidad_existente ?? 0);
        const nuevo = this.inventarioRepository.create({
            ...createInventarioDto,
            stock_inicial: stockInicial,
            entradas: 0,
            salidas: 0,
            cantidad_existente: stockInicial,
            precio_compra: Number(createInventarioDto.precio_compra || 0),
            precio_venta: Number(createInventarioDto.precio_venta || 0),
            sucursal: sucursalId ? ({ id: sucursalId } as any) : null,
        });

        const saved = await this.inventarioRepository.save(nuevo);

        // Si se crea con stock inicial > 0, crear el primer lote inicial y movimiento
        if (stockInicial > 0) {
            const lote = this.loteRepository.create({
                idinventario: saved.id,
                nro_lote: 'LOTE-INICIAL',
                cantidad_inicial: stockInicial,
                cantidad_disponible: stockInicial,
                costo_unitario: Number(saved.precio_compra || 0),
                precio_venta_sugerido: Number(saved.precio_venta || 0),
                estado: 'activo',
                observaciones: 'Stock inicial registrado al dar de alta el producto',
            });
            const savedLote = await this.loteRepository.save(lote);

            await this.movimientoRepository.save(
                this.movimientoRepository.create({
                    idinventario: saved.id,
                    idlote: savedLote.id,
                    tipo_movimiento: 'ENTRADA_INICIAL',
                    cantidad: stockInicial,
                    costo_unitario: Number(saved.precio_compra || 0),
                    precio_venta_unitario: Number(saved.precio_venta || 0),
                    saldo_stock_resultante: stockInicial,
                    observaciones: 'Ingreso por stock inicial',
                    idusuario: createInventarioDto.idusuario ? Number(createInventarioDto.idusuario) : undefined,
                })
            );
        }

        return saved;
    }

    async findAll(sucursalId: number | null = null) {
        const whereClause: any = {};
        if (sucursalId) {
            whereClause.sucursal = { id: sucursalId };
        }

        return await this.inventarioRepository.find({
            where: whereClause,
            relations: ['sucursal', 'unidad_medida', 'grupo_inventario'],
            order: {
                descripcion: 'ASC',
            },
        });
    }

    async searchByDescription(searchTerm: string) {
        return this.inventarioRepository
            .createQueryBuilder('inventario')
            .leftJoinAndSelect('inventario.unidad_medida', 'unidad_medida')
            .leftJoinAndSelect('inventario.grupo_inventario', 'grupo_inventario')
            .where('LOWER(inventario.descripcion) LIKE LOWER(:searchTerm)', {
                searchTerm: `%${searchTerm}%`
            })
            .andWhere('inventario.estado = :estado', { estado: 'activo' })
            .getMany();
    }

    async findOne(id: number) {
        const inventario = await this.inventarioRepository.findOne({
            where: { id },
            relations: ['sucursal', 'unidad_medida', 'grupo_inventario'],
        });
        if (!inventario) {
            throw new NotFoundException(`Registro de inventario con ID ${id} no encontrado`);
        }
        return inventario;
    }

    async update(id: number, updateInventarioDto: UpdateInventarioDto) {
        const inventario = await this.findOne(id);
        const oldStockInicial = Number(inventario.stock_inicial || 0);

        this.inventarioRepository.merge(inventario, updateInventarioDto);

        // Si se actualiza el stock inicial manualmente, recalcular cantidad existente
        if (updateInventarioDto.stock_inicial !== undefined) {
            const diff = Number(updateInventarioDto.stock_inicial) - oldStockInicial;
            if (diff !== 0) {
                // Actualizar o crear lote inicial
                let loteInicial = await this.loteRepository.findOne({
                    where: { idinventario: id, nro_lote: 'LOTE-INICIAL' }
                });
                if (loteInicial) {
                    loteInicial.cantidad_inicial = Number(updateInventarioDto.stock_inicial);
                    loteInicial.cantidad_disponible = Math.max(0, Number(loteInicial.cantidad_disponible) + diff);
                    loteInicial.costo_unitario = Number(inventario.precio_compra || 0);
                    loteInicial.precio_venta_sugerido = Number(inventario.precio_venta || 0);
                    await this.loteRepository.save(loteInicial);
                } else if (Number(updateInventarioDto.stock_inicial) > 0) {
                    await this.loteRepository.save(this.loteRepository.create({
                        idinventario: id,
                        nro_lote: 'LOTE-INICIAL',
                        cantidad_inicial: Number(updateInventarioDto.stock_inicial),
                        cantidad_disponible: Number(updateInventarioDto.stock_inicial),
                        costo_unitario: Number(inventario.precio_compra || 0),
                        precio_venta_sugerido: Number(inventario.precio_venta || 0),
                        estado: 'activo',
                        observaciones: 'Stock inicial actualizado',
                    }));
                }
            }
        }

        const stockIni = Number(inventario.stock_inicial || 0);
        const ent = Number(inventario.entradas || 0);
        const sal = Number(inventario.salidas || 0);
        inventario.cantidad_existente = Math.max(0, stockIni + ent - sal);

        return await this.inventarioRepository.save(inventario);
    }

    async remove(id: number) {
        const inventario = await this.findOne(id);
        return await this.inventarioRepository.remove(inventario);
    }

    /**
     * REGISTRO DE INGRESO POR COMPRA / PEDIDO DE MATERIAL (Nuevo Lote)
     */
    async registrarIngresoLote(params: {
        idinventario: number;
        idmaterial_pedido?: number;
        iddetalle_material_pedido?: number;
        cantidad: number;
        costo_unitario: number;
        precio_venta_sugerido?: number;
        nro_lote?: string;
        observaciones?: string;
        idusuario?: number;
    }) {
        const cant = Number(params.cantidad);
        if (cant <= 0) return null;

        const inventario = await this.findOne(params.idinventario);

        // 1. Crear nuevo lote
        const lote = this.loteRepository.create({
            idinventario: params.idinventario,
            idmaterial_pedido: params.idmaterial_pedido,
            iddetalle_material_pedido: params.iddetalle_material_pedido,
            nro_lote: params.nro_lote || (params.idmaterial_pedido ? `LOTE-COMPRA-${params.idmaterial_pedido}` : 'LOTE-COMPRA'),
            cantidad_inicial: cant,
            cantidad_disponible: cant,
            costo_unitario: Number(params.costo_unitario || 0),
            precio_venta_sugerido: Number(params.precio_venta_sugerido || inventario.precio_venta || 0),
            estado: 'activo',
            observaciones: params.observaciones || 'Ingreso por compra / pedido de material',
        });
        const savedLote = await this.loteRepository.save(lote);

        // 2. Actualizar inventario acumulado
        inventario.entradas = Number(inventario.entradas || 0) + cant;
        inventario.precio_compra = Number(params.costo_unitario);
        if (params.precio_venta_sugerido && Number(params.precio_venta_sugerido) > 0) {
            inventario.precio_venta = Number(params.precio_venta_sugerido);
        }
        inventario.cantidad_existente = Math.max(0, Number(inventario.stock_inicial || 0) + Number(inventario.entradas) - Number(inventario.salidas || 0));
        await this.inventarioRepository.save(inventario);

        // 3. Registrar movimiento Kardex
        await this.movimientoRepository.save(
            this.movimientoRepository.create({
                idinventario: params.idinventario,
                idlote: savedLote.id,
                tipo_movimiento: 'ENTRADA_COMPRA',
                cantidad: cant,
                costo_unitario: Number(params.costo_unitario || 0),
                precio_venta_unitario: Number(inventario.precio_venta || 0),
                idmaterial_pedido: params.idmaterial_pedido,
                saldo_stock_resultante: inventario.cantidad_existente,
                observaciones: params.observaciones || `Ingreso de compra Lote #${savedLote.id} (${params.nro_lote || ''})`,
                idusuario: params.idusuario,
            })
        );

        return savedLote;
    }

    /**
     * DESCONTAR STOCK USANDO MÉTODO FIFO (PEPS: Primeras Entradas, Primeras Salidas)
     * Descuenta del lote más antiguo con saldo disponible hasta completarlo.
     */
    async descontarStockFIFO(params: {
        idinventario: number;
        cantidad: number;
        idorden_trabajo: number;
        iddetalle_orden_trabajo: number;
        idusuario?: number;
    }) {
        const cantRequerida = Number(params.cantidad);
        if (cantRequerida <= 0) return;

        const inventario = await this.findOne(params.idinventario);

        // Buscar lotes activos con saldo > 0 ordenados por fecha de ingreso más antigua
        const lotes = await this.loteRepository.find({
            where: {
                idinventario: params.idinventario,
                estado: 'activo',
            },
            order: {
                fecha_ingreso: 'ASC',
                id: 'ASC',
            },
        });

        let restante = cantRequerida;

        for (const lote of lotes) {
            if (restante <= 0.0001) break;
            const disponible = Number(lote.cantidad_disponible || 0);
            if (disponible <= 0) continue;

            const aDescontar = Math.min(disponible, restante);
            lote.cantidad_disponible = Math.max(0, Number((disponible - aDescontar).toFixed(4)));

            if (lote.cantidad_disponible <= 0.0001) {
                lote.estado = 'agotado';
            }
            await this.loteRepository.save(lote);

            // Registrar movimiento de salida ligado al lote y a la orden de trabajo
            await this.movimientoRepository.save(
                this.movimientoRepository.create({
                    idinventario: params.idinventario,
                    idlote: lote.id,
                    tipo_movimiento: 'SALIDA_ORDEN',
                    cantidad: aDescontar,
                    costo_unitario: Number(lote.costo_unitario || 0),
                    precio_venta_unitario: Number(inventario.precio_venta || 0),
                    idorden_trabajo: params.idorden_trabajo,
                    iddetalle_orden_trabajo: params.iddetalle_orden_trabajo,
                    observaciones: `Consumo en Orden #${params.idorden_trabajo} descontado del Lote #${lote.id} (${lote.nro_lote || 'S/N'})`,
                    idusuario: params.idusuario,
                })
            );

            restante -= aDescontar;
        }

        // Si se requirió más cantidad que los lotes disponibles (stock insuficiente en lotes), registrar el restante
        if (restante > 0.0001) {
            await this.movimientoRepository.save(
                this.movimientoRepository.create({
                    idinventario: params.idinventario,
                    idlote: null,
                    tipo_movimiento: 'SALIDA_ORDEN',
                    cantidad: restante,
                    costo_unitario: Number(inventario.precio_compra || 0),
                    precio_venta_unitario: Number(inventario.precio_venta || 0),
                    idorden_trabajo: params.idorden_trabajo,
                    iddetalle_orden_trabajo: params.iddetalle_orden_trabajo,
                    observaciones: `Consumo excedente sin lote activo en Orden #${params.idorden_trabajo}`,
                    idusuario: params.idusuario,
                })
            );
        }

        // Actualizar acumuladores del inventario
        inventario.salidas = Number(inventario.salidas || 0) + cantRequerida;
        inventario.cantidad_existente = Math.max(0, Number(inventario.stock_inicial || 0) + Number(inventario.entradas || 0) - Number(inventario.salidas));
        await this.inventarioRepository.save(inventario);
    }

    /**
     * HELPER: Restituye stock a los lotes indicados, registra DEVOLUCION_ORDEN en Kardex,
     * descuenta/limpia las SALIDA_ORDEN correspondientes y recalcula acumuladores de inventario.
     */
    private async restituirLotesYStock(params: {
        idinventario: number;
        idorden_trabajo: number | null;
        iddetalle_orden_trabajo: number | null;
        slices: LoteDevolucionSnapshot[];
        observacionKardex: string;
        idusuario?: number | null;
    }) {
        let totalDevuelto = 0;

        for (const slice of params.slices) {
            const cant = Number(slice.cantidad || 0);
            if (cant <= 0) continue;
            totalDevuelto += cant;

            if (slice.idlote) {
                const lote = await this.loteRepository.findOneBy({ id: slice.idlote });
                if (lote) {
                    lote.cantidad_disponible = Number((Number(lote.cantidad_disponible || 0) + cant).toFixed(4));
                    if (lote.estado === 'agotado') {
                        lote.estado = 'activo';
                    }
                    await this.loteRepository.save(lote);
                }
            }

            await this.movimientoRepository.save(
                this.movimientoRepository.create({
                    idinventario: params.idinventario,
                    idlote: slice.idlote,
                    tipo_movimiento: 'DEVOLUCION_ORDEN',
                    cantidad: cant,
                    costo_unitario: slice.costo_unitario,
                    precio_venta_unitario: slice.precio_venta_unitario,
                    idorden_trabajo: params.idorden_trabajo,
                    iddetalle_orden_trabajo: params.iddetalle_orden_trabajo,
                    observaciones: params.observacionKardex,
                    idusuario: params.idusuario ?? null,
                }),
            );

            // Ajustar o eliminar el movimiento SALIDA_ORDEN original para mantener consistencia en trazabilidad de lotes
            if (slice.movimiento_id) {
                const movSalida = await this.movimientoRepository.findOneBy({ id: slice.movimiento_id });
                if (movSalida) {
                    const restanteMov = Number((Number(movSalida.cantidad || 0) - cant).toFixed(4));
                    if (restanteMov <= 0.0001) {
                        await this.movimientoRepository.remove(movSalida);
                    } else {
                        movSalida.cantidad = restanteMov;
                        await this.movimientoRepository.save(movSalida);
                    }
                }
            }
        }

        if (totalDevuelto > 0) {
            const inventario = await this.inventarioRepository.findOneBy({ id: params.idinventario });
            if (inventario) {
                inventario.salidas = Math.max(0, Number((Number(inventario.salidas || 0) - totalDevuelto).toFixed(4)));
                inventario.cantidad_existente = Math.max(
                    0,
                    Number((Number(inventario.stock_inicial || 0) + Number(inventario.entradas || 0) - Number(inventario.salidas || 0)).toFixed(4)),
                );
                await this.inventarioRepository.save(inventario);
            }
        }
    }

    /**
     * REVERTIR CONSUMO DE UNA ORDEN DE TRABAJO (Reintegro inmediato desde almacén)
     */
    async revertirConsumoOrden(iddetalle_orden_trabajo: number) {
        const movimientos = await this.movimientoRepository.find({
            where: {
                iddetalle_orden_trabajo,
                tipo_movimiento: 'SALIDA_ORDEN',
            },
        });

        if (!movimientos || movimientos.length === 0) return;

        const slices: LoteDevolucionSnapshot[] = movimientos.map((mov) => ({
            movimiento_id: mov.id,
            idlote: mov.idlote,
            cantidad: Number(mov.cantidad || 0),
            costo_unitario: Number(mov.costo_unitario || 0),
            precio_venta_unitario: Number(mov.precio_venta_unitario || 0),
        }));

        await this.restituirLotesYStock({
            idinventario: movimientos[0].idinventario,
            idorden_trabajo: movimientos[0].idorden_trabajo,
            iddetalle_orden_trabajo,
            slices,
            observacionKardex: `Devolución de stock por anulación/descarte en detalle #${iddetalle_orden_trabajo}`,
            idusuario: movimientos[0].idusuario,
        });
    }

    /**
     * CREAR DEVOLUCIÓN PENDIENTE DE VISTO BUENO FÍSICO EN ALMACÉN
     */
    async crearDevolucionPendiente(params: {
        idinventario: number;
        idorden_trabajo: number | null;
        iddetalle_orden_trabajo: number;
        sucursal_id?: number | null;
        detalle_descripcion?: string | null;
        cantidad: number;
        motivo?: string;
        observaciones_asesor?: string | null;
        idusuario_solicita?: number | null;
        usuario_solicita_nombre?: string | null;
    }): Promise<InventarioDevolucion> {
        const cantObjetivo = Number(params.cantidad || 0);
        const inventario = await this.findOne(params.idinventario);

        // Obtener salidas FIFO ligadas a este detalle que aún no estén comprometidas en otra devolución pendiente
        const movimientos = await this.movimientoRepository.find({
            where: {
                iddetalle_orden_trabajo: params.iddetalle_orden_trabajo,
                tipo_movimiento: 'SALIDA_ORDEN',
            },
            order: { id: 'DESC' },
        });

        const pendientesPrevias = await this.devolucionRepository.find({
            where: {
                iddetalle_orden_trabajo: params.iddetalle_orden_trabajo,
                estado: 'pendiente',
            },
        });

        const reservadoPorMov = new Map<number, number>();
        for (const dev of pendientesPrevias) {
            for (const s of dev.lotes_snapshot || []) {
                if (s.movimiento_id) {
                    reservadoPorMov.set(s.movimiento_id, (reservadoPorMov.get(s.movimiento_id) || 0) + Number(s.cantidad || 0));
                }
            }
        }

        const slices: LoteDevolucionSnapshot[] = [];
        let restante = cantObjetivo;

        for (const mov of movimientos) {
            if (restante <= 0.0001) break;
            const yaReservado = reservadoPorMov.get(mov.id) || 0;
            const disponibleMov = Math.max(0, Number(mov.cantidad || 0) - yaReservado);
            if (disponibleMov <= 0.0001) continue;

            const tomar = Math.min(disponibleMov, restante);
            slices.push({
                movimiento_id: mov.id,
                idlote: mov.idlote,
                cantidad: Number(tomar.toFixed(4)),
                costo_unitario: Number(mov.costo_unitario || 0),
                precio_venta_unitario: Number(mov.precio_venta_unitario || 0),
            });
            restante = Number((restante - tomar).toFixed(4));
        }

        // Fallback si no existieran movimientos SALIDA_ORDEN suficientes
        if (restante > 0.0001) {
            slices.push({
                idlote: null,
                cantidad: Number(restante.toFixed(4)),
                costo_unitario: Number(inventario.precio_compra || 0),
                precio_venta_unitario: Number(inventario.precio_venta || 0),
            });
        }

        const devolucion = this.devolucionRepository.create({
            idinventario: params.idinventario,
            idorden_trabajo: params.idorden_trabajo,
            iddetalle_orden_trabajo: params.iddetalle_orden_trabajo,
            sucursal_id: params.sucursal_id ?? null,
            detalle_descripcion: params.detalle_descripcion || inventario.descripcion,
            cantidad: cantObjetivo,
            lotes_snapshot: slices,
            motivo: params.motivo || 'Retirado desde Orden de Trabajo',
            estado: 'pendiente',
            observaciones_asesor: params.observaciones_asesor ?? null,
            idusuario_solicita: params.idusuario_solicita ?? null,
            usuario_solicita_nombre: params.usuario_solicita_nombre ?? null,
        });

        return await this.devolucionRepository.save(devolucion);
    }

    async cancelarDevolucionPendientePorDetalle(iddetalle_orden_trabajo: number): Promise<boolean> {
        const pendientes = await this.devolucionRepository.find({
            where: {
                iddetalle_orden_trabajo,
                estado: 'pendiente',
            },
        });
        if (pendientes.length === 0) return false;
        await this.devolucionRepository.remove(pendientes);
        return true;
    }

    async findDevoluciones(sucursalId?: number | null, estado?: string): Promise<InventarioDevolucion[]> {
        const qb = this.devolucionRepository.createQueryBuilder('d')
            .leftJoinAndSelect('d.inventario', 'inventario')
            .leftJoinAndSelect('inventario.unidad_medida', 'unidad')
            .leftJoinAndSelect('d.orden_trabajo', 'orden')
            .leftJoinAndSelect('orden.marca_auto', 'marca')
            .orderBy('d.fecha_solicitud', 'DESC')
            .addOrderBy('d.id', 'DESC');

        if (sucursalId) {
            qb.andWhere('(d.sucursal_id = :sucursalId OR d.sucursal_id IS NULL)', { sucursalId });
        }

        if (estado && estado !== 'todos') {
            qb.andWhere('d.estado = :estado', { estado });
        }

        return await qb.getMany();
    }

    async countDevolucionesPendientes(sucursalId?: number | null): Promise<{ count: number }> {
        const qb = this.devolucionRepository.createQueryBuilder('d')
            .where('d.estado = :estado', { estado: 'pendiente' });

        if (sucursalId) {
            qb.andWhere('(d.sucursal_id = :sucursalId OR d.sucursal_id IS NULL)', { sucursalId });
        }

        const count = await qb.getCount();
        return { count };
    }

    async confirmarDevolucion(
        id: number,
        data: { idusuario?: number; usuario_nombre?: string; observaciones?: string },
    ): Promise<InventarioDevolucion> {
        const dev = await this.devolucionRepository.findOne({ where: { id } });
        if (!dev) {
            throw new NotFoundException(`Devolución #${id} no encontrada`);
        }
        if (dev.estado !== 'pendiente') {
            throw new BadRequestException(`La devolución #${id} ya fue procesada (${dev.estado}).`);
        }

        const slices: LoteDevolucionSnapshot[] =
            dev.lotes_snapshot && dev.lotes_snapshot.length > 0
                ? dev.lotes_snapshot
                : [{
                    idlote: null,
                    cantidad: Number(dev.cantidad || 0),
                    costo_unitario: Number(dev.inventario?.precio_compra || 0),
                    precio_venta_unitario: Number(dev.inventario?.precio_venta || 0),
                }];

        const otText = dev.idorden_trabajo ? `OT #${dev.idorden_trabajo}` : 'Orden de Trabajo';
        await this.restituirLotesYStock({
            idinventario: dev.idinventario,
            idorden_trabajo: dev.idorden_trabajo,
            iddetalle_orden_trabajo: dev.iddetalle_orden_trabajo,
            slices,
            observacionKardex: `Retorno físico confirmado en almacén (${otText})${data.observaciones ? ` - ${data.observaciones}` : ''}`,
            idusuario: data.idusuario ?? dev.idusuario_solicita,
        });

        dev.estado = 'recibido';
        dev.idusuario_almacen = data.idusuario ?? null;
        dev.usuario_almacen_nombre = data.usuario_nombre ?? null;
        dev.observaciones_almacen = data.observaciones?.trim() || null;
        dev.fecha_resolucion = new Date();

        return await this.devolucionRepository.save(dev);
    }

    async rechazarDevolucion(
        id: number,
        data: { idusuario?: number; usuario_nombre?: string; observaciones?: string },
    ): Promise<InventarioDevolucion> {
        const dev = await this.devolucionRepository.findOne({ where: { id } });
        if (!dev) {
            throw new NotFoundException(`Devolución #${id} no encontrada`);
        }
        if (dev.estado !== 'pendiente') {
            throw new BadRequestException(`La devolución #${id} ya fue procesada (${dev.estado}).`);
        }

        dev.estado = 'rechazado';
        dev.idusuario_almacen = data.idusuario ?? null;
        dev.usuario_almacen_nombre = data.usuario_nombre ?? null;
        dev.observaciones_almacen = data.observaciones?.trim() || 'No devuelto en físico / pérdida reportada por almacén';
        dev.fecha_resolucion = new Date();

        return await this.devolucionRepository.save(dev);
    }

    /**
     * OBTENER KARDEX Y TRAZABILIDAD COMPLETA DE UN PRODUCTO
     */
    async getKardexByInventario(idinventario: number) {
        const item = await this.findOne(idinventario);
        const manager = this.inventarioRepository.manager;

        // 1. Lotes con datos de compras/pedidos y proveedores
        const lotes = await manager.query(
            `SELECT l.*, 
                    p.fecha as fecha_pedido, 
                    prov.proveedor as proveedor_nombre,
                    prov.telefono as proveedor_telefono
             FROM inventario_lotes l
             LEFT JOIN material_pedido p ON l.idmaterial_pedido = p.id
             LEFT JOIN proveedores prov ON p.idproveedor = prov.id
             WHERE l.idinventario = $1
             ORDER BY l.fecha_ingreso DESC, l.id DESC`,
            [idinventario]
        );

        // 2. Salidas detalladas por orden de trabajo
        const salidasOrdenes = await manager.query(
            `SELECT m.*,
                    ot.id as orden_id,
                    ot.vehiculo_placa,
                    ot.vehiculo_modelo,
                    ot.cliente_nombre,
                    ot.fecha_registro as orden_fecha,
                    l.nro_lote,
                    l.costo_unitario as lote_costo_unitario
             FROM inventario_movimientos m
             LEFT JOIN ordenes_trabajo ot ON m.idorden_trabajo = ot.id
             LEFT JOIN inventario_lotes l ON m.idlote = l.id
             WHERE m.idinventario = $1 AND m.tipo_movimiento = 'SALIDA_ORDEN'
             ORDER BY m.fecha DESC, m.id DESC`,
            [idinventario]
        );

        // Agrupar consumos en cada lote correspondiente
        const lotesConConsumos = lotes.map((lote: any) => {
            const consumos = salidasOrdenes.filter((s: any) => Number(s.idlote) === Number(lote.id));
            const totalConsumido = consumos.reduce((acc: number, curr: any) => acc + Number(curr.cantidad || 0), 0);
            return {
                ...lote,
                consumos,
                totalConsumido,
            };
        });

        // 3. Todos los movimientos (Kardex integral)
        const movimientos = await manager.query(
            `SELECT m.*, 
                    ot.vehiculo_placa,
                    ot.cliente_nombre,
                    l.nro_lote
             FROM inventario_movimientos m
             LEFT JOIN ordenes_trabajo ot ON m.idorden_trabajo = ot.id
             LEFT JOIN inventario_lotes l ON m.idlote = l.id
             WHERE m.idinventario = $1
             ORDER BY m.fecha DESC, m.id DESC`,
            [idinventario]
        );

        return {
            item,
            lotes: lotesConConsumos,
            salidasOrdenes,
            movimientos,
        };
    }
}
