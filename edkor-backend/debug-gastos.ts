import { createConnection } from 'typeorm';
import { PagosGastosFijos } from './src/pagos_gastos_fijos/entities/pagos_gastos_fijos.entity';
import { GastosFijos } from './src/gastos_fijos/entities/gastos_fijos.entity';
import { FormaPago } from './src/forma-pago/entities/forma-pago.entity';
import { UnidadMedida } from './src/unidad-medida/entities/unidad-medida.entity';
import { GrupoInventario } from './src/grupo-inventario/entities/grupo-inventario.entity';
import { Inventario } from './src/inventario/entities/inventario.entity';

async function checkData() {
    const connection = await createConnection({
        type: 'postgres',
        host: 'localhost',
        port: 5433,
        username: 'postgres',
        password: 'postgrespg',
        database: 'taller',
        entities: [PagosGastosFijos, GastosFijos, FormaPago, UnidadMedida, GrupoInventario, Inventario],
    });

    const today = new Date().toISOString().split('T')[0];
    console.log('Today (ISO):', today);

    const pagos = await connection.getRepository(PagosGastosFijos).find({
        relations: ['gastoFijo']
    });

    console.log('\n--- Pagos Gastos Fijos (All) ---');
    pagos.forEach(p => {
        console.log(`Date: ${p.fecha}, Amount: ${p.monto}, Gasto: ${p.gastoFijo?.gasto_fijo}`);
    });

    const currentDay = new Date().getDate();
    const gastosProgramados = await connection.getRepository(GastosFijos).find({
        where: { dia: currentDay, estado: 'activo' }
    });

    console.log(`\n--- Gastos Fijos Programados para el día ${currentDay} ---`);
    gastosProgramados.forEach(g => {
        console.log(`Gasto: ${g.gasto_fijo}, Dia: ${g.dia}`);
    });

    await connection.close();
}

checkData().catch(console.error);
