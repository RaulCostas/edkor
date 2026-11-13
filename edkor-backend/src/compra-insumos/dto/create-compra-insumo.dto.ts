import { IsString, IsNumber, IsDateString, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export class CreateCompraInsumoDto {
    @IsDateString()
    fecha: string;

    @IsString()
    descripcion: string;

    @IsNumber()
    cantidad: number;

    @IsNumber()
    precio_unitario: number;

    @IsEnum(['Bolivianos', 'Dólares'])
    moneda: string;

    @IsString()
    idproveedor: string;

    @IsString()
    idforma_pago: string;

    @IsString()
    @IsOptional()
    nro_factura?: string;

    @IsString()
    @IsOptional()
    nro_recibo?: string;

    @IsNumber()
    @IsOptional()
    idorden_trabajo?: number;
}
