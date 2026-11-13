import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5433,
    username: 'postgres',
    password: 'postgrespg',
    database: 'taller',
});

async function createPreciosTallerTable() {
    await AppDataSource.initialize();

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    try {
        // Check if table exists
        const tableExists = await queryRunner.hasTable('precios_taller');

        if (!tableExists) {
            console.log('Creating precios_taller table...');

            await queryRunner.query(`
                CREATE TABLE precios_taller (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    idcategoria_servicio UUID NOT NULL,
                    detalle TEXT NOT NULL,
                    precio DECIMAL(12, 2) DEFAULT 0,
                    moneda TEXT NOT NULL,
                    estado TEXT DEFAULT 'activo',
                    CONSTRAINT fk_categoria_servicio 
                        FOREIGN KEY (idcategoria_servicio) 
                        REFERENCES categoria_servicio(id)
                )
            `);

            console.log('✅ Table precios_taller created successfully!');
        } else {
            console.log('ℹ️  Table precios_taller already exists.');
        }
    } catch (error) {
        console.error('❌ Error creating table:', error);
    } finally {
        await queryRunner.release();
        await AppDataSource.destroy();
    }
}

createPreciosTallerTable();
