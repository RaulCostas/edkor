import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('seguros')
export class Seguro {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    seguro: string;

    @Column('text')
    nit: string;

    @Column('text', { nullable: true })
    direccion: string;

    @Column('text', { nullable: true })
    telefono: string;

    @Column('text', { nullable: true })
    celular: string;

    @Column('text', { nullable: true })
    correo: string;

    @Column('text', { default: 'activo' })
    estado: string;
}
