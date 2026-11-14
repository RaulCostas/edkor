import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { CreateEgresoDto } from './dto/create-egreso.dto';
import { UpdateEgresoDto } from './dto/update-egreso.dto';
import { Egreso } from './entities/egreso.entity';

@Injectable()
export class EgresosService {
    constructor(
        @InjectRepository(Egreso)
        private egresosRepository: Repository<Egreso>,
    ) { }

    async onModuleInit() {
        // Fix for existing records with null forma_pago_id
        await this.egresosRepository.query(`UPDATE egresos SET forma_pago_id = 1 WHERE forma_pago_id IS NULL`).catch(() => {});
        await this.egresosRepository.query(`ALTER TABLE egresos ADD COLUMN IF NOT EXISTS idorden_trabajo INT NULL REFERENCES ordenes_trabajo(id) ON DELETE SET NULL;`).catch(() => {});
    }

    async create(createEgresoDto: CreateEgresoDto, sucursalId: number | null = null) {
        try {
            const egreso = this.egresosRepository.create({
                ...createEgresoDto,
                formaPago: { id: createEgresoDto.formaPagoId },
                sucursal: sucursalId ? { id: sucursalId } as any : null,
                ordenTrabajo: createEgresoDto.idorden_trabajo ? { id: createEgresoDto.idorden_trabajo } as any : null,
                idorden_trabajo: createEgresoDto.idorden_trabajo || null,
            });
            return await this.egresosRepository.save(egreso);
        } catch (error) {
            console.error('Error creating egreso:', error);
            throw new InternalServerErrorException(error.message || 'Error al crear el egreso');
        }
    }

