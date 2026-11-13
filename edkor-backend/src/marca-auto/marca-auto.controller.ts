import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put } from '@nestjs/common';
import { MarcaAutoService } from './marca-auto.service';
import { CreateMarcaAutoDto } from './dto/create-marca-auto.dto';
import { UpdateMarcaAutoDto } from './dto/create-marca-auto.dto';

@Controller('marca-auto')
export class MarcaAutoController {
    constructor(private readonly marcaAutoService: MarcaAutoService) { }

    @Post()
    create(@Body() createMarcaAutoDto: CreateMarcaAutoDto) {
        return this.marcaAutoService.create(createMarcaAutoDto);
    }

    @Get('all')
    findAllMarcas() {
        return this.marcaAutoService.findAllMarcas();
    }

    @Get()
    findAll(
        @Query('search') search?: string,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
    ) {
        return this.marcaAutoService.findAll(search, limit, offset);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.marcaAutoService.findOne(+id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() updateMarcaAutoDto: UpdateMarcaAutoDto) {
        return this.marcaAutoService.update(+id, updateMarcaAutoDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.marcaAutoService.remove(+id);
    }

    @Patch(':id/reactivate')
    reactivate(@Param('id') id: string) {
        return this.marcaAutoService.reactivate(+id);
    }
}
