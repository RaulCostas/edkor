import api from "./api";
import type { CategoriaServicio } from "../types/categoriaServicio";

const ENDPOINT = "/categoria-servicio";

export const getCategoriasServicio = async (): Promise<CategoriaServicio[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const deleteCategoriaServicio = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const createCategoriaServicio = async (
  categoria: Omit<CategoriaServicio, "id">,
): Promise<CategoriaServicio> => {
  const response = await api.post(ENDPOINT, categoria);
  return response.data;
};

export const updateCategoriaServicio = async (
  id: string,
  categoria: Partial<CategoriaServicio>,
): Promise<CategoriaServicio> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, categoria);
  return response.data;
};
