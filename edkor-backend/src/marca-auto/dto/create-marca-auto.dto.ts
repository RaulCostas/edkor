import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMarcaAutoDto {
    @IsString()
    @IsNotEmpty()
    marca: string;

    @IsString()
    @IsOptional()
    estado?: string;
}

export class UpdateMarcaAutoDto extends CreateMarcaAutoDto { }
