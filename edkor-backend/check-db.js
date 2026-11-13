// Check database schema
const { Client } = require('pg');

async function checkSchema() {
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

        // Check column names
        const columns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'trabajos_asignados'
            ORDER BY ordinal_position
        `);

        console.log('Columnas de trabajos_asignados:');
        columns.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

        // Check actual data
        console.log('\nDatos actuales:');
        const data = await client.query('SELECT * FROM trabajos_asignados');
        console.log(`Total registros: ${data.rowCount}\n`);

        data.rows.forEach((row, i) => {
            console.log(`Registro ${i + 1}:`);
            console.log(`  ID: ${row.id}`);
            console.log(`  iddetalle_orden_trabajo: ${row.iddetalle_orden_trabajo}`);
            console.log(`  idpersonal: ${row.idpersonal}`);
            console.log(`  monto: ${row.monto}`);
            console.log('');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

checkSchema();
