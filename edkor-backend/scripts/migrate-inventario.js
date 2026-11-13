const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgrespg@localhost:5433/edkor'
  });
  await client.connect();

  console.log('Connected to database, running migration...');

  // 1. Columnas en inventario
  await client.query(`
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS stock_inicial DOUBLE PRECISION DEFAULT 0;
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS entradas DOUBLE PRECISION DEFAULT 0;
    ALTER TABLE inventario ADD COLUMN IF NOT EXISTS salidas DOUBLE PRECISION DEFAULT 0;
    UPDATE inventario SET stock_inicial = COALESCE(cantidad_existente, 0) WHERE stock_inicial IS NULL OR stock_inicial = 0;
    UPDATE inventario SET entradas = 0 WHERE entradas IS NULL;
    UPDATE inventario SET salidas = 0 WHERE salidas IS NULL;
  `);

  // 2. Columna cantidad en detalle_orden_trabajo
  await client.query(`
    ALTER TABLE detalle_orden_trabajo ALTER COLUMN cantidad TYPE DOUBLE PRECISION USING cantidad::DOUBLE PRECISION;
  `);

  // 3. Tabla inventario_lotes
  await client.query(`
    CREATE TABLE IF NOT EXISTS inventario_lotes (
      id SERIAL PRIMARY KEY,
      idinventario INTEGER NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
      idmaterial_pedido INTEGER,
      iddetalle_material_pedido INTEGER,
      fecha_ingreso TIMESTAMP DEFAULT NOW(),
      nro_lote VARCHAR(100),
      cantidad_inicial DOUBLE PRECISION NOT NULL,
      cantidad_disponible DOUBLE PRECISION NOT NULL,
      costo_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
      precio_venta_sugerido NUMERIC(12, 2) DEFAULT 0,
      estado VARCHAR(50) DEFAULT 'activo',
      observaciones TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 4. Tabla inventario_movimientos
  await client.query(`
    CREATE TABLE IF NOT EXISTS inventario_movimientos (
      id SERIAL PRIMARY KEY,
      idinventario INTEGER NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
      idlote INTEGER REFERENCES inventario_lotes(id) ON DELETE SET NULL,
      tipo_movimiento VARCHAR(50) NOT NULL,
      cantidad DOUBLE PRECISION NOT NULL,
      costo_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
      precio_venta_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
      idorden_trabajo INTEGER,
      iddetalle_orden_trabajo INTEGER,
      idmaterial_pedido INTEGER,
      fecha TIMESTAMP DEFAULT NOW(),
      saldo_stock_resultante DOUBLE PRECISION,
      observaciones TEXT,
      idusuario INTEGER
    );
  `);

  // 5. Para los ítems existentes en inventario, si tienen stock existente y no tienen lote, crearles un lote inicial
  const items = await client.query(`SELECT id, descripcion, cantidad_existente, precio_compra, precio_venta FROM inventario WHERE cantidad_existente > 0`);
  for (const item of items.rows) {
    const lotesExistentes = await client.query(`SELECT id FROM inventario_lotes WHERE idinventario = $1 LIMIT 1`, [item.id]);
    if (lotesExistentes.rows.length === 0) {
      const cant = Number(item.cantidad_existente || 0);
      const costo = Number(item.precio_compra || 0);
      const precioVenta = Number(item.precio_venta || 0);

      const loteRes = await client.query(`
        INSERT INTO inventario_lotes (idinventario, nro_lote, cantidad_inicial, cantidad_disponible, costo_unitario, precio_venta_sugerido, estado, observaciones)
        VALUES ($1, 'LOTE-INICIAL', $2, $2, $3, $4, 'activo', 'Inventario inicial del sistema')
        RETURNING id
      `, [item.id, cant, costo, precioVenta]);

      const loteId = loteRes.rows[0].id;
      await client.query(`
        INSERT INTO inventario_movimientos (idinventario, idlote, tipo_movimiento, cantidad, costo_unitario, precio_venta_unitario, saldo_stock_resultante, observaciones)
        VALUES ($1, $2, 'ENTRADA_INICIAL', $3, $4, $5, $3, 'Carga de stock inicial')
      `, [item.id, loteId, cant, costo, precioVenta]);
    }
  }

  console.log('Migration completed successfully!');
  await client.end();
}

migrate().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
