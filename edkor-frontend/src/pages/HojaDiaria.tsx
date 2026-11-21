import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import CalendarWidget from '../components/CalendarWidget';
import ManualModal, { type ManualSection } from './ManualModal';
import { ClipboardList, Wallet, Users, ShoppingBag, Banknote, Landmark, Search, RefreshCw, Printer, Coins } from 'lucide-react';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';
import { getLocalDateString } from '../utils/dateUtils';
import type { OtroIngreso } from '../types/otroIngreso';

// Interfaces for TALLER
interface PagoOrden {
    id: number;
    fecha: string;
    monto: number;
    moneda: string;
    observacion: string;
    orden_trabajo: {
        id: number;
        cliente: string;
        marca_auto: { marca: string };
        modelo: string;
        placa: string;
    };
    forma_pago: { forma_pago: string };
    tc?: number;
    comision_tarjeta?: {
        monto: number;
        red_banco: string; // Adjusted based on TALLER entity if exists, or check standard
    };
}

interface Egreso {
    id: number;
    fecha: string;
    detalle: string;
    monto: number;
    moneda: string;
    formaPago?: { forma_pago: string };
}

interface PagoPersonal {
    id: number;
    fecha_pago: string;
    total: number;
    personal: { nombre: string; apellido_paterno: string };
    detalle?: string;
}

interface PagoProveedor {
    id: number;
    fecha: string;
    material_pedido: {
        total: number;
        proveedor: { proveedor: string };
        observaciones: string;
    };
    moneda: string;
    factura?: string;
    recibo?: string;
    forma_pago: { forma_pago: string };
}

interface PagoGastoFijo {
    id: number;
    fecha: string;
    monto: number;
    moneda: string;
    gastoFijo: { gasto_fijo: string };
    formaPago: { forma_pago: string };
    observaciones?: string;
}

interface Anticipo {
    id: number;
    fecha: string;
    monto: number;
    motivo: string;
    personal: { nombre: string; apellido_paterno: string };
    estado: string;
    moneda?: string; // Assuming entity might have it or default to Bs
}

interface PagoPlanillaItem {
    id: number;
    fecha_pago: string;
    monto: number;
    observaciones: string;
    planilla: { mes: number; anio: number };
    moneda?: string;
}

interface Summary {
    [key: string]: { Bs: number; Sus: number };
}

