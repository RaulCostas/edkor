import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TiposVehiculosService } from './tipos-vehiculos.service';
import { CreateTipoVehiculoDto } from './dto/create-tipo-vehiculo.dto';
import { UpdateTipoVehiculoDto } from './dto/update-tipo-vehiculo.dto';

@Controller('tipos-vehiculos')
export class TiposVehiculosController {
    constructor(private readonly tiposVehiculosService: TiposVehiculosService) { }

    @Post()
    create(@Body() createTipoVehiculoDto: CreateTipoVehiculoDto) {
        return this.tiposVehiculosService.create(createTipoVehiculoDto);
    }

    @Get()
    findAll() {
        return this.tiposVehiculosService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.tiposVehiculosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTipoVehiculoDto: UpdateTipoVehiculoDto) {
        return this.tiposVehiculosService.update(+id, updateTipoVehiculoDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.tiposVehiculosService.remove(+id);
    }

    @Patch(':id/reactivate')
    reactivate(@Param('id') id: string) {
        return this.tiposVehiculosService.reactivate(+id);
    }
}
