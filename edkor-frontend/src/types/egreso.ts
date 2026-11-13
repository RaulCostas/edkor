import type { FormaPago } from "./formaPago";

export interface Egreso {
  id: number;
  fecha: string;
  detalle: string;
  monto: number;
  moneda: "Bolivianos" | "Dólares";
  formaPago: FormaPago;
  forma_pago_id?: string;
  imagen?: string;
  idorden_trabajo?: number | null;
  ordenTrabajo?: {
    id: number;
    vehiculo_placa?: string;
    placa?: string;
    cliente_nombre?: string;
    vehiculo_modelo?: string;
  } | null;
}

export interface CreateEgresoData {
  fecha: string;
  detalle: string;
  monto: number | string;
  moneda: string;
  formaPagoId: string;
  imagen?: string;
  idorden_trabajo?: number | string;
}
