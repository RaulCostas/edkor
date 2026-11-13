import api from "./api";
import type {
  Personal,
  CreatePersonalData,
  UpdatePersonalData,
} from "../types/personal";

const ENDPOINT = "/personal";

export const getPersonal = async (): Promise<Personal[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const deletePersonal = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const createPersonal = async (
  personal: CreatePersonalData,
): Promise<Personal> => {
  const response = await api.post(ENDPOINT, personal);
  return response.data;
};

export const updatePersonal = async (
  id: string,
  personal: UpdatePersonalData,
): Promise<Personal> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, personal);
  return response.data;
};
