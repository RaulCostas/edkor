import api from "./api";
import type {
  CreateGrupoInventarioData,
  GrupoInventario,
  UpdateGrupoInventarioData,
} from "../types/grupoInventario";

const ENDPOINT = "/grupo-inventario";

export const getGruposInventario = async (): Promise<GrupoInventario[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const getGrupoInventario = async (
  id: string,
): Promise<GrupoInventario> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  return response.data;
};

export const createGrupoInventario = async (
  data: CreateGrupoInventarioData,
): Promise<GrupoInventario> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateGrupoInventario = async (
  id: string,
  data: UpdateGrupoInventarioData,
): Promise<GrupoInventario> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteGrupoInventario = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};
