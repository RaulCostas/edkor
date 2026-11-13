import { Controller, Get, Post, Body, Patch, Param, Delete, Headers } from '@nestjs/common';
import { MaterialPedidoService } from './material-pedido.service';
import { CreateMaterialPedidoDto } from './dto/create-material-pedido.dto';
import { UpdateMaterialPedidoDto } from './dto/update-material-pedido.dto';

@Controller('material-pedido')
export class MaterialPedidoController {
  constructor(private readonly materialPedidoService: MaterialPedidoService) { }

  @Post()
  create(@Body() createMaterialPedidoDto: CreateMaterialPedidoDto, @Headers('x-sucursal-id') sucursalId: string) {
    return this.materialPedidoService.create(createMaterialPedidoDto, sucursalId ? +sucursalId : null);
  }

  @Get()
  findAll(@Headers('x-sucursal-id') sucursalId: string) {
    return this.materialPedidoService.findAll(sucursalId ? +sucursalId : null);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.materialPedidoService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMaterialPedidoDto: UpdateMaterialPedidoDto) {
    return this.materialPedidoService.update(+id, updateMaterialPedidoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.materialPedidoService.remove(+id);
  }
}
