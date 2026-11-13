import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
    CreateDateColumn,
} from 'typeorm';
import { Inventario } from './inventario.entity';
import { OrdenTrabajo } from '../../ordenes-trabajo/entities/orden-trabajo.entity';

export interface LoteDevolucionSnapshot {
    movimiento_id?: number;
    idlote: number | null;
    cantidad: number;
    costo_unitario: number;
    precio_venta_unitario: number;
}

@Entity('inventario_devoluciones')
export class InventarioDevolucion {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Inventario, { eager: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'idinventario' })
    inventario: Inventario;

    @Column('int')
    idinventario: number;

    @ManyToOne(() => OrdenTrabajo, { eager: true, nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'idorden_trabajo' })
    orden_trabajo: OrdenTrabajo | null;

    @Column('int', { nullable: true })
    idorden_trabajo: number | null;

    @Column('int', { nullable: true })
    iddetalle_orden_trabajo: number | null;

    @Column('int', { nullable: true })
    sucursal_id: number | null;

    @Column('text', { nullable: true })
    detalle_descripcion: string | null;

    @Column('float')
    cantidad: number;

    @Column('json', { nullable: true })
    lotes_snapshot: LoteDevolucionSnapshot[] | null;

    @Column('text', { nullable: true })
    motivo: string | null;

    @Column('varchar', { length: 30, default: 'pendiente' })
    estado: 'pendiente' | 'recibido' | 'rechazado';

    @Column('text', { nullable: true })
    observaciones_asesor: string | null;

    @Column('text', { nullable: true })
    observaciones_almacen: string | null;

    @Column('int', { nullable: true })
    idusuario_solicita: number | null;

    @Column('varchar', { length: 150, nullable: true })
    usuario_solicita_nombre: string | null;

    @Column('int', { nullable: true })
    idusuario_almacen: number | null;

    @Column('varchar', { length: 150, nullable: true })
    usuario_almacen_nombre: string | null;

    @CreateDateColumn({ type: 'timestamp' })
    fecha_solicitud: Date;

    @Column('timestamp', { nullable: true })
    fecha_resolucion: Date | null;
}
