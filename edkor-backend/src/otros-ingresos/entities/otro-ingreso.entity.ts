import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Personal } from '../../personal/entities/personal.entity';
import { FormaPago } from '../../forma-pago/entities/forma-pago.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';
import { Inventario } from '../../inventario/entities/inventario.entity';
import { User } from '../../users/entities/user.entity';

@Entity('otros_ingresos')
export class OtroIngreso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  nro: number;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  fecha: Date;

  @Column({ type: 'text' })
  motivo: string;

  @Column({ type: 'varchar', length: 100, default: 'Venta de Insumo' })
  tipo_ingreso: string; // 'Venta de Insumo', 'Auxilio Mecánico', 'Servicio Rápido', 'Otro'

  @Column('decimal', { precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'varchar', length: 20, default: 'Bolivianos' })
  moneda: string; // 'Bolivianos' | 'Dólares'

  @Column({ type: 'text', nullable: true })
  observacion: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cliente: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  telefono_cliente: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  placa: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  comprobante: string; // Factura, Recibo o Nro Documento

  @ManyToOne(() => Personal, { nullable: true, eager: true })
  @JoinColumn({ name: 'asesor_id' })
  asesor: Personal;

  @Column({ type: 'int', nullable: true })
  asesor_id: number;

  @ManyToOne(() => FormaPago, { nullable: true, eager: true })
  @JoinColumn({ name: 'forma_pago_id' })
  forma_pago: FormaPago;

  @Column({ type: 'int', nullable: true })
  forma_pago_id: number;

  @ManyToOne(() => Sucursal, { nullable: true })
  @JoinColumn({ name: 'sucursal_id' })
  sucursal: Sucursal;

  @Column({ type: 'int', nullable: true })
  sucursal_id: number;

  @ManyToOne(() => Inventario, { nullable: true, eager: true })
  @JoinColumn({ name: 'idinventario' })
  inventario: Inventario;

  @Column({ type: 'int', nullable: true })
  idinventario: number;

  @Column('float', { default: 1 })
  cantidad: number;

  @Column({ type: 'boolean', default: false })
  descontar_stock: boolean;

  @ManyToOne(() => User, { nullable: true, eager: true })
  @JoinColumn({ name: 'idusuario' })
  usuario: User;

  @Column({ type: 'int', nullable: true })
  idusuario: number;

  @Column({ type: 'varchar', length: 50, default: 'activo' })
  estado: string; // 'activo' | 'anulado'

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