    async findAll(page: number = 1, limit: number = 10, startDate?: string, endDate?: string, search?: string, sucursalId: number | null = null) {
        const skip = (page - 1) * limit;

        const queryBuilder = this.egresosRepository.createQueryBuilder('egreso')
            .leftJoinAndSelect('egreso.formaPago', 'formaPago')
            .leftJoinAndSelect('egreso.sucursal', 'sucursal')
            .leftJoinAndSelect('egreso.ordenTrabajo', 'ordenTrabajo')
            .orderBy('egreso.fecha', 'DESC')
            .addOrderBy('egreso.detalle', 'ASC')
            .skip(skip)
            .take(limit);

        const whereCondition: any = {};
        
        if (sucursalId) {
            whereCondition.sucursal = { id: sucursalId };
            queryBuilder.andWhere('egreso.sucursal_id = :sucursalId', { sucursalId });
        }
        
        if (search) {
            whereCondition.detalle = ILike(`%${search}%`);
            queryBuilder.andWhere('egreso.detalle ILIKE :search', { search: `%${search}%` });
        }
        if (startDate && endDate) {
            whereCondition.fecha = Between(startDate, endDate);
            queryBuilder.andWhere('egreso.fecha BETWEEN :startDate AND :endDate', { startDate, endDate });
        }

        const [data, total] = await queryBuilder.getManyAndCount();

        // Construct standard find options
        const findOptions: any = { relations: ['formaPago', 'sucursal'], where: {} };

        if (sucursalId) {
            findOptions.where.sucursal = { id: sucursalId };
        }
        if (search) {
            findOptions.where.detalle = ILike(`%${search}%`);
        }
        if (startDate && endDate) {
            findOptions.where.fecha = Between(startDate, endDate);
        }

        let allEgresosForTotals = await this.egresosRepository.find(findOptions);

        // Inicializar estructura solo con formas de pago presentes en los egresos filtrados
        const totals: Record<string, { bolivianos: number; dolares: number }> = {};

        allEgresosForTotals.forEach(egreso => {
            const monto = Number(egreso.monto);
            const monedaKey = egreso.moneda === 'Bolivianos' ? 'bolivianos' : 'dolares';
            const formaPagoName = egreso.formaPago?.forma_pago || 'Sin Asignar';

            let key = formaPagoName;

            // Normalizar nombres de formas de pago
            if (key.toUpperCase() === 'EFECTIVO') key = 'Efectivo';
            else if (key.toUpperCase() === 'QR') key = 'QR';
            else if (key.toUpperCase() === 'DEPOSITO' || key.toUpperCase() === 'DEPÓSITO' || key.toUpperCase() === 'TRANSFERENCIA') key = 'Transferencia';
            else if (key.toUpperCase() === 'DEBITO' || key.toUpperCase() === 'DÉBITO') key = 'Debito';

            if (!totals[key]) {
                totals[key] = { bolivianos: 0, dolares: 0 };
            }
            totals[key][monedaKey] += monto;
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totals
        };
    }

    async getOrdenesPendientes(includeAll: boolean = false) {
        const query = `
            SELECT 
                o.id,
                o.vehiculo_placa,
                o.cliente_nombre,
                o.cliente_telefono,
                o.vehiculo_modelo,
                o.estado,
                COALESCE(terceros.total_costo_terceros, 0) AS costo_terceros,
                COALESCE(egresos_ot.total_egresos, 0) AS total_egresos,
                COALESCE(terceros.trabajos, '[]'::json) AS trabajos
            FROM ordenes_trabajo o
            LEFT JOIN (
                SELECT 
                    d.idorden_trabajo,
                    SUM(
                        CASE 
                            WHEN d.costo_tercero > 0 THEN d.costo_tercero
                            WHEN cat.categoria_servicio ILIKE '%tercero%' AND d.total_costo > 0 THEN d.total_costo
                            WHEN cat.categoria_servicio ILIKE '%tercero%' AND pt.total_costo > 0 THEN pt.total_costo
                            ELSE 0 
                        END
                    ) AS total_costo_terceros,
                    json_agg(
                        json_build_object(
                            'id', d.id,
                            'detalle', COALESCE(d.detalle, pt.detalle, 'Trabajo Externo'),
                            'costo_tercero', CASE 
                                WHEN d.costo_tercero > 0 THEN d.costo_tercero
                                WHEN cat.categoria_servicio ILIKE '%tercero%' AND d.total_costo > 0 THEN d.total_costo
                                WHEN cat.categoria_servicio ILIKE '%tercero%' AND pt.total_costo > 0 THEN pt.total_costo
                                ELSE 0 
                            END
                        )
                    ) AS trabajos
                FROM detalle_orden_trabajo d
                LEFT JOIN precios_taller pt ON pt.id = d.idprecio_taller
                LEFT JOIN categoria_servicio cat ON cat.id = pt.idcategoria_servicio
                WHERE (d.costo_tercero > 0 OR cat.categoria_servicio ILIKE '%tercero%')
                  AND (d.estado_trabajo IS NULL OR d.estado_trabajo != 'descartado')
                GROUP BY d.idorden_trabajo
            ) terceros ON terceros.idorden_trabajo = o.id
            LEFT JOIN (
                SELECT 
                    e.idorden_trabajo,
                    SUM(e.monto) AS total_egresos
                FROM egresos e
                WHERE e.idorden_trabajo IS NOT NULL
                GROUP BY e.idorden_trabajo
            ) egresos_ot ON egresos_ot.idorden_trabajo = o.id
            WHERE o.estado NOT IN ('eliminado', 'cancelado')
            ORDER BY o.id DESC
        `;
        const rows = await this.egresosRepository.query(query);
        return rows.map((r: any) => {
            const costoTerceros = Number(r.costo_terceros || 0);
            const totalEgresos = Number(r.total_egresos || 0);
            const saldoTerceros = Math.max(0, Number((costoTerceros - totalEgresos).toFixed(2)));
            const trabajos = Array.isArray(r.trabajos) ? r.trabajos : [];
            const nombresTrabajos = trabajos
                .filter((t: any) => Number(t.costo_tercero) > 0 || t.detalle)
                .map((t: any) => t.detalle)
                .filter(Boolean)
                .join(', ');

            return {
                id: Number(r.id),
                vehiculo_placa: r.vehiculo_placa,
                cliente_nombre: r.cliente_nombre,
                cliente_telefono: r.cliente_telefono,
                vehiculo_modelo: r.vehiculo_modelo,
                estado: r.estado,
                costo_terceros: costoTerceros,
                total_egresos: totalEgresos,
                saldo_terceros: saldoTerceros,
                trabajos,
                detalle_sugerido: nombresTrabajos
                    ? `Pago Terceros OT #${r.id} (${r.vehiculo_placa || 'S/P'}): ${nombresTrabajos}`
                    : `Gasto OT #${r.id} (${r.vehiculo_placa || 'S/P'})`
            };
        });
    }

    findOne(id: number) {
        return this.egresosRepository.findOne({
            where: { id },
            relations: ['formaPago', 'sucursal', 'ordenTrabajo']
        });
    }

    update(id: number, updateEgresoDto: UpdateEgresoDto) {
        return this.egresosRepository.save({
            id,
            ...updateEgresoDto,
            formaPago: updateEgresoDto.formaPagoId ? { id: updateEgresoDto.formaPagoId } : undefined,
            ordenTrabajo: updateEgresoDto.idorden_trabajo !== undefined ? (updateEgresoDto.idorden_trabajo ? { id: updateEgresoDto.idorden_trabajo } as any : null) : undefined,
            idorden_trabajo: updateEgresoDto.idorden_trabajo !== undefined ? (updateEgresoDto.idorden_trabajo || null) : undefined,
        });
    }

    remove(id: number) {
        return this.egresosRepository.delete(id);
    }
}
