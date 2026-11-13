import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tipos_orden')
export class TipoOrden {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    tipo_orden: string;

    @Column('text', { default: 'activo' })
    estado: string;
}
