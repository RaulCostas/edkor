import { IsNumber, IsOptional } from 'class-validator';

export class CreateDetalleMaterialPedidoDto {
    @IsNumber()
    idmaterial_pedido: number;

    @IsNumber()
    idinventario: number;

    @IsNumber()
    cantidad: number;

    @IsNumber()
    precio_unitario: number;

    @IsNumber()
    total: number;

    @IsOptional()
    @IsNumber()
    precio_venta_sugerido?: number;
}

