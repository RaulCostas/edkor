
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

async function testInit() {
    console.log('Starting bot initialization test...');
    const authPath = path.resolve('wa_auth_info_test');
    console.log('Auth path:', authPath);

    try {
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        console.log('Auth state initialized');

        const sock = makeWASocket({
            logger: pino({ level: 'info' }),
            printQRInTerminal: true,
            auth: state,
        });

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            console.log('Connection update:', connection);
            if (qr) {
                console.log('QR Code generated!');
                process.exit(0);
            }
            if (connection === 'close') {
                console.log('Connection closed');
            }
        });

        console.log('Socket created, waiting for updates...');
    } catch (err) {
        console.error('Error during initialization:', err);
    }
}

testInit();
