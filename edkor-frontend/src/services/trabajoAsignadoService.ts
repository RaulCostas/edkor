import api from "./api";
import type {
  TrabajoAsignado,
  CreateTrabajoAsignadoDto,
  UpdateTrabajoAsignadoDto,
} from "../types/trabajoAsignado";

const ENDPOINT = "/trabajos-asignados";

export const getTrabajosAsignados = async (): Promise<TrabajoAsignado[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const getTrabajoAsignado = async (
  id: number,
): Promise<TrabajoAsignado> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  return response.data;
};

export const getTrabajoByDetalle = async (
  idDetalle: number,
): Promise<TrabajoAsignado | null> => {
  try {
    const response = await api.get(`${ENDPOINT}/detalle/${idDetalle}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const createTrabajoAsignado = async (
  data: CreateTrabajoAsignadoDto,
): Promise<TrabajoAsignado> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateTrabajoAsignado = async (
  id: number,
  data: UpdateTrabajoAsignadoDto,
): Promise<TrabajoAsignado> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteTrabajoAsignado = async (id: number): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};
