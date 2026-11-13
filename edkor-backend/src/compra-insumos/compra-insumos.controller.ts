import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Headers } from '@nestjs/common';
import { CompraInsumosService } from './compra-insumos.service';
import { CreateCompraInsumoDto } from './dto/create-compra-insumo.dto';
import { UpdateCompraInsumoDto } from './dto/update-compra-insumo.dto';

@Controller('compra-insumos')
export class CompraInsumosController {
    constructor(private readonly compraInsumosService: CompraInsumosService) { }

    @Post()
    create(@Body() createDto: CreateCompraInsumoDto, @Headers('x-sucursal-id') sucursalId: string) {
        return this.compraInsumosService.create(createDto, sucursalId ? +sucursalId : null);
    }

    @Get()
    findAll(@Headers('x-sucursal-id') sucursalId: string) {
        return this.compraInsumosService.findAll(sucursalId ? +sucursalId : null);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.compraInsumosService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: UpdateCompraInsumoDto) {
        return this.compraInsumosService.update(id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.compraInsumosService.remove(id);
    }
}
