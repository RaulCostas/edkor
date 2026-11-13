import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class CreateTipoVehiculoDto {
    @IsNotEmpty()
    @IsString()
    tipo: string;

    @IsNotEmpty()
    @IsString()
    @IsIn(['activo', 'inactivo'])
    estado: string;
}
