import api from "./api";
import type {
  MarcaAuto,
  CreateMarcaAutoData,
  UpdateMarcaAutoData,
} from "../types/marcaAuto";

const ENDPOINT = "/marca-auto";

export const getMarcasAuto = async (
  search?: string,
  limit: number = 10,
  offset: number = 0,
): Promise<{ data: MarcaAuto[]; total: number }> => {
  const response = await api.get(ENDPOINT, {
    params: { search, limit, offset },
  });
  return response.data;
};

export const getAllMarcasAuto = async (): Promise<MarcaAuto[]> => {
  const response = await api.get(`${ENDPOINT}/all`);
  return response.data;
};

export const createMarcaAuto = async (
  data: CreateMarcaAutoData,
): Promise<MarcaAuto> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateMarcaAuto = async (
  id: number,
  data: UpdateMarcaAutoData,
): Promise<MarcaAuto> => {
  const response = await api.put(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteMarcaAuto = async (id: number): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const reactivateMarcaAuto = async (id: number): Promise<MarcaAuto> => {
  const response = await api.patch(`${ENDPOINT}/${id}/reactivate`);
  return response.data;
};
