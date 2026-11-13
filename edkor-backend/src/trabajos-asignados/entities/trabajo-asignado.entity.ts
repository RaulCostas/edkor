import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DetalleOrdenTrabajo } from '../../detalle-orden-trabajo/entities/detalle-orden-trabajo.entity';
import { Personal } from '../../personal/entities/personal.entity';
import { PagoTrabajoAsignado } from '../../pagos-trabajos-asignados/entities/pagos-trabajos-asignado.entity';
import { Planilla } from '../../planillas/entities/planilla.entity';

@Entity('trabajos_asignados')
export class TrabajoAsignado {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'iddetalle_orden_trabajo' })
    iddetalle_orden_trabajo: number;

    @OneToOne(() => DetalleOrdenTrabajo)
    @JoinColumn({ name: 'iddetalle_orden_trabajo' })
    detalle_orden_trabajo: DetalleOrdenTrabajo;

    @Column({ name: 'idpersonal', nullable: true })
    idpersonal: number;

    @ManyToOne(() => Personal)
    @JoinColumn({ name: 'idpersonal' })
    personal: Personal;

    @Column('date')
    fecha_asignado: Date;

    @Column('date', { nullable: true })
    fecha_entrega: Date;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    monto: number;

    @Column('boolean', { default: false })
    cancelado: boolean;

    @ManyToOne(() => PagoTrabajoAsignado, (pago) => pago.trabajos, { nullable: true })
    @JoinColumn({ name: 'idpago_trabajo' })
    pago_trabajo: PagoTrabajoAsignado;

    @Column({ name: 'idplanilla', nullable: true })
    idplanilla: number;

    @ManyToOne(() => Planilla, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'idplanilla' })
    planilla: Planilla;

    @Column('decimal', { precision: 10, scale: 2, default: 0, nullable: true })
    tiempo_estimado: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0, nullable: true })
    costo_arancel: number;

    @Column('int', { nullable: true })
    idusuario: number;
}

