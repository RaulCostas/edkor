import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SeguimientoRepuestoService } from './seguimiento-repuesto.service';
import { CreateSeguimientoRepuestoDto } from './dto/create-seguimiento-repuesto.dto';
import { UpdateSeguimientoRepuestoDto } from './dto/update-seguimiento-repuesto.dto';
import * as fs from 'fs';
import * as path from 'path';

@Controller('seguimiento-repuesto')
export class SeguimientoRepuestoController {
    constructor(private readonly servicio: SeguimientoRepuestoService) { }

    private logError(error: any, context: string) {
        const logPath = path.join(process.cwd(), 'backend-error.log');
        const timestamp = new Date().toISOString();
        const message = `[${timestamp}] Error in ${context}: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}\n`;
        fs.appendFileSync(logPath, message);
    }

    @Post()
    async create(@Body() createDto: CreateSeguimientoRepuestoDto) {
        try {
            this.logError(createDto, 'PAYLOAD CHECK');
            return await this.servicio.create(createDto);
        } catch (error) {
            this.logError(error, 'create');
            throw error;
        }
    }

    @Get()
    findAll() {
        return this.servicio.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.servicio.findOne(+id);
    }

    @Get('detalle/:idDetalle')
    findByDetalle(@Param('idDetalle') idDetalle: string) {
        return this.servicio.findByDetalle(+idDetalle);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() updateDto: UpdateSeguimientoRepuestoDto) {
        try {
            return await this.servicio.update(+id, updateDto);
        } catch (error) {
            this.logError(error, 'update');
            throw error;
        }
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.servicio.remove(+id);
    }
}
