import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Planilla } from './planilla.entity';
import { Personal } from '../../personal/entities/personal.entity';

@Entity('detalle_planillas')
export class DetallePlanilla {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Planilla, (planilla) => planilla.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'planilla_id' })
    planilla: Planilla;

    @ManyToOne(() => Personal)
    @JoinColumn({ name: 'personal_id' })
    personal: Personal;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    haber_basico: number;

    @Column({ type: 'int' })
    dias_trabajados: number;

    @Column({ type: 'int' })
    faltas: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    bonos: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    descuentos: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    anticipos: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
    horas_produccion: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
    monto_produccion: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    liquido_pagable: number;
}
