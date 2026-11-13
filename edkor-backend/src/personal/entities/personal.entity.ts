import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AreaPersonal } from '../../area-personal/entities/area-personal.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('personal')
export class Personal {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    nombre: string;

    @Column('text')
    paterno: string;

    @Column('text')
    materno: string;

    @Column('text')
    ci: string;

    @Column('date', { nullable: true })
    fecha_nacimiento: string;

    @Column('text', { nullable: true })
    direccion: string;

    @Column('text', { nullable: true })
    telefono: string;

    @Column('text', { nullable: true })
    celular: string;

    @Column('text', { nullable: true })
    ci_anverso: string;

    @Column('text', { nullable: true })
    ci_reverso: string;

    @Column('text')
    tipo: string; // Planta | Contratista

    @ManyToOne(() => AreaPersonal, { eager: true })
    @JoinColumn({ name: 'area_id' })
    area: AreaPersonal;

    @Column('date', { nullable: true })
    fecha_ingreso: string;

    @Column('decimal', { nullable: true })
    salario: number;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    precio_hora: number;

    @Column('text', { default: 'activo' })
    estado: string;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;
}
