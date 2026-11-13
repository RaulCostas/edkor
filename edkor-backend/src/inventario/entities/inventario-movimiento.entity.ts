import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Inventario } from './inventario.entity';
import { InventarioLote } from './inventario-lote.entity';

@Entity('inventario_movimientos')
export class InventarioMovimiento {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Inventario, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'idinventario' })
    inventario: Inventario;

    @Column('int')
    idinventario: number;

    @ManyToOne(() => InventarioLote, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'idlote' })
    lote: InventarioLote;

    @Column('int', { nullable: true })
    idlote: number | null;

    @Column('varchar', { length: 50 })
    tipo_movimiento: string; // 'ENTRADA_COMPRA', 'ENTRADA_INICIAL', 'SALIDA_ORDEN', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'DEVOLUCION_ORDEN'

    @Column('float')
    cantidad: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    costo_unitario: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    precio_venta_unitario: number;

    @Column('int', { nullable: true })
    idorden_trabajo: number | null;

    @Column('int', { nullable: true })
    iddetalle_orden_trabajo: number | null;

    @Column('int', { nullable: true })
    idmaterial_pedido: number | null;

    @CreateDateColumn({ type: 'timestamp' })
    fecha: Date;

    @Column('float', { nullable: true })
    saldo_stock_resultante: number | null;

    @Column('text', { nullable: true })
    observaciones: string | null;

    @Column('int', { nullable: true })
    idusuario: number | null;
}
