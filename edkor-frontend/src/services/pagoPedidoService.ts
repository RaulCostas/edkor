import api from "./api";

const ENDPOINT = "/pago-pedidos";

export interface CreatePagoPedidoData {
  idmaterial_pedido: number | string;
  idusers: string;
  idforma_pago: string;
  fecha: string;
  factura: string;
  recibo: string;
  moneda: string;
  tc?: number;
  imagen?: string;
}

export const createPagoPedido = async (data: CreatePagoPedidoData) => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const getPagoByPedido = async (pedidoId: number) => {
  try {
    const response = await api.get(`${ENDPOINT}/pedido/${pedidoId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

export const getPagoPedidos = async () => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export interface UpdatePagoPedidoData extends Partial<CreatePagoPedidoData> {}

export const updatePagoPedido = async (
  id: number | string,
  data: UpdatePagoPedidoData
) => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deletePagoPedido = async (id: number | string) => {
  const response = await api.delete(`${ENDPOINT}/${id}`);
  return response.data;
};
