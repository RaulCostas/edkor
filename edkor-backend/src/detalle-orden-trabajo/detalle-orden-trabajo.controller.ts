import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, Query } from '@nestjs/common';
import { DetalleOrdenTrabajoService } from './detalle-orden-trabajo.service';
import { CreateBulkDetalleOrdenTrabajoDto, CreateDetalleOrdenTrabajoDto } from './dto/create-detalle-orden-trabajo.dto';
import { UpdateDetalleOrdenTrabajoDto } from './dto/update-detalle-orden-trabajo.dto';

@Controller('detalle-orden-trabajo')
export class DetalleOrdenTrabajoController {
    constructor(private readonly detalleOrdenTrabajoService: DetalleOrdenTrabajoService) { }

    @Post()
    create(@Body() createDetalleOrdenTrabajoDto: CreateDetalleOrdenTrabajoDto) {
        return this.detalleOrdenTrabajoService.create(createDetalleOrdenTrabajoDto);
    }

    @Post('bulk')
    createBulk(@Body() bulkDto: CreateBulkDetalleOrdenTrabajoDto) {
        return this.detalleOrdenTrabajoService.createBulk(bulkDto.items);
    }

    @Get()
    findAll() {
        return this.detalleOrdenTrabajoService.findAll();
    }

    @Get('repuestos/cargados')
    findRepuestosCargados(@Headers('x-sucursal-id') sucursalId: string) {
        return this.detalleOrdenTrabajoService.findRepuestosCargados(sucursalId ? +sucursalId : undefined);
    }

    @Get('orden/:idorden')
    findByOrden(@Param('idorden') idorden: string) {
        return this.detalleOrdenTrabajoService.findByOrden(+idorden);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.detalleOrdenTrabajoService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDetalleOrdenTrabajoDto: UpdateDetalleOrdenTrabajoDto) {
        return this.detalleOrdenTrabajoService.update(+id, updateDetalleOrdenTrabajoDto);
    }

    @Delete(':id')
    remove(
        @Param('id') id: string,
        @Query('origen') origen?: string,
        @Query('idusuario') idusuario?: string,
        @Query('usuarioNombre') usuarioNombre?: string,
    ) {
        return this.detalleOrdenTrabajoService.remove(+id, {
            origen,
            idusuario: idusuario ? +idusuario : undefined,
            usuarioNombre,
        });
    }
}
