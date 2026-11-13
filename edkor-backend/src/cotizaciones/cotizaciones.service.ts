import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cotizacion } from './entities/cotizacion.entity';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';
import { DetalleCotizacion } from './entities/detalle-cotizacion.entity';

@Injectable()
export class CotizacionesService {
    constructor(
        @InjectRepository(Cotizacion)
        private repo: Repository<Cotizacion>,
        @InjectRepository(DetalleCotizacion)
        private detalleRepo: Repository<DetalleCotizacion>,
    ) { }

    async create(createDto: CreateCotizacionDto, sucursalId: number | null = null): Promise<Cotizacion> {
        const { detalles, ...cotizacionData } = createDto;
        const raw: any = cotizacionData;

        return await this.repo.manager.transaction(async (transactionalEntityManager) => {
            const cliente_nombre = cotizacionData.cliente_nombre ?? raw.cliente ?? null;
            const cliente_telefono = cotizacionData.cliente_telefono ?? raw.celular ?? null;
            const vehiculo_modelo = cotizacionData.vehiculo_modelo ?? raw.modelo ?? null;
            const vehiculo_placa = (cotizacionData.vehiculo_placa ?? raw.placa ?? '').toUpperCase() || null;
            const vehiculo_color = cotizacionData.vehiculo_color ?? raw.color ?? null;
            const vehiculo_chasis = cotizacionData.vehiculo_chasis ?? raw.chasis ?? null;
            const vehiculo_kilometraje = cotizacionData.vehiculo_kilometraje !== undefined && cotizacionData.vehiculo_kilometraje !== null
                ? String(cotizacionData.vehiculo_kilometraje)
                : (raw.km_ingreso !== undefined && raw.km_ingreso !== null ? String(raw.km_ingreso) : null);

            const cotizacion = transactionalEntityManager.create(Cotizacion, {
                cliente_nombre,
                cliente_telefono,
                idmarca_auto: cotizacionData.idmarca_auto ? +cotizacionData.idmarca_auto : undefined,
                marca_auto: cotizacionData.idmarca_auto ? ({ id: +cotizacionData.idmarca_auto } as any) : null,
                vehiculo_modelo,
                vehiculo_placa,
                vehiculo_color,
                vehiculo_kilometraje,
                vehiculo_chasis,
                plazo_entrega: cotizacionData.plazo_entrega,
                moneda: cotizacionData.moneda || 'Bolivianos',
                sub_total: cotizacionData.sub_total ?? 0,
                descuento: cotizacionData.descuento ?? 0,
                total: cotizacionData.total ?? 0,
                observaciones: cotizacionData.observaciones,
                estado: cotizacionData.estado || 'activo',
                motivo_anulacion: cotizacionData.motivo_anulacion,
                id_hoja_recepcion: cotizacionData.id_hoja_recepcion,
                hoja_recepcion: cotizacionData.id_hoja_recepcion ? ({ id: +cotizacionData.id_hoja_recepcion } as any) : null,
                id_tipo_orden: cotizacionData.id_tipo_orden ? +cotizacionData.id_tipo_orden : undefined,
                tipo_orden: cotizacionData.id_tipo_orden ? ({ id: +cotizacionData.id_tipo_orden } as any) : null,
                idseguro: cotizacionData.idseguro ? +cotizacionData.idseguro : undefined,
                seguro: cotizacionData.idseguro ? ({ id: +cotizacionData.idseguro } as any) : null,
                idinspector: cotizacionData.idinspector ? +cotizacionData.idinspector : undefined,
                inspector: cotizacionData.idinspector ? ({ id: +cotizacionData.idinspector } as any) : null,
                usuario: cotizacionData.idusuario ? ({ id: +cotizacionData.idusuario } as any) : null,
                idusuario: cotizacionData.idusuario ? +cotizacionData.idusuario : undefined,
                sucursal: sucursalId ? ({ id: sucursalId } as any) : null,
                sucursal_id: sucursalId ? sucursalId : undefined,
            } as any);

            const savedCotizacion = await transactionalEntityManager.save(cotizacion);

            if (detalles && detalles.length > 0) {
                const detallesEntities = detalles.map(d => {
                    return transactionalEntityManager.create(DetalleCotizacion, {
                        ...d,
                        idcotizacion: savedCotizacion.id,
                        cotizacion: savedCotizacion,
                        precio_taller: d.idprecio_taller ? ({ id: +d.idprecio_taller } as any) : null,
                        precio_seguro: d.idprecio_seguro ? ({ id: +d.idprecio_seguro } as any) : null,
                        personal_mecanico: d.idpersonal_mecanico ? ({ id: +d.idpersonal_mecanico } as any) : null,
                        inventario: d.id_inventario ? ({ id: +d.id_inventario } as any) : null,
                        usuario: d.idusuario ? ({ id: +d.idusuario } as any) : null,
                        tiempo_estimado: d.tiempo_estimado ?? 0,
                        precio_hora: d.precio_hora ?? 0,
                        total_costo: d.total_costo ?? 0,
                        estado_trabajo: d.estado_trabajo || 'confirmado',
                    } as any);
                });
                await transactionalEntityManager.save(detallesEntities);
            }

            return savedCotizacion;
        });
    }

