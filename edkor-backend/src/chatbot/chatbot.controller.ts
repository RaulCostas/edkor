import { Controller, Get, Post, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChatbotService } from './chatbot.service';

@Controller('chatbot')
export class ChatbotController {
    constructor(private readonly chatbotService: ChatbotService) { }

    @Get('status')
    getStatus() {
        return this.chatbotService.getStatus();
    }

    @Post('initialize')
    async initialize(@Body() body?: { phoneNumber?: string }) {
        console.log('ChatbotController: Received initialize request', body);
        try {
            const phoneNumber = body?.phoneNumber;
            const result = await this.chatbotService.initialize(phoneNumber);
            console.log('ChatbotController: Initialize success, result:', result);
            return result;
        } catch (error: any) {
            console.error('ChatbotController: Initialize ERROR:', error.message, error.stack);
            throw error;
        }
    }

    @Post('disconnect')
    disconnect() {
        return this.chatbotService.disconnect();
    }

    @Post('send-document')
    @UseInterceptors(FileInterceptor('file'))
    async sendDocument(
        @UploadedFile() file: Express.Multer.File,
        @Body('phoneNumber') phoneNumber: string,
        @Body('caption') caption?: string
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }
        if (!phoneNumber) {
            throw new BadRequestException('Phone number is required');
        }

        return this.chatbotService.sendDocument(
            phoneNumber,
            file.buffer,
            file.originalname,
            caption
        );
    }

    @Post('reset')
    reset() {
        return this.chatbotService.resetSession();
    }
}
