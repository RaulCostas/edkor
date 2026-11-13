import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DetalleOrdenTrabajo } from '../../detalle-orden-trabajo/entities/detalle-orden-trabajo.entity';

@Entity('seguimiento_repuesto')
export class SeguimientoRepuesto {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => DetalleOrdenTrabajo, (detalle) => detalle.seguimiento)
    @JoinColumn({ name: 'id_detalle_orden_trabajo' })
    detalle_orden_trabajo: DetalleOrdenTrabajo;

    @Column('timestamp', { nullable: true })
    fecha_recepcion: Date;

    @Column('text', { nullable: true })
    encargado: string;

    @Column('text', { nullable: true })
    recibido: string;

    @Column('text', { nullable: true })
    entregado: string;
}
