import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Personal } from '../../personal/entities/personal.entity';
import { TrabajoAsignado } from '../../trabajos-asignados/entities/trabajo-asignado.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
import { FormaPago } from '../../forma-pago/entities/forma-pago.entity';

@Entity('pagos_trabajos_asignados')
export class PagoTrabajoAsignado {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn({ type: 'timestamp' })
    fecha_pago: Date;

    @Column('text', { nullable: true })
    detalle: string;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    sub_total: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    descuento: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    total: number;

    @ManyToOne(() => Personal, { eager: true })
    @JoinColumn({ name: 'idpersonal' })
    personal: Personal;

    @Column('int')
    idpersonal: number;

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'idusuario' })
    usuario: User;

    @Column('int', { nullable: true }) // nullable as sometimes user might not be strictly required or legacy data
    idusuario: number;

    @ManyToOne(() => FormaPago, { eager: true, nullable: true })
    @JoinColumn({ name: 'id_forma_pago' })
    forma_pago: FormaPago;

    @Column('int', { nullable: true })
    id_forma_pago: number;

    @OneToMany(() => TrabajoAsignado, (trabajo) => trabajo.pago_trabajo)
    trabajos: TrabajoAsignado[];

    @Column('text', { default: 'activo' })
    estado: string;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;
}
