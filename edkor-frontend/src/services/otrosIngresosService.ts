import api from "./api";
import type {
  OtroIngreso,
  CreateOtroIngresoData,
  UpdateOtroIngresoData,
} from "../types/otroIngreso";

const ENDPOINT = "/otros-ingresos";

export const getOtrosIngresos = async (): Promise<OtroIngreso[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const getOtroIngreso = async (id: number): Promise<OtroIngreso> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  return response.data;
};

export const createOtroIngreso = async (
  data: CreateOtroIngresoData
): Promise<OtroIngreso> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateOtroIngreso = async (
  id: number,
  data: UpdateOtroIngresoData
): Promise<OtroIngreso> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteOtroIngreso = async (id: number): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};
