import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePagoPedidoDto {
    @IsNotEmpty()
    @IsNumber() // or IsUUID depending on MaterialPedido ID type, checking next
    idmaterial_pedido: number | string;

    @IsNotEmpty()
    @IsString()
    idusers: string;

    @IsNotEmpty()
    @IsString()
    idforma_pago: string;

    @IsNotEmpty()
    @IsDateString()
    fecha: string;

    @IsOptional()
    @IsString()
    factura?: string;

    @IsOptional()
    @IsString()
    recibo?: string;

    @IsNotEmpty()
    @IsString()
    moneda: string;

    @IsOptional()
    @IsNumber()
    tc?: number;

    @IsOptional()
    @IsString()
    imagen?: string;
}
