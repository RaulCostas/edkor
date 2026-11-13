import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePersonalDto } from './dto/create-personal.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { Personal } from './entities/personal.entity';
import { AreaPersonal } from '../area-personal/entities/area-personal.entity';

@Injectable()
export class PersonalService {
    constructor(
        @InjectRepository(Personal)
        private readonly personalRepository: Repository<Personal>,
        @InjectRepository(AreaPersonal)
        private readonly areaPersonalRepository: Repository<AreaPersonal>,
    ) { }

    async onModuleInit() {
        try {
            await this.personalRepository.manager.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'personal' AND column_name = 'precio_hora'
                    ) THEN
                        ALTER TABLE personal ADD COLUMN precio_hora NUMERIC(10, 2);
                    END IF;
                END $$;
            `);
        } catch (err) {
            console.error('Error asegurando columna precio_hora en personal:', err);
        }
    }

    async create(createPersonalDto: CreatePersonalDto, sucursalId: number | null = null) {
        const area = await this.areaPersonalRepository.findOneBy({ id: +createPersonalDto.areaId });
        if (!area) {
            throw new NotFoundException(`AreaPersonal with ID ${createPersonalDto.areaId} not found`);
        }

        const personal = this.personalRepository.create({
            ...createPersonalDto,
            area: area,
            sucursal: sucursalId ? { id: sucursalId } as any : null,
        });
        return this.personalRepository.save(personal);
    }

    findAll(sucursalId: number | null = null) {
        const whereClause: any = {};
        if (sucursalId) {
            whereClause.sucursal = { id: sucursalId };
        }
        
        return this.personalRepository.find({
            where: whereClause,
            relations: ['area', 'sucursal'],
            order: { paterno: 'ASC', nombre: 'ASC' }
        });
    }

    findOne(id: string) {
        return this.personalRepository.findOneBy({ id: +id });
    }

    async update(id: string, updatePersonalDto: UpdatePersonalDto) {
        let area: AreaPersonal | undefined;
        if (updatePersonalDto.areaId) {
            const foundArea = await this.areaPersonalRepository.findOneBy({ id: +updatePersonalDto.areaId });
            if (!foundArea) {
                throw new NotFoundException(`AreaPersonal with ID ${updatePersonalDto.areaId} not found`);
            }
            area = foundArea;
        }

        const personal = await this.personalRepository.preload({
            id: +id,
            ...updatePersonalDto,
            area: area,
        });
        if (!personal) {
            throw new NotFoundException(`Personal #${id} not found`);
        }
        return this.personalRepository.save(personal);
    }

    remove(id: string) {
        return this.personalRepository.update(+id, { estado: 'inactivo' });
    }
}
