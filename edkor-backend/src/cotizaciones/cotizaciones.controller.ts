import { Controller, Get, Post, Body, Patch, Param, Delete, Headers } from '@nestjs/common';
import { CotizacionesService } from './cotizaciones.service';
import { CreateCotizacionDto } from './dto/create-cotizacion.dto';
import { UpdateCotizacionDto } from './dto/update-cotizacion.dto';

@Controller('cotizaciones')
export class CotizacionesController {
    constructor(private readonly servicio: CotizacionesService) { }

    @Post()
    create(@Body() createDto: CreateCotizacionDto, @Headers('x-sucursal-id') sucursalId: string) {
        return this.servicio.create(createDto, sucursalId ? +sucursalId : null);
    }

    @Get()
    findAll(@Headers('x-sucursal-id') sucursalId: string) {
        return this.servicio.findAll(sucursalId ? +sucursalId : null);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.servicio.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: UpdateCotizacionDto) {
        return this.servicio.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.servicio.remove(+id);
    }
}
