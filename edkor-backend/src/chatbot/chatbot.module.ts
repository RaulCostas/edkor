import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotIntento } from './entities/chatbot-intento.entity';
import { ChatbotIntentosService } from './chatbot-intentos.service';
import { ChatbotIntentosController } from './chatbot-intentos.controller';
import { InventarioModule } from '../inventario/inventario.module';
import { PagosGastosFijosModule } from '../pagos_gastos_fijos/pagos_gastos_fijos.module';
import { GastosFijosModule } from '../gastos_fijos/gastos_fijos.module';
import { ReportesModule } from '../reportes/reportes.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([ChatbotIntento]),
        InventarioModule,
        PagosGastosFijosModule,
        GastosFijosModule,
        ReportesModule,
    ],
    controllers: [ChatbotController, ChatbotIntentosController],
    providers: [ChatbotService, ChatbotIntentosService],
    exports: [ChatbotService],
})
export class ChatbotModule { }
