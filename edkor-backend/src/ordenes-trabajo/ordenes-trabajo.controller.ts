import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, Query } from '@nestjs/common';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';
import { CreateOrdenTrabajoDto } from './dto/create-orden-trabajo.dto';
import { UpdateOrdenTrabajoDto } from './dto/update-orden-trabajo.dto';

@Controller('ordenes-trabajo')
export class OrdenesTrabajoController {
    constructor(private readonly ordenesTrabajoService: OrdenesTrabajoService) { }

    @Post()
    create(@Body() createOrdenTrabajoDto: CreateOrdenTrabajoDto, @Headers('x-sucursal-id') sucursalId: string) {
        console.log('Received Create DTO:', JSON.stringify(createOrdenTrabajoDto, null, 2));
        return this.ordenesTrabajoService.create(createOrdenTrabajoDto, sucursalId ? +sucursalId : null);
    }

    @Get()
    findAll(@Headers('x-sucursal-id') sucursalId: string) {
        return this.ordenesTrabajoService.findAll(sucursalId ? +sucursalId : null);
    }

    @Get('by-placa/:placa')
    findByPlaca(@Param('placa') placa: string) {
        return this.ordenesTrabajoService.findByPlaca(placa);
    }

    @Get('trabajos-rechazados/by-placa/:placa')
    findTrabajosRechazadosByPlaca(@Param('placa') placa: string) {
        return this.ordenesTrabajoService.findTrabajosRechazadosByPlaca(placa);
    }

    @Get('utilidad-mensual')
    getUtilidadMensual(
        @Query('mes') mes?: string,
        @Query('desde') desde?: string,
        @Query('hasta') hasta?: string,
        @Query('estado') estado?: string,
        @Headers('x-sucursal-id') sucursalId?: string,
    ) {
        return this.ordenesTrabajoService.getUtilidadMensual(
            mes,
            desde,
            hasta,
            sucursalId ? +sucursalId : null,
            estado,
        );
    }

    @Get(':id/utilidad')
    getUtilidad(@Param('id') id: string) {
        return this.ordenesTrabajoService.getUtilidadOrden(+id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.ordenesTrabajoService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateOrdenTrabajoDto: UpdateOrdenTrabajoDto) {
        console.log('Update Orden ID:', id);
        console.log('Update Payload:', updateOrdenTrabajoDto);
        return this.ordenesTrabajoService.update(+id, updateOrdenTrabajoDto);
    }

    @Delete(':id')
    remove(
        @Param('id') id: string,
        @Body() body?: { motivo?: string },
        @Query('motivo') queryMotivo?: string
    ) {
        const motivo = body?.motivo || queryMotivo;
        return this.ordenesTrabajoService.remove(+id, motivo);
    }

    @Patch(':id/reactivate')
    reactivate(@Param('id') id: string) {
        return this.ordenesTrabajoService.reactivate(+id);
    }
}
