import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, Query } from '@nestjs/common';
import { PagoOrdenService } from './pago-orden.service';
import { CreatePagoOrdenDto } from './dto/create-pago-orden.dto';
import { UpdatePagoOrdenDto } from './dto/update-pago-orden.dto';

@Controller('pago-orden')
export class PagoOrdenController {
    constructor(private readonly pagoOrdenService: PagoOrdenService) { }

    @Post()
    create(@Body() createPagoOrdenDto: CreatePagoOrdenDto, @Headers('x-sucursal-id') sucursalId: string) {
        return this.pagoOrdenService.create(createPagoOrdenDto, sucursalId ? +sucursalId : null);
    }

    @Get()
    findAll(@Headers('x-sucursal-id') sucursalId: string) {
        return this.pagoOrdenService.findAll(sucursalId ? +sucursalId : null);
    }

    @Get('ordenes-con-saldo')
    getOrdenesConSaldo(
        @Headers('x-sucursal-id') sucursalId: string,
        @Query('soloConcluidas') soloConcluidas?: string
    ) {
        return this.pagoOrdenService.getOrdenesConSaldo(sucursalId ? +sucursalId : null, soloConcluidas === 'true');
    }

    @Get('deudas-por-cobrar')
    getDeudasPorCobrar(@Headers('x-sucursal-id') sucursalId: string) {
        return this.pagoOrdenService.getOrdenesConSaldo(sucursalId ? +sucursalId : null, true);
    }

    @Get('orden/:id')
    findByOrdenTrabajo(@Param('id') id: string) {
        return this.pagoOrdenService.findByOrdenTrabajo(+id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pagoOrdenService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePagoOrdenDto: UpdatePagoOrdenDto) {
        return this.pagoOrdenService.update(+id, updatePagoOrdenDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pagoOrdenService.remove(+id);
    }
}
