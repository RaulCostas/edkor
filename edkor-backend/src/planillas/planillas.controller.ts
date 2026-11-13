import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Headers } from '@nestjs/common';
import { PlanillasService } from './planillas.service';
import { CreatePlanillaDto } from './dto/create-planilla.dto';
import { UpdatePlanillaDto } from './dto/update-planilla.dto';

@Controller('planillas')
export class PlanillasController {
  constructor(private readonly planillasService: PlanillasService) { }

  @Post()
  create(@Body() createPlanillaDto: CreatePlanillaDto, @Headers('x-sucursal-id') sucursalId: string) {
    return this.planillasService.create(createPlanillaDto, sucursalId ? +sucursalId : null);
  }

  @Get()
  findAll(
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
    @Headers('x-sucursal-id') sucursalId?: string
  ) {
    return this.planillasService.findAll(mes ? +mes : undefined, anio ? +anio : undefined, sucursalId ? +sucursalId : null);
  }

  @Get('produccion-mecanicos')
  getProduccionMecanicos(
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Headers('x-sucursal-id') sucursalId?: string
  ) {
    return this.planillasService.getProduccionMecanicos(+mes, +anio, sucursalId ? +sucursalId : null);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.planillasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlanillaDto: UpdatePlanillaDto) {
    return this.planillasService.update(+id, updatePlanillaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.planillasService.remove(+id);
  }
}
