import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DetalleMaterialPedidoService } from './detalle-material-pedido.service';
import { CreateDetalleMaterialPedidoDto } from './dto/create-detalle-material-pedido.dto';
import { UpdateDetalleMaterialPedidoDto } from './dto/update-detalle-material-pedido.dto';

@Controller('detalle-material-pedido')
export class DetalleMaterialPedidoController {
  constructor(private readonly detalleService: DetalleMaterialPedidoService) { }

  @Post()
  create(@Body() createDto: CreateDetalleMaterialPedidoDto) {
    return this.detalleService.create(createDto);
  }

  @Get('pedido/:pedidoId')
  findAllByPedido(@Param('pedidoId') pedidoId: string) {
    return this.detalleService.findAllByPedido(+pedidoId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.detalleService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateDetalleMaterialPedidoDto) {
    return this.detalleService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.detalleService.remove(+id);
  }
}
