import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { FormaPago } from '../../forma-pago/entities/forma-pago.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
import { OrdenTrabajo } from '../../ordenes-trabajo/entities/orden-trabajo.entity';

@Entity('egresos')
export class Egreso {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    fecha: Date;

    @Column()
    detalle: string;

    @Column('decimal', { precision: 12, scale: 2 })
    monto: number;

    @Column()
    moneda: string; // 'Bolivianos' | 'Dólares'

    @Column('text', { nullable: true })
    imagen: string | null;

    @ManyToOne(() => FormaPago, { eager: true })
    @JoinColumn({ name: 'forma_pago_id' })
    formaPago: FormaPago;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;

    @Column({ type: 'int', nullable: true })
    idorden_trabajo: number | null;

    @ManyToOne(() => OrdenTrabajo, { nullable: true, eager: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'idorden_trabajo' })
    ordenTrabajo: OrdenTrabajo | null;
}
