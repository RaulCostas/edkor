const { Client } = require('pg');
require('dotenv').config();

async function removeCurrencyColumns() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });

    try {
        await client.connect();
        console.log('✓ Connected to database');

        // Remove moneda column from precios_seguros
        console.log('Removing moneda column from precios_seguros...');
        await client.query('ALTER TABLE precios_seguros DROP COLUMN IF EXISTS moneda');
        console.log('✓ Removed moneda from precios_seguros');

        // Remove moneda column from precios_taller
        console.log('Removing moneda column from precios_taller...');
        await client.query('ALTER TABLE precios_taller DROP COLUMN IF EXISTS moneda');
        console.log('✓ Removed moneda from precios_taller');

        console.log('\n✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Error executing migration:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

removeCurrencyColumns();
