import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Inventario } from './inventario.entity';

@Entity('inventario_lotes')
export class InventarioLote {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Inventario, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'idinventario' })
    inventario: Inventario;

    @Column('int')
    idinventario: number;

    @Column('int', { nullable: true })
    idmaterial_pedido: number | null;

    @Column('int', { nullable: true })
    iddetalle_material_pedido: number | null;

    @CreateDateColumn({ type: 'timestamp' })
    fecha_ingreso: Date;

    @Column('varchar', { length: 100, nullable: true })
    nro_lote: string | null;

    @Column('float')
    cantidad_inicial: number;

    @Column('float')
    cantidad_disponible: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    costo_unitario: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    precio_venta_sugerido: number;

    @Column('varchar', { length: 50, default: 'activo' })
    estado: string; // 'activo', 'agotado', 'anulado'

    @Column('text', { nullable: true })
    observaciones: string | null;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
