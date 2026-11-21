import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { getBoliviaDateParts } from './utils/date-utils';

@Injectable()
export class AppService {
  constructor(private dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getCumpleaneros() {
    const { year: currentYear, month: currentMonth, day: currentDay } = getBoliviaDateParts();

    // 1. Personal
    const personalRows = await this.dataSource.query(`
      SELECT 
        p.id,
        p.nombre,
        p.paterno,
        p.materno,
        p.celular,
        p.telefono,
        p.fecha_nacimiento,
        p.tipo,
        a.area
      FROM personal p
      LEFT JOIN areas_personal a ON a.id = p.area_id
      WHERE (p.estado = 'activo' OR p.estado IS NULL)
        AND p.fecha_nacimiento IS NOT NULL
      ORDER BY p.nombre ASC
    `);

    // 2. Clientes (de hoja_recepcion)
    const clientesRows = await this.dataSource.query(`
      SELECT DISTINCT ON (LOWER(TRIM(cliente_nombre)))
        id,
        cliente_nombre,
        cliente_telefono,
        cliente_fecha_nacimiento,
        vehiculo_marca,
        vehiculo_modelo,
        vehiculo_placa
      FROM hoja_recepcion
      WHERE cliente_fecha_nacimiento IS NOT NULL
        AND TRIM(cliente_fecha_nacimiento) != ''
        AND cliente_nombre IS NOT NULL
        AND TRIM(cliente_nombre) != ''
      ORDER BY LOWER(TRIM(cliente_nombre)), id DESC
    `);

    const parseDateInfo = (raw: any) => {
      if (!raw) return null;
      let y: number | null = null;
      let m: number | null = null;
      let d: number | null = null;

      if (raw instanceof Date) {
        y = raw.getUTCFullYear();
        m = raw.getUTCMonth() + 1;
        d = raw.getUTCDate();
      } else if (typeof raw === 'string') {
        const clean = raw.trim();
        if (clean.includes('T')) {
          const dt = new Date(clean);
          if (!isNaN(dt.getTime())) {
            y = dt.getUTCFullYear();
            m = dt.getUTCMonth() + 1;
            d = dt.getUTCDate();
          }
        } else if (clean.includes('-')) {
          const parts = clean.split('-');
          if (parts.length === 3) {
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
            d = parseInt(parts[2], 10);
          }
        } else if (clean.includes('/')) {
          const parts = clean.split('/');
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              y = parseInt(parts[0], 10);
              m = parseInt(parts[1], 10);
              d = parseInt(parts[2], 10);
            } else {
              d = parseInt(parts[0], 10);
              m = parseInt(parts[1], 10);
              y = parseInt(parts[2], 10);
            }
          }
        }
      }

      if (!m || !d || isNaN(m) || isNaN(d)) return null;

      let edad: number | null = null;
      if (y && !isNaN(y) && y > 1900 && y <= currentYear) {
        edad = currentYear - y;
      }

      const todayDate = new Date(currentYear, currentMonth - 1, currentDay);
      let nextBirthday = new Date(currentYear, m - 1, d);
      if (nextBirthday < todayDate) {
        nextBirthday = new Date(currentYear + 1, m - 1, d);
      }
      const diffTime = nextBirthday.getTime() - todayDate.getTime();
      const diasRestantes = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const esHoy = m === currentMonth && d === currentDay;
      const esEsteMes = m === currentMonth;

      return {
        dia: d,
        mes: m,
        anio: y,
        edad,
        diasRestantes,
        esHoy,
        esEsteMes,
      };
    };

    const result: any[] = [];

    // Map personal
    for (const p of personalRows) {
      const info = parseDateInfo(p.fecha_nacimiento);
      if (!info) continue;
      const fullName = `${p.nombre || ''} ${p.paterno || ''} ${p.materno || ''}`.replace(/\s+/g, ' ').trim();
      result.push({
        tipo: 'personal',
        id: `p-${p.id}`,
        nombre: fullName,
        telefono: p.celular || p.telefono || '',
        fecha_nacimiento: p.fecha_nacimiento,
        detalle: p.area ? `Área: ${p.area}` : (p.tipo || 'Personal'),
        ...info,
      });
    }

    // Map clientes
    for (const c of clientesRows) {
      const info = parseDateInfo(c.cliente_fecha_nacimiento);
      if (!info) continue;
      const vehiculoStr = [c.vehiculo_marca, c.vehiculo_modelo, c.vehiculo_placa ? `[${c.vehiculo_placa}]` : '']
        .filter(Boolean)
        .join(' ');
      result.push({
        tipo: 'cliente',
        id: `c-${c.id}`,
        nombre: c.cliente_nombre.trim(),
        telefono: c.cliente_telefono || '',
        fecha_nacimiento: c.cliente_fecha_nacimiento,
        detalle: vehiculoStr || 'Cliente',
        ...info,
      });
    }

    result.sort((a, b) => a.diasRestantes - b.diasRestantes);
    return result;
  }
}
