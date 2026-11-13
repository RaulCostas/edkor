import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query } from '@nestjs/common';
import { TrabajosAsignadosService } from './trabajos-asignados.service';
import { CreateTrabajoAsignadoDto } from './dto/create-trabajo-asignado.dto';
import { UpdateTrabajoAsignadoDto } from './dto/update-trabajo-asignado.dto';
import { FilterTrabajoAsignadoDto } from './dto/filter-trabajo-asignado.dto';

@Controller('trabajos-asignados')
export class TrabajosAsignadosController {
    constructor(private readonly trabajosAsignadosService: TrabajosAsignadosService) { }

    @Post()
    create(@Body() createTrabajoAsignadoDto: CreateTrabajoAsignadoDto) {
        return this.trabajosAsignadosService.create(createTrabajoAsignadoDto);
    }

    @Get()
    findAll() {
        return this.trabajosAsignadosService.findAll();
    }

    @Get('filter')
    findByFilter(@Query() filters: FilterTrabajoAsignadoDto) {
        return this.trabajosAsignadosService.findByFilter(filters);
    }

    @Get('detalle/:id')
    findByDetalle(@Param('id', ParseIntPipe) id: number) {
        return this.trabajosAsignadosService.findByDetalle(id);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.trabajosAsignadosService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateTrabajoAsignadoDto: UpdateTrabajoAsignadoDto) {
        return this.trabajosAsignadosService.update(id, updateTrabajoAsignadoDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.trabajosAsignadosService.remove(id);
    }
}
