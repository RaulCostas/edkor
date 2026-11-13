import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categoria_servicio')
export class CategoriaServicio {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    categoria_servicio: string;

    @Column('text', { default: 'activo' })
    estado: string;
}
