const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgrespg',
    database: 'edkor',
});

async function run() {
    await client.connect();
    console.log('Connected to DB');

    // 1. Add codigo column
    await client.query('ALTER TABLE precios_taller ADD COLUMN IF NOT EXISTS codigo TEXT;');
    console.log('Column codigo added or already exists');

    // 2. Populate legacy rows with formatted code
    await client.query("UPDATE precios_taller SET codigo = 'PT-' || LPAD(id::text, 4, '0') WHERE codigo IS NULL OR codigo = '';");
    console.log('Existing rows populated with codigo');

    // 3. Create unique index on codigo
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_precios_taller_codigo ON precios_taller (LOWER(TRIM(codigo)));');
    console.log('Unique index on codigo created');

    // 4. Create unique index on detalle
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS uq_precios_taller_detalle ON precios_taller (LOWER(TRIM(detalle)));');
    console.log('Unique index on detalle created');

    const res = await client.query('SELECT id, codigo, detalle, estado FROM precios_taller ORDER BY id');
    console.log('Current rows in precios_taller:');
    console.table(res.rows);

    await client.end();
}

run().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
