import api from './api';
import type { DetalleOrdenTrabajo } from '../types/detalleOrdenTrabajo';

export interface CargaRepuestoPayload {
  idorden_trabajo: number;
  id_inventario: number;
  detalle: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  total_costo: number;
  observaciones?: string;
  estado_trabajo?: string;
  idusuario?: number;
}

export const getCargasRepuestos = async (): Promise<DetalleOrdenTrabajo[]> => {
  const response = await api.get('/detalle-orden-trabajo/repuestos/cargados');
  return response.data;
};

export const createCargaRepuesto = async (
  payload: CargaRepuestoPayload
): Promise<DetalleOrdenTrabajo> => {
  const response = await api.post('/detalle-orden-trabajo', payload);
  return response.data;
};

export const createCargasRepuestosBulk = async (
  items: CargaRepuestoPayload[]
): Promise<DetalleOrdenTrabajo[]> => {
  const response = await api.post('/detalle-orden-trabajo/bulk', { items });
  return response.data;
};

export const deleteCargaRepuesto = async (id: number): Promise<void> => {
  await api.delete(`/detalle-orden-trabajo/${id}`);
};

export const updateCargaRepuesto = async (
  id: number,
  payload: Partial<CargaRepuestoPayload>
): Promise<DetalleOrdenTrabajo> => {
  const response = await api.patch(`/detalle-orden-trabajo/${id}`, payload);
  return response.data;
};
