import api from "./api";
import type {
  PrecioSeguro,
  CreatePrecioSeguroData,
} from "../types/precioSeguro";

const ENDPOINT = "/precios-seguros";

export const getPreciosSeguros = async (): Promise<PrecioSeguro[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const createPrecioSeguro = async (
  data: CreatePrecioSeguroData,
): Promise<PrecioSeguro> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updatePrecioSeguro = async (
  id: string,
  data: Partial<CreatePrecioSeguroData>,
): Promise<PrecioSeguro> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deletePrecioSeguro = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const reactivatePrecioSeguro = async (id: string): Promise<void> => {
  await api.patch(`${ENDPOINT}/${id}/reactivate`);
};
