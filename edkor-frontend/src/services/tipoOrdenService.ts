import api from "./api";
import type {
  TipoOrden,
  CreateTipoOrdenData,
  UpdateTipoOrdenData,
} from "../types/tipoOrden";

const ENDPOINT = "/tipo-orden";

export const getTiposOrden = async (): Promise<TipoOrden[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const getTiposOrdenEnHojasRecepcion = async (): Promise<TipoOrden[]> => {
  const response = await api.get(`${ENDPOINT}/en-hojas-recepcion`);
  return response.data;
};

export const deleteTipoOrden = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const createTipoOrden = async (
  tipoOrden: CreateTipoOrdenData,
): Promise<TipoOrden> => {
  const response = await api.post(ENDPOINT, tipoOrden);
  return response.data;
};

export const updateTipoOrden = async (
  id: string,
  tipoOrden: UpdateTipoOrdenData,
): Promise<TipoOrden> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, tipoOrden);
  return response.data;
};
