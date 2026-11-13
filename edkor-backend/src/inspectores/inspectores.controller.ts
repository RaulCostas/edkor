import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { InspectoresService } from './inspectores.service';
import { CreateInspectorDto } from './dto/create-inspector.dto';
import { UpdateInspectorDto } from './dto/update-inspector.dto';

@Controller('inspectores')
export class InspectoresController {
    constructor(private readonly inspectoresService: InspectoresService) { }

    @Post()
    create(@Body() createInspectorDto: CreateInspectorDto) {
        return this.inspectoresService.create(createInspectorDto);
    }

    @Get()
    findAll() {
        return this.inspectoresService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.inspectoresService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateInspectorDto: UpdateInspectorDto) {
        return this.inspectoresService.update(id, updateInspectorDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.inspectoresService.remove(id);
    }
}
