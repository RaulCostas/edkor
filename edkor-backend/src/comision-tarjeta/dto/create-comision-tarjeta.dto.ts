import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateComisionTarjetaDto {
    @IsNotEmpty()
    @IsString()
    red_banco: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    comision: number;

    @IsOptional()
    @IsString()
    estado?: string;
}
