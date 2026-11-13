import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('marca_auto')
export class MarcaAuto {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 100 })
    marca: string;

    @Column({ default: 'activo', length: 20 })
    estado: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
