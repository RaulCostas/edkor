import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn, AfterLoad } from 'typeorm';
import { MarcaAuto } from '../../marca-auto/entities/marca-auto.entity';
import { User } from '../../users/entities/user.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
import { HojaRecepcion } from '../../hoja-recepcion/entities/hoja-recepcion.entity';
import { TipoOrden } from '../../tipo-orden/entities/tipo-orden.entity';
import { Seguro } from '../../seguros/entities/seguro.entity';
import { Inspector } from '../../inspectores/entities/inspector.entity';

@Entity('ordenes_trabajo')
export class OrdenTrabajo {
    @PrimaryGeneratedColumn()
    id: number;

    @CreateDateColumn()
    fecha_registro: Date;

    @Column('text', { nullable: true })
    cliente_nombre: string;

    @Column('text', { nullable: true })
    cliente_telefono: string;

    @Column('text', { nullable: true })
    cliente_fecha_nacimiento: string;

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

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    total_pagado: number;

    @Column('decimal', { precision: 12, scale: 2, default: 0 })
    saldo: number;

    @Column('boolean', { default: false })
    facturado: boolean;

    @Column('text', { nullable: true })
    nro_factura: string | null;

    @Column('date', { nullable: true })
    fecha_facturado: string | Date | null;

    @Column('timestamp', { nullable: true })
    fecha_cancelado: Date | null;

    @Column('timestamp', { nullable: true })
    fecha_terminado: Date | null;

    @Column('timestamp', { nullable: true })
    fecha_entrega: Date | null;

    @Column('text', { nullable: true })
    observaciones: string;

    @Column('boolean', { default: false })
    cancelado: boolean;

    @ManyToOne(() => User, { eager: true, nullable: true })
    @JoinColumn({ name: 'idusuario' })
    usuario: User;

    @Column('int', { nullable: true })
    idusuario: number;

    @Column('text', { default: 'en_proceso' })
    estado: string;

    @Column('text', { nullable: true })
    motivo_anulacion: string;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;

    @Column({ nullable: true })
    sucursal_id: number;

    @Column({ nullable: true })
    id_hoja_recepcion: number;

    @ManyToOne(() => HojaRecepcion, { eager: true, nullable: true })
    @JoinColumn({ name: 'id_hoja_recepcion' })
    hoja_recepcion: HojaRecepcion;

    @Column({ nullable: true })
    id_cotizacion: number;

    tipo_orden?: TipoOrden;
    id_tipo_orden?: number;
    seguro?: Seguro;
    idseguro?: number;
    inspector?: Inspector;
    idinspector?: number;

    @AfterLoad()
    populateLegacyAliases() {
        if (this.hoja_recepcion?.cliente_telefono) {
            this.cliente_telefono = this.hoja_recepcion.cliente_telefono;
        }
        if (this.hoja_recepcion?.cliente_nombre) {
            this.cliente_nombre = this.hoja_recepcion.cliente_nombre;
        }
        (this as any).vehiculo_marca = this.marca_auto?.marca || this.hoja_recepcion?.marca_auto?.marca || '';
        (this as any).cliente = this.cliente_nombre;
        (this as any).celular = this.cliente_telefono;
        (this as any).modelo = this.hoja_recepcion?.vehiculo_modelo || this.vehiculo_modelo;
        (this as any).placa = this.hoja_recepcion?.vehiculo_placa || this.vehiculo_placa;
        (this as any).color = this.hoja_recepcion?.vehiculo_color || this.vehiculo_color;
        (this as any).chasis = this.hoja_recepcion?.vehiculo_chasis || this.vehiculo_chasis;
        (this as any).km_ingreso = this.hoja_recepcion?.vehiculo_kilometraje || this.vehiculo_kilometraje;
        (this as any).nro_hoja = this.hoja_recepcion?.nro || this.id_hoja_recepcion;
        (this as any).tipo_orden = this.hoja_recepcion?.tipo_orden;
        (this as any).id_tipo_orden = this.hoja_recepcion?.tipo_orden_id || (this.hoja_recepcion?.tipo_orden as any)?.id;
        (this as any).seguro = this.hoja_recepcion?.seguro;
        (this as any).idseguro = this.hoja_recepcion?.idseguro;
        (this as any).inspector = this.hoja_recepcion?.inspector;
        (this as any).idinspector = this.hoja_recepcion?.idinspector;
        (this as any).particular_seguro = this.hoja_recepcion?.tipo_orden?.tipo_orden || 'Particular';
    }
}
