import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HojaRecepcion } from './entities/hoja-recepcion.entity';
import { CreateHojaRecepcionDto } from './dto/create-hoja-recepcion.dto';
import { UpdateHojaRecepcionDto } from './dto/update-hoja-recepcion.dto';

@Injectable()
export class HojaRecepcionService {
  constructor(
    @InjectRepository(HojaRecepcion)
    private readonly hojaRecepcionRepository: Repository<HojaRecepcion>,
  ) {}

  parseKilometraje(km: any): number | null {
    if (km === null || km === undefined) return null;
    const str = String(km).trim();
    if (!str) return null;
    const digitsOnly = str.replace(/[^0-9]/g, '');
    if (!digitsOnly) return null;
    const parsed = parseInt(digitsOnly, 10);
    return isNaN(parsed) ? null : parsed;
  }

  async getLastKilometraje(placa: string): Promise<number | null> {
    const cleanPlaca = (placa || '').toUpperCase().trim();
    if (!cleanPlaca) return null;

    try {
      const rows = await this.hojaRecepcionRepository.manager.query(
        `SELECT vehiculo_kilometraje, fecha FROM (
          SELECT vehiculo_kilometraje, created_at as fecha
          FROM hoja_recepcion
          WHERE UPPER(TRIM(vehiculo_placa)) = $1
            AND vehiculo_kilometraje IS NOT NULL
            AND TRIM(vehiculo_kilometraje) != ''
            AND (estado IS NULL OR LOWER(estado) != 'anulado')
          UNION ALL
          SELECT vehiculo_kilometraje, fecha_registro as fecha
          FROM ordenes_trabajo
          WHERE UPPER(TRIM(vehiculo_placa)) = $1
            AND vehiculo_kilometraje IS NOT NULL
            AND TRIM(vehiculo_kilometraje) != ''
            AND (estado IS NULL OR LOWER(estado) != 'anulado')
        ) combined
        ORDER BY fecha DESC
        LIMIT 10`,
        [cleanPlaca],
      );

      for (const row of rows) {
        const kmNum = this.parseKilometraje(row.vehiculo_kilometraje);
        if (kmNum !== null && kmNum > 0) {
          return kmNum;
        }
      }
    } catch (err) {
      console.error('Error getting last kilometraje by placa:', err);
    }
    return null;
  }

  async create(createHojaRecepcionDto: CreateHojaRecepcionDto, sucursalId?: number | null): Promise<HojaRecepcion> {
    let marcaId = createHojaRecepcionDto.idmarca_auto || null;
    let vehiculoMarca = createHojaRecepcionDto.vehiculo_marca || '';
    if (!marcaId && vehiculoMarca) {
      marcaId = await this.resolveMarcaId(vehiculoMarca);
    } else if (marcaId && !vehiculoMarca) {
      vehiculoMarca = await this.resolveMarcaName(marcaId);
    }

    const placaUpper = (createHojaRecepcionDto.vehiculo_placa || '').toUpperCase().trim();

    // Validar que el kilometraje no sea menor al último registrado del mismo auto
    if (placaUpper && createHojaRecepcionDto.vehiculo_kilometraje) {
      const nuevoKm = this.parseKilometraje(createHojaRecepcionDto.vehiculo_kilometraje);
      if (nuevoKm !== null) {
        const ultimoKm = await this.getLastKilometraje(placaUpper);
        if (ultimoKm !== null && nuevoKm < ultimoKm) {
          throw new BadRequestException(
            `El kilometraje ingresado (${nuevoKm.toLocaleString()} km) no puede ser menor al último registrado (${ultimoKm.toLocaleString()} km) para este vehículo.`,
          );
        }
      }
    }
    const newHoja = this.hojaRecepcionRepository.create({
      ...createHojaRecepcionDto,
      vehiculo_placa: placaUpper,
      idmarca_auto: marcaId || undefined,
      marca_auto: marcaId ? ({ id: marcaId } as any) : null,
      vehiculo_marca: vehiculoMarca,
      sucursal_id: (sucursalId || createHojaRecepcionDto.sucursal_id || undefined) as any,
      tipo_orden: createHojaRecepcionDto.tipo_orden_id ? { id: createHojaRecepcionDto.tipo_orden_id } as any : null,
      seguro: createHojaRecepcionDto.idseguro ? { id: createHojaRecepcionDto.idseguro } as any : null,
      idseguro: createHojaRecepcionDto.idseguro || undefined,
      inspector: createHojaRecepcionDto.idinspector ? { id: createHojaRecepcionDto.idinspector } as any : null,
      idinspector: createHojaRecepcionDto.idinspector || undefined,
      asesor: createHojaRecepcionDto.asesor_id ? { id: createHojaRecepcionDto.asesor_id } as any : null,
      jefe_mecanico: createHojaRecepcionDto.jefe_mecanico_id ? { id: createHojaRecepcionDto.jefe_mecanico_id } as any : null,
      mecanico: createHojaRecepcionDto.mecanico_id ? { id: createHojaRecepcionDto.mecanico_id } as any : null,
    });
    // Auto increment nro per sucursal
    if (!newHoja.nro) {
        const lastHoja = await this.hojaRecepcionRepository.findOne({
            where: sucursalId ? { sucursal_id: sucursalId } : {},
            order: { nro: 'DESC' },
        });
        newHoja.nro = (lastHoja?.nro || 0) + 1;
    }
    const saved = await this.hojaRecepcionRepository.save(newHoja);
    // Ya no se crea la orden de trabajo automáticamente para permitir que se cree a demanda
    return saved;
  }

