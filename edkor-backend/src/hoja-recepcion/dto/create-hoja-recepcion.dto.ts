import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class CreateHojaRecepcionDto {
  @IsOptional()
  @IsNumber()
  nro?: number;

  @IsOptional()
  @IsString()
  cliente_nombre?: string;

  @IsOptional()
  @IsString()
  cliente_telefono?: string;

  @IsOptional()
  @IsString()
  cliente_fecha_nacimiento?: string;

  @IsOptional()
  @IsNumber()
  idmarca_auto?: number;

  @IsOptional()
  @IsString()
  vehiculo_marca?: string;

  @IsOptional()
  @IsString()
  vehiculo_modelo?: string;

  @IsOptional()
  @IsString()
  vehiculo_placa?: string;

  @IsOptional()
  @IsString()
  vehiculo_color?: string;

  @IsOptional()
  @IsString()
  vehiculo_kilometraje?: string;

  @IsOptional()
  @IsString()
  vehiculo_chasis?: string;

  @IsOptional()
  @IsObject()
  checklist_exterior_interior?: any;

  @IsOptional()
  @IsObject()
  checklist_accesorios?: any;

  @IsOptional()
  @IsString()
  nivel_combustible?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  trabajos_solicitados?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsNumber()
  sucursal_id?: number;

  @IsOptional()
  @IsNumber()
  tipo_orden_id?: number;

  @IsOptional()
  @IsNumber()
  idseguro?: number;

  @IsOptional()
  @IsNumber()
  idinspector?: number;

  @IsOptional()
  @IsNumber()
  asesor_id?: number;

  @IsOptional()
  @IsNumber()
  jefe_mecanico_id?: number;

  @IsOptional()
  @IsNumber()
  mecanico_id?: number;

  @IsOptional()
  autoriza_pruebas?: boolean;

  @IsOptional()
  fotos?: any;

  @IsOptional()
  @IsString()
  accesorios_otros?: string;

  @IsOptional()
  @IsString()
  firma_cliente?: string;

  @IsOptional()
  @IsString()
  firma_asesor?: string;

  @IsOptional()
  @IsString()
  diagrama_vehiculo?: string;

  @IsOptional()
  @IsNumber()
  idusuario?: number;
}
