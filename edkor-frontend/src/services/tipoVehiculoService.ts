import api from "./api";
import type {
  TipoVehiculo,
  CreateTipoVehiculoData,
} from "../types/tipoVehiculo";

const ENDPOINT = "/tipos-vehiculos";

export const getTiposVehiculos = async (): Promise<TipoVehiculo[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const getTipoVehiculo = async (id: number): Promise<TipoVehiculo> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  return response.data;
};

export const createTipoVehiculo = async (
  data: CreateTipoVehiculoData,
): Promise<TipoVehiculo> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateTipoVehiculo = async (
  id: number,
  data: CreateTipoVehiculoData,
): Promise<TipoVehiculo> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteTipoVehiculo = async (id: number): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const reactivateTipoVehiculo = async (id: number): Promise<void> => {
  await api.patch(`${ENDPOINT}/${id}/reactivate`);
};
