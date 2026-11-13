import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('forma_pago')
export class FormaPago {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    forma_pago: string;

    @Column('text', { default: 'activo' })
    estado: string;
}
