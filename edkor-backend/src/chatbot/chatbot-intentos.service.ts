import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatbotIntento, ChatbotAction } from './entities/chatbot-intento.entity';

@Injectable()
export class ChatbotIntentosService implements OnModuleInit {
    constructor(
        @InjectRepository(ChatbotIntento)
        private readonly intentoRepository: Repository<ChatbotIntento>,
    ) { }

    async onModuleInit() {
        try {
            await this.seedDefaults();
        } catch (err) {
            console.warn('Could not seed chatbot defaults:', err.message);
        }
    }

    async seedDefaults() {
        const count = await this.intentoRepository.count();
        if (count > 0) return;

        console.log('Seeding default chatbot intents...');
        const defaults = [
            {
                keywords: 'hola, buenos dias, info',
                action: ChatbotAction.TEXTO_LIBRE,
                active: true,
                replyTemplate: '¡Hola! Soy el asistente virtual de EDKOR MOTORS. Puedo ayudarte con información sobre horarios y servicios.'
            },
            {
                keywords: 'horario, atencion, hora',
                action: ChatbotAction.TEXTO_LIBRE,
                active: true,
                replyTemplate: 'Nuestro horario de atención es de Lunes a Viernes de 8:00 a 18:00.'
            },
            {
                keywords: 'direccion, ubicacion, donde',
                action: ChatbotAction.TEXTO_LIBRE,
                active: true,
                replyTemplate: 'Nos encontramos en la Av. Principal #123.'
            }
        ];

        for (const d of defaults) {
            await this.intentoRepository.save(this.intentoRepository.create(d));
        }
    }

    async create(createDto: Partial<ChatbotIntento>) {
        const intento = this.intentoRepository.create(createDto);
        return await this.intentoRepository.save(intento);
    }

    async findAll() {
        return await this.intentoRepository.find({
            order: { createdAt: 'DESC' }
        });
    }

    async findAllActive() {
        return await this.intentoRepository.find({
            where: { active: true }
        });
    }

    async update(id: number, updateDto: Partial<ChatbotIntento>) {
        await this.intentoRepository.update(id, updateDto);
        return this.intentoRepository.findOne({ where: { id } });
    }

    async remove(id: number) {
        return await this.intentoRepository.update(id, { active: false });
    }
}
