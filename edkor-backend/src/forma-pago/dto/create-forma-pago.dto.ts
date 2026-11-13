import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFormaPagoDto {
    @IsString()
    @MinLength(1)
    forma_pago: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
