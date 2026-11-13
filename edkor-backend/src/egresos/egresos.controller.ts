import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Headers } from '@nestjs/common';
import { EgresosService } from './egresos.service';
import { CreateEgresoDto } from './dto/create-egreso.dto';
import { UpdateEgresoDto } from './dto/update-egreso.dto';

@Controller('egresos')
export class EgresosController {
    constructor(private readonly egresosService: EgresosService) { }

    @Post()
    create(@Body() createEgresoDto: CreateEgresoDto, @Headers('x-sucursal-id') sucursalId: string) {
        return this.egresosService.create(createEgresoDto, sucursalId ? +sucursalId : null);
    }

    @Get()
    findAll(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('search') search?: string,
        @Query('fecha') fecha?: string,
        @Headers('x-sucursal-id') sucursalId?: string,
    ) {
        if (fecha) {
            startDate = fecha;
            endDate = fecha;
        }
        return this.egresosService.findAll(Number(page), Number(limit), startDate, endDate, search, sucursalId ? +sucursalId : null);
    }

    @Get('ordenes-pendientes')
    getOrdenesPendientes(@Query('all') all?: string) {
        return this.egresosService.getOrdenesPendientes(all === 'true');
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.egresosService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateEgresoDto: UpdateEgresoDto) {
        return this.egresosService.update(+id, updateEgresoDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.egresosService.remove(+id);
    }
}
