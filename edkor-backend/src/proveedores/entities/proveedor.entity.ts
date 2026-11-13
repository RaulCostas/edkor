import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('proveedores')
export class Proveedor {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    proveedor: string;

    @Column('text')
    nit: string;

    @Column('text', { nullable: true })
    direccion: string;

    @Column('text', { nullable: true })
    telefono: string;

    @Column('text', { nullable: true })
    celular: string;

    @Column('text', { nullable: true })
    email: string;

    @Column('text', { nullable: true })
    contacto: string;

    @Column('text', { default: 'activo' })
    estado: string;
}
