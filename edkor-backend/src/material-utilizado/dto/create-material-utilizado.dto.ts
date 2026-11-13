import { IsNumber, IsDateString, IsPositive, IsString } from 'class-validator';

export class CreateMaterialUtilizadoDto {
    @IsNumber()
    idorden_trabajo: number;

    @IsString()
    personalId: string;

    @IsNumber()
    id_inventario: number;

    @IsDateString()
    fecha: string;

    @IsNumber()
    @IsPositive()
    cantidad: number;

    @IsNumber()
    @IsPositive()
    precio: number;
}
