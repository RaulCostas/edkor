import { Controller, Get, Post, Body, Patch, Param, Delete, Headers } from '@nestjs/common';
import { PagosTrabajosAsignadosService } from './pagos-trabajos-asignados.service';
import { CreatePagoTrabajoAsignadoDto } from './dto/create-pagos-trabajos-asignado.dto';
import { UpdatePagosTrabajosAsignadoDto } from './dto/update-pagos-trabajos-asignado.dto';

@Controller('pagos-trabajos-asignados')
export class PagosTrabajosAsignadosController {
  constructor(private readonly pagosService: PagosTrabajosAsignadosService) { }

  @Post()
  create(@Body() createDto: CreatePagoTrabajoAsignadoDto, @Headers('x-sucursal-id') sucursalId: string) {
    return this.pagosService.create(createDto, sucursalId ? +sucursalId : null);
  }

  @Get()
  findAll(@Headers('x-sucursal-id') sucursalId: string) {
    return this.pagosService.findAll(sucursalId ? +sucursalId : null);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pagosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePagosTrabajosAsignadoDto) {
    return this.pagosService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pagosService.remove(+id);
  }
}
