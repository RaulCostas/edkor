import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { OrdenTrabajo } from '../../ordenes-trabajo/entities/orden-trabajo.entity';
import { PrecioTaller } from '../../precios-taller/entities/precio-taller.entity';
import { PrecioSeguro } from '../../precios-seguros/entities/precio-seguro.entity';
import { SeguimientoRepuesto } from '../../seguimiento-repuesto/entities/seguimiento-repuesto.entity';
import { Inventario } from '../../inventario/entities/inventario.entity';
import { Personal } from '../../personal/entities/personal.entity';
import { TrabajoAsignado } from '../../trabajos-asignados/entities/trabajo-asignado.entity';

@Entity('detalle_orden_trabajo')
export class DetalleOrdenTrabajo {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => OrdenTrabajo, { eager: true })
    @JoinColumn({ name: 'idorden_trabajo' })
    orden_trabajo: OrdenTrabajo;

    @ManyToOne(() => PrecioTaller, { eager: true, nullable: true })
    @JoinColumn({ name: 'idprecio_taller' })
    precio_taller: PrecioTaller;

    @ManyToOne(() => PrecioSeguro, { eager: true, nullable: true })
    @JoinColumn({ name: 'idprecio_seguro' })
    precio_seguro: PrecioSeguro;

    @ManyToOne(() => Inventario, { eager: true, nullable: true })
    @JoinColumn({ name: 'id_inventario' })
    inventario: Inventario;

    @Column('int', { nullable: true })
    id_inventario: number;

    @ManyToOne(() => Personal, { eager: true, nullable: true })
    @JoinColumn({ name: 'idpersonal_mecanico' })
    personal_mecanico: Personal;

    @Column('int', { nullable: true })
    idpersonal_mecanico: number;

    @OneToOne(() => SeguimientoRepuesto, (seguimiento) => seguimiento.detalle_orden_trabajo)
    seguimiento: SeguimientoRepuesto;

    @OneToOne(() => TrabajoAsignado, (ta) => ta.detalle_orden_trabajo, { nullable: true })
    trabajo_asignado?: TrabajoAsignado;

    @Column('float', { default: 1 })
    cantidad: number;

    @Column('decimal', { precision: 12, scale: 2 })
    precio_unitario: number;

    @Column('decimal', { precision: 12, scale: 2 })
    total: number;

    @Column('text', { nullable: true })
    nivel: string;

    @Column('text', { nullable: true })
    observaciones: string;

    @Column('json', { nullable: true })
    imagenes: string[];

    @Column('text', { nullable: true })
    detalle: string;

    @Column('text', { default: 'confirmado', nullable: true })
    estado_trabajo: string; // 'confirmado' | 'descartado' | 'pendiente'

    @Column('decimal', { precision: 10, scale: 2, default: 0, nullable: true })
    tiempo_estimado: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0, nullable: true })
    precio_hora: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0, nullable: true })
    total_costo: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0, nullable: true })
    costo_tercero: number;

    @Column('int', { nullable: true })
    idusuario: number;
}
