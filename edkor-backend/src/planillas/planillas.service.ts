import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePlanillaDto } from './dto/create-planilla.dto';
import { UpdatePlanillaDto } from './dto/update-planilla.dto';
import { Planilla } from './entities/planilla.entity';
import { DetallePlanilla } from './entities/detalle-planilla.entity';

const ESTADOS_ORDEN_PLANILLA =
  "('finalizado', 'finalizada', 'cerrada', 'entregado', 'entregado_con_saldo', 'entregado_por_pagar')";

@Injectable()
export class PlanillasService implements OnModuleInit {
  constructor(
    @InjectRepository(Planilla)
    private planillaRepository: Repository<Planilla>,
    @InjectRepository(DetallePlanilla)
    private detalleRepository: Repository<DetallePlanilla>,
  ) { }

  async onModuleInit() {
    try {
      await this.planillaRepository.manager.query(`
        ALTER TABLE detalle_planillas 
        ADD COLUMN IF NOT EXISTS horas_produccion NUMERIC(10, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS monto_produccion NUMERIC(10, 2) DEFAULT 0;
      `);
      await this.planillaRepository.manager.query(`
        ALTER TABLE trabajos_asignados 
        ADD COLUMN IF NOT EXISTS idplanilla INT NULL REFERENCES planillas(id) ON DELETE SET NULL;
      `);
    } catch (e) {
      console.warn('Could not auto-add columns to detalle_planillas or trabajos_asignados:', e.message);
    }
  }

  private async markTrabajosAsPagadosByPlanilla(planillaId: number, mes: number, anio: number) {
    try {
      const query = `
        UPDATE trabajos_asignados ta
        SET cancelado = true,
            idplanilla = $1,
            fecha_entrega = COALESCE(ta.fecha_entrega, ot.fecha_terminado, ot.fecha_cancelado, CURRENT_DATE)
        FROM detalle_orden_trabajo dot
        JOIN ordenes_trabajo ot ON dot.idorden_trabajo = ot.id
        WHERE ta.iddetalle_orden_trabajo = dot.id
          AND (dot.estado_trabajo IS NULL OR dot.estado_trabajo != 'descartado')
          AND LOWER(ot.estado) IN ${ESTADOS_ORDEN_PLANILLA}
          AND EXTRACT(MONTH FROM COALESCE(ta.fecha_entrega, ta.fecha_asignado, ot.fecha_terminado, ot.fecha_cancelado, ot.fecha_registro)) = $2
          AND EXTRACT(YEAR FROM COALESCE(ta.fecha_entrega, ta.fecha_asignado, ot.fecha_terminado, ot.fecha_cancelado, ot.fecha_registro)) = $3
          AND (ta.idpago_trabajo IS NULL)
          AND (ta.cancelado = false OR ta.idplanilla = $1);
      `;
      await this.planillaRepository.manager.query(query, [planillaId, mes, anio]);
    } catch (err) {
      console.error('Error marking trabajos_asignados as pagados by planilla:', err);
    }
  }

  private async releaseTrabajosByPlanilla(planillaId: number) {
    try {
      const query = `
        UPDATE trabajos_asignados
        SET cancelado = false,
            idplanilla = NULL
        WHERE idplanilla = $1;
      `;
      await this.planillaRepository.manager.query(query, [planillaId]);
    } catch (err) {
      console.error('Error releasing trabajos_asignados from planilla:', err);
    }
  }

  async create(createPlanillaDto: CreatePlanillaDto, sucursalId: number | null = null) {
    const { detalles, ...planillaData } = createPlanillaDto;

    const planilla = this.planillaRepository.create({
        ...planillaData,
        sucursal: sucursalId ? { id: sucursalId } as any : null,
    });
    const savedPlanilla = await this.planillaRepository.save(planilla);

    if (detalles && detalles.length > 0) {
      const detalleEntities = detalles.map(d => {
        return this.detalleRepository.create({
          ...d,
          planilla: savedPlanilla,
          personal: { id: d.personal_id }
        });
      });
      await this.detalleRepository.save(detalleEntities);
    }

    // Al guardar la planilla, los trabajos de las órdenes terminadas recién cambian a pagado
    await this.markTrabajosAsPagadosByPlanilla(savedPlanilla.id, savedPlanilla.mes, savedPlanilla.anio);

    return this.findOne(savedPlanilla.id);
  }

  async findAll(mes?: number, anio?: number, sucursalId: number | null = null) {
    const query = this.planillaRepository.createQueryBuilder('planilla')
      .leftJoinAndSelect('planilla.detalles', 'detalles')
      .leftJoinAndSelect('detalles.personal', 'personal')
      .leftJoinAndSelect('personal.area', 'area')
      .leftJoinAndSelect('planilla.pago_planilla', 'pago_planilla')
      .leftJoinAndSelect('planilla.sucursal', 'sucursal');

    if (sucursalId) {
        query.andWhere('planilla.sucursal_id = :sucursalId', { sucursalId });
    }

    if (mes) {
      query.andWhere('planilla.mes = :mes', { mes });
    }
    if (anio) {
      query.andWhere('planilla.anio = :anio', { anio });
    }

    return query.getMany();
  }

  async findOne(id: number) {
    return this.planillaRepository.findOne({
      where: { id },
      relations: ['detalles', 'detalles.personal', 'detalles.personal.area']
    });
  }

