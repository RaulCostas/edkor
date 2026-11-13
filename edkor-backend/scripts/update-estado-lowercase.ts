import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

async function updateEstadoToLowercase() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);

    try {
        console.log('Actualizando estados a minúsculas...');

        const result = await dataSource.query(
            `UPDATE users SET estado = LOWER(estado) WHERE estado != LOWER(estado)`
        );

        console.log('✅ Estados actualizados exitosamente');
        console.log(`Registros actualizados: ${result[1] || 0}`);

    } catch (error) {
        console.error('❌ Error al actualizar estados:', error);
    } finally {
        await app.close();
    }
}

updateEstadoToLowercase();
