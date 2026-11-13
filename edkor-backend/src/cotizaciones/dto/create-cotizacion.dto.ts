import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDetalleCotizacionDto {
    @IsOptional()
    @IsNumber()
    cantidad?: number;

    @IsNumber()
    precio_unitario: number;

    @IsNumber()
    total: number;

    @IsOptional()
    @IsString()
    observaciones?: string;

    @IsOptional()
    idprecio_taller?: any;

    @IsOptional()
    idprecio_seguro?: any;

    @IsOptional()
    @IsString()
    nivel?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    imagenes?: string[];

    @IsOptional()
    @IsString()
    detalle?: string;

    @IsOptional()
    @IsNumber()
    id_inventario?: number;

    @IsOptional()
    @IsNumber()
    idpersonal_mecanico?: number;

    @IsOptional()
    @IsString()
    estado_trabajo?: string;

    @IsOptional()
    @IsNumber()
    tiempo_estimado?: number;

    @IsOptional()
    @IsNumber()
    precio_hora?: number;

    @IsOptional()
    @IsNumber()
    total_costo?: number;

    @IsOptional()
    @IsNumber()
    idusuario?: number;
}

export class CreateCotizacionDto {
    @IsOptional()
    @IsString()
    cliente_nombre?: string;

    @IsOptional()
    @IsString()
    cliente_telefono?: string;

    // Legacy fallbacks
    @IsOptional()
    @IsString()
    cliente?: string;

    @IsOptional()
    @IsString()
    celular?: string;

    @IsOptional()
    @IsNumber()
    idmarca_auto?: number;

    @IsOptional()
    @IsString()
    vehiculo_modelo?: string;

    @IsOptional()
    @IsString()
    modelo?: string;

    @IsOptional()
    @IsString()
    vehiculo_placa?: string;

    @IsOptional()
    @IsString()
    placa?: string;

    @IsOptional()
    @IsString()
    vehiculo_color?: string;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    vehiculo_kilometraje?: string | number;

    @IsOptional()
    km_ingreso?: string | number;

    @IsOptional()
    @IsString()
    vehiculo_chasis?: string;

    @IsOptional()
    @IsString()
    chasis?: string;

    @IsOptional()
    @IsNumber()
    plazo_entrega?: number;

    @IsOptional()
    @IsString()
    moneda?: string;

    @IsOptional()
    @IsNumber()
    sub_total?: number;

    @IsOptional()
    @IsNumber()
    descuento?: number;

    @IsOptional()
    @IsNumber()
    total?: number;

    @IsOptional()
    @IsString()
    observaciones?: string;

    @IsOptional()
    @IsNumber()
    idusuario?: number;

    @IsOptional()
    @IsString()
    estado?: string;

    @IsOptional()
    @IsString()
    motivo_anulacion?: string;

    @IsOptional()
    @IsNumber()
    id_hoja_recepcion?: number;

    @IsOptional()
    @IsNumber()
    id_tipo_orden?: number;

    @IsOptional()
    @IsNumber()
    idseguro?: number;

    @IsOptional()
    @IsNumber()
    idinspector?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateDetalleCotizacionDto)
    detalles?: CreateDetalleCotizacionDto[];
}
