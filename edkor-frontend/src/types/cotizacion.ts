import type { MarcaAuto } from "./marcaAuto";
import type { User } from "./user";
import type { PrecioTaller } from "./precioTaller";
import type { PrecioSeguro } from "./precioSeguro";
import type { Inventario } from "./inventario";
import type { Personal } from "./personal";

export interface DetalleCotizacion {
  id?: number;
  idcotizacion?: number;
  precio_taller?: PrecioTaller;
  idprecio_taller?: number | string;
  precio_seguro?: PrecioSeguro;
  idprecio_seguro?: number | string;
  id_inventario?: number;
  inventario?: Inventario;
  idpersonal_mecanico?: number | string;
  personal_mecanico?: Personal;
  estado_trabajo?: 'confirmado' | 'descartado' | 'pendiente' | string;
  tiempo_estimado?: string | number;
  precio_hora?: number;
  total_costo?: number;
  cantidad: number;
  precio_unitario: number;
  total: number;
  nivel?: string;
  detalle?: string;
  observaciones?: string;
  imagenes?: string[];
  idusuario?: number;
}

export interface Cotizacion {
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
  observaciones?: string;
  usuario?: User;
  idusuario?: number;
  estado: string;
  motivo_anulacion?: string;
  detalles?: DetalleCotizacion[];

  // Alias de compatibilidad
  cliente?: string;
  celular?: string;
  modelo?: string;
  placa?: string;
  color?: string;
  chasis?: string;
  km_ingreso?: number | string;
}

export interface CreateCotizacionData {
  id_hoja_recepcion?: number;
  id_tipo_orden?: number;
  idseguro?: number;
  idinspector?: number;
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
  observaciones?: string;
  idusuario: string | number;
  estado: string;
  motivo_anulacion?: string;
  detalles?: any[];

  // Alias de compatibilidad
  cliente?: string;
  celular?: string;
  modelo?: string;
  placa?: string;
  color?: string;
  chasis?: string;
  km_ingreso?: number | string;
}

export interface UpdateCotizacionData extends Partial<CreateCotizacionData> {}
