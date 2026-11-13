import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ChatbotAction {
    TEXTO_LIBRE = 'TEXTO_LIBRE'
}

@Entity('chatbot_intentos')
export class ChatbotIntento {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    keywords: string; // Comma separated, e.g., "horario, atención, hora"

    @Column({
        type: 'enum',
        enum: ChatbotAction,
        default: ChatbotAction.TEXTO_LIBRE
    })
    action: ChatbotAction;

    @Column('text', { nullable: true })
    replyTemplate: string;

    @Column({ default: true })
    active: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
