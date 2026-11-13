import api from "./api";
import type {
  DetalleOrdenTrabajo,
  CreateDetalleOrdenTrabajoData,
} from "../types/detalleOrdenTrabajo";

const ENDPOINT = "/detalle-orden-trabajo";

export const getDetallesOrdenTrabajo = async (): Promise<
  DetalleOrdenTrabajo[]
> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const getRepuestosCargados = async (): Promise<
  DetalleOrdenTrabajo[]
> => {
  const response = await api.get(`${ENDPOINT}/repuestos/cargados`);
  return response.data;
};

export const getDetallesByOrden = async (
  idorden: number,
): Promise<DetalleOrdenTrabajo[]> => {
  const response = await api.get(`${ENDPOINT}/orden/${idorden}`);
  return response.data;
};

export const getDetalleOrdenTrabajo = async (
  id: number,
): Promise<DetalleOrdenTrabajo> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  return response.data;
};

export const createDetalleOrdenTrabajo = async (
  data: CreateDetalleOrdenTrabajoData,
): Promise<DetalleOrdenTrabajo> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateDetalleOrdenTrabajo = async (
  id: number,
  data: Partial<CreateDetalleOrdenTrabajoData>,
): Promise<DetalleOrdenTrabajo> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteDetalleOrdenTrabajo = async (
  id: number,
  options?: { origen?: "ot" | "almacen"; idusuario?: number; usuarioNombre?: string },
): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`, {
    params: options,
  });
};

export const deleteDetalleOrdenTrabajoHard = async (
  id: number,
): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}/hard`);
};

export const reactivateDetalleOrdenTrabajo = async (
  id: number,
): Promise<void> => {
  await api.patch(`${ENDPOINT}/${id}/reactivate`);
};
