import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('grupo_inventario')
export class GrupoInventario {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    grupo: string;

    @Column('text', { default: 'activo' })
    estado: string;
}
