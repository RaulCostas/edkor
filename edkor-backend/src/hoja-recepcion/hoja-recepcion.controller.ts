import { Controller, Get, Post, Body, Patch, Param, Delete, Headers } from '@nestjs/common';
import { HojaRecepcionService } from './hoja-recepcion.service';
import { CreateHojaRecepcionDto } from './dto/create-hoja-recepcion.dto';
import { UpdateHojaRecepcionDto } from './dto/update-hoja-recepcion.dto';

@Controller('hoja-recepcion')
export class HojaRecepcionController {
  constructor(private readonly hojaRecepcionService: HojaRecepcionService) {}

  private extractSucursalId(sucursalIdStr?: string): number | null {
    if (!sucursalIdStr) return null;
    const sucursalId = parseInt(sucursalIdStr, 10);
    return isNaN(sucursalId) ? null : sucursalId;
  }

  @Post()
  create(@Body() createHojaRecepcionDto: CreateHojaRecepcionDto, @Headers('x-sucursal-id') sucursalIdStr?: string) {
    const sucursalId = this.extractSucursalId(sucursalIdStr);
    return this.hojaRecepcionService.create(createHojaRecepcionDto, sucursalId || createHojaRecepcionDto.sucursal_id || null);
  }

  @Get()
  findAll(@Headers('x-sucursal-id') sucursalIdStr?: string) {
    return this.hojaRecepcionService.findAll(this.extractSucursalId(sucursalIdStr));
  }

  @Get('by-placa/:placa')
  findByPlaca(@Param('placa') placa: string) {
    return this.hojaRecepcionService.findByPlaca(placa);
  }

  @Get('pendientes-orden')
  findPendientesOrden(@Headers('x-sucursal-id') sucursalIdStr?: string) {
    return this.hojaRecepcionService.findPendientesOrden(this.extractSucursalId(sucursalIdStr));
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Headers('x-sucursal-id') sucursalIdStr?: string) {
    return this.hojaRecepcionService.findOne(+id, this.extractSucursalId(sucursalIdStr));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHojaRecepcionDto: UpdateHojaRecepcionDto, @Headers('x-sucursal-id') sucursalIdStr?: string) {
    return this.hojaRecepcionService.update(+id, updateHojaRecepcionDto, this.extractSucursalId(sucursalIdStr));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('x-sucursal-id') sucursalIdStr?: string) {
    return this.hojaRecepcionService.remove(+id, this.extractSucursalId(sucursalIdStr));
  }
}
