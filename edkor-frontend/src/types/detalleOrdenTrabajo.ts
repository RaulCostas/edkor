import type { OrdenTrabajo } from "./ordenTrabajo";
import type { PrecioTaller } from "./precioTaller";
import type { PrecioSeguro } from "./precioSeguro";
import type { Inventario } from "./inventario";
import type { Personal } from "./personal";

export interface DetalleOrdenTrabajo {
  id: number;
  orden_trabajo?: OrdenTrabajo;
  precio_taller?: PrecioTaller;
  precio_seguro?: PrecioSeguro;
  id_inventario?: number;
  inventario?: Inventario;
  idpersonal_mecanico?: string;
  personal_mecanico?: Personal;
  estado_trabajo?: 'confirmado' | 'descartado' | 'pendiente' | string;
  tiempo_estimado?: string;
  precio_hora?: number;
  total_costo?: number;
  costo_tercero?: number;
  cantidad: number;
  precio_unitario: number;
  total: number;
  nivel?: string;
  detalle?: string;
  observaciones?: string;
  imagenes?: string[];
  seguimiento?: any;
  trabajo_asignado?: {
    id: number;
    cancelado: boolean;
    idplanilla?: number;
    idpago_trabajo?: number;
    planilla?: { id: number; mes: number; anio: number };
  };
  idusuario?: number;
}

export interface CreateDetalleOrdenTrabajoData {
  idorden_trabajo: number;
  idprecio_taller?: string;
  idprecio_seguro?: string;
  id_inventario?: number;
  idpersonal_mecanico?: string;
  estado_trabajo?: string;
  tiempo_estimado?: string;
  precio_hora?: number;
  total_costo?: number;
  costo_tercero?: number;
  cantidad: number;
  precio_unitario: number;
  total: number;
  nivel?: string;
  detalle?: string;
  observaciones?: string;
  imagenes?: string[];
  idusuario?: number;
  origen?: "ot" | "almacen";
  usuario_nombre?: string;
}

