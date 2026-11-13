import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgrespg',
    database: process.env.DB_NAME || 'taller',
});

async function cleanOrdenesTrabajoData() {
    try {
        await AppDataSource.initialize();
        console.log('✓ Conectado a la base de datos');

        // Eliminar compra_insumos que referencian ordenes_trabajo
        await AppDataSource.query('DELETE FROM compra_insumos WHERE idorden_trabajo IS NOT NULL');
        console.log('✓ Compras de insumos relacionadas eliminadas');

        // Eliminar detalles primero (por la relación de clave foránea)
        await AppDataSource.query('DELETE FROM detalle_orden_trabajo');
        console.log('✓ Detalles de trabajo eliminados');

        // Eliminar órdenes de trabajo
        await AppDataSource.query('DELETE FROM ordenes_trabajo');
        console.log('✓ Órdenes de trabajo eliminadas');

        // Reiniciar secuencias
        await AppDataSource.query('ALTER SEQUENCE detalle_orden_trabajo_id_seq RESTART WITH 1');
        await AppDataSource.query('ALTER SEQUENCE ordenes_trabajo_id_seq RESTART WITH 1');
        console.log('✓ Secuencias reiniciadas');

        // Verificar
        const detallesCount = await AppDataSource.query('SELECT COUNT(*) as count FROM detalle_orden_trabajo');
        const ordenesCount = await AppDataSource.query('SELECT COUNT(*) as count FROM ordenes_trabajo');
        const comprasCount = await AppDataSource.query('SELECT COUNT(*) as count FROM compra_insumos WHERE idorden_trabajo IS NOT NULL');

        console.log(`\n📊 Resultado:`);
        console.log(`   - Detalles restantes: ${detallesCount[0].count}`);
        console.log(`   - Órdenes restantes: ${ordenesCount[0].count}`);
        console.log(`   - Compras relacionadas restantes: ${comprasCount[0].count}`);
        console.log('\n✅ Base de datos limpiada exitosamente');

        await AppDataSource.destroy();
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

cleanOrdenesTrabajoData();
