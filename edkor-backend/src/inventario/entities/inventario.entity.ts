import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { UnidadMedida } from '../../unidad-medida/entities/unidad-medida.entity';
import { GrupoInventario } from '../../grupo-inventario/entities/grupo-inventario.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
import { User } from '../../users/entities/user.entity';

@Entity('inventario')
export class Inventario {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    codigo: string;

    @Column()
    descripcion: string;

    @Column('float')
    cantidad_existente: number;

    @Column('float', { default: 0 })
    stock_inicial: number;

    @Column('float', { default: 0 })
    entradas: number;

    @Column('float', { default: 0 })
    salidas: number;

    @Column('float')
    stock_minimo: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    precio_compra: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    precio_venta: number;

    @Column({ default: 'activo' })
    estado: string;

    @ManyToOne(() => UnidadMedida, { eager: true })
    @JoinColumn({ name: 'idunidad_medida' })
    unidad_medida: UnidadMedida;

    @Column({ nullable: true })
    idunidad_medida: string;

    @ManyToOne(() => GrupoInventario, { eager: true })
    @JoinColumn({ name: 'id_grupo_inventario' })
    grupo_inventario: GrupoInventario;

    @Column({ nullable: true })
    id_grupo_inventario: string;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'idusuario' })
    usuario: User;

    @Column('int', { nullable: true })
    idusuario: number;
}
