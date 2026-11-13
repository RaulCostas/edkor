import api from "./api";
import type { User } from "../types/user";

const ENDPOINT = "/users";

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const createUser = async (user: Omit<User, "id">): Promise<User> => {
  const response = await api.post(ENDPOINT, user);
  return response.data;
};

export const updateUser = async (
  id: string,
  user: Partial<User>,
): Promise<User> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, user);
  return response.data;
};

export const changeUserPassword = async (
  id: string | number,
  data: { currentPassword: string; newPassword: string },
): Promise<{ success: boolean; message: string }> => {
  const response = await api.patch(`${ENDPOINT}/${id}/change-password`, data);
  return response.data;
};
