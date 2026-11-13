import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Personal } from '../../personal/entities/personal.entity';
import { User } from '../../users/entities/user.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('anticipos')
export class Anticipo {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Personal, { eager: true })
    @JoinColumn({ name: 'personal_id' })
    personal: Personal;

    @Column()
    personal_id: number;

    @Column('date')
    fecha: string;

    @Column('decimal', { precision: 10, scale: 2 })
    monto: number;

    @Column('text')
    motivo: string;

    @Column('text', { default: 'Pendiente' })
    estado: string; // Pendiente, Aprobado, Pagado, Descontado

    @Column({ nullable: true })
    mes_aplicacion: string; // YYYY-MM

    @ManyToOne(() => User, { eager: true })
    @JoinColumn({ name: 'usuario_id' })
    usuario: User;

    @Column({ nullable: true })
    usuario_id: number;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;
}
