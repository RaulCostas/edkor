import api from "./api";
import type {
  CreateUnidadMedidaData,
  UnidadMedida,
  UpdateUnidadMedidaData,
} from "../types/unidadMedida";

const ENDPOINT = "/unidad-medida";

export const getUnidadesMedida = async (): Promise<UnidadMedida[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const getUnidadMedida = async (id: string): Promise<UnidadMedida> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  return response.data;
};

export const createUnidadMedida = async (
  data: CreateUnidadMedidaData,
): Promise<UnidadMedida> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateUnidadMedida = async (
  id: string,
  data: UpdateUnidadMedidaData,
): Promise<UnidadMedida> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteUnidadMedida = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};
