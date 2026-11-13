import { Controller, Get, Post, Body, Param, Headers } from '@nestjs/common';
import { PagoPedidosService } from './pago-pedidos.service';
import { CreatePagoPedidoDto } from './dto/create-pago-pedido.dto';

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
}
