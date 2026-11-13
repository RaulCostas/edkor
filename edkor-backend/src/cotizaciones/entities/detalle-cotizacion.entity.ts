import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Cotizacion } from './cotizacion.entity';
import { PrecioTaller } from '../../precios-taller/entities/precio-taller.entity';
import { PrecioSeguro } from '../../precios-seguros/entities/precio-seguro.entity';
import { Inventario } from '../../inventario/entities/inventario.entity';
import { Personal } from '../../personal/entities/personal.entity';
import { User } from '../../users/entities/user.entity';

@Entity('detalle_cotizacion')
export class DetalleCotizacion {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Cotizacion, (cotizacion) => cotizacion.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'idcotizacion' })
    cotizacion: Cotizacion;

    @Column('int', { nullable: true })
    idcotizacion: number;

    @ManyToOne(() => PrecioTaller, { eager: true, nullable: true })
    @JoinColumn({ name: 'idprecio_taller' })
    precio_taller: PrecioTaller;

    @Column('int', { nullable: true })
    idprecio_taller: number;

    @ManyToOne(() => PrecioSeguro, { eager: true, nullable: true })
    @JoinColumn({ name: 'idprecio_seguro' })
    precio_seguro: PrecioSeguro;

    @Column('int', { nullable: true })
    idprecio_seguro: number;

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

    @Column('int', { default: 1 })
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

    @ManyToOne(() => User, { eager: true, nullable: true })
    @JoinColumn({ name: 'idusuario' })
    usuario: User;

    @Column('int', { nullable: true })
    idusuario: number;
}
