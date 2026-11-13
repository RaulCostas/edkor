import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PreciosSegurosService } from './precios-seguros.service';
import { CreatePrecioSeguroDto } from './dto/create-precio-seguro.dto';
import { UpdatePrecioSeguroDto } from './dto/update-precio-seguro.dto';

@Controller('precios-seguros')
export class PreciosSegurosController {
    constructor(private readonly preciosSegurosService: PreciosSegurosService) { }

    @Post()
    create(@Body() createPrecioSeguroDto: CreatePrecioSeguroDto) {
        return this.preciosSegurosService.create(createPrecioSeguroDto);
    }

    @Get()
    findAll() {
        return this.preciosSegurosService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.preciosSegurosService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePrecioSeguroDto: UpdatePrecioSeguroDto) {
        return this.preciosSegurosService.update(id, updatePrecioSeguroDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.preciosSegurosService.remove(id);
    }

    @Patch(':id/reactivate')
    reactivate(@Param('id') id: string) {
        return this.preciosSegurosService.reactivate(id);
    }
}
