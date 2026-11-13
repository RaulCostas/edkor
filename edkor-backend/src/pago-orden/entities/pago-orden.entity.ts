import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { OrdenTrabajo } from '../../ordenes-trabajo/entities/orden-trabajo.entity';
import { FormaPago } from '../../forma-pago/entities/forma-pago.entity';
import { User } from '../../users/entities/user.entity';
import { ComisionTarjeta } from '../../comision-tarjeta/entities/comision-tarjeta.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('pago_orden')
export class PagoOrden {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => OrdenTrabajo, { eager: true })
    @JoinColumn({ name: 'idorden_trabajo' })
    orden_trabajo: OrdenTrabajo;

    @Column('int')
    idorden_trabajo: number;

    @Column('date', { nullable: true, default: () => 'CURRENT_DATE' })
    fecha: Date;

    @Column('decimal', { precision: 12, scale: 2 })
    monto: number;

    @Column('text')
    moneda: string; // 'Bolivianos' | 'Dólares'

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    tc: number;

    @Column('text', { nullable: true })
    factura: string;

    @Column('text', { nullable: true })
    recibo: string;

    @ManyToOne(() => FormaPago, { eager: true })
    @JoinColumn({ name: 'idforma_pago' })
    forma_pago: FormaPago;

    @Column('int')
    idforma_pago: number;

    @Column('text', { nullable: true })
    observacion: string;

    @Column('text', { nullable: true })
    comprobante: string;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'idusers' })
    usuario: User;

    @Column('int')
    idusers: number;

    @ManyToOne(() => ComisionTarjeta, { eager: true, nullable: true })
    @JoinColumn({ name: 'idcomision_tarjeta' })
    comision_tarjeta: ComisionTarjeta;

    @Column('int', { nullable: true })
    idcomision_tarjeta: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    monto_comision: number;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;
}
