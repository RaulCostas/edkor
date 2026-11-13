import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('unidad_medida')
export class UnidadMedida {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    medida: string;

    @Column('text', { default: 'activo' })
    estado: string;
}
