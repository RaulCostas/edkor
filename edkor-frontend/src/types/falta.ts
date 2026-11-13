import type { Personal } from "./personal";

export interface Falta {
  id: number;
  personal: Personal;
  personal_id: number;
  fecha: string;
  fecha_fin?: string;
  dias?: number;
  motivo: string;
  observaciones?: string;
}
