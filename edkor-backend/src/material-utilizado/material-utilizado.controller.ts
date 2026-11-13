import { Controller, Post, Body, Get, Param, ParseIntPipe, Delete, Patch } from '@nestjs/common';
import { MaterialUtilizadoService } from './material-utilizado.service';
import { CreateMaterialUtilizadoDto } from './dto/create-material-utilizado.dto';

@Controller('material-utilizado')
export class MaterialUtilizadoController {
    constructor(private readonly materialUtilizadoService: MaterialUtilizadoService) { }

    @Post()
    create(@Body() createDto: CreateMaterialUtilizadoDto) {
        return this.materialUtilizadoService.create(createDto);
    }

    @Get('orden/:id')
    findByOrden(@Param('id', ParseIntPipe) id: number) {
        return this.materialUtilizadoService.findByOrden(id);
    }

    @Delete(':id')
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.materialUtilizadoService.remove(id);
    }

    // Using explicit Body type any to simplify for now or import UpdateDto
    @Patch(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: any) {
        return this.materialUtilizadoService.update(id, updateDto);
    }
}
