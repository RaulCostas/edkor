import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ChatbotIntentosService } from './chatbot-intentos.service';
import { ChatbotIntento } from './entities/chatbot-intento.entity';

@Controller('chatbot-intentos')
export class ChatbotIntentosController {
    constructor(private readonly intentosService: ChatbotIntentosService) { }

    @Post()
    create(@Body() createDto: Partial<ChatbotIntento>) {
        return this.intentosService.create(createDto);
    }

    @Get()
    findAll() {
        return this.intentosService.findAll();
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateDto: Partial<ChatbotIntento>) {
        return this.intentosService.update(+id, updateDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.intentosService.remove(+id);
    }
}
