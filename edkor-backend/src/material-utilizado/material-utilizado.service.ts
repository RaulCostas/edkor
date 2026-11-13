import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { MaterialUtilizado } from './entities/material-utilizado.entity';
import { CreateMaterialUtilizadoDto } from './dto/create-material-utilizado.dto';
import { Inventario } from '../inventario/entities/inventario.entity';

@Injectable()
export class MaterialUtilizadoService {
    constructor(
        @InjectRepository(MaterialUtilizado)
        private materialUtilizadoRepository: Repository<MaterialUtilizado>,
        @InjectRepository(Inventario)
        private inventarioRepository: Repository<Inventario>,
        private dataSource: DataSource,
    ) { }

    async create(createDto: CreateMaterialUtilizadoDto): Promise<MaterialUtilizado> {
        console.log('Creating MaterialUtilizado with DTO:', createDto);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Check Inventory existence and quantity
            console.log('Searching for Inventory ID:', createDto.id_inventario);
            const inventarioItem = await queryRunner.manager.findOne(Inventario, {
                where: { id: createDto.id_inventario }
            });

            if (!inventarioItem) {
                console.error('Inventory item not found for ID:', createDto.id_inventario);
                throw new BadRequestException('Item de inventario no encontrado');
            }
            console.log('Found Item:', inventarioItem.descripcion, 'Stock:', inventarioItem.cantidad_existente);

            if (inventarioItem.cantidad_existente < createDto.cantidad) {
                throw new BadRequestException(`Stock insuficiente. Disponible: ${inventarioItem.cantidad_existente}`);
            }

            // Deduct from Inventory
            inventarioItem.cantidad_existente -= createDto.cantidad;
            await queryRunner.manager.save(Inventario, inventarioItem);

            // Create MaterialUtilizado record
            const newRecord = queryRunner.manager.create(MaterialUtilizado, {
                idorden_trabajo: createDto.idorden_trabajo,
                personal: { id: createDto.personalId } as any, // Assign relation by ID
                id_inventario: createDto.id_inventario,
                fecha: createDto.fecha,
                cantidad: createDto.cantidad,
                precio: createDto.precio
            });
            const savedRecord = await queryRunner.manager.save(MaterialUtilizado, newRecord);

            await queryRunner.commitTransaction();
            return savedRecord;

        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error('Transaction Failed:', error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Error al registrar: ${error.message}`);
        } finally {
            await queryRunner.release();
        }
    }

    async findByOrden(ordenId: number): Promise<MaterialUtilizado[]> {
        return this.materialUtilizadoRepository.find({
            where: { idorden_trabajo: ordenId },
            order: { fecha: 'DESC' },
            relations: ['inventario', 'personal', 'inventario.unidad_medida'] // Load nested relations too if needed
        });
    }


    async remove(id: number): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const record = await queryRunner.manager.findOne(MaterialUtilizado, {
                where: { id },
                relations: ['inventario']
            });

            if (!record) throw new BadRequestException('Registro no encontrado');

            // Restore Stock
            if (record.inventario) {
                const inventario = await queryRunner.manager.findOne(Inventario, { where: { id: record.id_inventario } });
                if (inventario) {
                    inventario.cantidad_existente += record.cantidad;
                    await queryRunner.manager.save(Inventario, inventario);
                }
            }

            await queryRunner.manager.delete(MaterialUtilizado, id);
            await queryRunner.commitTransaction();

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw new BadRequestException(`Error al eliminar: ${error.message}`);
        } finally {
            await queryRunner.release();
        }
    }

    async update(id: number, updateDto: any): Promise<MaterialUtilizado> {
        // Simple Update: For now, if we change quantity or material, we need complex logic.
        // Assuming we might change quantity.
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const record = await queryRunner.manager.findOne(MaterialUtilizado, {
                where: { id },
                relations: ['inventario']
            });

            if (!record) throw new BadRequestException('Registro no encontrado');

            // If quantity or inventory changes, we must adjust stock.
            // Case 1: Same Inventory, Different Quantity
            if (updateDto.cantidad && updateDto.cantidad !== record.cantidad) {
                const inventario = await queryRunner.manager.findOne(Inventario, { where: { id: record.id_inventario } });
                if (!inventario) throw new BadRequestException('Inventario no encontrado');

                // Restore old qty
                inventario.cantidad_existente += record.cantidad;

                // Check new qty
                if (inventario.cantidad_existente < updateDto.cantidad) {
                    throw new BadRequestException(`Stock insuficiente para la nueva cantidad. Disponible: ${inventario.cantidad_existente}`);
                }

                // Deduct new qty
                inventario.cantidad_existente -= updateDto.cantidad;
                await queryRunner.manager.save(Inventario, inventario);
            }

            // Update fields
            // Note: If changing inventory ID (product), we would need restore old, deduct new. Assuming mostly quantity edit for now.
            await queryRunner.manager.update(MaterialUtilizado, id, {
                cantidad: updateDto.cantidad,
                fecha: updateDto.fecha,
                precio: updateDto.precio,
                personal: updateDto.personalId ? { id: updateDto.personalId } : undefined
            });

            await queryRunner.commitTransaction();
            const updatedRecord = await this.materialUtilizadoRepository.findOne({ where: { id } });
            if (!updatedRecord) throw new BadRequestException('Error al recuperar el registro actualizado');
            return updatedRecord;

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw new BadRequestException(`Error al actualizar: ${error.message}`);
        } finally {
            await queryRunner.release();
        }
    }
}
