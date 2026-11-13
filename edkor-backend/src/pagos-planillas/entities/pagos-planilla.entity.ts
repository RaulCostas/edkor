import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Planilla } from '../../planillas/entities/planilla.entity';
import { FormaPago } from '../../forma-pago/entities/forma-pago.entity';
import { User } from '../../users/entities/user.entity';

@Entity('pago_planillas')
export class PagoPlanilla {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Planilla)
    @JoinColumn({ name: 'planilla_id' })
    planilla: Planilla;

    @ManyToOne(() => FormaPago)
    @JoinColumn({ name: 'idforma_pago' })
    forma_pago: FormaPago;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'iduser' })
    user: User;

    @Column({ type: 'date', default: () => 'CURRENT_DATE' })
    fecha_pago: string;

    @Column({ type: 'decimal', precision: 12, scale: 2 })
    monto: number;

    @Column({ type: 'text', nullable: true })
    observaciones: string;
}
