import type { UnidadMedida } from "./unidadMedida";
import type { GrupoInventario } from "./grupoInventario";

export interface Inventario {
  id: number;
  codigo?: string;
  descripcion: string;
  stock_inicial?: number;
  entradas?: number;
  salidas?: number;
  cantidad_existente: number;
  stock_minimo: number;
  precio_compra?: number;
  precio_venta?: number;
  estado: string;
  idunidad_medida: string; // Foreign key
  unidad_medida?: UnidadMedida; // Relation
  id_grupo_inventario: string; // Foreign key
  grupo_inventario?: GrupoInventario; // Relation
  idusuario?: number;
}

export interface InventarioLote {
  id: number;
  idinventario: number;
  idmaterial_pedido?: number;
  iddetalle_material_pedido?: number;
  fecha_ingreso: string;
  nro_lote?: string;
  cantidad_inicial: number;
  cantidad_disponible: number;
  costo_unitario: number;
  precio_venta_sugerido: number;
  estado: string; // 'activo' | 'agotado' | 'anulado'
  observaciones?: string;
  created_at: string;
  proveedor?: string;
  material_pedido_codigo?: string;
  consumos?: Array<{
    idorden: number;
    iddetalle: number;
    placa?: string;
    cliente?: string;
    fecha?: string;
    cantidad: number;
    precio_venta: number;
  }>;
}

export interface InventarioConsumoOrden {
  idmovimiento: number;
  idorden: number;
  iddetalle: number;
  placa?: string;
  cliente?: string;
  fecha: string;
  cantidad: number;
  costo_unitario: number;
  precio_venta_unitario: number;
  idlote?: number;
  nro_lote?: string;
}

export interface InventarioMovimiento {
  id: number;
  idinventario: number;
  idlote?: number;
  tipo_movimiento: string;
  cantidad: number;
  costo_unitario: number;
  precio_venta_unitario: number;
  idorden_trabajo?: number;
  iddetalle_orden_trabajo?: number;
  idmaterial_pedido?: number;
  fecha: string;
  saldo_stock_resultante?: number;
  observaciones?: string;
  idusuario?: number;
}

export interface KardexData {
  inventario: Inventario;
  lotes: InventarioLote[];
  consumos_ordenes: InventarioConsumoOrden[];
  movimientos: InventarioMovimiento[];
}

export type CreateInventarioData = Omit<
  Inventario,
  "id" | "unidad_medida" | "grupo_inventario"
>;
export type UpdateInventarioData = Partial<CreateInventarioData>;

