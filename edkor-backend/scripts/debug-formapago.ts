
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

async function checkFormasPago() {
    await AppDataSource.initialize();

    const result = await AppDataSource.query(`
        SELECT * FROM forma_pago
    `);

    console.log('--- Formas Pago ---');
    console.table(result);

    await AppDataSource.destroy();
}

checkFormasPago().catch(err => console.error(err));
