import api from "./api";
import type {
  PrecioTaller,
  CreatePrecioTallerData,
} from "../types/precioTaller";

const ENDPOINT = "/precios-taller";

export const getPreciosTaller = async (): Promise<PrecioTaller[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const getPrecioTaller = async (id: string): Promise<PrecioTaller> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  return response.data;
};

export const createPrecioTaller = async (
  data: CreatePrecioTallerData,
): Promise<PrecioTaller> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updatePrecioTaller = async (
  id: string,
  data: CreatePrecioTallerData,
): Promise<PrecioTaller> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deletePrecioTaller = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const reactivatePrecioTaller = async (id: string): Promise<void> => {
  await api.patch(`${ENDPOINT}/${id}/reactivate`);
};
