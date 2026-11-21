import type { Inventario } from "./inventario";

export interface OtroIngreso {
  id: number;
  nro: number;
  fecha: string;
  motivo: string;
  tipo_ingreso: string; // 'Venta de Insumo' | 'Auxilio Mecánico' | 'Servicio Rápido' | 'Otro'
  monto: number;
  moneda: string; // 'Bolivianos' | 'Dólares'
  observacion?: string;
  cliente?: string;
  telefono_cliente?: string;
  placa?: string;
  comprobante?: string;
  asesor_id?: number;
  asesor?: {
    id: number;
    nombre: string;
    paterno?: string;
    materno?: string;
    celular?: string;
    telefono?: string;
  };
  forma_pago_id?: number;
  forma_pago?: {
    id: number;
    forma_pago: string;
  };
  sucursal_id?: number;
  sucursal?: {
    id: number;
    nombre: string;
  };
  idinventario?: number;
  inventario?: Inventario;
  cantidad?: number;
  descontar_stock?: boolean;
  idusuario?: number;
  usuario?: {
    id: number;
    username: string;
    nombre?: string;
  };
  estado?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateOtroIngresoData {
  fecha?: string;
  motivo: string;
  tipo_ingreso?: string;
  monto: number;
  moneda?: string;
  observacion?: string;
  cliente?: string;
  telefono_cliente?: string;
  placa?: string;
  comprobante?: string;
  asesor_id?: number;
  forma_pago_id?: number;
  sucursal_id?: number;
  idinventario?: number;
  cantidad?: number;
  descontar_stock?: boolean;
}

export type UpdateOtroIngresoData = Partial<CreateOtroIngresoData>;
