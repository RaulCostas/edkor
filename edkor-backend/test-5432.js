const { Client } = require('pg');

async function test5432() {
    console.log('Testing connection on port 5432...');
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'postgres', // Start with default database
        user: 'postgres',
        password: 'root'      // Based on .env.sample
    });

    try {
        await client.connect();
        console.log('Conectado a puerto 5432 (database postgres)');

        const res = await client.query('SELECT datname FROM pg_database');
        console.log('Databases on 5432:', res.rows.map(r => r.datname));

    } catch (error) {
        console.error('Error on 5432:', error.message);
    } finally {
        await client.end();
    }
}

test5432();