  async update(id: number, updatePlanillaDto: UpdatePlanillaDto) {
    const { detalles, ...planillaData } = updatePlanillaDto;

    // Update header
    await this.planillaRepository.update(id, planillaData);
    const currentPlanilla = await this.findOne(id);

    // Update details if provided
    if (detalles) {
      // Delete existing details
      await this.detalleRepository.delete({ planilla: { id } });

      // Create new details
      const detalleEntities = detalles.map(d => {
        return this.detalleRepository.create({
          ...d,
          planilla: { id },
          personal: { id: (d as any).personal_id }
        });
      });
      await this.detalleRepository.save(detalleEntities);
    }

    // Re-sincronizar trabajos pagados por esta planilla
    await this.releaseTrabajosByPlanilla(id);
    if (currentPlanilla) {
      await this.markTrabajosAsPagadosByPlanilla(id, currentPlanilla.mes, currentPlanilla.anio);
    }

    return this.findOne(id);
  }

  async remove(id: number) {
    // Revertir trabajos a no cancelados antes de eliminar la planilla
    await this.releaseTrabajosByPlanilla(id);
    return this.planillaRepository.delete(id);
  }

  async getProduccionMecanicos(mes: number, anio: number, sucursalId: number | null = null) {
    let sucursalCondition = '';
    const params: any[] = [mes, anio];

    if (sucursalId) {
      params.push(sucursalId);
      sucursalCondition = `AND (ot.sucursal_id = $3 OR ot.sucursal_id IS NULL)`;
    }

    // Buscar si existe planilla guardada para este periodo para incluir sus propios trabajos si se consulta
    const existingPlanilla = await this.planillaRepository.findOne({ where: { mes, anio } });
    const planillaId = existingPlanilla ? existingPlanilla.id : 0;

    const query = `
      SELECT 
          dot.idpersonal_mecanico AS personal_id,
          p.nombre,
          p.paterno,
          p.materno,
          p.ci,
          p.precio_hora AS personal_precio_hora,
          COUNT(DISTINCT ot.id)::int AS total_ordenes,
          COUNT(dot.id)::int AS total_trabajos,
          ROUND(COALESCE(SUM(COALESCE(dot.tiempo_estimado, 0)), 0)::numeric, 2) AS total_horas,
          ROUND(COALESCE(SUM(
              COALESCE(ta.monto, COALESCE(dot.tiempo_estimado, 0) * COALESCE(NULLIF(dot.precio_hora, 0), NULLIF(p.precio_hora, 0), 0))
          ), 0)::numeric, 2) AS total_monto,
          json_agg(json_build_object(
              'orden_id', ot.id,
              'placa', ot.vehiculo_placa,
              'cliente', ot.cliente_nombre,
              'fecha_terminado', ot.fecha_terminado,
              'detalle', dot.detalle,
              'horas', dot.tiempo_estimado,
              'precio_hora', COALESCE(NULLIF(dot.precio_hora, 0), NULLIF(p.precio_hora, 0), 0),
              'subtotal', COALESCE(ta.monto, ROUND((COALESCE(dot.tiempo_estimado, 0) * COALESCE(NULLIF(dot.precio_hora, 0), NULLIF(p.precio_hora, 0), 0))::numeric, 2))
          )) AS detalles
      FROM detalle_orden_trabajo dot
      JOIN ordenes_trabajo ot ON dot.idorden_trabajo = ot.id
      JOIN personal p ON dot.idpersonal_mecanico = p.id
      LEFT JOIN areas_personal ap ON p.area_id = ap.id
      LEFT JOIN trabajos_asignados ta ON ta.iddetalle_orden_trabajo = dot.id
      WHERE (dot.estado_trabajo IS NULL OR dot.estado_trabajo != 'descartado')
        AND LOWER(ot.estado) IN ${ESTADOS_ORDEN_PLANILLA}
        AND EXTRACT(MONTH FROM COALESCE(ta.fecha_entrega, ta.fecha_asignado, ot.fecha_terminado, ot.fecha_cancelado, ot.fecha_registro)) = $1
        AND EXTRACT(YEAR FROM COALESCE(ta.fecha_entrega, ta.fecha_asignado, ot.fecha_terminado, ot.fecha_cancelado, ot.fecha_registro)) = $2
        AND (ta.idpago_trabajo IS NULL)
        AND (ta.cancelado IS NULL OR ta.cancelado = false OR ta.idplanilla = ${planillaId})
        ${sucursalCondition}
      GROUP BY dot.idpersonal_mecanico, p.nombre, p.paterno, p.materno, p.ci, p.precio_hora;
    `;

    const rows = await this.planillaRepository.manager.query(query, params);
    return rows.map((r: any) => ({
      personal_id: Number(r.personal_id),
      nombre: r.nombre,
      paterno: r.paterno,
      materno: r.materno,
      ci: r.ci,
      personal_precio_hora: Number(r.personal_precio_hora || 0),
      total_ordenes: Number(r.total_ordenes || 0),
      total_trabajos: Number(r.total_trabajos || 0),
      total_horas: Number(r.total_horas || 0),
      total_monto: Number(r.total_monto || 0),
      detalles: r.detalles || []
    }));
  }
}
