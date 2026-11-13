import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tipos_vehiculos')
export class TipoVehiculo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text', { unique: true })
    tipo: string;

    @Column('text', { default: 'activo' })
    estado: string;
}
