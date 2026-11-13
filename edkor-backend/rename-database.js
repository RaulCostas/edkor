const { Client } = require('pg');

async function renameDatabase() {
    // First connect to postgres database (not paravicini)
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'postgres',
        password: 'postgrespg',
        database: 'postgres' // Connect to default postgres database
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL');

        // Terminate all connections to paravicini database
        console.log('Terminating connections to paravicini database...');
        await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'paravicini'
        AND pid <> pg_backend_pid();
    `);

        // Rename the database
        console.log('Renaming database from paravicini to taller...');
        await client.query('ALTER DATABASE paravicini RENAME TO taller;');

        console.log('✅ Database successfully renamed to "taller"');
    } catch (error) {
        console.error('❌ Error renaming database:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

renameDatabase();
