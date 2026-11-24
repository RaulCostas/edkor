import api from "./api";

const ENDPOINT = "/pago-orden";

export interface PagoOrden {
  id: number;
  idorden_trabajo: number;
  fecha: string;
  monto: number;
  moneda: string;
  tc?: number;
  factura?: string;
  recibo?: string;
  idforma_pago: number;
  observacion?: string;
  idusers: number;
  idcomision_tarjeta?: number;
  monto_comision?: number;
  comprobante?: string;
  orden_trabajo?: any;
  forma_pago?: any;
  usuario?: any;
  comision_tarjeta?: any;
}

export interface OrdenConSaldo {
  id: number;
  fecha_registro: string;
  cliente: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
  placa: string;
  vehiculo_placa?: string;
  vehiculo_modelo?: string;
  vehiculo_marca?: string;
  sub_total: number;
  descuento?: number;
  total?: number;
  total_pagado: number;
  saldo: number;
  facturado?: boolean;
  nro_factura?: string;
  fecha_facturado?: string;
  fecha_cancelado?: string;
  pagos: PagoOrden[];
  moneda: string;
  particular_seguro?: string;
  seguro?: { seguro: string };
  hoja_recepcion?: any;
}

export const getOrdenesConSaldo = async (): Promise<OrdenConSaldo[]> => {
  const response = await api.get(`${ENDPOINT}/ordenes-con-saldo`);
  return response.data;
};

export const getPagos = async (): Promise<PagoOrden[]> => {
  const response = await api.get(ENDPOINT);
  return response.data;
};

export const getPagosByOrden = async (
  idorden: number,
): Promise<PagoOrden[]> => {
  const response = await api.get(`${ENDPOINT}/orden/${idorden}`);
  return response.data;
};

export const createPago = async (
  data: Partial<PagoOrden>,
): Promise<PagoOrden> => {
  const response = await api.post(ENDPOINT, data);
  return response.data;
};

export const updatePago = async (
  id: number,
  data: Partial<PagoOrden>,
): Promise<PagoOrden> => {
  const response = await api.patch(`${ENDPOINT}/${id}`, data);
  return response.data;
};

export const deletePago = async (id: number): Promise<void> => {
  await api.delete(`${ENDPOINT}/${id}`);
};

export const getComprobantesList = (comprobante?: string | null): string[] => {
  if (!comprobante || !comprobante.trim()) return [];
  const trimmed = comprobante.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      // fallback
    }
  }
  if (trimmed.includes(",")) {
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [trimmed];
};
