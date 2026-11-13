import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import { Proveedor } from '../../proveedores/entities/proveedor.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('material_pedido')
export class MaterialPedido {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Proveedor, { eager: true })
    @JoinColumn({ name: 'idproveedor' })
    proveedor: Proveedor;

    @Column('int', { nullable: true })
    idproveedor: number;

    @Column('date')
    fecha: Date;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    sub_total: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    descuento: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    total: number;

    @Column('text', { nullable: true })
    observaciones: string;

    @Column('boolean', { default: false })
    pagado: boolean;

    @Column('text', { default: 'activo' })
    estado: string;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;

    @Column('int', { nullable: true })
    idusuario: number;

    @Column('int', { nullable: true })
    idorden_trabajo: number;
}

