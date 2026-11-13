import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAreaPersonalDto {
    @IsString()
    @IsNotEmpty()
    area: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
