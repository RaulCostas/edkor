import { IsNotEmpty, IsString, IsNumber, IsBoolean, IsOptional, IsIn, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateDetalleOrdenTrabajoDto } from '../../detalle-orden-trabajo/dto/create-detalle-orden-trabajo.dto';

export class CreateOrdenTrabajoDto {
    @IsOptional()
    @IsString()
    cliente_nombre?: string;

    @IsOptional()
    @IsString()
    cliente_telefono?: string;

    @IsOptional()
    @IsNumber()
    idmarca_auto?: number;

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
    vehiculo_kilometraje?: string | number;

    @IsOptional()
    @IsString()
    vehiculo_chasis?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    plazo_entrega?: number;

    @IsNotEmpty()
    @IsString()
    @IsIn(['Bolivianos', 'Dólares', 'bolivianos', 'dolares', 'Dolares'])
    moneda: string;

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

    @IsNotEmpty()
    @IsBoolean()
    cancelado: boolean;

    @IsOptional()
    @IsBoolean()
    facturado?: boolean;

    @IsOptional()
    @IsString()
    nro_factura?: string;

    @IsOptional()
    fecha_facturado?: Date | string;

    @IsOptional()
    fecha_cancelado?: Date | string;

    @IsNotEmpty()
    @IsNumber()
    idusuario: number;

    @IsNotEmpty()
    @IsString()
    @IsIn(['activo', 'inactivo', 'pendiente', 'en_proceso', 'terminado', 'entregado', 'entregado_con_saldo', 'entregado_por_pagar', 'anulada', 'anulado', 'cerrada', 'orden_cerrada', 'orden cerrada'])
    estado: string;

    @IsOptional()
    fecha_entrega?: Date | string;

    @IsOptional()
    fecha_terminado?: Date | string;

    @IsOptional()
    @IsString()
    motivo_anulacion?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateDetalleOrdenTrabajoDto)
    detalles?: CreateDetalleOrdenTrabajoDto[];

    @IsOptional()
    @IsNumber()
    id_hoja_recepcion?: number;

    @IsOptional()
    @IsNumber()
    id_cotizacion?: number;

    @IsOptional()
    @IsNumber()
    id_tipo_orden?: number;

    @IsOptional()
    @IsNumber()
    idseguro?: number;

    @IsOptional()
    @IsNumber()
    idinspector?: number;
}
