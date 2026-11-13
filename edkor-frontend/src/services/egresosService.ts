import api from "./api";
import type { Egreso, CreateEgresoData } from "../types/egreso";

const ENDPOINT = "/egresos";

export interface EgresosResponse {
  data: Egreso[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totals: Record<string, { bolivianos: number; dolares: number }>;
}

export const getEgresos = async (params: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}): Promise<EgresosResponse> => {
  const response = await api.get(ENDPOINT, { params });
  return response.data;
};

export const getEgreso = async (id: number): Promise<Egreso> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  return response.data;
};

export const createEgreso = async (data: CreateEgresoData): Promise<Egreso> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateEgreso = async (
  id: number,
  data: Partial<CreateEgresoData>,
): Promise<Egreso> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteEgreso = async (id: number): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export interface OrdenPendienteEgreso {
  id: number;
  vehiculo_placa: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  vehiculo_modelo?: string;
  estado: string;
  costo_terceros: number;
  total_egresos: number;
  saldo_terceros: number;
  trabajos: { id: number; detalle: string; costo_tercero: number }[];
  detalle_sugerido: string;
}

export const getOrdenesPendientesEgreso = async (all?: boolean): Promise<OrdenPendienteEgreso[]> => {
  const response = await api.get(`${ENDPOINT}/ordenes-pendientes`, { params: { all } });
  return response.data;
};
