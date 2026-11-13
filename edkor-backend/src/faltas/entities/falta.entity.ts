import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Personal } from '../../personal/entities/personal.entity';
import { User } from '../../users/entities/user.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('faltas')
export class Falta {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Personal, { eager: true })
    @JoinColumn({ name: 'personal_id' })
    personal: Personal;

    @Column()
    personal_id: number;

    @Column('date')
    fecha: string;

    @Column('date', { nullable: true })
    fecha_fin: string;

    @Column({ type: 'int', default: 1 })
    dias: number;

    @Column('text')
    motivo: string;

    @Column('text', { nullable: true })
    observaciones: string;

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
