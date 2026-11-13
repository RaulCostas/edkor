import { useState, useEffect } from 'react';
import { Search, Calendar, User, Filter, AlertCircle, FileCheck, ClipboardList, Printer, RotateCcw, Clock, DollarSign, CheckCircle, Clock4, CreditCard } from 'lucide-react';
import { getTrabajosAsignadosFilter } from '../services/trabajosAsignadosService';
import type { TrabajoAsignado } from '../services/trabajosAsignadosService';
import { getPersonal } from '../services/personalService';
import type { Personal } from '../types/personal';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import Pagination from '../components/Pagination';
import * as XLSX from 'xlsx';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';

const PagosTrabajosStatus = () => {
    // State
    const [trabajos, setTrabajos] = useState<TrabajoAsignado[]>([]);
    const [personalList, setPersonalList] = useState<Personal[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'no_cancelados' | 'cancelados'>('no_cancelados');
    const [showManual, setShowManual] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const manualSections: ManualSection[] = [
        { title: 'Filtrado', content: 'Filtre por Mecánico/Personal, rango de Fechas (Desde / Hasta) y Estado de la Orden de Trabajo.' },
        { title: 'Pestañas de Estado', content: 'Alterne entre "No Cancelados" (trabajos pendientes de pago) y "Cancelados" (trabajos ya liquidados con su respectivo recibo y forma de pago).' },
        { title: 'Columnas Operativas', content: 'Consulte la Fecha de Asignación (creación de OT), Fecha de Término, Tiempo, Precio por Hora y Total Costo.' },
        { title: 'Impresión', content: 'Haga clic en "Imprimir" para generar un reporte en papel o PDF de la lista visualizada.' }
    ];

    // Filters
    const [selectedPersonal, setSelectedPersonal] = useState<string>('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [ordenEstado, setOrdenEstado] = useState<string>('');

    useEffect(() => {
        fetchPersonal();
        handleSearch();
    }, []);

    const fetchPersonal = async () => {
        try {
            const data = await getPersonal();
            if (Array.isArray(data)) {
                setPersonalList(data);
            } else {
                setPersonalList([]);
            }
        } catch (error) {
            console.error('Error fetching personal:', error);
            setPersonalList([]);
        }
    };

    const handleReset = () => {
        setSelectedPersonal('');
        setFechaInicio('');
        setFechaFin('');
        setOrdenEstado('');

        setLoading(true);
        getTrabajosAsignadosFilter({})
            .then(data => {
                if (Array.isArray(data)) {
                    setTrabajos(data);
                } else {
                    setTrabajos([]);
                }
            })
            .catch(error => {
                console.error('Error resetting filters:', error);
                setTrabajos([]);
            })
            .finally(() => setLoading(false));
    };

    const handleSearch = async () => {
        setLoading(true);
        try {
            const filters = {
                personalId: selectedPersonal ? Number(selectedPersonal) : undefined,
                fechaInicio: fechaInicio || undefined,
                fechaFin: fechaFin || undefined,
                ordenEstado: ordenEstado || undefined
            };
            const data = await getTrabajosAsignadosFilter(filters);
            if (Array.isArray(data)) {
                setTrabajos(data);
            } else {
                setTrabajos([]);
            }
        } catch (error) {
            console.error('Error fetching trabajos:', error);
            setTrabajos([]);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return `Bs ${Number(amount || 0).toFixed(2)}`;
    };

    const exportToExcel = () => {
        const data = filteredTrabajos.map((t, index) => {
            const dot = t.detalle_orden_trabajo || {};
            const ot = dot.orden_trabajo || {};
            const mecanico = t.personal ? `${t.personal.nombre} ${t.personal.paterno || ''}`.trim() : '-';
            const tiempoVal = Number(t.tiempo_estimado || dot.tiempo_estimado || 0);
            const precioHoraVal = Number(dot.precio_hora || t.personal?.precio_hora || 0);
            const totalCosto = Number(t.monto || dot.total_costo || (tiempoVal * precioHoraVal) || 0);

            return {
                '#': index + 1,
                'N° OT': ot.id ? String(ot.id).padStart(6, '0') : '-',
                'Vehículo': `${ot.vehiculo_marca || ''} ${ot.vehiculo_modelo || ''}`.trim() || '-',
                'Placa': ot.vehiculo_placa || '-',
                'Mecánico': mecanico,
                'Trabajo': dot.detalle || '-',
                'Tiempo (Hrs)': tiempoVal,
                'Precio Hora (Bs)': precioHoraVal,
                'Total Costo (Bs)': totalCosto,
                'Estado Trabajo': t.cancelado ? 'CANCELADO (LIQUIDADO)' : 'NO CANCELADO (PENDIENTE)',
                'Fecha Asignado': t.fecha_asignado ? new Date(t.fecha_asignado).toLocaleDateString('es-ES') : '-',
                'Fecha Entrega/Pago': t.fecha_entrega ? new Date(t.fecha_entrega).toLocaleDateString('es-ES') : '-'
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Trabajos');
        XLSX.writeFile(wb, `Trabajos_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        const filtersArr = [];
        if (selectedPersonal) {
            const p = personalList.find(item => String(item.id) === selectedPersonal);
            if (p) filtersArr.push(`Mecánico: ${p.nombre} ${p.paterno || ''}`);
        }
        if (fechaInicio) filtersArr.push(`Desde: ${fechaInicio}`);
        if (fechaFin) filtersArr.push(`Hasta: ${fechaFin}`);
        filtersArr.push(`Pestaña: ${activeTab === 'cancelados' ? 'Cancelados (Liquidados)' : 'No Cancelados (Pendientes)'}`);

        const filtersText = filtersArr.join(' | ');

        await exportStandardPDF({
            title: `Reporte de Trabajos Asignados - ${activeTab === 'cancelados' ? 'Cancelados' : 'No Cancelados'}`,
            subtitle: 'EDKOR MOTORS - Control y Liquidación de Trabajos de Taller',
            filtersText,
            totalRecords: filteredTrabajos.length,
            totalRecordsLabel: 'Total Trabajos',
            filename: `Trabajos_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'N° OT', 'Placa', 'Vehículo', 'Mecánico', 'Trabajo Realizado', 'Tiempo', 'P. Hora', 'Total Costo', 'Estado']],
                body: filteredTrabajos.map((t, index) => {
                    const dot = t.detalle_orden_trabajo || {};
                    const ot = dot.orden_trabajo || {};
                    const mecanico = t.personal ? `${t.personal.nombre} ${t.personal.paterno || ''}`.trim() : '-';
                    const tiempoVal = Number(t.tiempo_estimado || dot.tiempo_estimado || 0);
                    const precioHoraVal = Number(dot.precio_hora || t.personal?.precio_hora || 0);
                    const totalCosto = Number(t.monto || dot.total_costo || (tiempoVal * precioHoraVal) || 0);

                    return [
                        index + 1,
                        ot.id ? String(ot.id).padStart(6, '0') : '-',
                        ot.vehiculo_placa || '-',
                        `${ot.vehiculo_marca || ''} ${ot.vehiculo_modelo || ''}`.trim() || '-',
                        mecanico,
                        dot.detalle || '-',
                        tiempoVal > 0 ? `${tiempoVal} hrs` : '-',
                        precioHoraVal > 0 ? formatCurrency(precioHoraVal) : '-',
                        formatCurrency(totalCosto),
                        t.cancelado ? 'LIQUIDADO' : 'PENDIENTE'
                    ];
                }),
                foot: [
                    [
                        { content: `TOTAL COSTO (${filteredTrabajos.length} TRABAJOS, ${totalHorasTab.toFixed(1)} HRS):`, colSpan: 8, styles: { halign: 'right', fontStyle: 'bold' } },
                        { content: `Bs ${totalMontoTab.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] } },
                        { content: '', styles: { halign: 'center' } }
                    ]
                ],
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
                    2: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
                    3: { cellWidth: 28 },
                    4: { cellWidth: 32 },
                    5: { cellWidth: 'auto' },
                    6: { halign: 'center', cellWidth: 18 },
                    7: { halign: 'right', cellWidth: 20 },
                    8: { halign: 'right', fontStyle: 'bold', cellWidth: 24, textColor: [22, 101, 52] },
                    9: { halign: 'center', fontStyle: 'bold', cellWidth: 22, fontSize: 6.5 }
                }
            }
        });
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 150);
    };

    // Filtered data based on active tab
    const filteredTrabajos = trabajos.filter(t => {
        if (activeTab === 'cancelados') return t.cancelado;
        return !t.cancelado;
    });

    // Totals calculations
    const totalMontoTab = filteredTrabajos.reduce((sum, t) => sum + Number(t.monto || t.costo_arancel || t.detalle_orden_trabajo?.total_costo || 0), 0);
    const totalHorasTab = filteredTrabajos.reduce((sum, t) => {
        const h = Number(t.tiempo_estimado || t.detalle_orden_trabajo?.tiempo_estimado || t.detalle_orden_trabajo?.precio_taller?.tiempo_estimado || 0);
        return sum + h;
    }, 0);

    const countCancelados = trabajos.filter(t => t.cancelado).length;
    const countNoCancelados = trabajos.filter(t => !t.cancelado).length;

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredTrabajos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredTrabajos.length / itemsPerPage);

    return (
        <>
        <div className="container mx-auto p-6 max-w-7xl min-h-screen print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <FileCheck className="text-green-600" size={32} />
                        Trabajos Cancelados / No Cancelados
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Control y seguimiento de trabajos liquidados por planilla y pendientes de pago
                    </p>
                </div>

                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={handlePrint}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual"
                />
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 no-print">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    {/* Personal */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                            <User size={15} className="text-blue-500" />
                            Personal / Mecánico
                        </label>
                        <select
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm"
                            value={selectedPersonal}
                            onChange={(e) => setSelectedPersonal(e.target.value)}
                        >
                            <option value="">-- Todos los Mecánicos --</option>
                            {Array.isArray(personalList) && personalList.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.nombre} {p.paterno} {p.area ? `(${p.area.area})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fecha Inicio */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                            <Calendar size={15} className="text-blue-500" />
                            Fecha Desde
                        </label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                        />
                    </div>

                    {/* Fecha Fin */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                            <Calendar size={15} className="text-blue-500" />
                            Fecha Hasta
                        </label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                        />
                    </div>

                    {/* Estado OT */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
                            <Filter size={15} className="text-blue-500" />
                            Estado de la OT
                        </label>
                        <select
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm"
                            value={ordenEstado}
                            onChange={(e) => setOrdenEstado(e.target.value)}
                        >
                            <option value="">Todas las Órdenes</option>
                            <option value="terminado">Órdenes Terminadas</option>
                            <option value="activo">Órdenes Activas</option>
                            <option value="en_proceso">Órdenes En Proceso</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={handleReset}
                        className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 font-medium rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5 text-sm"
                        title="Limpiar filtros"
                    >
                        <RotateCcw size={16} />
                        <span>Limpiar</span>
                    </button>
                    <button
                        onClick={handleSearch}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 hover:shadow-md flex items-center gap-1.5 text-sm"
                    >
                        <Search size={16} />
                        <span>Buscar</span>
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 hover:shadow-md flex items-center gap-1.5 text-sm"
                    >
                        <Printer size={16} />
                        <span>Imprimir</span>
                    </button>
                </div>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 no-print">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Trabajos Mostrados</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{filteredTrabajos.length}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                        <ClipboardList size={24} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Horas</p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{totalHorasTab.toFixed(1)} hrs</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Total Monto</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(totalMontoTab)}</p>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 rounded-xl">
                        <DollarSign size={24} />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-3 mb-4 no-print">
                <button
                    onClick={() => { setActiveTab('no_cancelados'); setCurrentPage(1); }}
                    className={`
                        px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm
                        ${activeTab === 'no_cancelados'
                            ? 'bg-red-600 text-white shadow-md transform scale-[1.02]'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}
                    `}
                >
                    <AlertCircle size={18} />
                    <span>No Cancelados (Pendientes de Pago)</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'no_cancelados' ? 'bg-red-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                        {countNoCancelados}
                    </span>
                </button>

                <button
                    onClick={() => { setActiveTab('cancelados'); setCurrentPage(1); }}
                    className={`
                        px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 shadow-sm
                        ${activeTab === 'cancelados'
                            ? 'bg-green-600 text-white shadow-md transform scale-[1.02]'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}
                    `}
                >
                    <ClipboardList size={18} />
                    <span>Cancelados (Pagados)</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === 'cancelados' ? 'bg-green-700 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                        {countCancelados}
                    </span>
                </button>
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
                Mostrando {filteredTrabajos.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredTrabajos.length)} de {filteredTrabajos.length} registros
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mecánico</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">OT / Vehículo</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trabajo Realizado</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">F. Asignado</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">F. Término</th>
                                {activeTab === 'cancelados' && (
                                    <>
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">F. Pago</th>
                                        <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Forma Pago</th>
                                    </>
                                )}
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Tiempo</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Precio Hora</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Total Costo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={activeTab === 'cancelados' ? 11 : 9} className="p-8 text-center text-gray-500">Cargando...</td>
                                </tr>
                            ) : (!filteredTrabajos || filteredTrabajos.length === 0) ? (
                                <tr>
                                    <td colSpan={activeTab === 'cancelados' ? 11 : 9} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                                            <p>No se encontraron trabajos {activeTab === 'cancelados' ? 'cancelados' : 'pendientes de pago'} con los filtros seleccionados.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((trabajo, index) => {
                                    const ot = trabajo.detalle_orden_trabajo?.orden_trabajo;
                                    const tiempoRaw = trabajo.tiempo_estimado || trabajo.detalle_orden_trabajo?.tiempo_estimado || trabajo.detalle_orden_trabajo?.precio_taller?.tiempo_estimado;
                                    const tiempoVal = Number(tiempoRaw || 0);
                                    const totalCosto = Number(trabajo.monto || trabajo.costo_arancel || trabajo.detalle_orden_trabajo?.total_costo || 0);

                                    const precioHoraVal = Number(trabajo.detalle_orden_trabajo?.precio_hora) > 0
                                        ? Number(trabajo.detalle_orden_trabajo.precio_hora)
                                        : (Number(trabajo.detalle_orden_trabajo?.precio_taller?.precio_hora) > 0
                                            ? Number(trabajo.detalle_orden_trabajo.precio_taller.precio_hora)
                                            : (tiempoVal > 0 && totalCosto > 0 ? Math.round((totalCosto / tiempoVal) * 100) / 100 : 0));

                                    const estadoOT = (ot?.estado || '').toLowerCase();
                                    const isTerminada = Boolean(trabajo.fecha_entrega) || estadoOT.startsWith('terminad') || estadoOT.startsWith('finaliz') || estadoOT.includes('cerrad');

                                    return (
                                        <tr key={trabajo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-3 text-gray-500 dark:text-gray-400 text-xs font-mono">
                                                {indexOfFirstItem + index + 1}
                                            </td>
                                            <td className="p-3 text-sm">
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    {trabajo.personal ? `${trabajo.personal.nombre} ${trabajo.personal.paterno}` : 'Sin Asignar'}
                                                </div>
                                                {trabajo.personal?.area && (
                                                    <span className="text-[11px] text-gray-400">
                                                        {trabajo.personal.area.area}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-sm">
                                                <div className="font-bold text-blue-600 dark:text-blue-400">
                                                    {ot?.id ? `OT #${ot.id}` : 'S/N'} - {ot?.placa || '-'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {ot?.marca_auto?.marca} {ot?.modelo}
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm">
                                                <div className="font-medium text-gray-800 dark:text-gray-200">
                                                    {trabajo.detalle_orden_trabajo?.detalle || trabajo.detalle_orden_trabajo?.precio_taller?.detalle || 'Sin detalle'}
                                                </div>
                                                <div className="mt-1">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${isTerminada ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                                        {isTerminada ? <CheckCircle size={11} /> : <Clock4 size={11} />}
                                                        {isTerminada ? 'Terminado' : 'En Proceso'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center text-xs text-gray-600 dark:text-gray-300">
                                                {trabajo.fecha_asignado ? new Date(trabajo.fecha_asignado).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-3 text-center text-xs text-gray-600 dark:text-gray-300">
                                                {trabajo.fecha_entrega ? new Date(trabajo.fecha_entrega).toLocaleDateString() : '-'}
                                            </td>

                                            {activeTab === 'cancelados' && (
                                                <>
                                                    <td className="p-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                        {trabajo.pago_trabajo?.fecha_pago
                                                            ? new Date(trabajo.pago_trabajo.fecha_pago).toLocaleDateString()
                                                            : (trabajo.fecha_entrega ? new Date(trabajo.fecha_entrega).toLocaleDateString() : '-')}
                                                    </td>
                                                    <td className="p-3 text-xs">
                                                        {trabajo.idplanilla || trabajo.planilla ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                                                <FileCheck size={11} />
                                                                Planilla {trabajo.planilla ? `${String(trabajo.planilla.mes).padStart(2, '0')}/${trabajo.planilla.anio}` : ''}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                                                                <CreditCard size={11} />
                                                                {trabajo.pago_trabajo?.forma_pago?.forma_pago || 'Pago Directo'}
                                                            </span>
                                                        )}
                                                    </td>
                                                </>
                                            )}

                                            <td className="p-3 text-center text-xs">
                                                <div className="inline-flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded">
                                                    <Clock size={12} className="text-blue-500" />
                                                    <span>{tiempoVal > 0 ? `${tiempoVal} hrs` : (tiempoRaw || '-')}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                {precioHoraVal > 0 ? formatCurrency(precioHoraVal) : '-'}
                                            </td>
                                            <td className="p-3 text-right text-sm font-bold text-green-600 dark:text-green-400">
                                                {formatCurrency(totalCosto)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 no-print">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-right no-print">
                Total Registros: {filteredTrabajos.length}
            </div>

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Estado de Pagos a Personal"
                sections={manualSections}
            />
        </div>

        {/* Print View Trabajos Asignados */}
        {isPrinting && (
            <div className="hidden print:block w-full bg-white text-black p-4 text-[11px] leading-tight font-sans">
                <style>{`
                    @media print {
                        @page {
                            size: letter landscape;
                            margin: 8mm;
                        }
                        body {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            background: white !important;
                            color: black !important;
                        }
                        table {
                            border-collapse: collapse !important;
                            width: 100% !important;
                        }
                        tr {
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                    }
                `}</style>

                <StandardPrintHeader
                    title={`Reporte de Trabajos Asignados - ${activeTab === 'cancelados' ? 'Cancelados (Liquidados)' : 'No Cancelados (Pendientes)'}`}
                    subtitle="EDKOR MOTORS - Control y Liquidación de Trabajos de Taller"
                    filtersText={
                        (selectedPersonal ? `Mecánico: ${personalList.find(p => String(p.id) === selectedPersonal)?.nombre || ''} | ` : '') +
                        (fechaInicio ? `Desde: ${fechaInicio} | ` : '') +
                        (fechaFin ? `Hasta: ${fechaFin}` : '')
                    }
                    totalRecords={filteredTrabajos.length}
                    totalRecordsLabel="Total Trabajos"
                />

                <table className="w-full text-left border border-gray-400 text-[10px]">
                    <thead>
                        <tr className="bg-gray-100 text-gray-900 border-b border-gray-400 font-bold uppercase text-[9px]">
                            <th className="p-1.5 border-r border-gray-300 text-center w-8">#</th>
                            <th className="p-1.5 border-r border-gray-300 text-center w-16">N° OT</th>
                            <th className="p-1.5 border-r border-gray-300 text-center w-16">Placa</th>
                            <th className="p-1.5 border-r border-gray-300 w-32">Vehículo</th>
                            <th className="p-1.5 border-r border-gray-300 w-36">Mecánico</th>
                            <th className="p-1.5 border-r border-gray-300">Trabajo Realizado</th>
                            <th className="p-1.5 border-r border-gray-300 text-center w-16">Tiempo</th>
                            <th className="p-1.5 border-r border-gray-300 text-right w-20">P. Hora</th>
                            <th className="p-1.5 border-r border-gray-300 text-right w-22">Total Costo</th>
                            <th className="p-1.5 text-center w-24">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTrabajos.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="p-4 text-center text-gray-500 italic">
                                    No hay trabajos para mostrar con los filtros seleccionados.
                                </td>
                            </tr>
                        ) : (
                            filteredTrabajos.map((t, index) => {
                                const dot = t.detalle_orden_trabajo || {};
                                const ot = dot.orden_trabajo || {};
                                const mecanico = t.personal ? `${t.personal.nombre} ${t.personal.paterno || ''}`.trim() : '-';
                                const tiempoVal = Number(t.tiempo_estimado || dot.tiempo_estimado || 0);
                                const precioHoraVal = Number(dot.precio_hora || t.personal?.precio_hora || 0);
                                const totalCosto = Number(t.monto || dot.total_costo || (tiempoVal * precioHoraVal) || 0);

                                return (
                                    <tr key={t.id} className={`border-b border-gray-200 ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                                        <td className="p-1.5 border-r border-gray-200 text-center font-medium">{index + 1}</td>
                                        <td className="p-1.5 border-r border-gray-200 text-center font-bold text-gray-900">
                                            {ot.id ? String(ot.id).padStart(6, '0') : '-'}
                                        </td>
                                        <td className="p-1.5 border-r border-gray-200 text-center font-bold">
                                            {ot.vehiculo_placa || '-'}
                                        </td>
                                        <td className="p-1.5 border-r border-gray-200 font-medium">
                                            {`${ot.vehiculo_marca || ''} ${ot.vehiculo_modelo || ''}`.trim() || '-'}
                                        </td>
                                        <td className="p-1.5 border-r border-gray-200">{mecanico}</td>
                                        <td className="p-1.5 border-r border-gray-200">{dot.detalle || '-'}</td>
                                        <td className="p-1.5 border-r border-gray-200 text-center">
                                            {tiempoVal > 0 ? `${tiempoVal} hrs` : '-'}
                                        </td>
                                        <td className="p-1.5 border-r border-gray-200 text-right">
                                            {precioHoraVal > 0 ? formatCurrency(precioHoraVal) : '-'}
                                        </td>
                                        <td className="p-1.5 border-r border-gray-200 text-right font-bold text-green-700">
                                            {formatCurrency(totalCosto)}
                                        </td>
                                        <td className="p-1.5 text-center uppercase font-semibold text-[9px]">
                                            {t.cancelado ? 'LIQUIDADO' : 'PENDIENTE'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                    {filteredTrabajos.length > 0 && (
                        <tfoot>
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-400 text-[10px]">
                                <td colSpan={8} className="p-2 text-right uppercase border-r border-gray-300">
                                    Total ({filteredTrabajos.length} trabajos, {totalHorasTab.toFixed(1)} hrs):
                                </td>
                                <td className="p-2 text-right text-green-700 font-black">
                                    Bs {totalMontoTab.toFixed(2)}
                                </td>
                                <td className="p-2"></td>
                            </tr>
                        </tfoot>
                    )}
                </table>

                <StandardPrintFooter />
            </div>
        )}
        </>
    );
};

export default PagosTrabajosStatus;
