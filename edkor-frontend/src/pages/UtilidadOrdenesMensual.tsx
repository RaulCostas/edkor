import { useEffect, useState, useMemo } from 'react';
import {
    TrendingUp,
    Wrench,
    Package,
    DollarSign,
    ExternalLink,
    Search,
    ChevronLeft,
    ChevronRight,
    Eye,
    User,
} from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import {
    getUtilidadMensual,
    getAsesoresRecepcion,
    type UtilidadMensualResponse,
    type AsesorRecepcion,
} from '../services/ordenTrabajoService';
import Pagination from '../components/Pagination';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { getLocalDateString } from '../utils/dateUtils';
import UtilidadOrdenModal from '../components/UtilidadOrdenModal';

export const UtilidadOrdenesMensual = () => {
    // Current date helpers
    const todayStr = getLocalDateString();
    const currentMonthStr = todayStr.slice(0, 7);

    // Filters state
    const [filterMode, setFilterMode] = useState<'month' | 'range'>('month');
    const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
    const [startDate, setStartDate] = useState<string>(`${currentMonthStr}-01`);
    const [endDate, setEndDate] = useState<string>(todayStr);
    const [selectedEstado, setSelectedEstado] = useState<string>('todos');
    const [selectedAsesor, setSelectedAsesor] = useState<string>('todos');
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Asesores registrados en orden de recepción
    const [asesores, setAsesores] = useState<AsesorRecepcion[]>([]);

    // Data state
    const [data, setData] = useState<UtilidadMensualResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Modal state for detail
    const [selectedOrdenId, setSelectedOrdenId] = useState<number | null>(null);
    const [showManual, setShowManual] = useState<boolean>(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 10;

    // Cargar asesores registrados en órdenes de recepción
    useEffect(() => {
        const loadAsesores = async () => {
            try {
                const res = await getAsesoresRecepcion();
                setAsesores(res || []);
            } catch (err) {
                console.error('Error al cargar asesores de recepción:', err);
            }
        };
        loadAsesores();
    }, []);

    const manualSections: ManualSection[] = [
        {
            title: 'Utilidad Neta Mensual de Órdenes',
            content:
                'Este módulo analiza la rentabilidad real de todas las órdenes de trabajo del taller en un periodo mensual o rango de fechas, calculando los ingresos netos descontando pagos a mecánicos, compras de repuestos y servicios externos.',
        },
        {
            title: 'Fórmulas de Cálculo',
            content:
                '1. Ingreso Orden: Subtotal facturado/cobrado al cliente menos descuentos.\n' +
                '2. Pago a Mecánicos: Total asignado a mano de obra por trabajo (pagado + pendiente).\n' +
                '3. Costo Compra Repuestos: Costo real de adquisición (FIFO de lotes o precio compra).\n' +
                '4. Trabajos de Terceros: Costos de rectificado, torno, alineación u otros proveedores externos.\n' +
                '5. Utilidad Neta Real = Ingreso Orden - (Pago Mecánicos + Costo Repuestos + Costo Terceros).\n' +
                '6. Margen de Ganancia = (Utilidad Neta Real / Ingreso Orden) * 100%.',
        },
        {
            title: 'Ver Detalle Individual',
            content:
                'Haga clic en el botón del ojo en la columna Acciones de cualquier orden para abrir la auditoría desglosada trabajo por trabajo de esa orden.',
        },
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (filterMode === 'month') {
                params.mes = selectedMonth;
            } else {
                params.desde = startDate;
                params.hasta = endDate;
            }
            if (selectedEstado && selectedEstado !== 'todos') {
                params.estado = selectedEstado;
            }
            if (selectedAsesor && selectedAsesor !== 'todos') {
                params.asesor_id = selectedAsesor;
            }

            const res = await getUtilidadMensual(params);
            setData(res);
            setCurrentPage(1);
        } catch (err) {
            console.error('Error al cargar utilidad mensual:', err);
            Swal.fire('Error', 'No se pudo obtener la utilidad del mes seleccionado', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedMonth, startDate, endDate, selectedEstado, selectedAsesor, filterMode]);

    // Month navigation helpers
    const changeMonth = (offset: number) => {
        const [y, m] = selectedMonth.split('-').map(Number);
        const date = new Date(y, m - 1 + offset, 1);
        const nextMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        setSelectedMonth(nextMonthStr);
    };

    const getMonthName = (monthStr: string) => {
        const [y, m] = monthStr.split('-').map(Number);
        const date = new Date(y, m - 1, 1);
        return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    };

    // Filtered orders list by search term and asesor
    const filteredOrdenes = useMemo(() => {
        if (!data?.ordenes) return [];
        let list = data.ordenes;
        if (selectedAsesor && selectedAsesor !== 'todos') {
            list = list.filter((o) => String(o.asesor_id) === String(selectedAsesor));
        }

        const term = searchTerm.toLowerCase().trim();
        if (!term) return list;

        return list.filter(
            (o) =>
                o.nro_orden.toLowerCase().includes(term) ||
                o.cliente.toLowerCase().includes(term) ||
                o.placa.toLowerCase().includes(term) ||
                o.vehiculo.toLowerCase().includes(term) ||
                (o.asesor && o.asesor.toLowerCase().includes(term)) ||
                (o.nro_factura && o.nro_factura.toLowerCase().includes(term))
        );
    }, [data?.ordenes, searchTerm, selectedAsesor]);

    // Pagination calculations
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredOrdenes.slice(indexOfFirstItem, indexOfLastItem);

    // Helpers
    const getEstadoBadgeClass = (estado: string) => {
        const est = (estado || '').toLowerCase();
        if (est.includes('cerrad') || est.includes('liquid')) {
            return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
        }
        if (est.includes('entregad')) {
            return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700';
        }
        if (est.includes('terminad') || est.includes('finalizad')) {
            return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800';
        }
        if (est.includes('proceso') || est === 'activo') {
            return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800';
        }
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600';
    };

    const formatEstadoLabel = (estado: string) => {
        const est = (estado || '').toLowerCase();
        if (est === 'en_proceso' || est === 'activo') return 'En Proceso';
        if (est === 'terminado' || est === 'finalizado') return 'Terminado en Taller';
        if (est.includes('entregad')) return 'Entregado con Saldo';
        if (est === 'cerrada' || est === 'orden_cerrada') return 'Cerrada';
        return estado.replace(/_/g, ' ');
    };

    // Export to Excel
    const handleExportExcel = () => {
        if (!data || filteredOrdenes.length === 0) {
            Swal.fire('Atención', 'No hay datos disponibles para exportar', 'warning');
            return;
        }

        const resumen = data.resumen_general;
        const selectedAsesorObj = asesores.find(a => String(a.id) === String(selectedAsesor));
        const asesorLabel = selectedAsesorObj ? selectedAsesorObj.nombre_completo : 'Todos los Asesores';

        const resumenRows = [
            { Concepto: 'REPORTE DE UTILIDAD NETA MENSUAL DE ÓRDENES DE TRABAJO', Valor: '' },
            { Concepto: 'Periodo:', Valor: filterMode === 'month' ? getMonthName(selectedMonth) : `${startDate} al ${endDate}` },
            { Concepto: 'Asesor Filtrado:', Valor: asesorLabel },
            { Concepto: 'Total Órdenes Evaluadas:', Valor: resumen.total_ordenes },
            { Concepto: 'Ingreso Neto Total Órdenes (Bs):', Valor: resumen.ingreso_neto_ordenes },
            { Concepto: 'Pago a Mecánicos Total (Bs):', Valor: resumen.costo_mecanicos },
            { Concepto: '  - Pagado (Bs):', Valor: resumen.costo_mecanicos_pagado },
            { Concepto: '  - Pendiente (Bs):', Valor: resumen.costo_mecanicos_pendiente },
            { Concepto: 'Costo Compra Repuestos (Bs):', Valor: resumen.costo_repuestos },
            { Concepto: '  - Venta de Repuestos (Bs):', Valor: resumen.ingreso_repuestos },
            { Concepto: 'Trabajos de Terceros (Bs):', Valor: resumen.costo_terceros },
            { Concepto: 'Pago a Chapistas / Chapería (Bs):', Valor: resumen.costo_chaperia || 0 },
            { Concepto: 'Total Costos Deducidos (Bs):', Valor: resumen.total_costos },
            { Concepto: 'UTILIDAD NETA REAL (Bs):', Valor: resumen.utilidad_neta },
            { Concepto: 'Margen de Ganancia Promedio (%):', Valor: `${resumen.margen_porcentaje}%` },
            { Concepto: '', Valor: '' },
            { Concepto: '--- DETALLE DE ÓRDENES ---', Valor: '' },
        ];

        const ordenesRows = filteredOrdenes.map((o, idx) => ({
            '#': idx + 1,
            'N° OT': o.nro_orden,
            'Fecha': new Date(o.fecha_registro).toLocaleDateString(),
            'Placa': o.placa,
            'Vehículo': o.vehiculo,
            'Cliente': o.cliente,
            'Asesor': o.asesor || 'Sin asesor',
            'Tipo Orden': o.tipo_orden,
            'Estado': o.estado,
            'Ingreso OT (Bs)': o.ingreso_neto,
            'Pago Mecánico (Bs)': o.costo_mecanicos,
            'Costo Repuestos (Bs)': o.costo_repuestos,
            'Terceros (Bs)': o.costo_terceros,
            'Chapería (Bs)': o.costo_chaperia || 0,
            'Total Costos (Bs)': o.total_costos,
            'Utilidad Neta (Bs)': o.utilidad_neta,
            'Margen (%)': `${o.margen_porcentaje}%`,
        }));

        const wb = XLSX.utils.book_new();
        const wsResumen = XLSX.utils.json_to_sheet(resumenRows);
        const wsDetalle = XLSX.utils.json_to_sheet(ordenesRows);

        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen General');
        XLSX.utils.book_append_sheet(wb, wsDetalle, 'Órdenes de Trabajo');

        const periodSlug = filterMode === 'month' ? selectedMonth : `${startDate}_a_${endDate}`;
        XLSX.writeFile(wb, `Utilidad_Neta_Ordenes_${periodSlug}.xlsx`);
    };

    // Export to PDF
    const handleExportPDF = async () => {
        if (!data || filteredOrdenes.length === 0) {
            Swal.fire('Atención', 'No hay datos disponibles para exportar', 'warning');
            return;
        }

        const selectedAsesorObj = asesores.find(a => String(a.id) === String(selectedAsesor));
        const asesorLabel = selectedAsesorObj ? selectedAsesorObj.nombre_completo : 'Todos los Asesores';
        const periodLabel = filterMode === 'month' ? getMonthName(selectedMonth).toUpperCase() : `${startDate} al ${endDate}`;
        const tableBody = filteredOrdenes.map((o, idx) => [
            idx + 1,
            o.nro_orden,
            new Date(o.fecha_registro).toLocaleDateString(),
            o.placa,
            `${o.cliente}${o.asesor ? ` (Asesor: ${o.asesor})` : ''}`,
            o.estado,
            `Bs. ${o.ingreso_neto.toFixed(2)}`,
            `Bs. ${o.costo_mecanicos.toFixed(2)}`,
            `Bs. ${o.costo_repuestos.toFixed(2)}`,
            `Bs. ${o.costo_terceros.toFixed(2)}`,
            `Bs. ${(o.costo_chaperia || 0).toFixed(2)}`,
            `Bs. ${o.utilidad_neta.toFixed(2)}`,
            `${o.margen_porcentaje}%`,
        ]);

        const res = data.resumen_general;

        await exportStandardPDF({
            title: 'REPORTE MENSUAL DE UTILIDAD NETA DE ÓRDENES DE TRABAJO',
            subtitle: `PERIODO: ${periodLabel} | Utilidad Neta Real: Bs. ${res.utilidad_neta.toFixed(2)} (${res.margen_porcentaje}%)`,
            filtersText: `Filtro: ${filterMode === 'month' ? selectedMonth : `${startDate} a ${endDate}`} | Asesor: ${asesorLabel} | Estado: ${selectedEstado} | Total OT: ${filteredOrdenes.length}`,
            totalRecords: filteredOrdenes.length,
            totalRecordsLabel: 'Órdenes Analizadas',
            filename: `Utilidad_Ordenes_${selectedMonth}.pdf`,
            orientation: 'landscape',
            tableOptions: {
                head: [[
                    '#',
                    'N° OT',
                    'Fecha',
                    'Placa',
                    'Cliente',
                    'Estado',
                    'Ingreso OT',
                    'Pago Mec.',
                    'Costo Rep.',
                    'Terceros',
                    'Chapería',
                    'Utilidad Neta',
                    'Margen %',
                ]],
                body: tableBody,
                foot: [[
                    { content: 'TOTALES:', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `Bs. ${res.ingreso_neto_ordenes.toFixed(2)}`, styles: { fontStyle: 'bold' } },
                    { content: `Bs. ${res.costo_mecanicos.toFixed(2)}`, styles: { fontStyle: 'bold' } },
                    { content: `Bs. ${res.costo_repuestos.toFixed(2)}`, styles: { fontStyle: 'bold' } },
                    { content: `Bs. ${res.costo_terceros.toFixed(2)}`, styles: { fontStyle: 'bold' } },
                    { content: `Bs. ${(res.costo_chaperia || 0).toFixed(2)}`, styles: { fontStyle: 'bold' } },
                    { content: `Bs. ${res.utilidad_neta.toFixed(2)}`, styles: { fontStyle: 'bold', textColor: res.utilidad_neta >= 0 ? [16, 122, 63] : [190, 18, 60] } },
                    { content: `${res.margen_porcentaje}%`, styles: { fontStyle: 'bold' } },
                ]],
                styles: { fontSize: 8 },
                headStyles: { fillColor: [15, 118, 110], textColor: 255 },
            },
        });
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="container mx-auto relative min-h-screen p-4 sm:p-6 space-y-6 print:hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={32} />
                        Utilidad Neta Mensual de Órdenes
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Cálculo acumulado mensual de ingresos netos descontando costos de mecánicos, repuestos y terceros
                    </p>
                </div>

                <StandardExportToolbar
                    onExportExcel={handleExportExcel}
                    onExportPDF={handleExportPDF}
                    onPrint={handlePrint}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda y Fórmulas de Utilidad"
                />
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setFilterMode('month')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                filterMode === 'month'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                        >
                            Vista por Mes
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterMode('range')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                filterMode === 'range'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                            }`}
                        >
                            Rango Personalizado
                        </button>
                    </div>

                    {filterMode === 'month' && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => changeMonth(-1)}
                                className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                title="Mes Anterior"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize min-w-[140px] text-center">
                                {getMonthName(selectedMonth)}
                            </span>
                            <button
                                type="button"
                                onClick={() => changeMonth(1)}
                                className="p-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                title="Mes Siguiente"
                            >
                                <ChevronRight size={16} />
                            </button>
                            {selectedMonth !== currentMonthStr && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedMonth(currentMonthStr)}
                                    className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline ml-1"
                                >
                                    Mes Actual
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 ${filterMode === 'month' ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3 pt-1`}>
                    {/* 1. Asesor (Primer Filtro) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <User size={13} className="text-emerald-600 dark:text-emerald-400" />
                            Filtrar por Asesor:
                        </label>
                        <select
                            value={selectedAsesor}
                            onChange={(e) => setSelectedAsesor(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                            <option value="todos">Todos los Asesores</option>
                            {asesores.map((a) => (
                                <option key={a.id} value={String(a.id)}>
                                    {a.nombre_completo}
                                </option>
                            ))}
                        </select>
                    </div>

                    {filterMode === 'month' ? (
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                Seleccionar Mes:
                            </label>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                    Fecha Desde:
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                                    Fecha Hasta:
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                            Filtrar por Estado:
                        </label>
                        <select
                            value={selectedEstado}
                            onChange={(e) => setSelectedEstado(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="todos">Todos los Estados</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="terminado">Terminado en Taller</option>
                            <option value="entregado_por_pagar">Entregado con Saldo</option>
                            <option value="cerrada">Cerrada / Liquidada</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                            Buscar Orden / Placa / Cliente:
                        </label>
                        <div className="relative">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            />
                            <input
                                type="text"
                                placeholder="Placa, Cliente, Asesor, OT..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Cards (visual mirroring of UtilidadOrdenModal cards) */}
            {data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 animate-in fade-in duration-300">
                    {/* 1. Ingreso Total Órdenes (Cliente) */}
                    <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 shadow-sm transition hover:shadow-md">
                        <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider">
                                Ingreso Orden (Cliente)
                            </span>
                            <DollarSign size={18} />
                        </div>
                        <div className="text-2xl font-extrabold text-gray-900 dark:text-white font-mono mt-1">
                            Bs. {data.resumen_general.ingreso_neto_ordenes.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 flex justify-between border-t border-blue-100 dark:border-blue-900/40 pt-1.5">
                            <span>Subtotal: Bs. {data.resumen_general.sub_total.toFixed(2)}</span>
                            {data.resumen_general.descuento > 0 && (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    Desc: -Bs. {data.resumen_general.descuento.toFixed(2)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 2. Pago a Mecánicos */}
                    <div className="bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 shadow-sm transition hover:shadow-md">
                        <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider">
                                Pago a Mecánicos
                            </span>
                            <Wrench size={18} />
                        </div>
                        <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 font-mono mt-1">
                            Bs. {data.resumen_general.costo_mecanicos.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 flex justify-between border-t border-amber-100 dark:border-amber-900/40 pt-1.5">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                Pagado: Bs. {data.resumen_general.costo_mecanicos_pagado.toFixed(2)}
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                                Pend.: Bs. {data.resumen_general.costo_mecanicos_pendiente.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* 3. Costo Compra Repuestos */}
                    <div className="bg-purple-50/70 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 shadow-sm transition hover:shadow-md">
                        <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider">
                                Costo Compra Repuestos
                            </span>
                            <Package size={18} />
                        </div>
                        <div className="text-2xl font-extrabold text-purple-700 dark:text-purple-300 font-mono mt-1">
                            Bs. {data.resumen_general.costo_repuestos.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 border-t border-purple-100 dark:border-purple-900/40 pt-1.5">
                            Precio venta repuestos: Bs. {data.resumen_general.ingreso_repuestos.toFixed(2)}
                        </div>
                    </div>

                    {/* 4. Trabajos de Terceros */}
                    <div className="bg-purple-50/70 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700 rounded-2xl p-4 shadow-sm transition hover:shadow-md">
                        <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider">
                                Trabajos Terceros
                            </span>
                            <ExternalLink size={18} />
                        </div>
                        <div className="text-2xl font-extrabold text-purple-800 dark:text-purple-200 font-mono mt-1">
                            Bs. {data.resumen_general.costo_terceros.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 border-t border-purple-200 dark:border-purple-800/40 pt-1.5">
                            Costo externo (torno, rectif.)
                        </div>
                    </div>

                    {/* 4.1 Pago a Chapistas / Chapería */}
                    <div className="bg-indigo-50/70 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 shadow-sm transition hover:shadow-md">
                        <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
                            <span className="text-xs font-bold uppercase tracking-wider">
                                Pago a Chapistas
                            </span>
                            <Wrench size={18} />
                        </div>
                        <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 font-mono mt-1">
                            Bs. {(data.resumen_general.costo_chaperia || 0).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 border-t border-indigo-100 dark:border-indigo-900/40 pt-1.5">
                            Chapería contratista (obra vendida)
                        </div>
                    </div>

                    {/* 5. Utilidad Neta Real */}
                    <div
                        className={`rounded-2xl p-4 shadow-sm transition hover:shadow-md border ${
                            data.resumen_general.utilidad_neta >= 0
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700'
                                : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700'
                        }`}
                    >
                        <div
                            className={`flex items-center justify-between mb-1 ${
                                data.resumen_general.utilidad_neta >= 0
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-red-700 dark:text-red-300'
                            }`}
                        >
                            <span className="text-xs font-bold uppercase tracking-wider">
                                Utilidad Neta Real
                            </span>
                            <TrendingUp size={18} />
                        </div>
                        <div
                            className={`text-2xl font-extrabold font-mono mt-1 ${
                                data.resumen_general.utilidad_neta >= 0
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-red-600 dark:text-red-400'
                            }`}
                        >
                            Bs. {data.resumen_general.utilidad_neta.toFixed(2)}
                        </div>
                        <div className="text-[11px] mt-2 flex items-center justify-between border-t border-emerald-200/60 dark:border-emerald-800/40 pt-1.5">
                            <span className="text-gray-600 dark:text-gray-300 font-medium">
                                Margen de ganancia:
                            </span>
                            <span
                                className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                                    data.resumen_general.utilidad_neta >= 0
                                        ? 'bg-emerald-200/80 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200'
                                        : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                                }`}
                            >
                                {data.resumen_general.margen_porcentaje}%
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Orders Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <span>Listado de Órdenes del Periodo</span>
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full font-mono">
                            {filteredOrdenes.length} órdenes
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        Mostrando {filteredOrdenes.length === 0 ? 0 : indexOfFirstItem + 1} -{' '}
                        {Math.min(indexOfLastItem, filteredOrdenes.length)} de {filteredOrdenes.length}
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm font-medium">Calculando utilidades de las órdenes...</p>
                    </div>
                ) : filteredOrdenes.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 dark:text-gray-500">
                        <p className="text-base font-semibold">No se encontraron órdenes para este periodo o filtro.</p>
                        <p className="text-xs mt-1">Pruebe cambiando el mes o los filtros seleccionados.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    <th className="p-3.5 w-12 text-center">#</th>
                                    <th className="p-3.5">N° OT</th>
                                    <th className="p-3.5">Fecha</th>
                                    <th className="p-3.5">Placa</th>
                                    <th className="p-3.5">Vehículo</th>
                                    <th className="p-3.5">Cliente</th>
                                    <th className="p-3.5 text-right">Ingreso OT</th>
                                    <th className="p-3.5 text-right">Pago Mec.</th>
                                    <th className="p-3.5 text-right">Costo Rep.</th>
                                    <th className="p-3.5 text-right">Terceros</th>
                                    <th className="p-3.5 text-right">Chapería</th>
                                    <th className="p-3.5 text-right">Utilidad Neta</th>
                                    <th className="p-3.5 text-center">Margen</th>
                                    <th className="p-3.5 text-center">Estado</th>
                                    <th className="p-3.5 text-center no-print">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                                {currentItems.map((o, idx) => (
                                    <tr
                                        key={o.id}
                                        className="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors"
                                    >
                                        <td className="p-3.5 text-center text-gray-400 font-mono">
                                            {indexOfFirstItem + idx + 1}
                                        </td>
                                        <td className="p-3.5 font-bold font-mono text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                            OT-{o.nro_orden}
                                        </td>
                                        <td className="p-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {new Date(o.fecha_registro).toLocaleDateString()}
                                        </td>
                                        <td className="p-3.5 font-mono font-bold uppercase text-gray-800 dark:text-gray-100 whitespace-nowrap">
                                            {o.placa}
                                        </td>
                                        <td className="p-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                            {o.vehiculo}
                                        </td>
                                        <td className="p-3.5 font-medium text-gray-800 dark:text-gray-200">
                                            <div>{o.cliente}</div>
                                            {o.asesor && (
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                                    <User size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                    <span className="truncate">Asesor: {o.asesor}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-right font-mono font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                            Bs. {o.ingreso_neto.toFixed(2)}
                                        </td>
                                        <td className="p-3.5 text-right font-mono text-amber-700 dark:text-amber-300 whitespace-nowrap">
                                            Bs. {o.costo_mecanicos.toFixed(2)}
                                        </td>
                                        <td className="p-3.5 text-right font-mono text-purple-700 dark:text-purple-300 whitespace-nowrap">
                                            Bs. {o.costo_repuestos.toFixed(2)}
                                        </td>
                                        <td className="p-3.5 text-right font-mono text-purple-700 dark:text-purple-300 whitespace-nowrap">
                                            Bs. {o.costo_terceros.toFixed(2)}
                                        </td>
                                        <td className="p-3.5 text-right font-mono text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                                            Bs. {(o.costo_chaperia || 0).toFixed(2)}
                                        </td>
                                        <td
                                            className={`p-3.5 text-right font-mono font-bold whitespace-nowrap ${
                                                o.utilidad_neta >= 0
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-red-500 dark:text-red-400'
                                            }`}
                                        >
                                            Bs. {o.utilidad_neta.toFixed(2)}
                                        </td>
                                        <td className="p-3.5 text-center whitespace-nowrap">
                                            <span
                                                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                    o.utilidad_neta >= 0
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                        : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                                }`}
                                            >
                                                {o.margen_porcentaje}%
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-center whitespace-nowrap">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10.5px] font-semibold ${getEstadoBadgeClass(
                                                    o.estado
                                                )}`}
                                            >
                                                {formatEstadoLabel(o.estado)}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-center whitespace-nowrap no-print">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedOrdenId(o.id)}
                                                className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-700 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800 shadow-xs cursor-pointer inline-flex items-center gap-1"
                                                title="Ver Utilidad Neta Detallada de esta Orden"
                                            >
                                                <Eye size={14} />
                                                <span className="text-[11px] font-semibold">Detalle</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {filteredOrdenes.length > itemsPerPage && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={Math.ceil(filteredOrdenes.length / itemsPerPage)}
                            onPageChange={(p) => setCurrentPage(p)}
                        />
                    </div>
                )}
            </div>

            {/* Individual Order Detail Modal */}
            {selectedOrdenId !== null && (
                <UtilidadOrdenModal
                    ordenId={selectedOrdenId}
                    onClose={() => setSelectedOrdenId(null)}
                />
            )}

            {/* Help / Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Utilidad Neta Mensual"
                sections={manualSections}
            />
        </div>
    );
};

export default UtilidadOrdenesMensual;
