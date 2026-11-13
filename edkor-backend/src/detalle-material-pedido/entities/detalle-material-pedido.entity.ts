import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { MaterialPedido } from '../../material-pedido/entities/material-pedido.entity';
import { Inventario } from '../../inventario/entities/inventario.entity';

@Entity('detalle_material_pedido')
export class DetalleMaterialPedido {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => MaterialPedido)
    @JoinColumn({ name: 'idmaterial_pedido' })
    material_pedido: MaterialPedido;

    @Column('int')
    idmaterial_pedido: number;

    @ManyToOne(() => Inventario, { eager: true })
    @JoinColumn({ name: 'idinventario' })
    inventario: Inventario;

    @Column('int')
    idinventario: number;

    @Column('float')
    cantidad: number;

    @Column('decimal', { precision: 12, scale: 2 })
    precio_unitario: number;

    // Although not explicitly requested in the prompt item 2 list, 
    // it's standard to store the line total (cantidad * precio) or valid it on read.
    // The prompt says "detalle_material_pedido (id, idMaterial_pedido (N:1), idinventario (N:1), cantidad, precio_unitario)"
    // I will stick to what is requested but usually a total per line is helpful. 
    // Actually, looking at DetalleOrdenTrabajo, it has 'total'. 
    // I will assume I should add 'total' for consistency with other modules as requested in item 3 "copiar el mismo formato de lo otros modulos".

    @Column('decimal', { precision: 12, scale: 2 })
    total: number;
}

