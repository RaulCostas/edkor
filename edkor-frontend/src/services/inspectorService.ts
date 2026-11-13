import api from "./api";
import type {
  Inspector,
  CreateInspectorData,
  UpdateInspectorData,
} from "../types/inspector";

const ENDPOINT = "/inspectores";

export const getInspectores = async (): Promise<Inspector[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const deleteInspector = async (id: string): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const createInspector = async (
  inspector: CreateInspectorData,
): Promise<Inspector> => {
  const response = await api.post(ENDPOINT, inspector);
  return response.data;
};

export const updateInspector = async (
  id: string,
  inspector: UpdateInspectorData,
): Promise<Inspector> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, inspector);
  return response.data;
};
