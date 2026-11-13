
import { DataSource } from 'typeorm';
import { AreaPersonal } from './src/area-personal/entities/area-personal.entity';
import { CategoriaServicio } from './src/categoria-servicio/entities/categoria-servicio.entity';
import { ChatbotIntento } from './src/chatbot/entities/chatbot-intento.entity';
import { CompraInsumo } from './src/compra-insumos/entities/compra-insumo.entity';
import { Correo } from './src/correos/entities/correo.entity';
import { DetalleMaterialPedido } from './src/detalle-material-pedido/entities/detalle-material-pedido.entity';
import { DetalleOrdenTrabajo } from './src/detalle-orden-trabajo/entities/detalle-orden-trabajo.entity';
import { Egreso } from './src/egresos/entities/egreso.entity';
import { FormaPago } from './src/forma-pago/entities/forma-pago.entity';
import { GrupoInventario } from './src/grupo-inventario/entities/grupo-inventario.entity';
import { Inspector } from './src/inspectores/entities/inspector.entity';
import { Inventario } from './src/inventario/entities/inventario.entity';
import { MarcaAuto } from './src/marca-auto/entities/marca-auto.entity';
import { MaterialPedido } from './src/material-pedido/entities/material-pedido.entity';
import { MaterialUtilizado } from './src/material-utilizado/entities/material-utilizado.entity';
import { OrdenTrabajo } from './src/ordenes-trabajo/entities/orden-trabajo.entity';
import { PagoPedido } from './src/pago-pedidos/entities/pago-pedido.entity';
import { Personal } from './src/personal/entities/personal.entity';
import { PrecioSeguro } from './src/precios-seguros/entities/precio-seguro.entity';
import { PrecioTaller } from './src/precios-taller/entities/precio-taller.entity';
import { Proveedor } from './src/proveedores/entities/proveedor.entity';
import { Seguro } from './src/seguros/entities/seguro.entity';
import { TipoVehiculo } from './src/tipos-vehiculos/entities/tipo-vehiculo.entity';
import { TrabajoAsignado } from './src/trabajos-asignados/entities/trabajo-asignado.entity';
import { UnidadMedida } from './src/unidad-medida/entities/unidad-medida.entity';
import { User } from './src/users/entities/user.entity';
import { config } from 'dotenv';

config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgrespg',
    database: process.env.DB_NAME || 'taller',
    entities: [
        AreaPersonal, CategoriaServicio, ChatbotIntento, CompraInsumo, Correo,
        DetalleMaterialPedido, DetalleOrdenTrabajo, Egreso, FormaPago, GrupoInventario,
        Inspector, Inventario, MarcaAuto, MaterialPedido, MaterialUtilizado,
        OrdenTrabajo, PagoPedido, Personal, PrecioSeguro, PrecioTaller,
        Proveedor, Seguro, TipoVehiculo, TrabajoAsignado, UnidadMedida, User
    ],
    synchronize: false,
});

async function cleanDatabase() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();

        console.log('Connected. Checking existing tables...');
        const result = await queryRunner.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
        `);
        const existingTables = result.map((r: any) => r.table_name);
        console.log('Existing tables:', existingTables);

        // List of tables to truncate
        const potentialTargets = [
            'material_utilizado',
            'trabajos_asignados',
            'detalle_orden_trabajo',
            'ordenes_trabajo',
            'pago_pedidos',
            'detalle_material_pedido',
            'material_pedido',
            'compra_insumos',
            'inspectores',
            'precios_seguros',
            'seguros',
            'personal',
            'area_personal',
            'precios_taller',
            'categoria_servicio',
            'marca_auto',
            'tipos_vehiculos',
            'inventario',
            'grupo_inventario',
            'egresos',
            'forma_pago',
            'proveedores',
            'unidad_medida',
            'correos'
        ];

        const targets = potentialTargets.filter(t => existingTables.includes(t));

        await queryRunner.startTransaction();
        try {
            if (targets.length > 0) {
                console.log(`Truncating ${targets.length} tables: ${targets.join(', ')}`);
                // Query runner query accepts a single string, we must format it carefully.
                // TRUNCATE TABLE "t1", "t2" ...
                const tablesStr = targets.map(t => `"${t}"`).join(', ');
                await queryRunner.query(`TRUNCATE TABLE ${tablesStr} RESTART IDENTITY CASCADE`);
            } else {
                console.log('No matching tables found to truncate.');
            }

            // Verify users are preserved
            if (existingTables.includes('users')) {
                const userCount = await queryRunner.query(`SELECT COUNT(*) as count FROM users`);
                console.log(`Preserved ${userCount[0].count} users.`);
            }

            if (existingTables.includes('chatbot_intentos')) {
                const chatbotCount = await queryRunner.query(`SELECT COUNT(*) as count FROM chatbot_intentos`);
                console.log(`Preserved ${chatbotCount[0].count} chatbot intents.`);
            }

            await queryRunner.commitTransaction();
            console.log('Database cleaned successfully!');
        } catch (err) {
            console.error('Error cleaning database:', err);
            await queryRunner.rollbackTransaction();
        } finally {
            await queryRunner.release();
        }

    } catch (error) {
        console.error('Error during initialization:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

cleanDatabase();
