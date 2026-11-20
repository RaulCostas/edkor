import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Personal } from '../../personal/entities/personal.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    name: string;

    @Column('text', { unique: true })
    email: string;

    @Column('text', { select: false })
    password?: string;

    @Column('text', { nullable: true, select: false })
    foto?: string;

    @Column('text', { default: 'activo' })
    estado: string;

    @ManyToOne(() => Role, { eager: true, nullable: true })
    @JoinColumn({ name: 'rol_id' })
    rol?: Role;

    @ManyToOne(() => Personal, { eager: true, nullable: true })
    @JoinColumn({ name: 'personal_id' })
    personal?: Personal;

    @Column('int', { nullable: true })
    personal_id?: number;

    @ManyToOne(() => Sucursal, { eager: true, nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal?: Sucursal;

    @Column('int', { nullable: true })
    sucursal_id?: number;
}
