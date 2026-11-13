export interface TipoOrden {
  id: string;
  tipo_orden: string;
  estado: string;
}

export interface CreateTipoOrdenData {
  tipo_orden: string;
  estado?: string;
}

export interface UpdateTipoOrdenData extends Partial<CreateTipoOrdenData> {}
