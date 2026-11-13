import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    nombre: string;

    @Column('json', { nullable: true })
    permisos: any;

    @Column('text', { default: 'activo' })
    estado: string;
}
