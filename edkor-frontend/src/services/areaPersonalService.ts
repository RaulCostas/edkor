import api from "./api";
import type {
  AreaPersonal,
  CreateAreaPersonalData,
  UpdateAreaPersonalData,
} from "../types/areaPersonal";

const ENDPOINT = "/area-personal";

export const getAreasPersonal = async (): Promise<AreaPersonal[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const deleteAreaPersonal = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const createAreaPersonal = async (
  areaPersonal: CreateAreaPersonalData,
): Promise<AreaPersonal> => {
  const response = await api.post(ENDPOINT, areaPersonal);
  return response.data;
};

export const updateAreaPersonal = async (
  id: string,
  areaPersonal: UpdateAreaPersonalData,
): Promise<AreaPersonal> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, areaPersonal);
  return response.data;
};
