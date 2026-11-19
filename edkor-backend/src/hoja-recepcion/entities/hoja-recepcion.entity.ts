import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, AfterLoad } from 'typeorm';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
import { Personal } from '../../personal/entities/personal.entity';
import { TipoOrden } from '../../tipo-orden/entities/tipo-orden.entity';
import { MarcaAuto } from '../../marca-auto/entities/marca-auto.entity';
import { Seguro } from '../../seguros/entities/seguro.entity';
import { Inspector } from '../../inspectores/entities/inspector.entity';

@Entity('hoja_recepcion')
export class HojaRecepcion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  nro: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cliente_nombre: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cliente_telefono: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cliente_fecha_nacimiento: string;

  @ManyToOne(() => MarcaAuto, { nullable: true, eager: true })
  @JoinColumn({ name: 'idmarca_auto' })
  marca_auto: MarcaAuto;

  @Column({ nullable: true })
  idmarca_auto: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vehiculo_marca: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vehiculo_modelo: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vehiculo_placa: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vehiculo_color: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  vehiculo_kilometraje: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vehiculo_chasis: string;

  @Column({ type: 'json', nullable: true })
  checklist_exterior_interior: any;

  @Column({ type: 'json', nullable: true })
  checklist_accesorios: any;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nivel_combustible: string;

  @Column({ type: 'text', nullable: true })
  observaciones: string;

  @Column({ type: 'text', nullable: true })
  trabajos_solicitados: string;

  @Column({ type: 'varchar', length: 50, default: 'Pendiente' })
  estado: string;

  @Column({ type: 'text', nullable: true })
  motivo_anulacion: string;

  @ManyToOne(() => Sucursal)
  @JoinColumn({ name: 'sucursal_id' })
  sucursal: Sucursal;

  @Column({ nullable: true })
  sucursal_id: number;

  @ManyToOne(() => TipoOrden, { nullable: true, eager: true })
  @JoinColumn({ name: 'tipo_orden_id' })
  tipo_orden: TipoOrden;

  @Column({ nullable: true })
  tipo_orden_id: number;

  @ManyToOne(() => Seguro, { nullable: true, eager: true })
  @JoinColumn({ name: 'idseguro' })
  seguro: Seguro;

  @Column({ nullable: true })
  idseguro: number;

  @ManyToOne(() => Inspector, { nullable: true, eager: true })
  @JoinColumn({ name: 'idinspector' })
  inspector: Inspector;

  @Column({ nullable: true })
  idinspector: number;

  @ManyToOne(() => Personal, { nullable: true, eager: true })
  @JoinColumn({ name: 'asesor_id' })
  asesor: Personal;

  @Column({ nullable: true })
  asesor_id: number;

  @ManyToOne(() => Personal, { nullable: true, eager: true })
  @JoinColumn({ name: 'jefe_mecanico_id' })
  jefe_mecanico: Personal;

  @Column({ nullable: true })
  jefe_mecanico_id: number;

  @ManyToOne(() => Personal, { nullable: true, eager: true })
  @JoinColumn({ name: 'mecanico_id' })
  mecanico: Personal;

  @Column({ nullable: true })
  mecanico_id: number;

  @Column({ type: 'boolean', default: false })
  autoriza_pruebas: boolean;

  @Column({ type: 'json', nullable: true, select: false })
  fotos: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accesorios_otros: string;

  @Column({ type: 'text', nullable: true })
  firma_cliente: string;

  @Column({ type: 'text', nullable: true })
  firma_asesor: string;

  @Column({ type: 'text', nullable: true })
  diagrama_vehiculo: string;

  @Column({ type: 'int', nullable: true })
  idusuario: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @AfterLoad()
  populateLegacyAliases() {
    if (!this.vehiculo_marca && this.marca_auto?.marca) {
      this.vehiculo_marca = this.marca_auto.marca;
    }
    (this as any).cliente = this.cliente_nombre;
    (this as any).celular = this.cliente_telefono;
    (this as any).modelo = this.vehiculo_modelo;
    (this as any).placa = this.vehiculo_placa;
    (this as any).color = this.vehiculo_color;
    (this as any).chasis = this.vehiculo_chasis;
    (this as any).km_ingreso = this.vehiculo_kilometraje;
    (this as any).particular_seguro = this.tipo_orden?.tipo_orden || 'Particular';
  }
}
