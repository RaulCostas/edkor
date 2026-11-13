import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GrupoInventarioService } from './grupo-inventario.service';
import { CreateGrupoInventarioDto } from './dto/create-grupo-inventario.dto';
import { UpdateGrupoInventarioDto } from './dto/update-grupo-inventario.dto';

@Controller('grupo-inventario')
export class GrupoInventarioController {
    constructor(private readonly grupoInventarioService: GrupoInventarioService) { }

    @Post()
    create(@Body() createGrupoInventarioDto: CreateGrupoInventarioDto) {
        return this.grupoInventarioService.create(createGrupoInventarioDto);
    }

    @Get()
    findAll() {
        console.log('GET /grupo-inventario hit');
        return this.grupoInventarioService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.grupoInventarioService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateGrupoInventarioDto: UpdateGrupoInventarioDto) {
        return this.grupoInventarioService.update(id, updateGrupoInventarioDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.grupoInventarioService.remove(id);
    }
}
