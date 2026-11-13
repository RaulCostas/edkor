import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';
import { ChatbotIntentosService } from './chatbot-intentos.service';
import pino from 'pino';
import * as fs from 'fs';
import * as path from 'path';
import { InventarioService } from '../inventario/inventario.service';
import { PagosGastosFijosService } from '../pagos_gastos_fijos/pagos_gastos_fijos.service';
import { GastosFijosService } from '../gastos_fijos/gastos_fijos.service';
import { ReportesService } from '../reportes/reportes.service';

@Injectable()
export class ChatbotService implements OnModuleInit, OnModuleDestroy {
    private sock: any;
    private readonly logger = new Logger(ChatbotService.name);
    private qrCode: string | null = null;
    private pairingCode: string | null = null;
    private isPairing: boolean = false;
    private isExplicitDisconnect: boolean = false;
    private status: 'disconnected' | 'connecting' | 'connected' | 'qr' | 'pairing' = 'disconnected';
    private saveCreds: any;

    constructor(
        private readonly dataSource: DataSource,
        private readonly intentosService: ChatbotIntentosService,
        private readonly inventarioService: InventarioService,
        private readonly pagosFijosService: PagosGastosFijosService,
        private readonly gastosFijosService: GastosFijosService,
        private readonly reportesService: ReportesService,
    ) { }

    onModuleInit() {
        const authPath = path.resolve('wa_auth_info');
        if (fs.existsSync(authPath) && fs.readdirSync(authPath).length > 0) {
            this.logger.log('Found existing session. Auto-initializing...');
            this.initialize();
        }
    }

    async onModuleDestroy() {
        if (this.sock) {
            this.sock.end(undefined);
        }
    }

