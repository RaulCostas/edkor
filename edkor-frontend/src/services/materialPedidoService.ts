import api from "./api";
import type {
  MaterialPedido,
  CreateMaterialPedidoData,
} from "../types/materialPedido";

const ENDPOINT = "/material-pedido";

export const getMaterialPedidos = async (): Promise<MaterialPedido[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const getMaterialPedido = async (
  id: number,
): Promise<MaterialPedido> => {
  const response = await api.get(`${ENDPOINT}/${id}`);
  return response.data;
};

export const createMaterialPedido = async (
  data: CreateMaterialPedidoData,
): Promise<MaterialPedido> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateMaterialPedido = async (
  id: number,
  data: Partial<CreateMaterialPedidoData>,
): Promise<MaterialPedido> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteMaterialPedido = async (id: number): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};
