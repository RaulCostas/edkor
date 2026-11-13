import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CategoriaServicio } from '../../categoria-servicio/entities/categoria-servicio.entity';

@Entity('precios_taller')
export class PrecioTaller {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => CategoriaServicio, { eager: true })
    @JoinColumn({ name: 'idcategoria_servicio' })
    categoria: CategoriaServicio;

    @Column('text', { nullable: true })
    codigo: string;

    @Column('text')
    detalle: string;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    precio: number;

    @Column('decimal', { precision: 10, scale: 2, default: 0 })
    tiempo_estimado: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    precio_hora: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0, nullable: true })
    total_costo: number;

    @Column({ type: 'json', nullable: true })
    items: { detalle: string; precio: number }[];

    @Column({ type: 'json', nullable: true })
    revisiones: string[];

    @Column('text', { default: 'activo' })
    estado: string;
}
