import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Seguro } from '../../seguros/entities/seguro.entity';

@Entity('inspectores')
export class Inspector {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Seguro, { eager: true })
    @JoinColumn({ name: 'seguro_id' })
    seguro: Seguro;

    @Column('text')
    inspector: string;

    @Column('text', { nullable: true })
    celular: string;

    @Column('text', { nullable: true })
    correo: string;

    @Column('text', { default: 'activo' })
    estado: string;
}
