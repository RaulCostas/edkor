import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, CreateDateColumn, AfterLoad } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { DetalleCotizacion } from './detalle-cotizacion.entity';
import { MarcaAuto } from '../../marca-auto/entities/marca-auto.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
import { HojaRecepcion } from '../../hoja-recepcion/entities/hoja-recepcion.entity';
import { TipoOrden } from '../../tipo-orden/entities/tipo-orden.entity';
import { Seguro } from '../../seguros/entities/seguro.entity';
import { Inspector } from '../../inspectores/entities/inspector.entity';

@Entity('cotizaciones')
export class Cotizacion {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    fecha_registro: Date;

    @Column('text', { nullable: true })
    cliente_nombre: string;

    @Column('text', { nullable: true })
    cliente_telefono: string;

    @ManyToOne(() => MarcaAuto, { eager: true, nullable: true })
    @JoinColumn({ name: 'idmarca_auto' })
    marca_auto: MarcaAuto;

    @Column('int', { nullable: true })
    idmarca_auto: number;

    @Column('text', { nullable: true })
    vehiculo_modelo: string;

    @Column('text', { nullable: true })
    vehiculo_placa: string;

    @Column('text', { nullable: true })
    vehiculo_color: string;

    @Column('text', { nullable: true })
    vehiculo_kilometraje: string;

    @Column('text', { nullable: true })
    vehiculo_chasis: string;

    @Column('int', { nullable: true })
    plazo_entrega: number;

    @Column('text', { default: 'Bolivianos' })
    moneda: string; // 'Bolivianos' | 'Dólares'

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    sub_total: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    descuento: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    total: number;

    @Column('text', { nullable: true })
    observaciones: string;

    @ManyToOne(() => User, { eager: true, nullable: true })
    @JoinColumn({ name: 'idusuario' })
    usuario: User;

    @Column('int', { nullable: true })
    idusuario: number;

    @Column('text', { default: 'activo' })
    estado: string;

    @Column('text', { nullable: true })
    motivo_anulacion: string;

    @Column({ nullable: true })
    id_hoja_recepcion: number;

    @ManyToOne(() => HojaRecepcion, { eager: true, nullable: true })
    @JoinColumn({ name: 'id_hoja_recepcion' })
    hoja_recepcion: HojaRecepcion;

    @ManyToOne(() => TipoOrden, { eager: true, nullable: true })
    @JoinColumn({ name: 'id_tipo_orden' })
    tipo_orden: TipoOrden;

    @Column('int', { nullable: true })
    id_tipo_orden: number;

    @ManyToOne(() => Seguro, { eager: true, nullable: true })
    @JoinColumn({ name: 'idseguro' })
    seguro: Seguro;

    @Column('int', { nullable: true })
    idseguro: number;

    @ManyToOne(() => Inspector, { eager: true, nullable: true })
    @JoinColumn({ name: 'idinspector' })
    inspector: Inspector;

    @Column('int', { nullable: true })
    idinspector: number;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;

    @Column('int', { nullable: true })
    sucursal_id: number;

    @OneToMany(() => DetalleCotizacion, (detalle) => detalle.cotizacion, { cascade: true })
    detalles: DetalleCotizacion[];

    @AfterLoad()
    populateLegacyAliases() {
        (this as any).vehiculo_marca = this.marca_auto?.marca || this.hoja_recepcion?.marca_auto?.marca || '';
        (this as any).cliente = this.cliente_nombre;
        (this as any).celular = this.cliente_telefono;
        (this as any).modelo = this.vehiculo_modelo;
        (this as any).placa = this.vehiculo_placa;
        (this as any).color = this.vehiculo_color;
        (this as any).chasis = this.vehiculo_chasis;
        (this as any).km_ingreso = this.vehiculo_kilometraje;
        (this as any).nro_hoja = this.hoja_recepcion?.nro || this.id_hoja_recepcion;
        (this as any).particular_seguro = this.tipo_orden?.tipo_orden || this.hoja_recepcion?.tipo_orden?.tipo_orden || 'Particular';
    }
}
