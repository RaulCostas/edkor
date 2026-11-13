import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePrecioTallerDto } from './dto/create-precio-taller.dto';
import { UpdatePrecioTallerDto } from './dto/update-precio-taller.dto';
import { PrecioTaller } from './entities/precio-taller.entity';

@Injectable()
export class PreciosTallerService {
    constructor(
        @InjectRepository(PrecioTaller)
        private preciosTallerRepository: Repository<PrecioTaller>,
    ) { }

    async create(createPrecioTallerDto: CreatePrecioTallerDto): Promise<PrecioTaller> {
        const codigo = (createPrecioTallerDto.codigo || '').trim().toUpperCase();
        const detalle = (createPrecioTallerDto.detalle || '').trim();

        if (codigo) {
            const existingCodigo = await this.preciosTallerRepository
                .createQueryBuilder('pt')
                .where('LOWER(TRIM(pt.codigo)) = LOWER(:codigo)', { codigo })
                .getOne();
            if (existingCodigo) {
                throw new BadRequestException(`El código "${codigo}" ya se encuentra registrado.`);
            }
        }

        if (detalle) {
            const existingDetalle = await this.preciosTallerRepository
                .createQueryBuilder('pt')
                .where('LOWER(TRIM(pt.detalle)) = LOWER(:detalle)', { detalle })
                .getOne();
            if (existingDetalle) {
                throw new BadRequestException(`El detalle "${detalle}" ya se encuentra registrado.`);
            }
        }

        const totalCosto = createPrecioTallerDto.total_costo !== undefined && createPrecioTallerDto.total_costo !== null
            ? Number(createPrecioTallerDto.total_costo)
            : Number((Number(createPrecioTallerDto.tiempo_estimado || 0) * Number(createPrecioTallerDto.precio_hora || 0)).toFixed(2));

        const precio = this.preciosTallerRepository.create({
            ...createPrecioTallerDto,
            total_costo: totalCosto,
            codigo: codigo || undefined,
            detalle,
            categoria: { id: +createPrecioTallerDto.idcategoria_servicio } as any,
        });
        const saved = await this.preciosTallerRepository.save(precio);
        if (!saved.codigo) {
            saved.codigo = String(saved.id);
            await this.preciosTallerRepository.update(saved.id, { codigo: saved.codigo });
        }
        return saved;
    }

    async findAll(): Promise<PrecioTaller[]> {
        return await this.preciosTallerRepository.find({
            order: { id: 'ASC' },
        });
    }

    async findOne(id: string): Promise<PrecioTaller | null> {
        return await this.preciosTallerRepository.findOne({ where: { id: +id } });
    }

    async update(id: string, updatePrecioTallerDto: UpdatePrecioTallerDto): Promise<PrecioTaller | null> {
        const updateData: any = { ...updatePrecioTallerDto };

        if (updatePrecioTallerDto.codigo) {
            const codigo = updatePrecioTallerDto.codigo.trim().toUpperCase();
            const existingCodigo = await this.preciosTallerRepository
                .createQueryBuilder('pt')
                .where('LOWER(TRIM(pt.codigo)) = LOWER(:codigo) AND pt.id != :id', { codigo, id: +id })
                .getOne();
            if (existingCodigo) {
                throw new BadRequestException(`El código "${codigo}" ya se encuentra registrado.`);
            }
            updateData.codigo = codigo;
        }

        if (updatePrecioTallerDto.detalle) {
            const detalle = updatePrecioTallerDto.detalle.trim();
            const existingDetalle = await this.preciosTallerRepository
                .createQueryBuilder('pt')
                .where('LOWER(TRIM(pt.detalle)) = LOWER(:detalle) AND pt.id != :id', { detalle, id: +id })
                .getOne();
            if (existingDetalle) {
                throw new BadRequestException(`El detalle "${detalle}" ya se encuentra registrado.`);
            }
            updateData.detalle = detalle;
        }

        if (updatePrecioTallerDto.idcategoria_servicio) {
            updateData.categoria = { id: +updatePrecioTallerDto.idcategoria_servicio };
            delete updateData.idcategoria_servicio;
        }

        if (updatePrecioTallerDto.total_costo !== undefined && updatePrecioTallerDto.total_costo !== null) {
            updateData.total_costo = Number(updatePrecioTallerDto.total_costo);
        } else if (updatePrecioTallerDto.tiempo_estimado !== undefined || updatePrecioTallerDto.precio_hora !== undefined) {
            const current = await this.findOne(id);
            const tiempoEst = updatePrecioTallerDto.tiempo_estimado ?? current?.tiempo_estimado ?? 0;
            const precioHora = updatePrecioTallerDto.precio_hora ?? current?.precio_hora ?? 0;
            updateData.total_costo = Number((Number(tiempoEst) * Number(precioHora)).toFixed(2));
        }

        await this.preciosTallerRepository.update(+id, updateData);
        return this.findOne(id);
    }

    async remove(id: string): Promise<void> {
        await this.preciosTallerRepository.update(+id, { estado: 'inactivo' });
    }

    async reactivate(id: string): Promise<void> {
        await this.preciosTallerRepository.update(+id, { estado: 'activo' });
    }
}
