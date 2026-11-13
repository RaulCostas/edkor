import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AreaPersonalService } from './area-personal.service';
import { CreateAreaPersonalDto } from './dto/create-area-personal.dto';
import { UpdateAreaPersonalDto } from './dto/update-area-personal.dto';

@Controller('area-personal')
export class AreaPersonalController {
    constructor(private readonly areaPersonalService: AreaPersonalService) { }

    @Post()
    create(@Body() createAreaPersonalDto: CreateAreaPersonalDto) {
        return this.areaPersonalService.create(createAreaPersonalDto);
    }

    @Get()
    findAll() {
        return this.areaPersonalService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.areaPersonalService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateAreaPersonalDto: UpdateAreaPersonalDto) {
        return this.areaPersonalService.update(id, updateAreaPersonalDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.areaPersonalService.remove(id);
    }
}
