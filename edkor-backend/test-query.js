const { Client } = require('pg');

async function testQuery() {
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

        console.log('Querying ordenes_trabajo...');
        const res = await client.query('SELECT * FROM ordenes_trabajo LIMIT 1');
        console.log('Query successful');
        console.log('Result:', res.rows);

    } catch (error) {
        console.error('Error executing query:', error);
    } finally {
        await client.end();
    }
}

testQuery();
