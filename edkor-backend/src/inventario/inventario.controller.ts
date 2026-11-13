import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, Query } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { UpdateInventarioDto } from './dto/update-inventario.dto';

@Controller('inventario')
export class InventarioController {
    constructor(private readonly inventarioService: InventarioService) { }

    @Post()
    create(@Body() createInventarioDto: CreateInventarioDto, @Headers('x-sucursal-id') sucursalId: string) {
        return this.inventarioService.create(createInventarioDto, sucursalId ? +sucursalId : null);
    }

    @Get()
    findAll(@Headers('x-sucursal-id') sucursalId: string) {
        return this.inventarioService.findAll(sucursalId ? +sucursalId : null);
    }

    @Get('devoluciones/pendientes/count')
    countDevolucionesPendientes(@Headers('x-sucursal-id') sucursalId: string) {
        return this.inventarioService.countDevolucionesPendientes(sucursalId ? +sucursalId : null);
    }

    @Get('devoluciones')
    findDevoluciones(
        @Headers('x-sucursal-id') sucursalId: string,
        @Query('estado') estado?: string,
    ) {
        return this.inventarioService.findDevoluciones(sucursalId ? +sucursalId : null, estado);
    }

    @Post('devoluciones/:id/confirmar')
    confirmarDevolucion(
        @Param('id') id: string,
        @Body() body: { idusuario?: number; usuario_nombre?: string; observaciones?: string },
    ) {
        return this.inventarioService.confirmarDevolucion(+id, body || {});
    }

    @Post('devoluciones/:id/rechazar')
    rechazarDevolucion(
        @Param('id') id: string,
        @Body() body: { idusuario?: number; usuario_nombre?: string; observaciones?: string },
    ) {
        return this.inventarioService.rechazarDevolucion(+id, body || {});
    }

    @Get(':id/kardex')
    getKardex(@Param('id') id: string) {
        return this.inventarioService.getKardexByInventario(+id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.inventarioService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateInventarioDto: UpdateInventarioDto) {
        return this.inventarioService.update(+id, updateInventarioDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.inventarioService.remove(+id);
    }
}