  private async resolveMarcaName(marcaId: number): Promise<string> {
    try {
      const rows = await this.hojaRecepcionRepository.manager.query(
        `SELECT marca FROM marca_auto WHERE id = $1 LIMIT 1`,
        [marcaId],
      );
      return rows?.[0]?.marca || '';
    } catch {
      return '';
    }
  }

  private async resolveMarcaId(marcaStr?: string): Promise<number | null> {
    if (!marcaStr || !marcaStr.trim()) return null;
    try {
      const cleanMarca = marcaStr.trim();
      const rows = await this.hojaRecepcionRepository.manager.query(
        `SELECT id FROM marca_auto WHERE LOWER(TRIM(marca)) = LOWER($1) LIMIT 1`,
        [cleanMarca],
      );
      if (rows && rows.length > 0) {
        return rows[0].id;
      }
      const inserted = await this.hojaRecepcionRepository.manager.query(
        `INSERT INTO marca_auto (marca, estado) VALUES ($1, 'activo') RETURNING id`,
        [cleanMarca],
      );
      return inserted?.[0]?.id || null;
    } catch (err) {
      console.error('Error resolving marca_auto:', err);
      return null;
    }
  }

  private async createOrdenTrabajoFromHoja(hoja: HojaRecepcion, sucursalId: number): Promise<void> {
    try {
      const marcaId = hoja.idmarca_auto || (await this.resolveMarcaId(hoja.vehiculo_marca));
      const marcaNombre = hoja.vehiculo_marca || (marcaId ? await this.resolveMarcaName(marcaId) : '');
      const observaciones = [hoja.trabajos_solicitados, hoja.observaciones]
        .filter((s) => s && s.trim())
        .join(' | ');

      await this.hojaRecepcionRepository.manager.query(
        `INSERT INTO ordenes_trabajo (
          cliente_nombre,
          cliente_telefono,
          idmarca_auto,
          vehiculo_modelo,
          vehiculo_placa,
          vehiculo_color,
          vehiculo_kilometraje,
          vehiculo_chasis,
          moneda,
          sub_total,
          descuento,
          total,
          observaciones,
          estado,
          sucursal_id,
          id_hoja_recepcion,
          idusuario
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, 0, $10, 'en_proceso', $11, $12, $13)`,
        [
          hoja.cliente_nombre || '',
          hoja.cliente_telefono || '',
          marcaId,
          hoja.vehiculo_modelo || '',
          hoja.vehiculo_placa || '',
          hoja.vehiculo_color || '',
          String(hoja.vehiculo_kilometraje || ''),
          hoja.vehiculo_chasis || '',
          'Bolivianos',
          observaciones,
          sucursalId || null,
          hoja.id,
          hoja.idusuario || null,
        ],
      );
    } catch (err) {
      console.error('Error auto-creating OrdenTrabajo from HojaRecepcion:', err);
    }
  }

  async findAll(sucursalId?: number | null): Promise<HojaRecepcion[]> {
    const where: any = {};
    if (sucursalId) {
      where.sucursal_id = sucursalId;
    }
    return await this.hojaRecepcionRepository.find({
      where,
      order: { created_at: 'DESC' },
      relations: ['tipo_orden', 'marca_auto', 'asesor', 'jefe_mecanico', 'mecanico', 'seguro', 'inspector']
    });
  }

