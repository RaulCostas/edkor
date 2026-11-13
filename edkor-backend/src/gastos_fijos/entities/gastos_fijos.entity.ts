import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
@Entity('gastos_fijos')
export class GastosFijos {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    dia: number;

    @Column({ default: false })
    anual: boolean;

    @Column({ nullable: true })
    mes: string;

    @Column()
    gasto_fijo: string;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column()
    moneda: string; // 'Bolivianos' | 'Dólares'

    @Column({ default: 'activo' })
    estado: string;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;
}
