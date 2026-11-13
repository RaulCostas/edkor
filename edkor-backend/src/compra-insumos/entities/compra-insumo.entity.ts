import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { FormaPago } from '../../forma-pago/entities/forma-pago.entity';
import { OrdenTrabajo } from '../../ordenes-trabajo/entities/orden-trabajo.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('compra_insumos')
export class CompraInsumo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    fecha: string;

    @Column()
    descripcion: string;

    @Column('float')
    cantidad: number;

    @Column('decimal', { precision: 10, scale: 2 })
    precio_unitario: number;

    @Column('decimal', { precision: 10, scale: 2 })
    total: number;

    @Column({ type: 'enum', enum: ['Bolivianos', 'Dólares'], default: 'Bolivianos' })
    moneda: string;

    @Column({ name: 'nro_factura', nullable: true })
    nro_factura: string;

    @Column({ name: 'nro_recibo', nullable: true })
    nro_recibo: string;

    @Column({ name: 'idorden_trabajo', nullable: true })
    idorden_trabajo: number;

    @ManyToOne(() => OrdenTrabajo, { nullable: true })
    @JoinColumn({ name: 'idorden_trabajo' })
    orden_trabajo: OrdenTrabajo;

    @Column({ nullable: true })
    idproveedor: number;

    @ManyToOne(() => Proveedor, { eager: true })
    @JoinColumn({ name: 'idproveedor' })
    proveedor: Proveedor;

    @Column({ nullable: true })
    idforma_pago: number;

    @ManyToOne(() => FormaPago, { eager: true })
    @JoinColumn({ name: 'idforma_pago' })
    forma_pago: FormaPago;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;
}
