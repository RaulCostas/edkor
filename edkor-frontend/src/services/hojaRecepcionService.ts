import api from "./api";

export interface FotoVehiculo {
  url: string;
  fecha: string;
}

export interface HojaRecepcion {
  id: number;
  nro: number;
  cliente_nombre: string;
  cliente_telefono: string;
  cliente_fecha_nacimiento?: string;
  idmarca_auto?: number;
  marca_auto?: { id: number; marca: string };
  vehiculo_marca: string;
  vehiculo_modelo: string;
  vehiculo_placa: string;
  vehiculo_color: string;
  vehiculo_kilometraje: string;
  vehiculo_chasis: string;
  checklist_exterior_interior: Record<string, boolean>;
  checklist_accesorios: Record<string, boolean>;
  nivel_combustible: string;
  observaciones: string;
  trabajos_solicitados: string;
  estado: string;
  motivo_anulacion?: string;
  created_at: string;
  tipo_orden_id?: number;
  tipo_orden?: any;
  idseguro?: number;
  seguro?: { id: number; seguro: string };
  idinspector?: number;
  inspector?: { id: number; inspector: string; seguro_id?: number };
  asesor_id?: number;
  asesor?: any;
  jefe_mecanico_id?: number;
  jefe_mecanico?: any;
  mecanico_id?: number;
  mecanico?: any;
  autoriza_pruebas?: boolean;
  fotos?: (string | FotoVehiculo)[];
  accesorios_otros?: string;
  firma_cliente?: string;
  firma_asesor?: string;
  diagrama_vehiculo?: string;
}

export const getHojasRecepcion = async (): Promise<HojaRecepcion[]> => {
  const response = await api.get("/hoja-recepcion");
  return response.data;
};

export const getHojasRecepcionPendientes = async (): Promise<HojaRecepcion[]> => {
  const response = await api.get("/hoja-recepcion/pendientes-orden");
  return response.data;
};

export const getHojaRecepcion = async (id: number): Promise<HojaRecepcion> => {
  const response = await api.get(`/hoja-recepcion/${id}`);
  return response.data;
};

export const createHojaRecepcion = async (data: Partial<HojaRecepcion>) => {
  const response = await api.post("/hoja-recepcion", data);
  return response.data;
};

export const updateHojaRecepcion = async (
  id: number,
  data: Partial<HojaRecepcion>,
) => {
  const response = await api.patch(`/hoja-recepcion/${id}`, data);
  return response.data;
};

export const deleteHojaRecepcion = async (id: number) => {
  const response = await api.delete(`/hoja-recepcion/${id}`);
  return response.data;
};

export const getHojaRecepcionByPlaca = async (placa: string): Promise<any | null> => {
  try {
    const cleanPlaca = (placa || '').trim().toUpperCase();
    if (!cleanPlaca) return null;
    const response = await api.get(`/hoja-recepcion/by-placa/${encodeURIComponent(cleanPlaca)}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching hoja recepcion by placa:', error);
    return null;
  }
};
