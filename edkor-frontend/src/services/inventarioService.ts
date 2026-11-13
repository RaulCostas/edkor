import api from "./api";
import type {
  CreateInventarioData,
  Inventario,
  UpdateInventarioData,
} from "../types/inventario";

const ENDPOINT = "/inventario";

export const getInventarios = async (): Promise<Inventario[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const createInventario = async (
  data: CreateInventarioData,
): Promise<Inventario> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateInventario = async (
  id: number,
  data: UpdateInventarioData,
): Promise<Inventario> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteInventario = async (id: number): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const getKardexInventario = async (id: number): Promise<any> => {
  const response = await api.get(`${ENDPOINT}/${id}/kardex`);
  return response.data;
};

export interface InventarioDevolucion {
  id: number;
  idinventario: number;
  inventario?: Inventario;
  idorden_trabajo?: number | null;
  orden_trabajo?: any;
  iddetalle_orden_trabajo?: number | null;
  sucursal_id?: number | null;
  detalle_descripcion?: string | null;
  cantidad: number;
  motivo?: string | null;
  estado: "pendiente" | "recibido" | "rechazado";
  observaciones_asesor?: string | null;
  observaciones_almacen?: string | null;
  idusuario_solicita?: number | null;
  usuario_solicita_nombre?: string | null;
  idusuario_almacen?: number | null;
  usuario_almacen_nombre?: string | null;
  fecha_solicitud: string;
  fecha_resolucion?: string | null;
}

export const getDevolucionesInventario = async (
  estado?: string,
): Promise<InventarioDevolucion[]> => {
  const response = await api.get(`${ENDPOINT}/devoluciones`, {
    params: estado ? { estado } : undefined,
  });
  return response.data;
};

export const getDevolucionesPendientesCount = async (): Promise<{
  count: number;
}> => {
  const response = await api.get(`${ENDPOINT}/devoluciones/pendientes/count`);
  return response.data;
};

export const confirmarDevolucionInventario = async (
  id: number,
  payload: { idusuario?: number; usuario_nombre?: string; observaciones?: string },
): Promise<InventarioDevolucion> => {
  const response = await api.post(`${ENDPOINT}/devoluciones/${id}/confirmar`, payload);
  return response.data;
};

export const rechazarDevolucionInventario = async (
  id: number,
  payload: { idusuario?: number; usuario_nombre?: string; observaciones?: string },
): Promise<InventarioDevolucion> => {
  const response = await api.post(`${ENDPOINT}/devoluciones/${id}/rechazar`, payload);
  return response.data;
};
