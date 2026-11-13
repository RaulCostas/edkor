import { Controller, Get, Post, Body, Patch, Param, Delete, Headers } from '@nestjs/common';
import { FaltasService } from './faltas.service';
import { CreateFaltaDto } from './dto/create-falta.dto';
import { UpdateFaltaDto } from './dto/update-falta.dto';

@Controller('faltas')
export class FaltasController {
    constructor(private readonly faltasService: FaltasService) { }

    @Post()
    create(@Body() createFaltaDto: CreateFaltaDto, @Headers('x-sucursal-id') sucursalId: string) {
        return this.faltasService.create(createFaltaDto, sucursalId ? +sucursalId : null);
    }

    @Get()
    findAll(@Headers('x-sucursal-id') sucursalId: string) {
        return this.faltasService.findAll(sucursalId ? +sucursalId : null);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.faltasService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateFaltaDto: UpdateFaltaDto) {
        return this.faltasService.update(+id, updateFaltaDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.faltasService.remove(+id);
    }
}
