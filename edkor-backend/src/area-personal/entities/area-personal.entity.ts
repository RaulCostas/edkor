import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('areas_personal')
export class AreaPersonal {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    area: string;

    @Column('text', { default: 'activo' })
    estado: string;
}
