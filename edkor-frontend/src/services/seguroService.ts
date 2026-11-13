import api from "./api";
import type { Seguro } from "../types/seguro";

const ENDPOINT = "/seguros";

export const getSeguros = async (): Promise<Seguro[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const deleteSeguro = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const createSeguro = async (
  seguro: Omit<Seguro, "id">,
): Promise<Seguro> => {
  const response = await api.post(ENDPOINT, seguro);
  return response.data;
};

export const updateSeguro = async (
  id: string,
  seguro: Partial<Seguro>,
): Promise<Seguro> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, seguro);
  return response.data;
};
