import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgrespg',
    database: process.env.DB_NAME || 'taller',
    entities: [],
    synchronize: false,
});

async function fixSchema() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected.');

        const queryRunner = AppDataSource.createQueryRunner();

        console.log('Altering table seguimiento_repuesto...');

        // Check if columns exist and try to alter them
        await queryRunner.query(`
            ALTER TABLE "seguimiento_repuesto" 
            ALTER COLUMN "recibido" TYPE text USING "recibido"::text,
            ALTER COLUMN "recibido" DROP DEFAULT,
            ALTER COLUMN "entregado" TYPE text USING "entregado"::text,
            ALTER COLUMN "entregado" DROP DEFAULT;
        `);

        console.log('Columns modified successfully.');
        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error fixing schema:', error);
    }
}

fixSchema();
