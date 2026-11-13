import api from "./api";
import type { Correo } from "../types/correo";

const ENDPOINT = "/correos";

export interface CreateCorreoData {
  remitente_id: string;
  destinatario_id: string;
  copia_id?: string;
  asunto: string;
  mensaje: string;
}

export const getInbox = async (userId: string): Promise<Correo[]> => {
  const response = await api.get(`${ENDPOINT}/inbox/${userId}`);
  return response.data;
};

export const getSent = async (userId: string): Promise<Correo[]> => {
  const response = await api.get(`${ENDPOINT}/sent/${userId}`);
  return response.data;
};

export const createCorreo = async (data: CreateCorreoData): Promise<Correo> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const markAsRead = async (
  id: number,
  userId: string,
): Promise<Correo> => {
  const response = await api.patch(`${ENDPOINT}/${id}/read`, { userId });
  return response.data;
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  const response = await api.get(`${ENDPOINT}/unread-count/${userId}`);
  return response.data;
};
