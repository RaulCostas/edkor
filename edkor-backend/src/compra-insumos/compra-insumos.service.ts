import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompraInsumo } from './entities/compra-insumo.entity';
import { CreateCompraInsumoDto } from './dto/create-compra-insumo.dto';
import { UpdateCompraInsumoDto } from './dto/update-compra-insumo.dto';

@Injectable()
export class CompraInsumosService {
    constructor(
        @InjectRepository(CompraInsumo)
        private compraInsumoRepository: Repository<CompraInsumo>,
    ) { }

    async create(createDto: CreateCompraInsumoDto, sucursalId: number | null = null): Promise<CompraInsumo> {
        console.log('Creating CompraInsumo:', createDto);
        // Calculate total automatically
        const total = createDto.cantidad * createDto.precio_unitario;
        const { idproveedor, idforma_pago, idorden_trabajo, ...rest } = createDto;

        const newRecord = this.compraInsumoRepository.create({
            ...rest,
            idproveedor: +idproveedor,
            idforma_pago: +idforma_pago,
            ...(idorden_trabajo && { idorden_trabajo: +idorden_trabajo }),
            total,
            sucursal: sucursalId ? { id: sucursalId } as any : null,
        });

        return this.compraInsumoRepository.save(newRecord);
    }

    async findAll(sucursalId: number | null = null): Promise<CompraInsumo[]> {
        const whereClause: any = {};
        if (sucursalId) {
            whereClause.sucursal = { id: sucursalId };
        }
        return this.compraInsumoRepository.find({
            where: whereClause,
            order: { fecha: 'DESC' },
            relations: ['sucursal']
        });
    }

    async findOne(id: number): Promise<CompraInsumo> {
        const record = await this.compraInsumoRepository.findOne({ where: { id } });
        if (!record) {
            throw new NotFoundException(`Compra de insumo con ID ${id} no encontrada`);
        }
        return record;
    }

    async update(id: number, updateDto: UpdateCompraInsumoDto): Promise<CompraInsumo> {
        const record = await this.findOne(id);
        const updatedData: any = { ...updateDto };
        if (updateDto.idproveedor) updatedData.idproveedor = +updateDto.idproveedor;
        if (updateDto.idforma_pago) updatedData.idforma_pago = +updateDto.idforma_pago;
        if (updateDto.idorden_trabajo) {
            updatedData.idorden_trabajo = +updateDto.idorden_trabajo;
        }

        // Recalculate total if quantity or price changes
        if (updateDto.cantidad !== undefined || updateDto.precio_unitario !== undefined) {
            const cantidad = updateDto.cantidad ?? record.cantidad;
            const precio = updateDto.precio_unitario ?? record.precio_unitario;
            updatedData['total'] = cantidad * precio;
        }

        this.compraInsumoRepository.merge(record, updatedData);
        return this.compraInsumoRepository.save(record);
    }

    async remove(id: number): Promise<void> {
        const result = await this.compraInsumoRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Compra de insumo con ID ${id} no encontrada`);
        }
    }
}
