
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'taller_db',
    synchronize: false,
});

async function checkComisiones() {
    await AppDataSource.initialize();

    // Using raw SQL
    const result = await AppDataSource.query(`
        SELECT * FROM comision_tarjeta
    `);

    console.log('--- Comisiones Tarjeta ---');
    console.table(result);

    await AppDataSource.destroy();
}

checkComisiones().catch(err => console.error(err));
