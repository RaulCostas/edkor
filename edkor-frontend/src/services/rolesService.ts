import api from "./api";

export interface Role {
  id: number;
  nombre: string;
  permisos: any;
  estado: string;
}

export interface CreateRoleData {
  nombre: string;
  permisos?: any;
  estado?: string;
}

export const getRoles = async (): Promise<Role[]> => {
  const response = await api.get("/roles");
  return response.data;
};

export const getRole = async (id: number): Promise<Role> => {
  const response = await api.get(`/roles/${id}`);
  return response.data;
};

export const createRole = async (data: CreateRoleData) => {
  const response = await api.post("/roles", data);
  return response.data;
};

export const updateRole = async (id: number, data: Partial<CreateRoleData>) => {
  const response = await api.patch(`/roles/${id}`, data);
  return response.data;
};

export const deleteRole = async (id: number) => {
  const response = await api.delete(`/roles/${id}`);
  return response.data;
};
