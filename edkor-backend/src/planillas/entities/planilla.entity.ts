import { Column, Entity, OneToMany, OneToOne, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { DetallePlanilla } from './detalle-planilla.entity';
import { PagoPlanilla } from '../../pagos-planillas/entities/pagos-planilla.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('planillas')
export class Planilla {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    mes: number;

    @Column({ type: 'int' })
    anio: number;

    @Column({ type: 'date', default: () => 'CURRENT_DATE' })
    fecha_generacion: string;

    @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
    total_planilla: number;

    @Column({ type: 'varchar', default: 'BORRADOR' })
    estado: string; // BORRADOR, GENERADO, PAGADO

    @OneToMany(() => DetallePlanilla, (detalle) => detalle.planilla, { cascade: true })
    detalles: DetallePlanilla[];

    @OneToOne(() => PagoPlanilla, (pago) => pago.planilla)
    pago_planilla: PagoPlanilla;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;
}