const HojaDiaria: React.FC = () => {
    // State
    const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Hoja Diaria',
            content: 'Resumen de movimientos financieros del día o rango de fechas seleccionado.'
        },
        {
            title: 'Pestañas',
            content: 'Navegue entre Ingresos (Pagos de Órdenes), Otros Ingresos (Ventas directas/Auxilios), Egresos Diarios, Pagos a Personal, Pagos a Proveedores y Gastos Fijos.'
        },
        {
            title: 'Búsqueda',
            content: 'Puede ver los datos de una fecha específica seleccionándola en el calendario, o buscar un rango de fechas usando el formulario de la derecha.'
        },
        {
            title: 'Impresión',
            content: 'Utilice el botón "Imprimir" para generar un reporte físico de la vista actual.'
        }
    ];

    // Range Search State
    const [rangeStart, setRangeStart] = useState<string>('');
    const [rangeEnd, setRangeEnd] = useState<string>('');
    const [searchMode, setSearchMode] = useState<'single' | 'range'>('single');

    const [activeTab, setActiveTab] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    // Data States
    const [ingresos, setIngresos] = useState<PagoOrden[]>([]);
    const [otrosIngresos, setOtrosIngresos] = useState<OtroIngreso[]>([]);
    const [egresos, setEgresos] = useState<Egreso[]>([]);
    const [pagosPersonal, setPagosPersonal] = useState<PagoPersonal[]>([]);
    const [anticiposList, setAnticiposList] = useState<Anticipo[]>([]);
    const [pagosPlanillasList, setPagosPlanillasList] = useState<PagoPlanillaItem[]>([]);
    const [pagosProveedores, setPagosProveedores] = useState<PagoProveedor[]>([]);
    const [gastosFijos, setGastosFijos] = useState<PagoGastoFijo[]>([]);

    // Derived states for filtering
    const sueldos = pagosPersonal.filter(p => p.detalle?.toLowerCase().includes('sueldo'));
    const adelantos = pagosPersonal.filter(p => p.detalle?.toLowerCase().includes('adelanto'));

    const tabs = [
        { label: "Ingresos (Órdenes)", icon: <Wallet size={16} /> },
        { label: "Otros Ingresos", icon: <Coins size={16} /> },
        { label: "Egresos Diarios", icon: <Banknote size={16} /> },
        { label: "Pagos a Personal", icon: <Users size={16} /> },
        { label: "Pagos a Proveedores", icon: <ShoppingBag size={16} /> },
        { label: "Gastos Fijos", icon: <Landmark size={16} /> },
        { label: "Sueldos", icon: <Users size={16} /> },
        { label: "Adelantos", icon: <Banknote size={16} /> }
    ];

    const fetchAllData = async (modeOverride?: 'single' | 'range') => {
        setLoading(true);
        try {
            const currentMode = modeOverride || searchMode;
            let startDateStr = '';
            let endDateStr = '';

            if (currentMode === 'single') {
                startDateStr = selectedDate;
                endDateStr = selectedDate;
            } else {
                if (!rangeStart || !rangeEnd) {
                    Swal.fire('Atención', 'Seleccione ambas fechas para el rango', 'warning');
                    setLoading(false);
                    return;
                }
                startDateStr = rangeStart;
                endDateStr = rangeEnd;
            }

            // Client-side filtering check
            const isInRange = (dateStr: string) => {
                const d = getLocalDateString(dateStr);
                return d >= startDateStr && d <= endDateStr;
            };

            const [
                resIngresos,
                resOtrosIngresos,
                resEgresos,
                resPersonal,
                resProveedores,
                resGastosFijos,
                resAnticipos,
                resPlanillas
            ] = await Promise.all([
                api.get('/pago-orden'),
                api.get('/otros-ingresos'),
                api.get('/egresos'),
                api.get('/pagos-trabajos-asignados'),
                api.get('/pago-pedidos'),
                api.get('/pagos-gastos-fijos'),
                api.get('/anticipos'),
                api.get('/pagos-planillas')
            ]);

            // Filter Ingresos (Órdenes)
            setIngresos(resIngresos.data.filter((i: PagoOrden) => isInRange(i.fecha)));

            // Filter Otros Ingresos
            const otrosIngresosData = Array.isArray(resOtrosIngresos.data) ? resOtrosIngresos.data : [];
            setOtrosIngresos(otrosIngresosData.filter((oi: OtroIngreso) => isInRange(oi.fecha)));

            // Filter Egresos
            const egresosData = Array.isArray(resEgresos.data.data) ? resEgresos.data.data : (Array.isArray(resEgresos.data) ? resEgresos.data : []);
            setEgresos(egresosData.filter((e: Egreso) => isInRange(e.fecha)));

            // Filter Personal
            setPagosPersonal(resPersonal.data.filter((p: PagoPersonal) => isInRange(p.fecha_pago)));

            // Filter Proveedores
            setPagosProveedores(resProveedores.data.filter((p: PagoProveedor) => isInRange(p.fecha)));

            // Filter Gastos Fijos
            setGastosFijos(resGastosFijos.data.filter((gf: PagoGastoFijo) => isInRange(gf.fecha)));

            // Filter Anticipos
            setAnticiposList(resAnticipos.data.filter((a: Anticipo) => isInRange(a.fecha)));

            // Filter Planillas
            setPagosPlanillasList(resPlanillas.data.filter((p: PagoPlanillaItem) => isInRange(p.fecha_pago)));

        } catch (error) {
            console.error("Error fetching Hoja Diaria:", error);
            Swal.fire('Error', 'No se pudieron cargar los datos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Effect for single date change
    useEffect(() => {
        if (searchMode === 'single') {
            fetchAllData();
        }
    }, [selectedDate, searchMode]);

    const handleCalendarSelect = (dateStr: string) => {
        setSelectedDate(dateStr);
        setSearchMode('single'); // Switch to single mode
    };

    const handleRangeSearch = () => {
        if (!rangeStart || !rangeEnd) {
            Swal.fire('Campos requeridos', 'Por favor seleccione fecha inicio y fecha fin', 'warning');
            return;
        }
        setSearchMode('range');
        fetchAllData('range');
    };

    // Helper function to generate filter info text
    const getFilterInfoText = (): string => {
        const formatDateDisplay = (dateStr: string) => {
            if (!dateStr) return '';
            const [y, m, d] = dateStr.split('-');
            return `${d}/${m}/${y}`;
        };

        if (searchMode === 'single') {
            return `Fecha: ${formatDateDisplay(selectedDate)}`;
        } else {
            return `Rango: ${formatDateDisplay(rangeStart)} al ${formatDateDisplay(rangeEnd)}`;
        }
    };

    const formatMoney = (amount: number, currency: string) => {
        const symbol = currency === 'Dólares' ? '$us' : 'Bs';
        return `${symbol} ${Number(amount).toFixed(2)}`;
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        // adjust for timezone issue if needed, but assuming direct string split is safer for YYYY-MM-DD
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
        return date.toLocaleDateString();
    };


    const calculateSummary = (items: any[], type: 'ingreso' | 'otro_ingreso' | 'egreso' | 'personal' | 'proveedor' | 'gasto' | 'anticipo' | 'planilla'): Summary => {
        return items.reduce((acc, item) => {
            let currency = item.moneda || 'Bolivianos';
            let amount = 0;
            let method = '';

            if (type === 'ingreso' || type === 'otro_ingreso') {
                amount = Number(item.monto || 0);
                method = item.forma_pago?.forma_pago || 'Desconocido';
            } else if (type === 'egreso') {
                amount = Number(item.monto);
                method = item.formaPago?.forma_pago || 'Desconocido';
            } else if (type === 'personal') {
                amount = Number(item.total);
                method = 'Desconocido'; // Personal doesn't seem to have forma_pago in entity yet
                currency = 'Bolivianos'; // Default
            } else if (type === 'proveedor') {
                amount = Number(item.material_pedido?.total || 0);
                method = item.forma_pago?.forma_pago || 'Desconocido';
            } else if (type === 'gasto') {
                amount = Number(item.monto);
                method = item.formaPago?.forma_pago || 'Desconocido';
            }

            if (!acc[method]) {
                acc[method] = { Bs: 0, Sus: 0 };
            }

            if (currency === 'Bolivianos') {
                acc[method].Bs += amount;
            } else {
                acc[method].Sus += amount;
            }

            return acc;
        }, {} as Summary);
    };

    const generateSummaryHTML = (summary: Summary): string => {
        const entries = Object.entries(summary);
        if (entries.length === 0) return '<p style="color: #666; font-style: italic;">No hay datos para el resumen.</p>';

        const totalBs = entries.reduce((acc, [, totals]) => acc + totals.Bs, 0);
        const totalSus = entries.reduce((acc, [, totals]) => acc + totals.Sus, 0);

        return `
            <div style="background-color: #f8f9fa; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-top: 20px;">
                <h3 style="font-size: 14px; font-weight: bold; color: #2c3e50; margin: 0 0 15px 0; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Resumen por Forma de Pago</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
                ${entries.map(([method, totals]) => `
                    <div style="background-color: white; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0;">
                        <div style="font-weight: bold; color: #333; margin-bottom: 5px; font-size: 11px;">${method}</div>
                        <div style="display: flex; justify-content: space-between; font-size: 11px;">
                            <span>Bs: <strong style="color: #2563eb;">${totals.Bs.toFixed(2)}</strong></span>
                            <span>$us: <strong style="color: #16a34a;">${totals.Sus.toFixed(2)}</strong></span>
                        </div>
                    </div>
                `).join('')}
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 2px solid #333; font-weight: bold;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span>Total Bs: ${totalBs.toFixed(2)}</span>
                        <span>Total $us: ${totalSus.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    };

    // --- PRINT HANDLERS ---
    // (Simulating print by opening new window with styled content)
    const printWindow = (title: string, content: string) => {
        const win = window.open('', '', 'width=900,height=600');
        if (win) {
            win.document.write(`
                <html>
                    <head>
                        <title>${title}</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                            th { background-color: #f2f2f2; }
                            h1 { color: #333; font-size: 18px; }
                            .header { margin-bottom: 20px; border-bottom: 2px solid #3366cc; padding-bottom: 10px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>${title} - TALLER</h1>
                            <p>${getFilterInfoText()}</p>
                        </div>
                        ${content}
                    </body>
                </html>
            `);
            win.document.close();
            win.print();
        }
    };

    const handlePrintIngresos = () => {
        const summary = calculateSummary(ingresos, 'ingreso');
        const rows = ingresos.map(i => `
            <tr>
                <td>${formatDateDisplay(i.fecha)}</td>
                <td>${i.orden_trabajo?.cliente || '-'}</td>
                <td>OT-${i.orden_trabajo?.id}</td>
                <td>${formatMoney(Number(i.monto), i.moneda)}</td>
                <td>${i.forma_pago?.forma_pago || 'N/A'}</td>
                <td>${i.observacion || '-'}</td>
            </tr>
        `).join('');

        const table = `
            <table>
                <thead>
                    <tr><th>Fecha</th><th>Cliente</th><th>Orden #</th><th>Monto</th><th>Forma Pago</th><th>Obs</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            ${generateSummaryHTML(summary)}
        `;
        printWindow('Reporte de Ingresos', table);
    };

    const handlePrintOtrosIngresos = () => {
        const summary = calculateSummary(otrosIngresos, 'otro_ingreso');
        const rows = otrosIngresos.map(oi => `
            <tr>
                <td>${formatDateDisplay(oi.fecha)}</td>
                <td>${String(oi.nro || oi.id).padStart(6, '0')}</td>
                <td>${oi.tipo_ingreso || 'Venta'}</td>
                <td>${oi.motivo}</td>
                <td>${formatMoney(Number(oi.monto || 0), oi.moneda)}</td>
                <td>${oi.forma_pago?.forma_pago || 'N/A'}</td>
                <td>${oi.cliente || '-'}${oi.placa ? ` (${oi.placa})` : ''}</td>
                <td>${oi.observacion || '-'}</td>
            </tr>
        `).join('');

        const table = `
            <table>
                <thead>
                    <tr><th>Fecha</th><th>N°</th><th>Tipo</th><th>Motivo</th><th>Monto</th><th>Forma Pago</th><th>Cliente/Placa</th><th>Obs</th></tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
            ${generateSummaryHTML(summary)}
        `;
        printWindow('Reporte de Otros Ingresos', table);
    };

    const handlePrintEgresos = () => {
        const filtered = egresos;
        const summary = calculateSummary(filtered, 'egreso');
        const rows = filtered.map(e => `
            <tr>
                <td>${formatDateDisplay(e.fecha)}</td>
                <td>${e.detalle}</td>
                <td>${formatMoney(Number(e.monto), e.moneda)}</td>
                <td>${e.formaPago?.forma_pago || 'N/A'}</td>
            </tr>
        `).join('');
        const table = `
            <table>
                <thead><tr><th>Fecha</th><th>Detalle</th><th>Monto</th><th>Forma Pago</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            ${generateSummaryHTML(summary)}
        `;
        printWindow('Reporte de Egresos', table);
    };

    const handlePrintPersonal = () => {
        // Combined report for Personal
        const summaryPersonal = calculateSummary(pagosPersonal, 'personal');
        const summaryAnticipos = calculateSummary(anticiposList, 'anticipo');
        const summaryPlanillas = calculateSummary(pagosPlanillasList, 'planilla');

        let htmlContent = '';

        if (pagosPersonal.length > 0) {
            const rows = pagosPersonal.map(p => `
                <tr>
                    <td>${formatDateDisplay(p.fecha_pago)}</td>
                    <td>${p.personal?.nombre} ${p.personal?.apellido_paterno}</td>
                    <td>${formatMoney(Number(p.total), 'Bolivianos')}</td>
                    <td>${p.detalle || 'Pago Trabajo'}</td>
                </tr>
            `).join('');
            htmlContent += `
                <h3>Pagos por Trabajos</h3>
                <table>
                    <thead><tr><th>Fecha</th><th>Personal</th><th>Monto</th><th>Detalle</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }

        if (anticiposList.length > 0) {
            const rows = anticiposList.map(a => `
                <tr>
                    <td>${formatDateDisplay(a.fecha)}</td>
                    <td>${a.personal?.nombre} ${a.personal?.apellido_paterno}</td>
                    <td>${formatMoney(Number(a.monto), 'Bolivianos')}</td>
                    <td>${a.motivo}</td>
                </tr>
            `).join('');
            htmlContent += `
                <h3>Adelantos</h3>
                <table>
                    <thead><tr><th>Fecha</th><th>Personal</th><th>Monto</th><th>Motivo</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }

        if (pagosPlanillasList.length > 0) {
            const rows = pagosPlanillasList.map(p => `
                <tr>
                    <td>${formatDateDisplay(p.fecha_pago)}</td>
                    <td>Planilla ${p.planilla?.mes}/${p.planilla?.anio}</td>
                    <td>${formatMoney(Number(p.monto), 'Bolivianos')}</td>
                    <td>${p.observaciones || '-'}</td>
                </tr>
            `).join('');
            htmlContent += `
                <h3>Pago de Sueldos (Planillas)</h3>
                <table>
                    <thead><tr><th>Fecha</th><th>Periodo</th><th>Monto</th><th>Obs</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            `;
        }

        // Combined Summary
        const totalBs = (Object.values(summaryPersonal).reduce((a, b) => a + b.Bs, 0) +
            Object.values(summaryAnticipos).reduce((a, b) => a + b.Bs, 0) +
            Object.values(summaryPlanillas).reduce((a, b) => a + b.Bs, 0));

        htmlContent += `
            <div style="margin-top:20px; font-weight:bold; font-size:14px; text-align:right;">
                Total Pagado a Personal: ${formatMoney(totalBs, 'Bolivianos')}
            </div>
        `;

        printWindow('Pagos a Personal (Completo)', htmlContent);
    };

    const handlePrintProveedores = () => {
        const summary = calculateSummary(pagosProveedores, 'proveedor');
        const rows = pagosProveedores.map(p => `
            <tr>
                <td>${formatDateDisplay(p.fecha)}</td>
                <td>${p.material_pedido?.proveedor?.proveedor || '-'}</td>
                <td>${formatMoney(p.material_pedido?.total || 0, p.moneda)}</td>
                <td>${p.forma_pago?.forma_pago || 'N/A'}</td>
                <td>${p.factura ? 'F:' + p.factura : ''} ${p.recibo ? 'R:' + p.recibo : ''}</td>
            </tr>
        `).join('');
        const table = `
            <table>
                <thead><tr><th>Fecha</th><th>Proveedor</th><th>Monto</th><th>Forma Pago</th><th>Doc</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            ${generateSummaryHTML(summary)}
        `;
        printWindow('Pagos a Proveedores', table);
    };

    const handlePrintGastos = () => {
        const filtered = gastosFijos;
        const summary = calculateSummary(filtered, 'gasto');
        const rows = filtered.map(g => `
            <tr>
                <td>${formatDateDisplay(g.fecha)}</td>
                <td>${g.gastoFijo?.gasto_fijo}</td>
                <td>${formatMoney(Number(g.monto), g.moneda)}</td>
                <td>${g.formaPago?.forma_pago || 'N/A'}</td>
            </tr>
        `).join('');
        const table = `
            <table>
                 <thead><tr><th>Fecha</th><th>Gasto</th><th>Monto</th><th>Forma Pago</th></tr></thead>
                 <tbody>${rows}</tbody>
             </table>
            ${generateSummaryHTML(summary)}
        `;
        printWindow('Gastos Fijos', table);
    };


    // Calculate Grand Totals for Summary
    const totalIngresosOrdenesBs = ingresos.filter(i => i.moneda === 'Bolivianos').reduce((acc, curr) => acc + Number(curr.monto), 0);
    const totalIngresosOrdenesSus = ingresos.filter(i => i.moneda === 'Dólares').reduce((acc, curr) => acc + Number(curr.monto), 0);

    const totalOtrosIngresosBs = otrosIngresos.filter(i => (i.moneda || 'Bolivianos') === 'Bolivianos').reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
    const totalOtrosIngresosSus = otrosIngresos.filter(i => i.moneda === 'Dólares').reduce((acc, curr) => acc + Number(curr.monto || 0), 0);

    const totalIngresosBs = totalIngresosOrdenesBs + totalOtrosIngresosBs;
    const totalIngresosSus = totalIngresosOrdenesSus + totalOtrosIngresosSus;

    const calcTotalEgresos = (items: any[], montoKey: string = 'monto') => {
        return {
            Bs: items.filter(i => !i.moneda || i.moneda === 'Bolivianos' || i.moneda === 'Bs').reduce((acc, curr) => acc + Number(curr[montoKey]), 0),
            Sus: items.filter(i => i.moneda === 'Dólares' || i.moneda === '$us').reduce((acc, curr) => acc + Number(curr[montoKey]), 0)
        };
    };

    const tEgresos = calcTotalEgresos(egresos);
    const tPersonal = calcTotalEgresos(pagosPersonal, 'total');
    const tProveedores = calcTotalEgresos(pagosProveedores.map(p => ({ ...p, monto: p.material_pedido?.total })), 'monto');
    const tGastos = calcTotalEgresos(gastosFijos);

    // New totals
    const tAnticipos = calcTotalEgresos(anticiposList);
    const tPlanillas = calcTotalEgresos(pagosPlanillasList);

    const totalEgresosGlobalBs = tEgresos.Bs + tPersonal.Bs + tProveedores.Bs + tGastos.Bs + tAnticipos.Bs + tPlanillas.Bs;
    const totalEgresosGlobalSus = tEgresos.Sus + tPersonal.Sus + tProveedores.Sus + tGastos.Sus + tAnticipos.Sus + tPlanillas.Sus;

    const saldoNetoBs = totalIngresosBs - totalEgresosGlobalBs;
    const saldoNetoSus = totalIngresosSus - totalEgresosGlobalSus;

    const exportGlobalExcel = () => {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Ingresos Órdenes
        const wsIngresos = XLSX.utils.json_to_sheet(ingresos.map(i => ({
            Fecha: formatDateDisplay(i.fecha),
            Cliente: i.orden_trabajo?.cliente || '-',
            OT: i.orden_trabajo?.id ? `OT-${i.orden_trabajo.id}` : '-',
            Monto: Number(i.monto || 0).toFixed(2),
            Moneda: i.moneda,
            'Forma Pago': i.forma_pago?.forma_pago || '-',
            Observación: i.observacion || '-'
        })));
        XLSX.utils.book_append_sheet(wb, wsIngresos, "Ingresos Órdenes");

        // Sheet 2: Otros Ingresos
        const wsOtrosIngresos = XLSX.utils.json_to_sheet(otrosIngresos.map(oi => ({
            Fecha: formatDateDisplay(oi.fecha),
            'N° Ingreso': String(oi.nro || oi.id).padStart(6, '0'),
            Tipo: oi.tipo_ingreso || 'Venta',
            Motivo: oi.motivo,
            Monto: Number(oi.monto || 0).toFixed(2),
            Moneda: oi.moneda || 'Bolivianos',
            'Forma Pago': oi.forma_pago?.forma_pago || '-',
            Cliente: oi.cliente || '-',
            Placa: oi.placa || '-',
            Asesor: oi.asesor ? `${oi.asesor.nombre} ${oi.asesor.paterno || ''}` : '-',
            Observación: oi.observacion || '-'
        })));
        XLSX.utils.book_append_sheet(wb, wsOtrosIngresos, "Otros Ingresos");

        // Sheet 3: Egresos
        const wsEgresos = XLSX.utils.json_to_sheet(egresos.map(e => ({
            Fecha: formatDateDisplay(e.fecha),
            Detalle: e.detalle,
            Monto: Number(e.monto || 0).toFixed(2),
            Moneda: e.moneda,
            'Forma Pago': e.formaPago?.forma_pago || '-'
        })));
        XLSX.utils.book_append_sheet(wb, wsEgresos, "Egresos");

        // Sheet 4: Resumen
        const wsResumen = XLSX.utils.json_to_sheet([
            { Concepto: 'Ingresos por Órdenes (Bs)', Valor: totalIngresosOrdenesBs.toFixed(2) },
            { Concepto: 'Otros Ingresos (Bs)', Valor: totalOtrosIngresosBs.toFixed(2) },
            { Concepto: 'Total Ingresos Global (Bs)', Valor: totalIngresosBs.toFixed(2) },
            { Concepto: 'Total Egresos Global (Bs)', Valor: totalEgresosGlobalBs.toFixed(2) },
            { Concepto: 'Saldo Neto (Bs)', Valor: saldoNetoBs.toFixed(2) }
        ]);
        XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Global");

        XLSX.writeFile(wb, `Hoja_Diaria_${searchMode === 'single' ? selectedDate : `${rangeStart}_a_${rangeEnd}`}.xlsx`);
    };

    const exportGlobalPDF = async () => {
        const dateText = getFilterInfoText();
        await exportStandardPDF({
            title: 'Hoja Diaria - Balance de Movimientos',
            subtitle: 'EDKOR MOTORS - Reporte Financiero de Ingresos y Egresos',
            filtersText: dateText,
            totalRecords: ingresos.length + otrosIngresos.length + egresos.length,
            totalRecordsLabel: 'Movimientos Totales',
            filename: `Hoja_Diaria_${searchMode === 'single' ? selectedDate : `${rangeStart}_a_${rangeEnd}`}.pdf`,
            tableOptions: {
                head: [['Tipo', 'Fecha', 'Concepto / Cliente', 'Monto (Bs)', 'Forma Pago', 'Detalle']],
                body: [
                    ...ingresos.map(i => [
                        'INGRESO OT',
                        formatDateDisplay(i.fecha),
                        i.orden_trabajo?.cliente || `OT-${i.orden_trabajo?.id || ''}`,
                        Number(i.monto || 0).toFixed(2),
                        i.forma_pago?.forma_pago || '-',
                        i.observacion || 'Cobro OT'
                    ]),
                    ...otrosIngresos.map(oi => [
                        'OTRO INGRESO',
                        formatDateDisplay(oi.fecha),
                        oi.motivo,
                        Number(oi.monto || 0).toFixed(2),
                        oi.forma_pago?.forma_pago || '-',
                        `${oi.tipo_ingreso || 'Venta'}${oi.cliente ? ` - ${oi.cliente}` : ''}`
                    ]),
                    ...egresos.map(e => [
                        'EGRESO',
                        formatDateDisplay(e.fecha),
                        e.detalle,
                        `-${Number(e.monto || 0).toFixed(2)}`,
                        e.formaPago?.forma_pago || '-',
                        'Egreso Taller'
                    ])
                ],
                columnStyles: {
                    0: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
                    1: { halign: 'center', cellWidth: 22 },
                    2: { cellWidth: 50, fontStyle: 'bold' },
                    3: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
                    4: { halign: 'center', cellWidth: 28 },
                    5: { cellWidth: 'auto' }
                }
            }
        });
    };

    const printGlobalList = () => {
        window.print();
    };

    return (
        <>
        <div className="container mx-auto relative min-h-screen print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <ClipboardList className="text-[#3498db]" size={32} />
                            Hoja Diaria
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Resumen de movimientos financieros del día o rango de fechas seleccionado</p>
                    </div>
                </div>

                <StandardExportToolbar
                    onExportExcel={exportGlobalExcel}
                    onExportPDF={exportGlobalPDF}
                    onPrint={printGlobalList}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Modern Calendar */}
                <CalendarWidget
                    selectedDate={searchMode === 'single' ? selectedDate : ''}
                    onDateSelect={handleCalendarSelect}
                />

                {/* Range Search */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                    <h3 className="font-bold mb-4 text-gray-800 dark:text-white">Búsqueda por Rango</h3>
                    <div className="flex gap-2 mb-4">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400">Desde</label>
                            <input
                                type="date"
                                value={rangeStart}
                                onChange={(e) => setRangeStart(e.target.value)}
                                className="w-full px-3 py-2 text-sm border rounded-lg bg-white text-gray-900 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] outline-none transition-colors font-medium"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-gray-500 dark:text-gray-400">Hasta</label>
                            <input
                                type="date"
                                value={rangeEnd}
                                onChange={(e) => setRangeEnd(e.target.value)}
                                className="w-full px-3 py-2 text-sm border rounded-lg bg-white text-gray-900 border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] outline-none transition-colors font-medium"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button onClick={handleRangeSearch} className="w-full bg-[#3498db] hover:bg-[#2980b9] text-white py-2.5 px-4 rounded-lg font-bold shadow-md transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm">
                            <Search size={16} /> Buscar Rango
                        </button>
                        <button onClick={() => fetchAllData()} className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-2.5 px-4 rounded-lg font-bold shadow-sm transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm border border-gray-200 dark:border-gray-600">
                            <RefreshCw size={16} /> Refrescar
                        </button>
                    </div>
                </div>

                {/* Summary / Info */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">Resumen Actual</h3>
                        <p className="text-sm mb-3 text-gray-500 dark:text-gray-400 font-medium">{getFilterInfoText()}</p>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-800/40">
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block mb-1 uppercase tracking-wider">Ingresos Totales</span>
                            <div className="flex justify-between text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                <span>Bs: {totalIngresosBs.toFixed(2)}</span>
                                <span>$us: {totalIngresosSus.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800/40">
                            <span className="text-xs font-bold text-red-700 dark:text-red-300 block mb-1 uppercase tracking-wider">Egresos Globales</span>
                            <div className="flex justify-between text-sm font-semibold text-red-800 dark:text-red-200">
                                <span>Bs: {totalEgresosGlobalBs.toFixed(2)}</span>
                                <span>$us: {totalEgresosGlobalSus.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/40">
                            <span className="text-xs font-bold text-blue-700 dark:text-blue-300 block mb-1 uppercase tracking-wider">Saldo Neto</span>
                            <div className="flex justify-between text-sm font-bold text-blue-800 dark:text-blue-200">
                                <span>Bs: {saldoNetoBs.toFixed(2)}</span>
                                <span>$us: {saldoNetoSus.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAB BUTTONS */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700 pb-3">
                {tabs.map((tab, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveTab(idx)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all transform hover:-translate-y-0.5 shadow-sm ${
                            activeTab === idx
                                ? 'bg-[#3498db] text-white shadow-md'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300 dark:border-gray-700'
                        }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* CONTENT AREA */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700 mb-8">
                {loading && <div className="p-8 text-center text-gray-500 font-medium">Cargando datos...</div>}

                {!loading && activeTab === 0 && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Ingresos (Pagos de Órdenes)</h2>
                            <button onClick={handlePrintIngresos} className="bg-[#9b59b6] hover:bg-[#8e44ad] text-white px-3.5 py-2 rounded-lg font-medium shadow-md transform hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm">
                                <Printer size={16} /> Imprimir
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4">Auto</th>
                                        <th className="p-4 text-center">N° Orden</th>
                                        <th className="p-4 text-right">Monto</th>
                                        <th className="p-4">F. Pago</th>
                                        <th className="p-4">Obs</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {ingresos.length === 0 ? (
                                        <tr><td colSpan={8} className="p-8 text-center italic text-gray-500 dark:text-gray-400">No hay ingresos registrados</td></tr>
                                    ) : (
                                        ingresos.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-center font-mono text-xs text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDateDisplay(item.fecha)}</td>
                                                <td className="p-4 font-semibold text-gray-800 dark:text-white">{item.orden_trabajo?.cliente}</td>
                                                <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{item.orden_trabajo?.modelo} ({item.orden_trabajo?.placa})</td>
                                                <td className="p-4 text-center font-mono font-medium text-gray-700 dark:text-gray-300">{item.orden_trabajo?.id}</td>
                                                <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(Number(item.monto), item.moneda)}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300">{item.forma_pago?.forma_pago}</td>
                                                <td className="p-4 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{item.observacion || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* OTROS INGRESOS TAB */}
                {!loading && activeTab === 1 && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Otros Ingresos (Ventas Directas / Auxilios)</h2>
                            <button onClick={handlePrintOtrosIngresos} className="bg-[#9b59b6] hover:bg-[#8e44ad] text-white px-3.5 py-2 rounded-lg font-medium shadow-md transform hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm">
                                <Printer size={16} /> Imprimir
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4 text-center">N° Comprobante</th>
                                        <th className="p-4">Tipo</th>
                                        <th className="p-4">Motivo / Descripción</th>
                                        <th className="p-4 text-right">Monto</th>
                                        <th className="p-4">F. Pago</th>
                                        <th className="p-4">Cliente / Placa</th>
                                        <th className="p-4">Asesor</th>
                                        <th className="p-4">Obs</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {otrosIngresos.length === 0 ? (
                                        <tr><td colSpan={10} className="p-8 text-center italic text-gray-500 dark:text-gray-400">No hay otros ingresos registrados</td></tr>
                                    ) : (
                                        otrosIngresos.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-center font-mono text-xs text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDateDisplay(item.fecha)}</td>
                                                <td className="p-4 text-center font-mono font-bold text-blue-600 dark:text-blue-400">{String(item.nro || item.id).padStart(6, '0')}</td>
                                                <td className="p-4 text-xs">
                                                    <span className="px-2 py-0.5 rounded font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                        {item.tipo_ingreso || 'Venta'}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-semibold text-gray-800 dark:text-white">
                                                    <div>{item.motivo}</div>
                                                    {item.inventario && (
                                                        <div className="text-xs text-gray-400 font-normal mt-0.5">
                                                            {item.cantidad || 1} x {item.inventario.descripcion}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(Number(item.monto), item.moneda)}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300">{item.forma_pago?.forma_pago || 'Efectivo'}</td>
                                                <td className="p-4 text-gray-700 dark:text-gray-300">
                                                    <div>{item.cliente || '-'}</div>
                                                    {item.placa && <span className="text-xs font-mono font-bold text-amber-600">{item.placa}</span>}
                                                </td>
                                                <td className="p-4 text-xs text-gray-500 dark:text-gray-400">
                                                    {item.asesor ? `${item.asesor.nombre} ${item.asesor.paterno || ''}`.trim() : '-'}
                                                </td>
                                                <td className="p-4 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{item.observacion || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {!loading && activeTab === 2 && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Egresos Diarios</h2>
                            <button onClick={handlePrintEgresos} className="bg-[#9b59b6] hover:bg-[#8e44ad] text-white px-3.5 py-2 rounded-lg font-medium shadow-md transform hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm">
                                <Printer size={16} /> Imprimir
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Detalle</th>
                                        <th className="p-4 text-right">Monto</th>
                                        <th className="p-4">F. Pago</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {egresos.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center italic text-gray-500 dark:text-gray-400">No hay egresos registrados</td></tr>
                                    ) : (
                                        egresos.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-center font-mono text-xs text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDateDisplay(item.fecha)}</td>
                                                <td className="p-4 font-semibold text-gray-800 dark:text-white">{item.detalle}</td>
                                                <td className="p-4 text-right font-bold text-red-500">{formatMoney(Number(item.monto), item.moneda)}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300">{item.formaPago?.forma_pago}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {!loading && activeTab === 3 && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Pagos a Personal</h2>
                            <button onClick={handlePrintPersonal} className="bg-[#9b59b6] hover:bg-[#8e44ad] text-white px-3.5 py-2 rounded-lg font-medium shadow-md transform hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm">
                                <Printer size={16} /> Imprimir
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-700 dark:text-gray-300 p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/30">Pagos por Trabajos</h3>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Personal</th>
                                        <th className="p-4 text-right">Monto</th>
                                        <th className="p-4">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {pagosPersonal.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center italic text-gray-500 dark:text-gray-400">No hay pagos de trabajos registrados</td></tr>
                                    ) : (
                                        pagosPersonal.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-center font-mono text-xs text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDateDisplay(item.fecha_pago)}</td>
                                                <td className="p-4 font-semibold text-gray-800 dark:text-white">{item.personal?.nombre} {item.personal?.apellido_paterno}</td>
                                                <td className="p-4 text-right font-bold text-red-500">{formatMoney(Number(item.total), 'Bolivianos')}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300">{item.detalle || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {!loading && activeTab === 4 && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Pagos a Proveedores</h2>
                            <button onClick={handlePrintProveedores} className="bg-[#9b59b6] hover:bg-[#8e44ad] text-white px-3.5 py-2 rounded-lg font-medium shadow-md transform hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm">
                                <Printer size={16} /> Imprimir
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Proveedor</th>
                                        <th className="p-4 text-right">Monto</th>
                                        <th className="p-4">F. Pago</th>
                                        <th className="p-4">Doc</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {pagosProveedores.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center italic text-gray-500 dark:text-gray-400">No hay pagos a proveedores registrados</td></tr>
                                    ) : (
                                        pagosProveedores.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-center font-mono text-xs text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDateDisplay(item.fecha)}</td>
                                                <td className="p-4 font-semibold text-gray-800 dark:text-white">{item.material_pedido?.proveedor?.proveedor}</td>
                                                <td className="p-4 text-right font-bold text-red-500">{formatMoney(Number(item.material_pedido?.total || 0), item.moneda)}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300">{item.forma_pago?.forma_pago}</td>
                                                <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{item.factura ? 'F:' + item.factura : ''} {item.recibo ? 'R:' + item.recibo : ''}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {!loading && activeTab === 5 && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Pagos Gastos Fijos</h2>
                            <button onClick={handlePrintGastos} className="bg-[#9b59b6] hover:bg-[#8e44ad] text-white px-3.5 py-2 rounded-lg font-medium shadow-md transform hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm">
                                <Printer size={16} /> Imprimir
                            </button>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Gasto</th>
                                        <th className="p-4 text-right">Monto</th>
                                        <th className="p-4">F. Pago</th>
                                        <th className="p-4">Obs</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {gastosFijos.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center italic text-gray-500 dark:text-gray-400">No hay gastos fijos registrados</td></tr>
                                    ) : (
                                        gastosFijos.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-center font-mono text-xs text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDateDisplay(item.fecha)}</td>
                                                <td className="p-4 font-semibold text-gray-800 dark:text-white">{item.gastoFijo?.gasto_fijo}</td>
                                                <td className="p-4 text-right font-bold text-red-500">{formatMoney(Number(item.monto), item.moneda)}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300">{item.formaPago?.forma_pago}</td>
                                                <td className="p-4 text-xs text-gray-500 dark:text-gray-400">{item.observaciones || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {/* SUELDOS TAB */}
                {!loading && activeTab === 6 && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Sueldos</h2>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Personal</th>
                                        <th className="p-4 text-right">Monto</th>
                                        <th className="p-4">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {pagosPlanillasList.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center italic text-gray-500 dark:text-gray-400">No hay pagos de planillas registrados</td></tr>
                                    ) : (
                                        pagosPlanillasList.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-center font-mono text-xs text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDateDisplay(item.fecha_pago)}</td>
                                                <td className="p-4 font-semibold text-gray-800 dark:text-white">Planilla {item.planilla?.mes}/{item.planilla?.anio}</td>
                                                <td className="p-4 text-right font-bold text-red-500">{formatMoney(Number(item.monto), 'Bolivianos')}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300">{item.observaciones || '-'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ADELANTOS TAB */}
                {!loading && activeTab === 7 && (
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Adelantos</h2>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="p-4 w-12 text-center">#</th>
                                        <th className="p-4">Fecha</th>
                                        <th className="p-4">Personal</th>
                                        <th className="p-4 text-right">Monto</th>
                                        <th className="p-4">Detalle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {anticiposList.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center italic text-gray-500 dark:text-gray-400">No hay adelantos registrados</td></tr>
                                    ) : (
                                        anticiposList.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-center font-mono text-xs text-gray-500 dark:text-gray-400">{idx + 1}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDateDisplay(item.fecha)}</td>
                                                <td className="p-4 font-semibold text-gray-800 dark:text-white">{item.personal?.nombre} {item.personal?.apellido_paterno}</td>
                                                <td className="p-4 text-right font-bold text-red-500">{formatMoney(Number(item.monto), 'Bolivianos')}</td>
                                                <td className="p-4 text-gray-600 dark:text-gray-300">{item.motivo}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {showManual && (
                <ManualModal
                    isOpen={showManual}
                    onClose={() => setShowManual(false)}
                    title="Manual Hoja Diaria"
                    sections={manualSections}
                />
            )}
        </div>

        {/* Printable View */}
        <div className="hidden print:block font-sans text-black p-4 bg-white min-h-screen">
            <StandardPrintHeader
                title="HOJA DIARIA - BALANCE FINANCIERO"
                subtitle="Resumen Consolidado de Ingresos y Egresos"
                filtersText={getFilterInfoText()}
            />

            <div className="my-4 grid grid-cols-3 gap-4 border p-3 rounded bg-gray-50 text-xs">
                <div>
                    <span className="text-gray-500 block">Total Ingresos:</span>
                    <strong className="text-sm text-green-700">Bs {totalIngresosBs.toFixed(2)}</strong>
                </div>
                <div>
                    <span className="text-gray-500 block">Total Egresos Global:</span>
                    <strong className="text-sm text-red-700">Bs {totalEgresosGlobalBs.toFixed(2)}</strong>
                </div>
                <div>
                    <span className="text-gray-500 block">Saldo Neto:</span>
                    <strong className={`text-sm ${saldoNetoBs >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Bs {saldoNetoBs.toFixed(2)}</strong>
                </div>
            </div>

            <h4 className="font-bold text-xs uppercase mb-1 mt-4">Detalle de Movimientos</h4>
            <table className="w-full text-left border-collapse border border-gray-400 text-xs">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-400">
                        <th className="border border-gray-300 p-1.5 text-center w-16">Tipo</th>
                        <th className="border border-gray-300 p-1.5 text-center">Fecha</th>
                        <th className="border border-gray-300 p-1.5">Concepto / Detalle</th>
                        <th className="border border-gray-300 p-1.5 text-right">Monto (Bs)</th>
                        <th className="border border-gray-300 p-1.5 text-center">Forma Pago</th>
                    </tr>
                </thead>
                <tbody>
                    {ingresos.map(i => (
                        <tr key={`ing-${i.id}`} className="border-b border-gray-200">
                            <td className="border border-gray-200 p-1.5 text-center font-bold text-green-700">INGRESO</td>
                            <td className="border border-gray-200 p-1.5 text-center">{formatDateDisplay(i.fecha)}</td>
                            <td className="border border-gray-200 p-1.5 font-bold">{i.orden_trabajo?.cliente || `OT-${i.orden_trabajo?.id || ''}`}</td>
                            <td className="border border-gray-200 p-1.5 text-right font-bold text-green-700">+{Number(i.monto || 0).toFixed(2)}</td>
                            <td className="border border-gray-200 p-1.5 text-center">{i.forma_pago?.forma_pago || '-'}</td>
                        </tr>
                    ))}
                    {egresos.map(e => (
                        <tr key={`egr-${e.id}`} className="border-b border-gray-200">
                            <td className="border border-gray-200 p-1.5 text-center font-bold text-red-700">EGRESO</td>
                            <td className="border border-gray-200 p-1.5 text-center">{formatDateDisplay(e.fecha)}</td>
                            <td className="border border-gray-200 p-1.5">{e.detalle}</td>
                            <td className="border border-gray-200 p-1.5 text-right font-bold text-red-700">-{Number(e.monto || 0).toFixed(2)}</td>
                            <td className="border border-gray-200 p-1.5 text-center">{e.formaPago?.forma_pago || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <StandardPrintFooter />
        </div>
        </>
    );
};

export default HojaDiaria;
