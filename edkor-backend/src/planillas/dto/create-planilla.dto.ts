import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDetallePlanillaDto {
    @IsNumber()
    personal_id: number;

    @IsNumber()
    haber_basico: number;

    @IsNumber()
    dias_trabajados: number;

    @IsNumber()
    faltas: number;

    @IsNumber()
    bonos: number;

    @IsNumber()
    descuentos: number;

    @IsNumber()
    anticipos: number;

    @IsOptional()
    @IsNumber()
    horas_produccion?: number;

    @IsOptional()
    @IsNumber()
    monto_produccion?: number;

    @IsNumber()
    liquido_pagable: number;
}

export class CreatePlanillaDto {
    @IsNumber()
    mes: number;

    @IsNumber()
    anio: number;

    @IsNumber()
    total_planilla: number;

    @IsString()
    estado: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateDetallePlanillaDto)
    detalles: CreateDetallePlanillaDto[];
}
