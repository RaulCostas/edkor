
const http = require('http');

const fetchData = (path) => {
    return new Promise((resolve, reject) => {
        http.get(`http://localhost:3001${path}`, (resp) => {
            let data = '';
            resp.on('data', (chunk) => { data += chunk; });
            resp.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on("error", (err) => {
            reject(err);
        });
    });
};

const isInRange = (dateStr) => {
    if (!dateStr) return false;
    // Handle potential null/undefined dates
    const d = new Date(dateStr).toISOString().split('T')[0];
    return d >= '2026-01-01' && d <= '2026-01-30';
};

const run = async () => {
    try {
        const [
            resEgresos,
            resPersonal,
            resProveedores,
            resGastosFijos,
            resInsumos,
            resAnticipos,
            resPlanillas
        ] = await Promise.all([
            fetchData('/egresos'),
            fetchData('/pagos-trabajos-asignados'),
            fetchData('/pago-pedidos'),
            fetchData('/pagos-gastos-fijos'),
            fetchData('/compra-insumos'),
            fetchData('/anticipos'),
            fetchData('/pagos-planillas')
        ]);

        const egresosData = Array.isArray(resEgresos.data) ? resEgresos.data : (Array.isArray(resEgresos) ? resEgresos : []);

        // Filter
        const egresos = egresosData.filter(e => isInRange(e.fecha));
        const pPersonal = resPersonal.filter(p => isInRange(p.fecha_pago));
        const pProveedores = resProveedores.filter(p => isInRange(p.fecha));
        const pGastos = resGastosFijos.filter(gf => isInRange(gf.fecha));
        const insumos = resInsumos.filter(i => isInRange(i.fecha));
        const anticipos = resAnticipos.filter(a => isInRange(a.fecha));
        const planillas = resPlanillas.filter(p => isInRange(p.fecha_pago));

        console.log("SAMPLE EGRESO:", egresos[0]);
        console.log("SAMPLE PERSONAL:", pPersonal[0]);
        console.log("SAMPLE ANTICIPO:", anticipos[0]);
        console.log("SAMPLE PLANILLA:", planillas[0]);
        console.log("SAMPLE INSUMO:", insumos[0]);

        // Sum
        const sumVal = (arr, key = 'monto', currencyKey = 'moneda') => {
            return arr.reduce((acc, item) => {
                const currency = item[currencyKey];
                const amount = Number(item[key] || 0);
                if (currency === 'Bolivianos' || currency === 'Bs') {
                    return acc + amount;
                }
                return acc;
            }, 0);
        };

        const tEgresos = sumVal(egresos);
        const tPersonal = sumVal(pPersonal, 'total', 'moneda'); // Personal usually Bs
        const tProveedores = sumVal(pProveedores.map(p => ({ ...p, monto: p.material_pedido?.total })), 'monto', 'moneda');
        const tGastos = sumVal(pGastos);
        const tInsumos = sumVal(insumos, 'total', 'moneda'); // Insumos usually Bs? check entity
        const tAnticipos = sumVal(anticipos, 'monto', 'moneda'); // Anticipo has monto
        const tPlanillas = sumVal(planillas, 'monto', 'moneda'); // Planilla has monto

        // Insumos might rely on 'total' and assume Bolivianos if no currency field? 
        // Let's check typical structure or assume Bs for simplistic check.
        // Actually HojaDiaria.tsx uses: const tInsumos = calcTotalEgresos(insumos, 'total');
        // And calcTotalEgresos filters by currency.

        console.log('--- Breakdown (Bs) ---');
        console.log(`Egresos Diarios: ${tEgresos}`);
        console.log(`Personal (Trabajos): ${tPersonal}`);
        console.log(`Proveedores: ${tProveedores}`);
        console.log(`Gastos Fijos: ${tGastos}`);
        console.log(`Insumos: ${tInsumos}`);
        console.log(`Anticipos: ${tAnticipos}`);
        console.log(`Planillas: ${tPlanillas}`);
        console.log('----------------------');
        console.log(`TOTAL CALCULATED: ${tEgresos + tPersonal + tProveedores + tGastos + tInsumos + tAnticipos + tPlanillas}`);

    } catch (error) {
        console.error("Error:", error);
    }
};

run();
