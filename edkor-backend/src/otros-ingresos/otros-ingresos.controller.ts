import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
} from '@nestjs/common';
import { OtrosIngresosService } from './otros-ingresos.service';
import { CreateOtroIngresoDto } from './dto/create-otro-ingreso.dto';
import { UpdateOtroIngresoDto } from './dto/update-otro-ingreso.dto';

@Controller('otros-ingresos')
export class OtrosIngresosController {
  constructor(private readonly otrosIngresosService: OtrosIngresosService) {}

  private extractSucursalId(sucursalIdStr?: string): number | null {
    if (!sucursalIdStr) return null;
    const sucursalId = parseInt(sucursalIdStr, 10);
    return isNaN(sucursalId) ? null : sucursalId;
  }

  @Post()
  create(
    @Body() createDto: CreateOtroIngresoDto,
    @Headers('x-sucursal-id') sucursalIdStr?: string,
  ) {
    const sucursalId = this.extractSucursalId(sucursalIdStr);
    return this.otrosIngresosService.create(createDto, sucursalId);
  }

  @Get()
  findAll(@Headers('x-sucursal-id') sucursalIdStr?: string) {
    return this.otrosIngresosService.findAll(this.extractSucursalId(sucursalIdStr));
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Headers('x-sucursal-id') sucursalIdStr?: string,
  ) {
    return this.otrosIngresosService.findOne(+id, this.extractSucursalId(sucursalIdStr));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateOtroIngresoDto,
    @Headers('x-sucursal-id') sucursalIdStr?: string,
  ) {
    return this.otrosIngresosService.update(
      +id,
      updateDto,
      this.extractSucursalId(sucursalIdStr),
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Headers('x-sucursal-id') sucursalIdStr?: string,
  ) {
    return this.otrosIngresosService.remove(+id, this.extractSucursalId(sucursalIdStr));
  }
}