  async findPendientesOrden(sucursalId?: number | null): Promise<HojaRecepcion[]> {
    const qb = this.hojaRecepcionRepository
      .createQueryBuilder('hoja')
      .leftJoinAndSelect('hoja.marca_auto', 'marca_auto')
      .leftJoinAndSelect('hoja.tipo_orden', 'tipo_orden')
      .leftJoinAndSelect('hoja.seguro', 'seguro')
      .leftJoinAndSelect('hoja.inspector', 'inspector')
      .leftJoinAndSelect('hoja.asesor', 'asesor')
      .leftJoin('ordenes_trabajo', 'ot', 'ot.id_hoja_recepcion = hoja.id')
      .where('ot.id IS NULL')
      .andWhere('hoja.estado != :anulado', { anulado: 'Anulado' });

    if (sucursalId) {
      qb.andWhere('hoja.sucursal_id = :sucursalId', { sucursalId });
    }

    return await qb.orderBy('hoja.created_at', 'DESC').getMany();
  }

  async findByPlaca(placa: string): Promise<any | null> {
    const cleanPlaca = (placa || '').toUpperCase().trim();
    if (!cleanPlaca) return null;

    const lastKm = await this.getLastKilometraje(cleanPlaca);

    // 1. Search in hoja_recepcion
    const hoja = await this.hojaRecepcionRepository.findOne({
      where: { vehiculo_placa: cleanPlaca },
      relations: ['marca_auto', 'tipo_orden'],
      order: { created_at: 'DESC' },
    });

    if (hoja) {
      return {
        idmarca_auto: hoja.idmarca_auto || hoja.marca_auto?.id || null,
        vehiculo_marca: hoja.vehiculo_marca || hoja.marca_auto?.marca || '',
        vehiculo_modelo: hoja.vehiculo_modelo || '',
        vehiculo_color: hoja.vehiculo_color || '',
        vehiculo_chasis: hoja.vehiculo_chasis || '',
        vehiculo_kilometraje: lastKm !== null ? String(lastKm) : (hoja.vehiculo_kilometraje || ''),
        ultimo_kilometraje: lastKm,
        cliente_nombre: hoja.cliente_nombre || '',
        cliente_telefono: hoja.cliente_telefono || '',
        cliente_fecha_nacimiento: hoja.cliente_fecha_nacimiento || '',
      };
    }

    // 2. Fallback: Search in ordenes_trabajo
    try {
      const ordenRows = await this.hojaRecepcionRepository.manager.query(
        `SELECT ot.idmarca_auto, ot.vehiculo_marca, ot.vehiculo_modelo, ot.vehiculo_color, ot.vehiculo_chasis, ot.vehiculo_kilometraje, ot.cliente_nombre, ot.cliente_telefono, ot.cliente_fecha_nacimiento, m.marca as marca_nombre
         FROM ordenes_trabajo ot
         LEFT JOIN marca_auto m ON m.id = ot.idmarca_auto
         WHERE UPPER(TRIM(ot.vehiculo_placa)) = $1
         ORDER BY ot.fecha_registro DESC
         LIMIT 1`,
        [cleanPlaca],
      );

      if (ordenRows && ordenRows.length > 0) {
        const o = ordenRows[0];
        return {
          idmarca_auto: o.idmarca_auto || null,
          vehiculo_marca: o.vehiculo_marca || o.marca_nombre || '',
          vehiculo_modelo: o.vehiculo_modelo || '',
          vehiculo_color: o.vehiculo_color || '',
          vehiculo_chasis: o.vehiculo_chasis || '',
          vehiculo_kilometraje: lastKm !== null ? String(lastKm) : (o.vehiculo_kilometraje || ''),
          ultimo_kilometraje: lastKm,
          cliente_nombre: o.cliente_nombre || '',
          cliente_telefono: o.cliente_telefono || '',
          cliente_fecha_nacimiento: o.cliente_fecha_nacimiento || '',
        };
      }
    } catch (err) {
      console.error('Error querying ordenes_trabajo by placa in HojaRecepcionService:', err);
    }

    return null;
  }

  async findOne(id: number, sucursalId?: number | null): Promise<HojaRecepcion> {
    const where: any = { id };
    if (sucursalId) {
      where.sucursal_id = sucursalId;
    }
    const hoja = await this.hojaRecepcionRepository.findOne({
      where,
      relations: ['tipo_orden', 'marca_auto', 'asesor', 'jefe_mecanico', 'mecanico', 'seguro', 'inspector']
    });
    if (!hoja) {
      throw new NotFoundException(`Hoja de recepcion con id ${id} no encontrada`);
    }
    return hoja;
  }

