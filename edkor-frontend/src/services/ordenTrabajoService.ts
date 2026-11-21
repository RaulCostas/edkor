import api from "./api";
import type {
  OrdenTrabajo,
  CreateOrdenTrabajoData,
} from "../types/ordenTrabajo";

const ENDPOINT = "/ordenes-trabajo";

export const getOrdenesTrabajo = async (): Promise<OrdenTrabajo[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const getOrdenTrabajo = async (id: number): Promise<OrdenTrabajo> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  return response.data;
};

export const getOrdenTrabajoByPlaca = async (
  placa: string,
): Promise<OrdenTrabajo | null> => {
  try {
    const response = await api.get(`${ENDPOINT}/by-placa/${placa}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const createOrdenTrabajo = async (
  data: CreateOrdenTrabajoData,
): Promise<OrdenTrabajo> => {
  console.log("Sending Create Payload:", JSON.stringify(data, null, 2));
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateOrdenTrabajo = async (
  id: number,
  data: CreateOrdenTrabajoData,
): Promise<OrdenTrabajo> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteOrdenTrabajo = async (id: number, motivo?: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`, {
    data: { motivo },
    params: { motivo },
  });
};

export const reactivateOrdenTrabajo = async (id: number): Promise<void> => {
  await api.patch(`${ENDPOINT}/${id}/reactivate`);
};

export interface UtilidadServicioItem {
  id: number;
  detalle: string;
  es_grupo?: boolean;
  sub_items?: {
    id: number;
    detalle: string;
    cantidad: number;
    precio_unitario: number;
    ingreso_total: number;
  }[];
  nivel: string | null;
  cantidad: number;
  precio_unitario: number;
  ingreso_total: number;
  mecanico: string;
  tiene_mecanico: boolean;
  tiempo_estimado: number;
  precio_hora: number;
  costo_mecanico: number;
  es_tercero?: boolean;
  costo_tercero?: number;
  mecanico_pagado: boolean;
  utilidad: number;
}

export interface UtilidadRepuestoItem {
  id: number | string;
  codigo: string | null;
  detalle: string;
  cantidad: number;
  precio_venta_unitario: number;
  ingreso_total: number;
  costo_compra_unitario: number;
  costo_compra_total: number;
  lotes: string[];
  mecanico: string | null;
  costo_mecanico: number;
  es_tercero?: boolean;
  costo_tercero?: number;
  mecanico_pagado: boolean;
  utilidad: number;
}

export interface UtilidadOrdenResponse {
  orden: {
    id: number;
    nro_orden: string;
    fecha_registro: string;
    cliente: string;
    placa: string;
    vehiculo: string;
    tipo_orden: string;
    estado: string;
    moneda: string;
    facturado: boolean;
    nro_factura: string | null;
  };
  servicios: UtilidadServicioItem[];
  repuestos: UtilidadRepuestoItem[];
  pagos_cliente: {
    id: number;
    fecha: string;
    monto: number;
    moneda: string;
    monto_comision: number;
    forma_pago: string;
  }[];
  resumen: {
    ingreso_servicios: number;
    ingreso_repuestos: number;
    sub_total: number;
    descuento: number;
    ingreso_neto_orden: number;
    total_pagado_cliente: number;
    saldo_cliente: number;
    costo_mecanicos: number;
    costo_mecanicos_pagado: number;
    costo_mecanicos_pendiente: number;
    costo_repuestos: number;
    costo_terceros?: number;
    comisiones_tarjeta: number;
    total_costos: number;
    utilidad_neta: number;
    margen_porcentaje: number;
  };
}

export const getUtilidadOrdenTrabajo = async (
  id: number,
): Promise<UtilidadOrdenResponse> => {
  const response = await api.get(`${ENDPOINT}/${id}/utilidad`);
  return response.data;
};

export interface TrabajoRechazadoHistorial {
  id: number;
  idorden_trabajo: number;
  fecha_orden: string;
  vehiculo_placa: string;
  cliente_nombre: string;
  moneda: string;
  detalle: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  observaciones: string | null;
  idprecio_taller: number | null;
  idprecio_seguro: number | null;
  id_inventario: number | null;
  categoria: string;
  codigo_repuesto: string | null;
}

export const getTrabajosRechazadosByPlaca = async (
  placa: string,
): Promise<TrabajoRechazadoHistorial[]> => {
  try {
    const cleanPlaca = (placa || "").trim().toUpperCase();
    if (!cleanPlaca) return [];
    const response = await api.get(
      `${ENDPOINT}/trabajos-rechazados/by-placa/${encodeURIComponent(cleanPlaca)}`
    );
    return response.data || [];
  } catch (error) {
    console.error("Error fetching trabajos rechazados by placa:", error);
    return [];
  }
};

export interface OrdenUtilidadItem {
  id: number;
  nro_orden: string;
  fecha_registro: string;
  cliente: string;
  placa: string;
  vehiculo: string;
  tipo_orden: string;
  estado: string;
  asesor?: string;
  asesor_id?: number | null;
  moneda: string;
  facturado: boolean;
  nro_factura: string | null;
  sub_total: number;
  descuento: number;
  ingreso_neto: number;
  ingreso_servicios: number;
  ingreso_repuestos: number;
  costo_mecanicos: number;
  costo_mecanicos_pagado: number;
  costo_mecanicos_pendiente: number;
  costo_repuestos: number;
  costo_terceros: number;
  total_costos: number;
  utilidad_neta: number;
  margen_porcentaje: number;
}

export interface UtilidadMensualResponse {
  periodo: {
    mes: string;
    desde: string;
    hasta: string;
  };
  resumen_general: {
    total_ordenes: number;
    ingreso_neto_ordenes: number;
    sub_total: number;
    descuento: number;
    ingreso_servicios: number;
    ingreso_repuestos: number;
    costo_mecanicos: number;
    costo_mecanicos_pagado: number;
    costo_mecanicos_pendiente: number;
    costo_repuestos: number;
    costo_terceros: number;
    comisiones_tarjeta: number;
    total_costos: number;
    utilidad_neta: number;
    margen_porcentaje: number;
  };
  ordenes: OrdenUtilidadItem[];
}

export interface AsesorRecepcion {
  id: number;
  nombre: string;
  paterno?: string;
  materno?: string;
  nombre_completo: string;
}

export const getAsesoresRecepcion = async (): Promise<AsesorRecepcion[]> => {
  try {
    const response = await api.get(`${ENDPOINT}/utilidad-mensual/asesores`);
    return response.data || [];
  } catch (error) {
    console.error("Error al obtener asesores con recepción:", error);
    return [];
  }
};

export const getUtilidadMensual = async (params?: {
  mes?: string;
  desde?: string;
  hasta?: string;
  estado?: string;
  asesor_id?: string | number;
}): Promise<UtilidadMensualResponse> => {
  const response = await api.get(`${ENDPOINT}/utilidad-mensual`, { params });
  return response.data;
};
