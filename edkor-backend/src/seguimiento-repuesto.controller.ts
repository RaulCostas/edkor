import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SeguimientoRepuestoService } from './seguimiento-repuesto.service';
import { CreateSeguimientoRepuestoDto } from './dto/create-seguimiento-repuesto.dto';
import { UpdateSeguimientoRepuestoDto } from './dto/update-seguimiento-repuesto.dto';

@Controller('seguimiento-repuesto')
export class SeguimientoRepuestoController {
  constructor(private readonly seguimientoRepuestoService: SeguimientoRepuestoService) {}

  @Post()
  create(@Body() createSeguimientoRepuestoDto: CreateSeguimientoRepuestoDto) {
    return this.seguimientoRepuestoService.create(createSeguimientoRepuestoDto);
  }

  @Get()
  findAll() {
    return this.seguimientoRepuestoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.seguimientoRepuestoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSeguimientoRepuestoDto: UpdateSeguimientoRepuestoDto) {
    return this.seguimientoRepuestoService.update(+id, updateSeguimientoRepuestoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.seguimientoRepuestoService.remove(+id);
  }
}
