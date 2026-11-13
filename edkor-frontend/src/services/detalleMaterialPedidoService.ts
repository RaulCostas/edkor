import api from "./api";
import type {
  DetalleMaterialPedido,
  CreateDetalleMaterialPedidoData,
} from "../types/materialPedido";

const ENDPOINT = "/detalle-material-pedido";

export const getDetallesByPedido = async (
  pedidoId: number,
): Promise<DetalleMaterialPedido[]> => {
  const response = await api.get(`${ENDPOINT}/pedido/${pedidoId}`);
  return response.data;
};

export const createDetalleMaterialPedido = async (
  data: CreateDetalleMaterialPedidoData,
): Promise<DetalleMaterialPedido> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updateDetalleMaterialPedido = async (
  id: number,
  data: Partial<CreateDetalleMaterialPedidoData>,
): Promise<DetalleMaterialPedido> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deleteDetalleMaterialPedido = async (
  id: number,
): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};
