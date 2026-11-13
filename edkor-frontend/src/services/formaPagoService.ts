import api from "./api";
import type { FormaPago } from "../types/formaPago";

const ENDPOINT = "/forma-pago";

export const getFormasPago = async (): Promise<FormaPago[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const deleteFormaPago = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const createFormaPago = async (
  formaPago: Omit<FormaPago, "id">,
): Promise<FormaPago> => {
  const response = await api.post(ENDPOINT, formaPago);
  return response.data;
};

export const updateFormaPago = async (
  id: string,
  formaPago: Partial<FormaPago>,
): Promise<FormaPago> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, formaPago);
  return response.data;
};
