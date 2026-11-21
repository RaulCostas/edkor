import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateComisionTarjetaDto } from './dto/create-comision-tarjeta.dto';
import { UpdateComisionTarjetaDto } from './dto/update-comision-tarjeta.dto';
import { ComisionTarjeta } from './entities/comision-tarjeta.entity';

@Injectable()
export class ComisionTarjetaService {
    constructor(
        @InjectRepository(ComisionTarjeta)
        private readonly comisionTarjetaRepository: Repository<ComisionTarjeta>,
    ) { }

    async create(createComisionTarjetaDto: CreateComisionTarjetaDto): Promise<ComisionTarjeta> {
        const redBanco = createComisionTarjetaDto.red_banco?.trim();
        if (!redBanco) {
            throw new BadRequestException('El nombre de la Red Banco es obligatorio.');
        }

        const existing = await this.comisionTarjetaRepository
            .createQueryBuilder('c')
            .where('LOWER(TRIM(c.red_banco)) = LOWER(:redBanco)', { redBanco })
            .getOne();

        if (existing) {
            if (existing.estado === 'inactivo') {
                throw new BadRequestException(`La red banco "${redBanco}" ya existe en estado inactivo. Puede reactivarla desde el listado.`);
            }
            throw new BadRequestException(`Ya existe una red banco con el nombre "${redBanco}".`);
        }

        const comisionTarjeta = this.comisionTarjetaRepository.create({
            ...createComisionTarjetaDto,
            red_banco: redBanco,
        });
        return await this.comisionTarjetaRepository.save(comisionTarjeta);
    }

    async findAll(): Promise<ComisionTarjeta[]> {
        return await this.comisionTarjetaRepository.find({
            order: {
                red_banco: 'ASC',
            },
        });
    }

    async findOne(id: number): Promise<ComisionTarjeta> {
        const comisionTarjeta = await this.comisionTarjetaRepository.findOne({ where: { id } });
        if (!comisionTarjeta) {
            throw new NotFoundException(`ComisionTarjeta with ID ${id} not found`);
        }
        return comisionTarjeta;
    }

    async update(id: number, updateComisionTarjetaDto: UpdateComisionTarjetaDto): Promise<ComisionTarjeta> {
        const comisionTarjeta = await this.findOne(id);

        if (updateComisionTarjetaDto.red_banco) {
            const redBanco = updateComisionTarjetaDto.red_banco.trim();
            if (!redBanco) {
                throw new BadRequestException('El nombre de la Red Banco no puede estar vacío.');
            }

            const existing = await this.comisionTarjetaRepository
                .createQueryBuilder('c')
                .where('LOWER(TRIM(c.red_banco)) = LOWER(:redBanco)', { redBanco })
                .andWhere('c.id != :id', { id })
                .getOne();

            if (existing) {
                throw new BadRequestException(`Ya existe otra red banco con el nombre "${redBanco}".`);
            }
            updateComisionTarjetaDto.red_banco = redBanco;
        }

        this.comisionTarjetaRepository.merge(comisionTarjeta, updateComisionTarjetaDto);
        return await this.comisionTarjetaRepository.save(comisionTarjeta);
    }

    async remove(id: number): Promise<void> {
        const comisionTarjeta = await this.findOne(id);
        await this.comisionTarjetaRepository.save({ ...comisionTarjeta, estado: 'inactivo' });
    }
}
