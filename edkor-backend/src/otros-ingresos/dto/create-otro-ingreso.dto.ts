import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreateOtroIngresoDto {
  @IsOptional()
  @IsNumber()
  nro?: number;

  @IsOptional()
  @IsString()
  fecha?: string;

  @IsString()
  motivo: string;

  @IsOptional()
  @IsString()
  tipo_ingreso?: string;

  @IsNumber()
  monto: number;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @IsString()
  cliente?: string;

  @IsOptional()
  @IsString()
  telefono_cliente?: string;

  @IsOptional()
  @IsString()
  placa?: string;

  @IsOptional()
  @IsString()
  comprobante?: string;

  @IsOptional()
  @IsNumber()
  asesor_id?: number;

  @IsOptional()
  @IsNumber()
  forma_pago_id?: number;

  @IsOptional()
  @IsNumber()
  sucursal_id?: number;

  @IsOptional()
  @IsNumber()
  idinventario?: number;

  @IsOptional()
  @IsNumber()
  cantidad?: number;

  @IsOptional()
  @IsBoolean()
  descontar_stock?: boolean;

  @IsOptional()
  @IsNumber()
  idusuario?: number;

  @IsOptional()
  @IsString()
  estado?: string;
}
