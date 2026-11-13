const { Client } = require('pg');

async function listTables() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        database: 'taller',
        user: 'postgres',
        password: 'postgrespg'
    });

    try {
        await client.connect();
        console.log('Conectado a la base de datos\n');

        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);

        console.log('Tablas encontradas:');
        res.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

listTables();
