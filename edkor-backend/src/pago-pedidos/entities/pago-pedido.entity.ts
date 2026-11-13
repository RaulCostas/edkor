import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MaterialPedido } from '../../material-pedido/entities/material-pedido.entity';
import { User } from '../../users/entities/user.entity';
import { FormaPago } from '../../forma-pago/entities/forma-pago.entity';
import { Sucursal } from '../../sucursales/entities/sucursal.entity';

@Entity('pago_pedidos')
export class PagoPedido {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => MaterialPedido)
    @JoinColumn({ name: 'idmaterial_pedido' })
    material_pedido: MaterialPedido;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'idusers' })
    usuario: User;

    @ManyToOne(() => FormaPago)
    @JoinColumn({ name: 'idforma_pago' })
    forma_pago: FormaPago;

    @Column('date')
    fecha: Date;

    @Column('text')
    factura: string;

    @Column('text')
    recibo: string;

    @Column('text') // 'Bolivianos' | 'Dólares'
    moneda: string;

    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    tc: number;

    @Column('text', { nullable: true })
    imagen: string | null;

    @ManyToOne(() => Sucursal, { nullable: true })
    @JoinColumn({ name: 'sucursal_id' })
    sucursal: Sucursal;
}
