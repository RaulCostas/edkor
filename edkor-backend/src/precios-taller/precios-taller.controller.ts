import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PreciosTallerService } from './precios-taller.service';
import { CreatePrecioTallerDto } from './dto/create-precio-taller.dto';
import { UpdatePrecioTallerDto } from './dto/update-precio-taller.dto';

@Controller('precios-taller')
export class PreciosTallerController {
    constructor(private readonly preciosTallerService: PreciosTallerService) { }

    @Post()
    create(@Body() createPrecioTallerDto: CreatePrecioTallerDto) {
        return this.preciosTallerService.create(createPrecioTallerDto);
    }

    @Get()
    findAll() {
        return this.preciosTallerService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.preciosTallerService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePrecioTallerDto: UpdatePrecioTallerDto) {
        return this.preciosTallerService.update(id, updatePrecioTallerDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.preciosTallerService.remove(id);
    }

    @Patch(':id/reactivate')
    reactivate(@Param('id') id: string) {
        return this.preciosTallerService.reactivate(id);
    }
}
