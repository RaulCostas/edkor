import api from "./api";

export interface TrabajoAsignado {
  id: number;
  iddetalle_orden_trabajo: number;
  detalle_orden_trabajo: any;
  idpersonal: number;
  personal: any;
  fecha_asignado: string;
  fecha_entrega?: string;
  tiempo_estimado?: string;
  costo_arancel?: number;
  monto: number;
  cancelado: boolean;
  idusuario?: number;
  idplanilla?: number;
  planilla?: {
    id: number;
    mes: number;
    anio: number;
    total_planilla?: number;
    estado?: string;
  };
  pago_trabajo?: {
    id?: number;
    fecha_pago: string;
    id_forma_pago?: number;
    forma_pago?: {
      id?: number;
      forma_pago?: string;
    };
  };
}

export interface FilterTrabajoAsignado {
  personalId?: number;
  fechaInicio?: string;
  fechaFin?: string;
  terminado?: string; // 'true' | 'false'
  ordenEstado?: string;
  soloMecanicos?: boolean | string;
}

export const getTrabajosAsignadosFilter = async (
  filters: FilterTrabajoAsignado,
): Promise<TrabajoAsignado[]> => {
  const params = new URLSearchParams();
  if (filters.personalId)
    params.append("personalId", filters.personalId.toString());
  if (filters.fechaInicio) params.append("fechaInicio", filters.fechaInicio);
  if (filters.fechaFin) params.append("fechaFin", filters.fechaFin);
  if (filters.terminado) params.append("terminado", filters.terminado);
  if (filters.ordenEstado) params.append("ordenEstado", filters.ordenEstado);
  if (filters.soloMecanicos !== undefined)
    params.append("soloMecanicos", String(filters.soloMecanicos));

  const response = await api.get<TrabajoAsignado[]>(
    `/trabajos-asignados/filter?${params.toString()}`,
  );
  return response.data;
};

export const updateTrabajoAsignado = async (
  id: number,
  data: Partial<TrabajoAsignado>,
): Promise<TrabajoAsignado> => {
  const response = await api.patch<TrabajoAsignado>(
    `/trabajos-asignados/${id}`,
    data,
  );
  return response.data;
};

