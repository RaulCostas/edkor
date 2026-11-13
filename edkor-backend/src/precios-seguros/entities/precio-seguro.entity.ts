import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Seguro } from '../../seguros/entities/seguro.entity';
import { CategoriaServicio } from '../../categoria-servicio/entities/categoria-servicio.entity';

@Entity('precios_seguros')
export class PrecioSeguro {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Seguro, { eager: true })
    @JoinColumn({ name: 'idseguro' })
    seguro: Seguro;

    @ManyToOne(() => CategoriaServicio, { eager: true })
    @JoinColumn({ name: 'idcategoria_servicio' })
    categoria: CategoriaServicio;

    @Column('text')
    detalle: string;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    nivel1: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    nivel2: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    nivel3: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    pintado: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    instalacion: number;

    @Column('text', { default: 'activo' })
    estado: string;
}