    async findAll(sucursalId: number | null = null): Promise<Cotizacion[]> {
        const whereClause: any = {};
        if (sucursalId) {
            whereClause.sucursal = { id: sucursalId };
        }
        return this.repo.find({
            where: whereClause,
            order: { fecha_registro: 'DESC', id: 'DESC' },
            relations: [
                'detalles',
                'detalles.personal_mecanico',
                'detalles.precio_taller',
                'detalles.precio_seguro',
                'detalles.inventario',
                'marca_auto',
                'usuario',
                'hoja_recepcion',
                'hoja_recepcion.tipo_orden',
                'sucursal',
                'tipo_orden',
                'seguro',
                'inspector'
            ]
        });
    }

    async findOne(id: number): Promise<Cotizacion> {
        const cotizacion = await this.repo.findOne({
            where: { id },
            relations: [
                'detalles',
                'detalles.personal_mecanico',
                'detalles.precio_taller',
                'detalles.precio_seguro',
                'detalles.inventario',
                'marca_auto',
                'usuario',
                'hoja_recepcion',
                'hoja_recepcion.tipo_orden',
                'sucursal',
                'tipo_orden',
                'seguro',
                'inspector'
            ]
        });

        if (!cotizacion) {
            throw new NotFoundException(`Cotización con id ${id} no encontrada`);
        }
        return cotizacion;
    }

