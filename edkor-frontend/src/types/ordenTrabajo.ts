import type { MarcaAuto } from "./marcaAuto";
import type { User } from "./user";

export interface OrdenTrabajo {
  id: number;
  id_hoja_recepcion?: number;
  hoja_recepcion?: {
    id: number;
    nro?: number;
    placa?: string;
    cliente?: string;
    idseguro?: number;
    seguro?: { id: number; seguro: string };
    idinspector?: number;
    inspector?: { id: number; inspector: string; seguro_id?: number };
    tipo_orden?: {
      id: number;
      tipo_orden: string;
    };
  };
  id_cotizacion?: number;
  id_tipo_orden?: number;
  tipo_orden?: {
    id: number;
    tipo_orden: string;
  };
  idseguro?: number;
  seguro?: { id: number; seguro: string };
  idinspector?: number;
  inspector?: { id: number; inspector: string; seguro_id?: number };
  fecha_registro: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  idmarca_auto?: number;
  marca_auto?: MarcaAuto;
  vehiculo_marca?: string;
  vehiculo_modelo: string;
  vehiculo_placa: string;
  vehiculo_color?: string;
  vehiculo_kilometraje?: string | number;
  vehiculo_chasis?: string;
  plazo_entrega?: number;
  moneda: string;
  sub_total: number;
  descuento: number;
  total: number;
  total_pagado?: number;
  saldo?: number;
  facturado?: boolean;
  nro_factura?: string;
  fecha_facturado?: string;
  fecha_cancelado?: string;
  fecha_terminado?: string;
  fecha_entrega?: string;
  observaciones?: string;
  cancelado: boolean;
  usuario?: User;
  estado: string;
  motivo_anulacion?: string;

  // Alias de compatibilidad (hidratados por @AfterLoad en el backend)
  cliente: string;
  celular?: string;
  modelo: string;
  placa: string;
  color?: string;
  chasis?: string;
  km_ingreso?: number | string;
}

export interface CreateOrdenTrabajoData {
  id_hoja_recepcion?: number;
  id_cotizacion?: number;
  id_tipo_orden?: number;
  idseguro?: number;
  idinspector?: number;
  fecha_recepcion?: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  idmarca_auto: number;
  vehiculo_marca?: string;
  vehiculo_modelo: string;
  vehiculo_placa: string;
  vehiculo_color?: string;
  vehiculo_kilometraje?: string | number;
  vehiculo_chasis?: string;
  plazo_entrega?: number;
  moneda: string;
  sub_total: number;
  descuento: number;
  total: number;
  total_pagado?: number;
  saldo?: number;
  facturado?: boolean;
  nro_factura?: string;
  fecha_facturado?: string;
  fecha_cancelado?: string;
  fecha_terminado?: string;
  fecha_entrega?: string;
  observaciones?: string;
  cancelado: boolean;
  idusuario: string | number;
  estado: string;
  motivo_anulacion?: string;
  detalles?: any[];
}

