
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

async function addComisionFields() {
    await AppDataSource.initialize();

    console.log('Adding comision_tarjeta fields to pago_orden table...');

    try {
        await AppDataSource.query(`
            ALTER TABLE "pago_orden" 
            ADD COLUMN "idcomision_tarjeta" integer NULL,
            ADD COLUMN "monto_comision" decimal(12,2) DEFAULT 0;
        `);

        await AppDataSource.query(`
            ALTER TABLE "pago_orden"
            ADD CONSTRAINT "FK_pago_orden_comision_tarjeta" 
            FOREIGN KEY ("idcomision_tarjeta") 
            REFERENCES "comision_tarjeta"("id") 
            ON DELETE SET NULL;
        `);

        console.log('Successfully added fields and foreign key.');
    } catch (error) {
        console.error('Error adding fields (might already exist):', error.message);
    }

    await AppDataSource.destroy();
}

addComisionFields().catch(err => console.error(err));