    async update(id: number, updateDto: UpdateCotizacionDto): Promise<Cotizacion> {
        const { detalles, ...cotizacionData } = updateDto;
        const raw: any = cotizacionData;

        return await this.repo.manager.transaction(async (transactionalEntityManager) => {
            const existing = await transactionalEntityManager.findOne(Cotizacion, {
                where: { id },
                relations: ['detalles']
            });

            if (!existing) {
                throw new NotFoundException(`Cotización con id ${id} no encontrada`);
            }

            const updatedData: any = {};
            if (cotizacionData.cliente_nombre !== undefined || raw.cliente !== undefined) {
                updatedData.cliente_nombre = cotizacionData.cliente_nombre ?? raw.cliente;
            }
            if (cotizacionData.cliente_telefono !== undefined || raw.celular !== undefined) {
                updatedData.cliente_telefono = cotizacionData.cliente_telefono ?? raw.celular;
            }
            if (cotizacionData.vehiculo_modelo !== undefined || raw.modelo !== undefined) {
                updatedData.vehiculo_modelo = cotizacionData.vehiculo_modelo ?? raw.modelo;
            }
            if (cotizacionData.vehiculo_placa !== undefined || raw.placa !== undefined) {
                updatedData.vehiculo_placa = (cotizacionData.vehiculo_placa ?? raw.placa ?? '').toUpperCase();
            }
            if (cotizacionData.vehiculo_color !== undefined || raw.color !== undefined) {
                updatedData.vehiculo_color = cotizacionData.vehiculo_color ?? raw.color;
            }
            if (cotizacionData.vehiculo_chasis !== undefined || raw.chasis !== undefined) {
                updatedData.vehiculo_chasis = cotizacionData.vehiculo_chasis ?? raw.chasis;
            }
            if (cotizacionData.vehiculo_kilometraje !== undefined) {
                updatedData.vehiculo_kilometraje = String(cotizacionData.vehiculo_kilometraje);
            } else if (raw.km_ingreso !== undefined) {
                updatedData.vehiculo_kilometraje = String(raw.km_ingreso);
            }
            if (cotizacionData.plazo_entrega !== undefined) updatedData.plazo_entrega = cotizacionData.plazo_entrega;
            if (cotizacionData.moneda !== undefined) updatedData.moneda = cotizacionData.moneda;
            if (cotizacionData.sub_total !== undefined) updatedData.sub_total = cotizacionData.sub_total;
            if (cotizacionData.descuento !== undefined) updatedData.descuento = cotizacionData.descuento;
            if (cotizacionData.total !== undefined) updatedData.total = cotizacionData.total;
            if (cotizacionData.observaciones !== undefined) updatedData.observaciones = cotizacionData.observaciones;
            if (cotizacionData.estado !== undefined) updatedData.estado = cotizacionData.estado;
            if (cotizacionData.motivo_anulacion !== undefined) updatedData.motivo_anulacion = cotizacionData.motivo_anulacion;
            if (cotizacionData.id_hoja_recepcion !== undefined) {
                updatedData.id_hoja_recepcion = cotizacionData.id_hoja_recepcion;
                updatedData.hoja_recepcion = cotizacionData.id_hoja_recepcion ? ({ id: cotizacionData.id_hoja_recepcion } as any) : null;
            }
            if (cotizacionData.idmarca_auto !== undefined) {
                updatedData.idmarca_auto = cotizacionData.idmarca_auto;
                updatedData.marca_auto = cotizacionData.idmarca_auto ? ({ id: cotizacionData.idmarca_auto } as any) : null;
            }
            if (cotizacionData.idusuario !== undefined) {
                updatedData.idusuario = cotizacionData.idusuario;
                updatedData.usuario = cotizacionData.idusuario ? ({ id: cotizacionData.idusuario } as any) : null;
            }
            if (cotizacionData.id_tipo_orden !== undefined) {
                updatedData.id_tipo_orden = cotizacionData.id_tipo_orden || null;
                updatedData.tipo_orden = cotizacionData.id_tipo_orden ? ({ id: +cotizacionData.id_tipo_orden } as any) : null;
            }
            if (cotizacionData.idseguro !== undefined) {
                updatedData.idseguro = cotizacionData.idseguro || null;
                updatedData.seguro = cotizacionData.idseguro ? ({ id: +cotizacionData.idseguro } as any) : null;
            }
            if (cotizacionData.idinspector !== undefined) {
                updatedData.idinspector = cotizacionData.idinspector || null;
                updatedData.inspector = cotizacionData.idinspector ? ({ id: +cotizacionData.idinspector } as any) : null;
            }

            const updatedEntity = transactionalEntityManager.merge(Cotizacion, existing, updatedData);
            const savedCotizacion = await transactionalEntityManager.save(updatedEntity);

            if (detalles) {
                if (existing.detalles && existing.detalles.length > 0) {
                    await transactionalEntityManager.remove(existing.detalles);
                }
                const detallesEntities = detalles.map(d => {
                    return transactionalEntityManager.create(DetalleCotizacion, {
                        ...d,
                        idcotizacion: savedCotizacion.id,
                        cotizacion: savedCotizacion,
                        precio_taller: d.idprecio_taller ? ({ id: +d.idprecio_taller } as any) : null,
                        precio_seguro: d.idprecio_seguro ? ({ id: +d.idprecio_seguro } as any) : null,
                        personal_mecanico: d.idpersonal_mecanico ? ({ id: +d.idpersonal_mecanico } as any) : null,
                        inventario: d.id_inventario ? ({ id: +d.id_inventario } as any) : null,
                        usuario: d.idusuario ? ({ id: +d.idusuario } as any) : null,
                        tiempo_estimado: d.tiempo_estimado ?? 0,
                        precio_hora: d.precio_hora ?? 0,
                        total_costo: d.total_costo ?? 0,
                        estado_trabajo: d.estado_trabajo || 'confirmado',
                    } as any);
                });
                await transactionalEntityManager.save(detallesEntities);
            }

            return savedCotizacion;
        });
    }

    async remove(id: number) {
        return this.repo.update(id, { estado: 'inactivo' });
    }
}
