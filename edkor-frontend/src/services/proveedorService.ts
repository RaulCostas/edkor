import api from "./api";
import type {
  Proveedor,
  CreateProveedorData,
  UpdateProveedorData,
} from "../types/proveedor";

const ENDPOINT = "/proveedores";

export const getProveedores = async (): Promise<Proveedor[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const deleteProveedor = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const createProveedor = async (
  proveedor: CreateProveedorData,
): Promise<Proveedor> => {
  const response = await api.post(ENDPOINT, proveedor);
  return response.data;
};

export const updateProveedor = async (
  id: string,
  proveedor: UpdateProveedorData,
): Promise<Proveedor> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, proveedor);
  return response.data;
};
