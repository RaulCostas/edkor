import api from "./api";
import type { Sucursal, CreateSucursalData } from "../types/sucursal";

export const getSucursales = async (): Promise<Sucursal[]> => {
  const response = await api.get("/sucursales");
  return response.data;
};

export const getSucursal = async (id: string): Promise<Sucursal> => {
  const response = await api.get(`/sucursales/${id}`);
  return response.data;
};

export const createSucursal = async (
  data: CreateSucursalData,
): Promise<Sucursal> => {
  const response = await api.post("/sucursales", data);
  return response.data;
};

export const updateSucursal = async (
  id: string,
  data: CreateSucursalData,
): Promise<Sucursal> => {
  const response = await api.patch(`/sucursales/${id}`, data);
  return response.data;
};

export const deleteSucursal = async (id: number): Promise<void> => {
  await api.delete(`/sucursales/${id}`);
};

export const reactivateSucursal = async (id: string): Promise<void> => {
  await api.patch(`/sucursales/${id}`, { estado: "activo" });
};