  async update(id: number, updateHojaRecepcionDto: UpdateHojaRecepcionDto, sucursalId?: number | null): Promise<HojaRecepcion> {
    const hoja = await this.findOne(id, sucursalId);
    const estadoActual = (hoja.estado || '').toLowerCase();
    if (estadoActual === 'finalizado' || estadoActual === 'terminado' || estadoActual === 'orden cerrada' || estadoActual === 'cerrada') {
      throw new BadRequestException('No se puede modificar una hoja de recepción con orden de trabajo terminada o cerrada.');
    }
    if (updateHojaRecepcionDto.vehiculo_placa !== undefined) {
      updateHojaRecepcionDto.vehiculo_placa = (updateHojaRecepcionDto.vehiculo_placa || '').toUpperCase().trim();
    }
    Object.assign(hoja, updateHojaRecepcionDto);
    if (updateHojaRecepcionDto.idmarca_auto !== undefined) {
      hoja.marca_auto = updateHojaRecepcionDto.idmarca_auto ? ({ id: updateHojaRecepcionDto.idmarca_auto } as any) : null;
      if (updateHojaRecepcionDto.idmarca_auto && !updateHojaRecepcionDto.vehiculo_marca) {
        hoja.vehiculo_marca = await this.resolveMarcaName(updateHojaRecepcionDto.idmarca_auto);
      }
    }
    if (updateHojaRecepcionDto.tipo_orden_id !== undefined) {
      hoja.tipo_orden = updateHojaRecepcionDto.tipo_orden_id ? ({ id: updateHojaRecepcionDto.tipo_orden_id } as any) : null;
    }
    if (updateHojaRecepcionDto.asesor_id !== undefined) {
      hoja.asesor = updateHojaRecepcionDto.asesor_id ? ({ id: updateHojaRecepcionDto.asesor_id } as any) : null;
    }
    if (updateHojaRecepcionDto.jefe_mecanico_id !== undefined) {
      hoja.jefe_mecanico = updateHojaRecepcionDto.jefe_mecanico_id ? ({ id: updateHojaRecepcionDto.jefe_mecanico_id } as any) : null;
    }
    if (updateHojaRecepcionDto.mecanico_id !== undefined) {
      hoja.mecanico = updateHojaRecepcionDto.mecanico_id ? ({ id: updateHojaRecepcionDto.mecanico_id } as any) : null;
    }
    if (updateHojaRecepcionDto.idseguro !== undefined) {
      hoja.idseguro = updateHojaRecepcionDto.idseguro ? +updateHojaRecepcionDto.idseguro : undefined as any;
      hoja.seguro = updateHojaRecepcionDto.idseguro ? ({ id: +updateHojaRecepcionDto.idseguro } as any) : null;
    }
    if (updateHojaRecepcionDto.idinspector !== undefined) {
      hoja.idinspector = updateHojaRecepcionDto.idinspector ? +updateHojaRecepcionDto.idinspector : undefined as any;
      hoja.inspector = updateHojaRecepcionDto.idinspector ? ({ id: +updateHojaRecepcionDto.idinspector } as any) : null;
    }
    const saved = await this.hojaRecepcionRepository.save(hoja);
    try {
      const marcaId = saved.idmarca_auto || (await this.resolveMarcaId(saved.vehiculo_marca));
      await this.hojaRecepcionRepository.manager.query(
        `UPDATE ordenes_trabajo
         SET cliente_nombre = $1,
             cliente_telefono = $2,
             idmarca_auto = COALESCE($3, idmarca_auto),
             vehiculo_modelo = $4,
             vehiculo_placa = $5,
             vehiculo_color = $6,
             vehiculo_kilometraje = $7,
             vehiculo_chasis = $8
         WHERE id_hoja_recepcion = $9`,
        [
          saved.cliente_nombre || '',
          saved.cliente_telefono || '',
          marcaId || null,
          saved.vehiculo_modelo || '',
          saved.vehiculo_placa || '',
          saved.vehiculo_color || '',
          String(saved.vehiculo_kilometraje || ''),
          saved.vehiculo_chasis || '',
          saved.id,
        ],
      );
    } catch (err) {
      console.error('Error syncing OrdenTrabajo from HojaRecepcion update:', err);
    }
    return await this.findOne(id, sucursalId);
  }

  async remove(id: number, sucursalId?: number | null): Promise<void> {
    const hoja = await this.findOne(id, sucursalId);
    const estadoActual = (hoja.estado || '').toLowerCase();
    if (estadoActual === 'finalizado' || estadoActual === 'terminado' || estadoActual === 'orden cerrada' || estadoActual === 'cerrada') {
      throw new BadRequestException('No se puede eliminar una hoja de recepción con orden de trabajo terminada o cerrada.');
    }
    await this.hojaRecepcionRepository.remove(hoja);
  }
}
