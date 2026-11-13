import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sucursales')
export class Sucursal {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    nombre: string;

    @Column('text')
    direccion: string;

    @Column('text')
    celular: string;

    @Column('text', { default: 'activo' })
    estado: string;
}
