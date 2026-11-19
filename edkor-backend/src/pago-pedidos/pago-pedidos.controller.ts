import { Controller, Get, Post, Body, Param, Headers, Patch, Delete } from '@nestjs/common';
import { PagoPedidosService } from './pago-pedidos.service';
import { CreatePagoPedidoDto } from './dto/create-pago-pedido.dto';
import { UpdatePagoPedidoDto } from './dto/update-pago-pedido.dto';

@Controller('pago-pedidos')
export class PagoPedidosController {
    constructor(private readonly pagoPedidosService: PagoPedidosService) { }

    @Post()
    create(@Body() createPagoPedidoDto: CreatePagoPedidoDto, @Headers('x-sucursal-id') sucursalId: string) {
        return this.pagoPedidosService.create(createPagoPedidoDto, sucursalId ? +sucursalId : null);
    }

    @Get()
    findAll(@Headers('x-sucursal-id') sucursalId: string) {
        return this.pagoPedidosService.findAll(sucursalId ? +sucursalId : null);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.pagoPedidosService.findOne(id);
    }

    @Get('pedido/:id')
    findByPedido(@Param('id') id: string) {
        return this.pagoPedidosService.findByPedido(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePagoPedidoDto: UpdatePagoPedidoDto) {
        return this.pagoPedidosService.update(+id, updatePagoPedidoDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.pagoPedidosService.remove(+id);
    }
}
