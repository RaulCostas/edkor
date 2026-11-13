import { IsNotEmpty, IsNumber, IsString, IsOptional, IsIn } from 'class-validator';

export class CreatePagoOrdenDto {
    @IsNotEmpty()
    @IsNumber()
    idorden_trabajo: number;

    @IsNotEmpty()
    fecha: Date;

    @IsNotEmpty()
    @IsNumber()
    monto: number;

    @IsNotEmpty()
    @IsString()
    @IsIn(['Bolivianos', 'Dólares'])
    moneda: string;

    @IsOptional()
    @IsNumber()
    tc?: number;

    @IsOptional()
    @IsString()
    factura?: string;

    @IsOptional()
    @IsString()
    recibo?: string;

    @IsNotEmpty()
    @IsNumber()
    idforma_pago: number;

    @IsOptional()
    @IsString()
    observacion?: string;

    @IsOptional()
    @IsString()
    comprobante?: string;

    @IsNotEmpty()
    @IsNumber()
    idusers: number;

    @IsOptional()
    @IsNumber()
    idcomision_tarjeta?: number;

    @IsOptional()
    @IsNumber()
    monto_comision?: number;
}
