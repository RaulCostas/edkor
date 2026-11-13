import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function createTableFormaPago() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    try {
        console.log('Creando tabla forma_pago...');

        // Intentar crear la tabla. TypeORM usa uuid_generate_v4() si la extensión está activa.
        // Si no, intentaremos con gen_random_uuid() en el catch block o asumiremos que typeorm sync lo arregla.

        await dataSource.query(`
            CREATE TABLE IF NOT EXISTS "forma_pago" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "forma_pago" text NOT NULL,
                "estado" text NOT NULL DEFAULT 'activo',
                CONSTRAINT "PK_forma_pago" PRIMARY KEY ("id")
            )
        `);
        console.log('✅ Tabla forma_pago creada exitosamente');
    } catch (error) {
        console.error('⚠️ Error inicial al crear tabla (posiblemente falta extensión uuid-ossp):', error.message);

        try {
            console.log('Intentando con gen_random_uuid()...');
            await dataSource.query(`
                CREATE TABLE IF NOT EXISTS "forma_pago" (
                    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                    "forma_pago" text NOT NULL,
                    "estado" text NOT NULL DEFAULT 'activo',
                    CONSTRAINT "PK_forma_pago" PRIMARY KEY ("id")
                )
            `);
            console.log('✅ Tabla forma_pago creada exitosamente con gen_random_uuid()');
        } catch (error2) {
            console.error('❌ Error fatal al crear tabla:', error2);
        }
    } finally {
        await app.close();
    }
}

createTableFormaPago();
