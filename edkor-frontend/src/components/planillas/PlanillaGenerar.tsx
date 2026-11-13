import { useState } from 'react';
import api from '../../services/api';
import Swal from 'sweetalert2';
import { Sliders, Save, Printer, Calendar, DollarSign, Info, Wrench } from 'lucide-react';
import type { Personal } from '../../types/personal';
import type { Anticipo } from '../../types/anticipo';
import type { Falta } from '../../types/falta';
import PlanillaPrintView from './PlanillaPrintView';

interface PlanillaItem extends Personal {
    dias_trabajados: number;
    faltas: number;
    bonos: number;
    descuentos: number;
    anticipos: number;
    horas_produccion: number;
    monto_produccion: number;
    liquido_pagable: number;
    is_mecanico?: boolean;
    produccion_detalles?: any[];
    detalle_anticipos?: Anticipo[];
    detalle_faltas?: Falta[];
}

const isMecanicoPlanta = (p: Partial<Personal>) => {
    const a = (p.area?.area || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const isMecArea = (a.includes('mecanic') || a.includes('taller')) && !a.includes('jefe') && !a.includes('asesor');
    return (p.tipo === 'Planta' || !p.tipo) && (isMecArea || Number(p.precio_hora || 0) > 0);
};

const PlanillaGenerar = () => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [planillaItems, setPlanillaItems] = useState<PlanillaItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [existingPlanillaId, setExistingPlanillaId] = useState<number | null>(null);

    const months = [
        { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
    ];

    const generatePlanilla = async () => {
        setLoading(true);
        try {
            // 1. Check if planilla exists
            const existingRes = await api.get(`/planillas`, { params: { mes: month, anio: year } });

            if (existingRes.data && existingRes.data.length > 0) {
                const planilla = existingRes.data[0];
                setExistingPlanillaId(planilla.id);

                if (planilla.estado === 'PAGADO') {
                    setPlanillaItems([]);
                    setExistingPlanillaId(null);
                    Swal.fire({
                        icon: 'warning',
                        title: 'Planilla Pagada',
                        text: `La planilla del ${month}/${year} ya se encuentra pagada y no puede ser modificada.`,
                    });
                    return;
                }

                // Map details back to PlanillaItem structure
                // Fetch details for tooltips even if planilla exists
                const [anticiposRes, faltasRes, produccionRes] = await Promise.all([
                    api.get('/anticipos'),
                    api.get('/faltas'),
                    api.get('/planillas/produccion-mecanicos', { params: { mes: month, anio: year } }).catch(() => ({ data: [] }))
                ]);

                const allAnticipos: Anticipo[] = anticiposRes.data;
                const allFaltas: Falta[] = faltasRes.data;
                const allProduccion: any[] = produccionRes.data || [];
                const selectedPeriod = `${year}-${String(month).padStart(2, '0')}`;

                // Map details back to PlanillaItem structure
                const items = planilla.detalles.map((d: any) => {
                    const personalAnticipos = allAnticipos.filter(a =>
                        a.personal_id === Number(d.personal.id) &&
                        a.mes_aplicacion === selectedPeriod &&
                        (a.estado === 'Pagado' || a.estado === 'Aprobado')
                    );

                    const personalFaltas = allFaltas.filter(f =>
                        f.personal_id === Number(d.personal.id) &&
                        f.fecha.startsWith(selectedPeriod)
                    );

                    const prod = allProduccion.find(pr => Number(pr.personal_id) === Number(d.personal.id));
                    const isMec = isMecanicoPlanta(d.personal);
                    const horasProd = Number(d.horas_produccion !== undefined && d.horas_produccion !== null ? d.horas_produccion : (prod ? prod.total_horas : 0));
                    const montoProd = Number(d.monto_produccion !== undefined && d.monto_produccion !== null ? d.monto_produccion : (prod ? prod.total_monto : 0));

                    return {
                        ...d.personal,
                        id: d.personal.id,
                        salario: Number(d.haber_basico),
                        dias_trabajados: d.dias_trabajados,
                        faltas: d.faltas,
                        bonos: Number(d.bonos),
                        descuentos: Number(d.descuentos),
                        anticipos: Number(d.anticipos),
                        horas_produccion: horasProd,
                        monto_produccion: montoProd,
                        liquido_pagable: Number(d.liquido_pagable),
                        is_mecanico: isMec,
                        produccion_detalles: prod?.detalles || [],
                        detalle_anticipos: personalAnticipos,
                        detalle_faltas: personalFaltas
                    };
                });

                setPlanillaItems(items);
                Swal.fire({
                    icon: 'info',
                    title: 'Planilla Existente',
                    text: `Se cargó la planilla guardada del ${month}/${year}.`,
                    timer: 1500,
                    showConfirmButton: false
                });
                return;
            }

            // 2. Generate new if not exists
            const [personalRes, anticiposRes, faltasRes, produccionRes] = await Promise.all([
                api.get('/personal'),
                api.get('/anticipos'),
                api.get('/faltas'),
                api.get('/planillas/produccion-mecanicos', { params: { mes: month, anio: year } }).catch(() => ({ data: [] }))
            ]);

            const personalPlanta = personalRes.data.filter((p: Personal) => p.tipo === 'Planta' && p.estado === 'activo');
            const allAnticipos: Anticipo[] = anticiposRes.data;
            const allFaltas: Falta[] = faltasRes.data;
            const allProduccion: any[] = produccionRes.data || [];

            if (personalPlanta.length === 0) {
                Swal.fire('Atención', 'No se encontró personal de planta activo.', 'warning');
                setPlanillaItems([]);
                return;
            }

            const selectedPeriod = `${year}-${String(month).padStart(2, '0')}`;
            setExistingPlanillaId(null);

            const items = personalPlanta.map((p: Personal) => {
                const personalAnticipos = allAnticipos.filter(a =>
                    a.personal_id === Number(p.id) &&
                    a.mes_aplicacion === selectedPeriod &&
                    (a.estado === 'Pagado' || a.estado === 'Aprobado')
                );

                const personalFaltas = allFaltas.filter(f =>
                    f.personal_id === Number(p.id) &&
                    f.fecha.startsWith(selectedPeriod)
                );

                const totalAnticipos = personalAnticipos.reduce((sum, a) => sum + Number(a.monto), 0);
                const countFaltas = personalFaltas.reduce((sum, f) => sum + Math.max(1, Number(f.dias) || 1), 0);
                const diasTrabajados = Math.max(0, 30 - countFaltas);

                const isMec = isMecanicoPlanta(p);
                const prod = allProduccion.find(pr => Number(pr.personal_id) === Number(p.id));
                const horasTrabajadas = prod ? Number(prod.total_horas) : 0;
                const montoProd = prod ? Number(prod.total_monto) : 0;

                const haberBasico = Number(p.salario) || 0;
                const salarioDiario = haberBasico / 30;
                const sueldoBasico = salarioDiario * diasTrabajados;

                const liquido = Math.max(0, sueldoBasico + montoProd - totalAnticipos);

                return {
                    ...p,
                    salario: haberBasico,
                    dias_trabajados: diasTrabajados,
                    faltas: countFaltas,
                    bonos: 0,
                    descuentos: 0,
                    anticipos: totalAnticipos,
                    horas_produccion: horasTrabajadas,
                    monto_produccion: montoProd,
                    liquido_pagable: liquido,
                    is_mecanico: isMec,
                    produccion_detalles: prod?.detalles || [],
                    detalle_anticipos: personalAnticipos,
                    detalle_faltas: personalFaltas
                };
            });

            setPlanillaItems(items);
            Swal.fire({
                icon: 'success',
                title: 'Planilla Generada',
                text: `Se calcularon ${items.length} empleados. No olvide guardar.`,
                timer: 1500,
                showConfirmButton: false
            });

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo generar la planilla', 'error');
        } finally {
            setLoading(false);
        }
    };

    const savePlanilla = async () => {
        if (planillaItems.length === 0) return;

        try {
            const total = planillaItems.reduce((sum, item) => sum + item.liquido_pagable, 0);

            const payload = {
                mes: month,
                anio: year,
                total_planilla: total,
                estado: 'BORRADOR',
                detalles: planillaItems.map(item => ({
                    personal_id: Number(item.id),
                    haber_basico: Number(item.salario || 0),
                    dias_trabajados: item.dias_trabajados,
                    faltas: item.faltas,
                    bonos: item.bonos,
                    descuentos: item.descuentos,
                    anticipos: item.anticipos,
                    horas_produccion: Number(item.horas_produccion || 0),
                    monto_produccion: Number(item.monto_produccion || 0),
                    liquido_pagable: item.liquido_pagable
                }))
            };

            if (existingPlanillaId) {
                await api.patch(`/planillas/${existingPlanillaId}`, payload);
                Swal.fire({
                    icon: 'success',
                    title: 'Guardado',
                    text: 'Cambios actualizados en la planilla',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                const res = await api.post('/planillas', payload);
                setExistingPlanillaId(res.data.id);
                Swal.fire({
                    icon: 'success',
                    title: 'Guardado',
                    text: 'Planilla guardada correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar la planilla', 'error');
        }
    };

    const handleInputChange = (id: string, field: keyof PlanillaItem, value: any) => {
        setPlanillaItems(current => current.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'faltas') {
                    updated.dias_trabajados = Math.max(0, 30 - value);
                } else if (field === 'dias_trabajados') {
                    updated.faltas = Math.max(0, 30 - value);
                }

                const salarioDiario = Number(item.salario || 0) / 30;
                const sueldoBasico = salarioDiario * updated.dias_trabajados;
                const montoProd = Number(item.monto_produccion || 0);

                updated.liquido_pagable = sueldoBasico + montoProd + Number(updated.bonos || 0) - Number(updated.descuentos || 0) - Number(updated.anticipos || 0);
                return updated;
            }
            return item;
        }));
    };

    const handlePrint = () => {
        window.print();
    };

    const totalPlanilla = planillaItems.reduce((sum, item) => sum + item.liquido_pagable, 0);

    return (
        <>
            <div className="space-y-6 print:hidden">
                {/* Controls */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="w-full md:w-48">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mes</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <select
                                    value={month}
                                    onChange={(e) => setMonth(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    {months.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="w-full md:w-32">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                            <input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                        <button
                            onClick={generatePlanilla}
                            disabled={loading}
                            className="w-full md:w-auto px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 font-medium cursor-pointer"
                        >
                            <Sliders size={20} />
                            Generar Planilla
                        </button>
                        {planillaItems.length > 0 && (
                            <>
                                <button
                                    onClick={savePlanilla}
                                    className="w-full md:w-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 font-medium cursor-pointer"
                                >
                                    <Save size={20} />
                                    {existingPlanillaId ? 'Actualizar Cambios' : 'Guardar Planilla'}
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="w-full md:w-auto px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 font-medium cursor-pointer"
                                    title="Abrir cuadro de diálogo de impresión"
                                >
                                    <Printer size={20} />
                                    Imprimir Planilla
                                </button>
                            </>
                        )}
                    </div>
                </div>

            {/* Table */}
            {planillaItems.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-100 dark:bg-gray-700 text-xs uppercase text-gray-600 dark:text-gray-300">
                                <tr>
                                    <th className="p-4 font-bold border-b dark:border-gray-600 text-center w-12">#</th>
                                    <th className="p-4 font-bold border-b dark:border-gray-600">Personal</th>
                                    <th className="p-4 font-bold border-b dark:border-gray-600">Area</th>
                                    <th className="p-4 font-bold border-b dark:border-gray-600 text-right">Haber Básico</th>
                                    <th className="p-4 font-bold border-b dark:border-gray-600 text-right">Horas Producción</th>
                                    <th className="p-4 font-bold border-b dark:border-gray-600 text-right w-32">Bonos</th>
                                    <th className="p-4 font-bold border-b dark:border-gray-600 text-right w-32">Descuentos</th>
                                    <th className="p-4 font-bold border-b dark:border-gray-600 text-center w-24">Faltas</th>
                                    <th className="p-4 font-bold border-b dark:border-gray-600 text-right w-32">Anticipos</th>
                                    <th className="p-4 font-bold border-b dark:border-gray-600 text-right bg-green-50 dark:bg-green-900/20">Líquido Pagable</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {planillaItems.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="p-4 text-center text-gray-500 dark:text-gray-400 font-medium">
                                            {index + 1}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900 dark:text-white">{item.nombre} {item.paterno}</div>
                                            <div className="text-xs text-gray-500">{item.ci}</div>
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-300 text-sm">
                                            {item.area?.area || 'Sin Asignar'}
                                        </td>
                                        {/* Haber Básico limpio */}
                                        <td className="p-4 text-right font-mono text-gray-700 dark:text-gray-300">
                                            <span className="font-semibold text-gray-900 dark:text-white">
                                                Bs {Number(item.salario || 0).toFixed(2)}
                                            </span>
                                        </td>
                                        {/* Nueva columna: Horas Producción */}
                                        <td className="p-4 text-right">
                                            {Number(item.monto_produccion || 0) > 0 || Number(item.horas_produccion || 0) > 0 ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-gray-900 dark:text-white font-mono">
                                                        Bs {Number(item.monto_produccion || 0).toFixed(2)}
                                                    </span>
                                                    <div className="mt-1 flex items-center justify-end gap-1 group relative">
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 cursor-pointer shadow-xs">
                                                            <Wrench size={11} className="text-amber-600 dark:text-amber-300" />
                                                            <span>{Number(item.horas_produccion || 0).toFixed(1)} hrs</span>
                                                            <Info size={11} className="text-amber-600 dark:text-amber-300" />
                                                        </span>
                                                        {item.produccion_detalles && item.produccion_detalles.length > 0 ? (
                                                            <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 min-w-[300px] max-w-sm text-left">
                                                                <div className="font-bold border-b border-gray-700 pb-1 mb-2 text-amber-400 flex items-center justify-between">
                                                                    <span>Órdenes Terminadas ({item.produccion_detalles.length})</span>
                                                                    <span>Total: {Number(item.horas_produccion || 0).toFixed(1)} hrs</span>
                                                                </div>
                                                                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                                                    {item.produccion_detalles.map((det: any, idx: number) => (
                                                                        <div key={idx} className="border-b border-gray-800 pb-1.5 last:border-0">
                                                                            <div className="font-semibold text-gray-200 flex justify-between">
                                                                                <span>OT #{det.orden_id} • {det.placa || 'S/P'}</span>
                                                                                <span className="text-gray-400 font-normal">{det.cliente || ''}</span>
                                                                            </div>
                                                                            <div className="text-[11px] text-gray-400 truncate">{det.detalle}</div>
                                                                            <div className="flex justify-between text-[11px] mt-0.5">
                                                                                <span className="text-gray-400">{det.horas}h × Bs {det.precio_hora}</span>
                                                                                <span className="font-mono text-amber-300 font-bold">Bs {Number(det.subtotal).toFixed(2)}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 min-w-max text-left">
                                                                <span className="text-gray-400 italic">0 órdenes terminadas este mes</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : item.is_mecanico ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="font-mono text-gray-500 dark:text-gray-400 text-sm">Bs 0.00</span>
                                                    <span className="text-[10px] text-gray-400">0.0 hrs</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-sm font-mono">-</span>
                                            )}
                                        </td>

                                        <td className="p-3">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.bonos}
                                                onChange={(e) => handleInputChange(item.id, 'bonos', Number(e.target.value))}
                                                className="w-full p-1 border rounded text-right focus:ring-green-500 focus:border-green-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.descuentos}
                                                onChange={(e) => handleInputChange(item.id, 'descuentos', Number(e.target.value))}
                                                className="w-full p-1 border rounded text-right focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            />
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex flex-col items-center justify-center group relative">
                                                <div className="flex items-center gap-1">
                                                    <span className={`font-semibold ${item.faltas > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                                        {item.faltas} {item.faltas === 1 ? 'día' : 'días'}
                                                    </span>
                                                    {item.faltas > 0 && <Info size={14} className="text-gray-400 cursor-help" />}
                                                </div>
                                                {item.faltas > 0 && (
                                                    <span className="text-[11px] font-mono text-red-500 dark:text-red-400 font-semibold">
                                                        -Bs {((Number(item.salario || 0) / 30) * item.faltas).toFixed(2)}
                                                    </span>
                                                )}
                                                {item.faltas > 0 && (
                                                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 min-w-max">
                                                        <div className="font-bold border-b border-gray-600 mb-1 pb-1">
                                                            Faltas Registradas ({item.faltas} {item.faltas === 1 ? 'día' : 'días'} = Bs {((Number(item.salario || 0) / 30) * item.faltas).toFixed(2)}):
                                                        </div>
                                                        {item.detalle_faltas && item.detalle_faltas.length > 0 ? (
                                                            <ul className="space-y-1">
                                                                {item.detalle_faltas.map((f, idx) => {
                                                                    const fDias = Math.max(1, Number(f.dias) || 1);
                                                                    return (
                                                                        <li key={idx} className="flex justify-between gap-4">
                                                                            <span>
                                                                                {new Date(f.fecha + 'T00:00:00').toLocaleDateString()}
                                                                                {fDias > 1 ? ` (${fDias} días)` : ''}
                                                                            </span>
                                                                            <span className="text-gray-300">{f.motivo || '-'}</span>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        ) : (
                                                            <div className="text-gray-400 italic">Sin detalles</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-end gap-2 group relative">
                                                <span className="font-medium text-gray-700 dark:text-gray-200">
                                                    {item.anticipos.toFixed(2)}
                                                </span>
                                                {item.anticipos > 0 && (
                                                    <>
                                                        <Info size={14} className="text-gray-400 cursor-help" />
                                                        <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 p-2 bg-gray-800 text-white text-xs rounded shadow-lg z-50 min-w-max text-left">
                                                            <div className="font-bold border-b border-gray-600 mb-1 pb-1">Anticipos Descontados:</div>
                                                            {item.detalle_anticipos && item.detalle_anticipos.length > 0 ? (
                                                                <ul className="space-y-1">
                                                                    {item.detalle_anticipos.map((a, idx) => (
                                                                        <li key={idx} className="flex justify-between gap-4">
                                                                            <span>{new Date(a.fecha).toLocaleDateString()}</span>
                                                                            <span className="font-mono text-green-400">Bs {Number(a.monto).toFixed(2)}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <div className="text-gray-400 italic">Sin detalles</div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 text-lg">
                                            {item.liquido_pagable.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-600">
                                <tr>
                                    <td colSpan={9} className="p-4 text-right font-bold text-gray-700 dark:text-gray-300 uppercase">Total Planilla:</td>
                                    <td className="p-4 text-right font-bold text-green-700 dark:text-green-400 text-xl">
                                        Bs {totalPlanilla.toFixed(2)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500 dark:text-gray-400">
                    <DollarSign className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No hay planilla generada</h3>
                    <p>Seleccione un mes y año, y haga clic en "Generar Planilla" para calcular los sueldos.</p>
                </div>
            )}
            </div>

            {planillaItems.length > 0 && (
                <div className="hidden print:block">
                    <PlanillaPrintView
                        mes={month}
                        anio={year}
                        items={planillaItems}
                        totalPlanilla={totalPlanilla}
                    />
                </div>
            )}
        </>
    );
};

export default PlanillaGenerar;
