import type { CategoriaServicio } from "./categoriaServicio";

export interface ItemPrecioTaller {
  detalle: string;
  precio: number;
}

export interface PrecioTaller {
  id: string;
  codigo?: string;
  categoria?: CategoriaServicio;
  detalle: string;
  precio: number;
  tiempo_estimado: number;
  precio_hora: number;
  total_costo?: number;
  items?: (ItemPrecioTaller | string)[];
  revisiones?: string[];
  moneda?: string;
  estado: string;
}

export interface CreatePrecioTallerData {
  codigo?: string;
  idcategoria_servicio: string;
  detalle: string;
  precio: number;
  tiempo_estimado: number;
  precio_hora: number;
  total_costo?: number;
  items?: ItemPrecioTaller[];
  revisiones?: string[];
  estado: string;
}
