import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { OrdenTrabajo } from '../../ordenes-trabajo/entities/orden-trabajo.entity';
import { Inventario } from '../../inventario/entities/inventario.entity';
import { Personal } from '../../personal/entities/personal.entity';

@Entity('material_utilizado')
export class MaterialUtilizado {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    idorden_trabajo: number;

    @Column({ type: 'int' })
    id_inventario: number;

    @Column({ type: 'date' })
    fecha: string;

    @Column({ type: 'float' })
    cantidad: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    precio: number;

    // Relationships
    @ManyToOne(() => OrdenTrabajo, { eager: true })
    @JoinColumn({ name: 'idorden_trabajo' })
    orden_trabajo: OrdenTrabajo;

    @ManyToOne(() => Inventario, { eager: true })
    @JoinColumn({ name: 'id_inventario' })
    inventario: Inventario;

    @ManyToOne(() => Personal, { eager: true })
    @JoinColumn({ name: 'idpersonal' })
    personal: Personal;
}
