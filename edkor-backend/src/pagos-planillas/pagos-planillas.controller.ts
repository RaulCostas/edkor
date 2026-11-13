import { Controller, Get, Post, Body, Patch, Param, Delete, Headers } from '@nestjs/common';
import { PagosPlanillasService } from './pagos-planillas.service';
import { CreatePagosPlanillaDto } from './dto/create-pagos-planilla.dto';
import { UpdatePagosPlanillaDto } from './dto/update-pagos-planilla.dto';

@Controller('pagos-planillas')
export class PagosPlanillasController {
  constructor(private readonly pagosPlanillasService: PagosPlanillasService) {}

  @Post()
  create(@Body() createPagosPlanillaDto: CreatePagosPlanillaDto) {
    return this.pagosPlanillasService.create(createPagosPlanillaDto);
  }

  @Get()
  findAll(@Headers('x-sucursal-id') sucursalId: string) {
    return this.pagosPlanillasService.findAll(sucursalId ? +sucursalId : null);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pagosPlanillasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePagosPlanillaDto: UpdatePagosPlanillaDto) {
    return this.pagosPlanillasService.update(+id, updatePagosPlanillaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.pagosPlanillasService.remove(+id);
  }
}
