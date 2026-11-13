import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('comision_tarjeta')
export class ComisionTarjeta {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    red_banco: string;

    @Column('decimal', { precision: 10, scale: 2 })
    comision: number;

    @Column('text', { default: 'activo' })
    estado: string;
}
