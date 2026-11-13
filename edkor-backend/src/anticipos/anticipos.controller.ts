import { Controller, Get, Post, Body, Patch, Param, Delete, Headers } from '@nestjs/common';
import { AnticiposService } from './anticipos.service';
import { CreateAnticipoDto } from './dto/create-anticipo.dto';
import { UpdateAnticipoDto } from './dto/update-anticipo.dto';

@Controller('anticipos')
export class AnticiposController {
    constructor(private readonly anticiposService: AnticiposService) { }

    @Post()
    create(@Body() createAnticipoDto: CreateAnticipoDto, @Headers('x-sucursal-id') sucursalId: string) {
        return this.anticiposService.create(createAnticipoDto, sucursalId ? +sucursalId : null);
    }

    @Get()
    findAll(@Headers('x-sucursal-id') sucursalId: string) {
        return this.anticiposService.findAll(sucursalId ? +sucursalId : null);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.anticiposService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateAnticipoDto: UpdateAnticipoDto) {
        return this.anticiposService.update(+id, updateAnticipoDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.anticiposService.remove(+id);
    }
}