    async initialize(phoneNumber?: string) {
        if (this.status === 'connected') {
            return { status: this.status };
        }

        // Limpiar socket previo si existía
        if (this.sock) {
            try {
                this.sock.end(undefined);
            } catch (e) {
                // ignore
            }
            this.sock = null;
        }

        this.status = 'connecting';
        this.isPairing = !!phoneNumber;
        this.isExplicitDisconnect = false;
        this.qrCode = null;
        this.pairingCode = null;

        try {
            this.logger.log('ChatbotService: Fetching latest WhatsApp Baileys version...');
            const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: undefined }));
            this.logger.log(`ChatbotService: Using Baileys version: ${JSON.stringify(version)}`);

            const authPath = path.resolve('wa_auth_info');
            const { state, saveCreds } = await useMultiFileAuthState(authPath);
            this.saveCreds = saveCreds;

            this.sock = makeWASocket({
                version,
                logger: pino({ level: 'silent' }) as any,
                printQRInTerminal: false,
                auth: state,
                connectTimeoutMs: 60000,
                retryRequestDelayMs: 2000,
                browser: Browsers.ubuntu('Chrome'),
                syncFullHistory: false,
            });

            this.logger.log('ChatbotService: Socket created successfully');

            this.sock.ev.on('connection.update', async (update: any) => {
                const { connection, lastDisconnect, qr } = update;
                this.logger.log(`ChatbotService: Connection update: ${connection}, qr: ${!!qr}`);

                if (qr && !this.isPairing) {
                    this.status = 'qr';
                    try {
                        this.qrCode = await QRCode.toDataURL(qr);
                        this.logger.log('ChatbotService: QR Code DataURL generated successfully');
                    } catch (qrErr) {
                        this.logger.error('Error generating QR DataURL:', qrErr);
                    }
                }

                if (connection === 'close') {
                    const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut && !this.isExplicitDisconnect;

                    this.logger.warn(`Connection closed. Status: ${statusCode}, Reconnect: ${shouldReconnect}`);

                    if (shouldReconnect) {
                        this.status = 'connecting';
                        setTimeout(() => this.initialize(phoneNumber), 3000);
                    } else {
                        this.status = 'disconnected';
                        this.qrCode = null;
                        this.logger.log('Session logged out or terminated.');
                    }
                } else if (connection === 'open') {
                    this.logger.log('WhatsApp connection opened successfully!');
                    this.status = 'connected';
                    this.qrCode = null;
                    this.pairingCode = null;
                }
            });

            this.sock.ev.on('creds.update', this.saveCreds);

            this.sock.ev.on('messages.upsert', async (m: any) => {
                if (!m.messages || m.messages.length === 0) return;

                for (const msg of m.messages) {
                    await this.handleMessage(msg);
                }
            });

            if (phoneNumber && !this.sock.authState.creds.registered) {
                this.status = 'pairing';
                setTimeout(async () => {
                    try {
                        const code = await this.sock.requestPairingCode(phoneNumber);
                        this.pairingCode = code;
                        this.logger.log(`Pairing code generated: ${code}`);
                    } catch (err) {
                        this.logger.error('Failed to generate pairing code', err);
                    }
                }, 3000);
            }

        } catch (error) {
            this.logger.error('Error initializing bot (Global Catch):', error);
            if (error instanceof Error) {
                this.logger.error('Stack:', error.stack);
            }
            this.status = 'disconnected';
        }

        return { status: this.status };
    }

    async handleMessage(msg: any) {
        const remoteJid = msg.key?.remoteJid;
        if (!remoteJid) return;

        // 1. Filtrar remitente:
        // Excluir estrictamente grupos, canales y estados/difusiones
        const isGroup = remoteJid.endsWith('@g.us');
        const isNewsletter = remoteJid.endsWith('@newsletter');
        const isBroadcast = remoteJid.endsWith('@broadcast') || remoteJid.includes('broadcast');

        if (isGroup || isNewsletter || isBroadcast) {
            return;
        }

        // Si es mensaje de protocolo o reacción, ignorar
        if (
            msg.message?.protocolMessage ||
            msg.message?.reactionMessage ||
            msg.message?.pollUpdateMessage
        ) {
            return;
        }

        // Si es un mensaje enviado por la propia cuenta (fromMe):
        // Permitir responder SOLO si es un chat consigo mismo ("Mensaje a ti mismo" para pruebas directas del usuario)
        const myJid = this.sock?.user?.id?.split(':')[0]?.split('@')[0] || '';
        const remotePhone = remoteJid.split('@')[0]?.split(':')[0] || '';
        const isSelfChat = msg.key.fromMe && Boolean(myJid) && remotePhone === myJid;

        if (msg.key.fromMe && !isSelfChat) {
            return;
        }

        // 2. Extraer texto del mensaje (soporta texto simple, extendido, efímero/temporal, botones, etc.)
        const rawMessage = msg.message;
        if (!rawMessage) return;

        const unwrapped =
            rawMessage.ephemeralMessage?.message ||
            rawMessage.viewOnceMessage?.message ||
            rawMessage.viewOnceMessageV2?.message ||
            rawMessage.documentWithCaptionMessage?.message ||
            rawMessage;

        const text =
            unwrapped.conversation ||
            unwrapped.extendedTextMessage?.text ||
            unwrapped.imageMessage?.caption ||
            unwrapped.videoMessage?.caption ||
            unwrapped.buttonsResponseMessage?.selectedButtonId ||
            unwrapped.listResponseMessage?.singleSelectReply?.selectedRowId ||
            '';

        if (!text || !text.trim()) return;

        // 3. Normalizar texto (elimina tildes, mayúsculas y caracteres especiales)
        const normalize = (str: string) =>
            str
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[¿?¡!.,;:_()\[\]{}"'\\\/]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

        const normalizedText = normalize(text);
        this.logger.log(`Mensaje recibido de ${remoteJid}: "${text}" -> Normalizado: "${normalizedText}"`);

        // Marcar mensaje como leído para simular presencia humana
        if (this.sock) {
            try {
                await this.sock.readMessages([msg.key]);
            } catch (err) {
                // Silencioso
            }
        }

        // 4. Consultas de Producción de Mecánicos de Planta
        const isProduccionQuery =
            normalizedText.includes('mi produccion') ||
            normalizedText === 'produccion' ||
            normalizedText.includes('mis horas') ||
            normalizedText.includes('mi acumulado') ||
            normalizedText.includes('horas acumuladas');

        const isDetalleOrdenesQuery =
            normalizedText.includes('detalle orden') ||
            normalizedText.includes('detalle de orden') ||
            normalizedText === 'detalle' ||
            normalizedText === 'detalles' ||
            normalizedText.includes('mis detalles');

        if (isProduccionQuery || isDetalleOrdenesQuery) {
            try {
                // Obtener número del remitente
                const rawSender = msg.key.participant || remoteJid || '';
                let senderDigits = rawSender.split('@')[0].split(':')[0].replace(/\D/g, '');

                // Si viene de un LID (@lid), resolver al número telefónico real usando el almacén de Baileys
                if (rawSender.includes('@lid')) {
                    try {
                        const authPath = path.resolve('wa_auth_info');
                        const reverseFile = path.join(authPath, `lid-mapping-${senderDigits}_reverse.json`);
                        if (fs.existsSync(reverseFile)) {
                            const content = fs.readFileSync(reverseFile, 'utf8');
                            const parsed = JSON.parse(content);
                            if (parsed) {
                                this.logger.log(`LID ${senderDigits} resuelto a teléfono real por reverse: ${parsed}`);
                                senderDigits = String(parsed).replace(/\D/g, '');
                            }
                        } else if (fs.existsSync(authPath)) {
                            // Buscar en mapeos directos si el reverse aún no se ha escrito
                            const files = fs.readdirSync(authPath).filter(f => f.startsWith('lid-mapping-') && !f.includes('_reverse'));
                            for (const file of files) {
                                try {
                                    const content = fs.readFileSync(path.join(authPath, file), 'utf8');
                                    const parsed = JSON.parse(content);
                                    if (String(parsed).replace(/\D/g, '') === senderDigits) {
                                        const phone = file.replace('lid-mapping-', '').replace('.json', '');
                                        this.logger.log(`LID ${senderDigits} resuelto a teléfono real por escaneo: ${phone}`);
                                        senderDigits = phone.replace(/\D/g, '');
                                        break;
                                    }
                                } catch {}
                            }
                        }
                    } catch (lidErr: any) {
                        this.logger.warn(`Error resolviendo LID mapping: ${lidErr?.message}`);
                    }
                }

                this.logger.log(`Remitente evaluado para Producción: raw=${rawSender}, digits=${senderDigits}`);

                // 1. Buscar todos los mecánicos activos de planta
                const mechanics: any[] = await this.dataSource.query(`
                    SELECT 
                        p.id, 
                        p.nombre, 
                        p.paterno, 
                        p.materno, 
                        p.tipo, 
                        p.celular, 
                        p.telefono, 
                        p.precio_hora, 
                        ap.area
                    FROM personal p
                    JOIN areas_personal ap ON ap.id = p.area_id
                    WHERE p.estado = 'activo'
                      AND LOWER(p.tipo) = 'planta'
                      AND (LOWER(ap.area) LIKE '%mecanic%' OR ap.id = 4);
                `);

                // 2. Vincular remitente con el mecánico
                const matchedMechanic = mechanics.find(m => {
                    const phones = [m.celular, m.telefono].filter(Boolean);
                    return phones.some(phone => {
                        const cleanP = String(phone).replace(/\D/g, '');
                        if (!cleanP || !senderDigits) return false;
                        if (cleanP === senderDigits) return true;
                        if (cleanP.endsWith(senderDigits) || senderDigits.endsWith(cleanP)) return true;
                        if (cleanP.length >= 8 && senderDigits.length >= 8) {
                            return cleanP.slice(-8) === senderDigits.slice(-8);
                        }
                        return false;
                    });
                });

                if (!matchedMechanic) {
                    const reply = `⚠️ *Acceso Restringido - Producción de Taller*\n\n` +
                        `Esta consulta es exclusiva para el *Personal de Planta* del área de *Mecánica*.\n\n` +
                        `El número remitente (+${senderDigits}) no coincide con ningún mecánico de planta activo registrado en el sistema.\n\n` +
                        `_Por favor solicita a Administración registrar tu número de celular en tu ficha de Personal._`;
                    await this.sendMessage(remoteJid, reply);
                    return;
                }

                // 3. Consultar órdenes acumuladas (Entregado por Cobrar / Orden Cerrada)
                const rows: any[] = await this.dataSource.query(`
                    SELECT 
                        ot.id as orden_id,
                        COALESCE(ot.vehiculo_placa, 'S/P') as placa,
                        COALESCE(ot.cliente_nombre, 'Cliente') as cliente,
                        ot.estado as estado_orden,
                        dot.id as detalle_id,
                        dot.detalle,
                        ROUND(COALESCE(dot.tiempo_estimado, 0)::numeric, 2) as horas,
                        ROUND(COALESCE(NULLIF(dot.precio_hora, 0), NULLIF(p.precio_hora, 0), 0)::numeric, 2) as precio_hora,
                        ROUND(COALESCE(
                            ta.monto,
                            (COALESCE(dot.tiempo_estimado, 0) * COALESCE(NULLIF(dot.precio_hora, 0), NULLIF(p.precio_hora, 0), 0))
                        )::numeric, 2) as subtotal
                    FROM detalle_orden_trabajo dot
                    JOIN ordenes_trabajo ot ON dot.idorden_trabajo = ot.id
                    JOIN personal p ON dot.idpersonal_mecanico = p.id
                    LEFT JOIN trabajos_asignados ta ON ta.iddetalle_orden_trabajo = dot.id
                    WHERE dot.idpersonal_mecanico = $1
                      AND (dot.estado_trabajo IS NULL OR dot.estado_trabajo != 'descartado')
                      AND (
                          LOWER(ot.estado) IN (
                              'entregado', 'entregado_con_saldo', 'entregado con saldo',
                              'entregado_por_pagar', 'entregado por pagar', 'entregado_por_cobrar', 'entregado por cobrar',
                              'cerrada', 'orden_cerrada', 'orden cerrada', 'finalizado', 'finalizada', 'terminado'
                          )
                          OR LOWER(ot.estado) LIKE '%entregad%'
                          OR LOWER(ot.estado) LIKE '%cerrad%'
                          OR LOWER(ot.estado) LIKE '%finalizad%'
                          OR LOWER(ot.estado) LIKE '%terminad%'
                      )
                      AND (ta.idpago_trabajo IS NULL)
                      AND (ta.cancelado IS NULL OR ta.cancelado = false)
                    ORDER BY ot.id DESC, dot.id ASC;
                `, [matchedMechanic.id]);

                // 4. Consultar resumen y detalle de trabajos en proceso
                const procesoDetalles: any[] = await this.dataSource.query(`
                    SELECT 
                        ot.id as orden_id,
                        COALESCE(ot.vehiculo_placa, 'S/P') as placa,
                        COALESCE(ot.cliente_nombre, 'Cliente') as cliente,
                        ot.estado as estado_orden,
                        dot.id as detalle_id,
                        dot.detalle,
                        ROUND(COALESCE(dot.tiempo_estimado, 0)::numeric, 2) as horas,
                        ROUND(COALESCE(NULLIF(dot.precio_hora, 0), NULLIF(p.precio_hora, 0), 0)::numeric, 2) as precio_hora,
                        ROUND((COALESCE(dot.tiempo_estimado, 0) * COALESCE(NULLIF(dot.precio_hora, 0), NULLIF(p.precio_hora, 0), 0))::numeric, 2) as subtotal
                    FROM detalle_orden_trabajo dot
                    JOIN ordenes_trabajo ot ON dot.idorden_trabajo = ot.id
                    JOIN personal p ON dot.idpersonal_mecanico = p.id
                    WHERE dot.idpersonal_mecanico = $1
                      AND (dot.estado_trabajo IS NULL OR dot.estado_trabajo != 'descartado')
                      AND (LOWER(ot.estado) LIKE '%proceso%' OR LOWER(ot.estado) = 'activo')
                    ORDER BY ot.id DESC, dot.id ASC;
                `, [matchedMechanic.id]);

                let totalHoras = 0;
                let totalMonto = 0;
                const ordenesMap = new Map<number, { nro: string; placa: string; cliente: string; estado: string; trabajos: any[] }>();

                for (const row of rows) {
                    const horasNum = Number(row.horas || 0);
                    const subtotalNum = Number(row.subtotal || 0);
                    totalHoras += horasNum;
                    totalMonto += subtotalNum;

                    if (!ordenesMap.has(row.orden_id)) {
                        ordenesMap.set(row.orden_id, {
                            nro: String(row.orden_id).padStart(6, '0'),
                            placa: row.placa,
                            cliente: row.cliente,
                            estado: row.estado_orden,
                            trabajos: []
                        });
                    }
                    ordenesMap.get(row.orden_id)!.trabajos.push({
                        detalle: row.detalle,
                        horas: horasNum,
                        precio_hora: Number(row.precio_hora),
                        subtotal: subtotalNum
                    });
                }

                // Agrupar trabajos en proceso por orden
                const procesoMap = new Map<number, { nro: string; placa: string; cliente: string; trabajos: any[] }>();
                let totalHorasProceso = 0;
                for (const row of procesoDetalles) {
                    const horasNum = Number(row.horas || 0);
                    totalHorasProceso += horasNum;

                    if (!procesoMap.has(row.orden_id)) {
                        procesoMap.set(row.orden_id, {
                            nro: String(row.orden_id).padStart(6, '0'),
                            placa: row.placa,
                            cliente: row.cliente,
                            trabajos: []
                        });
                    }
                    procesoMap.get(row.orden_id)!.trabajos.push({
                        detalle: row.detalle,
                        horas: horasNum,
                        precio_hora: Number(row.precio_hora),
                        subtotal: Number(row.subtotal || 0)
                    });
                }

                // CASO A: "mi produccion" (Resumen General)
                if (isProduccionQuery && !isDetalleOrdenesQuery) {
                    let reply = `👨‍🔧 *PRODUCCIÓN ACUMULADA - EDKOR MOTORS*\n`;
                    reply += `━━━━━━━━━━━━━━━━━━━━━\n`;
                    reply += `📊 *TOTAL GENERAL ACUMULADO A LA FECHA:*\n`;
                    reply += `🔢 *Órdenes completadas:* ${ordenesMap.size}\n`;
                    reply += `⏳ *Horas totales acumuladas:* *${totalHoras.toFixed(2)} Hrs*\n`;
                    reply += `💰 *Monto total a liquidar:* *Bs. ${totalMonto.toFixed(2)}*\n`;
                    reply += `━━━━━━━━━━━━━━━━━━━━━\n`;
                    reply += `🔧 *En Proceso actualmente:*\n`;
                    if (procesoDetalles.length > 0) {
                        reply += `Tienes ${procesoDetalles.length} trabajo(s) en curso (${totalHorasProceso.toFixed(2)} Hrs aprox.). Se sumarán a tu acumulado cuando las órdenes sean entregadas o cerradas.\n`;
                    } else {
                        reply += `No tienes trabajos en curso actualmente.\n`;
                    }
                    reply += `\n_Consulta el detalle de las Ordenes Acumuladas enviando "detalle ordenes"._\n`;
                    reply += `_Consulta tu acumulado día a día enviando "mi produccion"._`;

                    await this.sendMessage(remoteJid, reply);
                    return;
                }

                // CASO B: "detalle ordenes" (Desglose por Orden de Trabajo)
                if (isDetalleOrdenesQuery) {
                    let reply = `📋 *DETALLE DE ÓRDENES - EDKOR MOTORS*\n`;
                    reply += `━━━━━━━━━━━━━━━━━━━━━\n`;
                    reply += `✅ *ÓRDENES ACUMULADAS:*\n\n`;

                    if (ordenesMap.size === 0) {
                        reply += `_No tienes órdenes acumuladas en este momento._\n\n`;
                    } else {
                        let i = 1;
                        for (const [, ord] of ordenesMap.entries()) {
                            const totalHorasOT = ord.trabajos.reduce((acc, t) => acc + t.horas, 0);
                            const totalMontoOT = ord.trabajos.reduce((acc, t) => acc + t.subtotal, 0);
                            reply += `${i}. *OT N° ${ord.nro}* | Placa: *${ord.placa}*\n`;
                            ord.trabajos.forEach(t => {
                                reply += `   • ${t.detalle}: *${t.horas.toFixed(2)} Hrs* (x Bs. ${t.precio_hora.toFixed(2)} = Bs. ${t.subtotal.toFixed(2)})\n`;
                            });
                            reply += `   👉 _Subtotal OT: ${totalHorasOT.toFixed(2)} Hrs = *Bs. ${totalMontoOT.toFixed(2)}*_\n\n`;
                            i++;
                        }
                    }

                    reply += `━━━━━━━━━━━━━━━━━━━━━\n`;
                    reply += `🔧 *EN PROCESO ACTUALMENTE:*\n\n`;

                    if (procesoMap.size === 0) {
                        reply += `_No tienes trabajos en proceso actualmente._\n`;
                    } else {
                        let j = 1;
                        for (const [, ord] of procesoMap.entries()) {
                            const totalHorasProc = ord.trabajos.reduce((acc, t) => acc + t.horas, 0);
                            const totalMontoProc = ord.trabajos.reduce((acc, t) => acc + t.subtotal, 0);
                            reply += `${j}. *OT N° ${ord.nro}* | Placa: *${ord.placa}*\n`;
                            ord.trabajos.forEach(t => {
                                reply += `   • ${t.detalle}: *${t.horas.toFixed(2)} Hrs* (x Bs. ${t.precio_hora.toFixed(2)} = Bs. ${t.subtotal.toFixed(2)})\n`;
                            });
                            reply += `   👉 _Subtotal en Proceso: ${totalHorasProc.toFixed(2)} Hrs = *Bs. ${totalMontoProc.toFixed(2)}*_\n\n`;
                            j++;
                        }
                    }

                    reply += `━━━━━━━━━━━━━━━━━━━━━\n`;
                    reply += `_Consulta tu acumulado general enviando "mi produccion"._`;

                    await this.sendMessage(remoteJid, reply);
                    return;
                }

            } catch (error) {
                this.logger.error('Error querying mechanic production:', error);
                await this.sendMessage(remoteJid, 'Hubo un error al consultar tu producción. Por favor, intenta de nuevo.');
                return;
            }
        }

        // Check for "Hoja Diaria" query
        if (normalizedText.includes('hoja diaria')) {
            try {
                const now = new Date();
                const today = now.toISOString().split('T')[0];
                const res = await this.reportesService.getHojaDiaria(today);

                let reply = "📋 *HOJA DIARIA - RESUMEN DE HOY*\n";
                reply += `📅 Fecha: ${today}\n\n`;

                // Calculate Totals
                let totalIngresosBs = 0;
                let totalIngresosUsd = 0;
                res.ingresos.forEach(i => {
                    if (i.moneda === 'Bolivianos') totalIngresosBs += Number(i.monto);
                    else totalIngresosUsd += Number(i.monto);
                });

                let totalEgresosBs = 0;
                let totalEgresosUsd = 0;

                const sumEgresos = (list: any[], amountKey: string = 'monto') => {
                    list.forEach(item => {
                        const amount = Number(item[amountKey]);
                        const moneda = item.moneda || 'Bolivianos';
                        if (moneda === 'Bolivianos') totalEgresosBs += amount;
                        else totalEgresosUsd += amount;
                    });
                };

                sumEgresos(res.egresos);
                sumEgresos(res.pagosPersonal, 'total');
                sumEgresos(res.pagosProveedor.map(p => ({ ...p, monto: p.material_pedido?.total })));
                sumEgresos(res.pagosGastosFijos);
                sumEgresos(res.insumos, 'total');
                sumEgresos(res.anticipos);
                sumEgresos(res.pagosPlanillas);

                reply += "🟢 *INGRESOS:* \n";
                reply += `💰 Bs. ${totalIngresosBs.toFixed(2)}\n`;
                reply += `💰 $us. ${totalIngresosUsd.toFixed(2)}\n\n`;

                reply += "🔴 *EGRESOS TOTALES:* \n";
                reply += `💸 Bs. ${totalEgresosBs.toFixed(2)}\n`;
                reply += `💸 $us. ${totalEgresosUsd.toFixed(2)}\n\n`;

                reply += "──────────────────\n";
                reply += "⚖️ *SALDO NETO:* \n";
                reply += `*Bs. ${(totalIngresosBs - totalEgresosBs).toFixed(2)}*\n`;
                reply += `*$us. ${(totalIngresosUsd - totalEgresosUsd).toFixed(2)}*\n\n`;

                reply += "_Para ver detalles por categoría, consulta la web._";

                await this.sendMessage(remoteJid, reply);
                return;
            } catch (error) {
                this.logger.error('Error querying Hoja Diaria:', error);
                await this.sendMessage(remoteJid, 'Hubo un error al generar la Hoja Diaria. Por favor, intenta de nuevo.');
                return;
            }
        }

        // Check for "Gastos Fijos" query
        if (normalizedText.includes('gastos fijos')) {
            try {
                const now = new Date();
                const today = now.toISOString().split('T')[0];
                const currentDay = now.getDate();

                const pagos = await this.pagosFijosService.findAll(today);
                const programados = await this.gastosFijosService.findByDay(currentDay);

                let reply = "📊 *RESUMEN DE GASTOS FIJOS*\n";
                reply += `📅 Fecha: ${today}\n\n`;

                // 1. Mostrar Programados para hoy
                if (programados.length > 0) {
                    reply += `📅 *Gasto(s) Programado(s) para hoy (Día ${currentDay}):*\n`;
                    programados.forEach(g => {
                        const monto = Number(g.monto).toFixed(2);
                        const moneda = g.moneda === 'Bolivianos' ? 'Bs.' : '$us.';
                        reply += `• ${g.gasto_fijo}: ${monto} ${moneda}\n`;
                    });
                    reply += "\n";
                }

                // 2. Mostrar Pagos realizados hoy
                reply += "💰 *Pagos Registrados Hoy:* \n";
                if (pagos.length === 0) {
                    reply += "_No se han registrado pagos para hoy._\n";
                } else {
                    let totalBs = 0;
                    let totalUsd = 0;

                    pagos.forEach((p, index) => {
                        const desc = p.gastoFijo?.gasto_fijo || 'Gasto';
                        const monto = Number(p.monto).toFixed(2);
                        const moneda = p.moneda === 'Bolivianos' ? 'Bs.' : '$us.';

                        if (p.moneda === 'Bolivianos') totalBs += Number(p.monto);
                        else totalUsd += Number(p.monto);

                        reply += `${index + 1}. *${desc}*: ${monto} ${moneda}\n`;
                        if (p.observaciones) reply += `   _Obs: ${p.observaciones}_\n`;
                    });

                    reply += "\n──────────────────\n";
                    reply += `💰 *TOTAL BS:* ${totalBs.toFixed(2)} Bs.\n`;
                    reply += `💰 *TOTAL $US:* ${totalUsd.toFixed(2)} $us.\n`;
                }

                await this.sendMessage(remoteJid, reply);
                return;
            } catch (error) {
                this.logger.error('Error querying fixed expenses:', error);
                await this.sendMessage(remoteJid, 'Hubo un error al consultar los gastos fijos. Por favor, intenta de nuevo.');
                return;
            }
        }

        // Check for inventory queries first
        const inventoryKeywords = ['inventario', 'stock', 'cantidad', 'cuanto', 'cuanta', 'hay', 'tengo', 'existe', 'disponible'];
        const hasInventoryKeyword = inventoryKeywords.some(keyword => normalizedText.includes(keyword));

        if (hasInventoryKeyword) {
            // Extract product name from query
            // Remove common words to get the product name
            let productQuery = normalizedText
                .replace(/[¿?]/g, '')
                .replace(/\bcuanto(s)?\b/gi, '')
                .replace(/\bcuánto(s)?\b/gi, '')
                .replace(/\bcuanta(s)?\b/gi, '')
                .replace(/\bcuánta(s)?\b/gi, '')
                .replace(/\bhay\b/gi, '')
                .replace(/\btengo\b/gi, '')
                .replace(/\bexiste(n)?\b/gi, '')
                .replace(/\bdisponible(s)?\b/gi, '')
                .replace(/\ben el\b/gi, '')
                .replace(/\ben la\b/gi, '')
                .replace(/\ben\b/gi, '')
                .replace(/\bel\b/gi, '')
                .replace(/\bla\b/gi, '')
                .replace(/\bde\b/gi, '')
                .replace(/\binventario\b/gi, '')
                .replace(/\bstock\b/gi, '')
                .replace(/\bcantidad\b/gi, '')
                .trim();

            if (productQuery.length > 2) {
                try {
                    // Split the query into words and filter short or common words
                    const searchWords = productQuery
                        .split(/\s+/)
                        .filter(word => word.length > 2 || !isNaN(Number(word)))
                        .map(word => {
                            // Basic plural to singular (very simple for Spanish)
                            if (word.length > 4 && word.endsWith('s')) {
                                // If it ends in 'es', remove 'es', otherwise remove 's'
                                if (word.endsWith('es')) return word.slice(0, -2);
                                return word.slice(0, -1);
                            }
                            return word;
                        });

                    if (searchWords.length === 0) {
                        await this.sendMessage(remoteJid, `No entendí bien qué producto buscas. Prueba con palabras más específicas.`);
                        return;
                    }

                    // Build query to match all words
                    const builder = (this.inventarioService as any).inventarioRepository
                        .createQueryBuilder('inventario')
                        .leftJoinAndSelect('inventario.unidad_medida', 'unidad_medida')
                        .leftJoinAndSelect('inventario.grupo_inventario', 'grupo_inventario')
                        .where('inventario.estado = :estado', { estado: 'activo' });

                    searchWords.forEach((word, index) => {
                        builder.andWhere(`LOWER(inventario.descripcion) LIKE LOWER(:word${index})`, {
                            [`word${index}`]: `%${word}%`
                        });
                    });

                    const results = await builder.getMany();

                    if (results.length === 0) {
                        await this.sendMessage(remoteJid, `No encontré ningún producto con "${productQuery}" en el inventario.`);
                        return;
                    }

                    if (results.length === 1) {
                        const item = results[0];
                        const unidad = item.unidad_medida?.medida || 'unidades';
                        const stockStatus = item.cantidad_existente <= item.stock_minimo ? '⚠️ STOCK BAJO' : '✅';
                        const reply = `${stockStatus} *${item.descripcion}*\n` +
                            `Cantidad disponible: *${item.cantidad_existente} ${unidad}*\n` +
                            `Stock mínimo: ${item.stock_minimo} ${unidad}`;
                        await this.sendMessage(remoteJid, reply);
                        return;
                    }

                    if (results.length <= 5) {
                        let reply = `Encontré ${results.length} productos:\n\n`;
                        results.forEach((item, index) => {
                            const unidad = item.unidad_medida?.medida || 'unidades';
                            const stockStatus = item.cantidad_existente <= item.stock_minimo ? '⚠️' : '✅';
                            reply += `${index + 1}. ${stockStatus} *${item.descripcion}*\n`;
                            reply += `   Disponible: *${item.cantidad_existente} ${unidad}*\n\n`;
                        });
                        await this.sendMessage(remoteJid, reply);
                        return;
                    }

                    // Too many results
                    await this.sendMessage(remoteJid, `Encontré ${results.length} productos. Por favor, sé más específico en tu búsqueda.`);
                    return;
                } catch (error) {
                    this.logger.error('Error querying inventory:', error);
                    await this.sendMessage(remoteJid, 'Hubo un error al consultar el inventario. Por favor, intenta de nuevo.');
                    return;
                }
            }
        }

        // Find match in intents
        const intents = await this.intentosService.findAllActive();
        let reply = '';

        for (const intent of intents) {
            const rawKeywords = intent.keywords || '';
            const keywordList = rawKeywords
                .split(',')
                .map(k => normalize(k))
                .filter(k => k.length > 0);

            const matched = keywordList.some(k => {
                if (k.includes(' ')) {
                    return normalizedText.includes(k);
                }
                const regex = new RegExp(`(^|\\s)${k}(\\s|$)`, 'i');
                return regex.test(normalizedText) || normalizedText.includes(k);
            });

            if (matched && intent.replyTemplate) {
                reply = intent.replyTemplate;
                this.logger.log(`Coincidencia encontrada con intención #${intent.id} ("${intent.keywords}")`);
                break;
            }
        }

        if (reply) {
            await this.sendMessage(remoteJid, reply);
        } else {
            this.logger.log(`No se encontró coincidencia de intención para: "${normalizedText}"`);
        }
    }

    async sendMessage(jid: string, text: string) {
        if (!this.sock) return;

        try {
            // 1. Indicar presencia "escribiendo..." (los tres puntos "...")
            await this.sock.sendPresenceUpdate('composing', jid);

            // 2. Simular tiempo de escritura humano: mínimo 2 segundos (2000ms a 3500ms)
            // Esto evita que WhatsApp detecte respuestas instantáneas automáticas y bloquee el número
            const typingDelay = Math.min(Math.max(2000, text.length * 20), 3500);
            await new Promise((resolve) => setTimeout(resolve, typingDelay));

            // 3. Pausar el estado de escritura
            await this.sock.sendPresenceUpdate('paused', jid);

            // 4. Enviar el mensaje
            await this.sock.sendMessage(jid, { text });
        } catch (error) {
            this.logger.error(`Error sending message to ${jid}:`, error);
        }
    }

    async sendDocument(phoneNumber: string, pdfBuffer: Buffer, fileName: string, caption?: string) {
        if (!this.sock || this.status !== 'connected') {
            throw new Error('Bot is not connected');
        }

        try {
            // Format phone number to WhatsApp JID format
            // Remove any non-numeric characters
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            const jid = `${cleanPhone}@s.whatsapp.net`;

            // Breve presencia antes de enviar el documento
            try {
                await this.sock.sendPresenceUpdate('composing', jid);
                await new Promise((resolve) => setTimeout(resolve, 1500));
                await this.sock.sendPresenceUpdate('paused', jid);
            } catch (err) {
                // Silencioso si la presencia falla
            }

            // Send document
            await this.sock.sendMessage(jid, {
                document: pdfBuffer,
                mimetype: 'application/pdf',
                fileName: fileName,
                caption: caption || ''
            });

            this.logger.log(`Document sent successfully to ${phoneNumber}`);
            return { success: true, message: 'Document sent successfully' };
        } catch (error) {
            this.logger.error('Error sending document:', error);
            throw new Error('Failed to send document via WhatsApp');
        }
    }

    getStatus() {
        return { status: this.status, qr: this.qrCode, pairingCode: this.pairingCode };
    }

    async disconnect() {
        if (this.sock) {
            this.isExplicitDisconnect = true;
            this.sock.end(undefined);
            this.status = 'disconnected';
            this.qrCode = null;
        }
    }

    async resetSession() {
        await this.disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const authPath = path.resolve('wa_auth_info');
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true });
        }
    }
}
