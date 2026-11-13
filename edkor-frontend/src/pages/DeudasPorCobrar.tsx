import { useState, useEffect, useMemo } from 'react';
import { Search, AlertCircle, FileText, DollarSign, Filter, RefreshCw, ReceiptText } from 'lucide-react';
import api from '../services/api';
import { getTiposOrdenEnHojasRecepcion } from '../services/tipoOrdenService';
import type { OrdenTrabajo } from '../types/ordenTrabajo';
import Pagination from '../components/Pagination';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import * as XLSX from 'xlsx';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';

// Extend OrdenTrabajo to include the extra fields returned by the endpoint
interface DeudaOrden extends OrdenTrabajo {
    total_pagado: number;
    saldo: number;
    pagos: any[];
}

const DeudasPorCobrar = () => {
    const [ordenes, setOrdenes] = useState<DeudaOrden[]>([]);
    const [loading, setLoading] = useState(true);
    const [tiposOrden, setTiposOrden] = useState<{ id: number; tipo_orden: string }[]>([]);
    const [selectedTipoOrden, setSelectedTipoOrden] = useState<string>('todos');
    const [searchTerm, setSearchTerm] = useState('');
    const [showManual, setShowManual] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [deudasRes, tiposData] = await Promise.all([
                api.get<DeudaOrden[]>('/pago-orden/deudas-por-cobrar'),
                getTiposOrdenEnHojasRecepcion().catch((err) => {
                    console.error('Error cargando tipos en hojas recepcion:', err);
                    return [];
                })
            ]);
            setOrdenes(deudasRes.data);
            if (tiposData && tiposData.length > 0) {
                setTiposOrden(tiposData);
            }
        } catch (error) {
            console.error('Error fetching deudas:', error);
        } finally {
            setLoading(false);
        }
    };

    // Combinar tipos de la base de datos (hojas de recepción) con cualquier tipo presente en las órdenes cargadas
    const availableTipos = useMemo(() => {
        const map = new Map<string, { id: number; tipo_orden: string }>();
        tiposOrden.forEach(t => {
            if (t?.tipo_orden) {
                map.set(t.tipo_orden.trim().toLowerCase(), { id: t.id, tipo_orden: t.tipo_orden.trim() });
            }
        });
        ordenes.forEach(o => {
            const nom = o.hoja_recepcion?.tipo_orden?.tipo_orden || (o as any).particular_seguro;
            if (nom && !map.has(nom.trim().toLowerCase())) {
                map.set(nom.trim().toLowerCase(), { id: (o as any).id_tipo_orden || Math.random(), tipo_orden: nom.trim() });
            }
        });
        return Array.from(map.values()).sort((a, b) => a.tipo_orden.localeCompare(b.tipo_orden));
    }, [tiposOrden, ordenes]);

    // Filter logic
    const filteredOrdenes = ordenes.filter(orden => {
        const tipo = orden.hoja_recepcion?.tipo_orden?.tipo_orden || (orden as any).particular_seguro || 'Particular';
        if (selectedTipoOrden !== 'todos') {
            if (tipo.trim().toLowerCase() !== selectedTipoOrden.trim().toLowerCase()) {
                return false;
            }
        }

        const lowerSearch = searchTerm.toLowerCase();
        const matchesSearch =
            (orden.cliente_nombre || orden.cliente || '').toLowerCase().includes(lowerSearch) ||
            (orden.vehiculo_placa || orden.placa || '').toLowerCase().includes(lowerSearch) ||
            (orden.marca_auto?.marca || orden.vehiculo_marca || '').toLowerCase().includes(lowerSearch) ||
            (orden.vehiculo_modelo || orden.modelo || '').toLowerCase().includes(lowerSearch) ||
            (orden.hoja_recepcion?.seguro?.nombre || (orden as any).seguro?.nombre || '').toLowerCase().includes(lowerSearch) ||
            (orden.nro_factura || '').toLowerCase().includes(lowerSearch) ||
            String(orden.id).includes(lowerSearch);

        return matchesSearch;
    });

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredOrdenes.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredOrdenes.length / itemsPerPage);

    const manualSections: ManualSection[] = [
        { title: 'Deudas por Cobrar', content: 'Este módulo muestra exclusivamente las órdenes de trabajo concluidas o entregadas que tienen saldo pendiente de cobro (cartera de créditos exigibles). Las órdenes en proceso no se consideran deuda exigible y sus abonos se gestionan en Registro de Cobros.' },
        { title: 'Filtro por Tipo de Orden', content: 'Utilice el selector "Tipo de Orden" para ver únicamente las órdenes registradas bajo un tipo específico en las Hojas de Recepción (Particular, Seguros, Concesionaria, etc.).' },
        { title: 'Búsqueda', content: 'Puede buscar por cliente, placa, vehículo, número de factura o código de orden.' },
        { title: 'Información', content: 'La tabla detalla el total presupuestado de la orden, el importe pagado y el saldo remanente a cobrar.' }
    ];

    const formatCurrency = (amount: number, currency: string) => {
        const symbol = currency === 'Dólares' ? '$us' : 'Bs';
        return `${symbol} ${Number(amount).toFixed(2)}`;
    };

    const totalDeudaSaldo = filteredOrdenes.reduce((sum, o) => sum + Number(o.saldo || 0), 0);
    const totalDeudaMonto = filteredOrdenes.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalDeudaPagado = filteredOrdenes.reduce((sum, o) => sum + Number(o.total_pagado || 0), 0);

    const exportToExcel = () => {
        const data = filteredOrdenes.map((o, index) => ({
            '#': index + 1,
            'N° Orden': String(o.hoja_recepcion?.nro || (o as any).nro_hoja || o.id_hoja_recepcion || o.id).padStart(6, '0'),
            'Tipo Orden': o.hoja_recepcion?.tipo_orden?.tipo_orden || (o as any).particular_seguro || 'Particular',
            'Cliente': o.cliente_nombre || o.cliente || '-',
            'Teléfono': o.cliente_telefono || (o as any).celular || '-',
            'Placa': (o.vehiculo_placa || o.placa || 'S/P').toUpperCase(),
            'Vehículo': `${o.marca_auto?.marca || o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.modelo || ''}`.trim() || '-',
            'N° Factura': o.nro_factura || 'S/N',
            'Total': Number(o.total || 0),
            'Total Pagado': Number(o.total_pagado || 0),
            'Saldo Pendiente': Number(o.saldo || 0),
            'Moneda': o.moneda || 'Bolivianos'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DeudasPorCobrar');
        XLSX.writeFile(wb, `DeudasPorCobrar_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        const filtersArr = [];
        if (selectedTipoOrden !== 'todos') filtersArr.push(`Tipo: ${selectedTipoOrden}`);
        if (searchTerm) filtersArr.push(`Búsqueda: "${searchTerm}"`);
        const filtersText = filtersArr.length > 0 ? `Filtros: ${filtersArr.join(' | ')}` : undefined;

        await exportStandardPDF({
            title: 'Reporte de Deudas por Cobrar',
            subtitle: 'EDKOR MOTORS - Control de Cartera y Saldos Pendientes',
            filtersText,
            totalRecords: filteredOrdenes.length,
            totalRecordsLabel: 'Órdenes con Saldo',
            filename: `DeudasPorCobrar_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'N° Orden', 'Tipo Orden', 'Cliente', 'Teléfono', 'Placa', 'Vehículo', 'Total OT', 'Total Pagado', 'Saldo Deuda']],
                body: filteredOrdenes.map((o, index) => [
                    index + 1,
                    String(o.hoja_recepcion?.nro || (o as any).nro_hoja || o.id_hoja_recepcion || o.id).padStart(6, '0'),
                    o.hoja_recepcion?.tipo_orden?.tipo_orden || (o as any).particular_seguro || 'Particular',
                    o.cliente_nombre || o.cliente || '-',
                    o.cliente_telefono || (o as any).celular || '-',
                    (o.vehiculo_placa || o.placa || 'S/P').toUpperCase(),
                    `${o.marca_auto?.marca || o.vehiculo_marca || ''} ${o.vehiculo_modelo || o.modelo || ''}`.trim() || '-',
                    formatCurrency(o.total, o.moneda),
                    formatCurrency(o.total_pagado, o.moneda),
                    formatCurrency(o.saldo, o.moneda)
                ]),
                foot: [
                    [
                        { content: `TOTAL SALDOS PENDIENTES (${filteredOrdenes.length} ÓRDENES):`, colSpan: 9, styles: { halign: 'right', fontStyle: 'bold' } },
                        { content: `Bs ${totalDeudaSaldo.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } }
                    ]
                ],
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
                    2: { cellWidth: 24 },
                    3: { cellWidth: 'auto' },
                    4: { cellWidth: 22, fontSize: 6.5 },
                    5: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
                    6: { cellWidth: 32 },
                    7: { halign: 'right', cellWidth: 22 },
                    8: { halign: 'right', cellWidth: 22 },
                    9: { halign: 'right', fontStyle: 'bold', cellWidth: 26, textColor: [220, 38, 38] }
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

    return (
        <>
        <div className="container mx-auto p-6 max-w-7xl min-h-screen print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <FileText className="text-red-600" size={32} />
                        Deudas por Cobrar
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Control y seguimiento de órdenes con saldo pendiente de cobro
                    </p>
                </div>

                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={handlePrint}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual"
                >
                    <button
                        onClick={loadData}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-gray-700 dark:text-blue-400 dark:hover:bg-gray-600 rounded-lg transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                        title="Actualizar lista"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Actualizar</span>
                    </button>
                </StandardExportToolbar>
            </div>

            {/* Filtros: Selector de Tipo de Orden y Buscador */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {/* Selector Tipo de Orden */}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                        <Filter size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                            Tipo de Orden:
                        </label>
                        <select
                            value={selectedTipoOrden}
                            onChange={(e) => {
                                setSelectedTipoOrden(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="bg-transparent text-sm font-bold text-gray-900 dark:text-white focus:outline-none cursor-pointer pr-2"
                        >
                            <option value="todos" className="text-gray-800 dark:text-gray-200">
                                Todos ({ordenes.length})
                            </option>
                            {availableTipos.map((t) => {
                                const count = ordenes.filter(o => {
                                    const nom = o.hoja_recepcion?.tipo_orden?.tipo_orden || (o as any).particular_seguro || 'Particular';
                                    return nom.trim().toLowerCase() === t.tipo_orden.trim().toLowerCase();
                                }).length;
                                return (
                                    <option key={t.id || t.tipo_orden} value={t.tipo_orden} className="text-gray-800 dark:text-gray-200">
                                        {t.tipo_orden} ({count})
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Buscador */}
                    <div className="relative w-full sm:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por cliente, placa, vehículo..."
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-xs transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {selectedTipoOrden !== 'todos' && (
                    <button
                        onClick={() => { setSelectedTipoOrden('todos'); setSearchTerm(''); }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline self-start md:self-center font-medium"
                    >
                        Limpiar filtros
                    </button>
                )}
            </div>

            {/* Info Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Total Saldo Deudor {selectedTipoOrden !== 'todos' ? `(${selectedTipoOrden})` : ''}
                        </p>
                        <p className="text-2xl font-bold text-red-600 mt-0.5">
                            Bs {filteredOrdenes.reduce((acc, curr) => {
                                const saldoNum = Number(curr.saldo) || 0;
                                return acc + (curr.moneda === 'Bolivianos' ? saldoNum : saldoNum * 6.96);
                            }, 0).toFixed(2)}
                        </p>
                    </div>
                    <div className="p-3 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 rounded-xl">
                        <DollarSign size={24} />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Órdenes Pendientes {selectedTipoOrden !== 'todos' ? `(${selectedTipoOrden})` : ''}
                        </p>
                        <p className="text-2xl font-bold text-gray-800 dark:text-white mt-0.5">
                            {filteredOrdenes.length}
                        </p>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-xl">
                        <FileText size={24} />
                    </div>
                </div>
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
                Mostrando {filteredOrdenes.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredOrdenes.length)} de {filteredOrdenes.length} registros
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16"># Orden</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo Orden</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente / Seguro</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehículo</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Total</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Pagado</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Saldo Deudor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500">Cargando deudas...</td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <AlertCircle className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                                            <p className="font-medium">No hay órdenes con saldo pendiente en esta categoría</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((orden) => {
                                    const tipo = orden.hoja_recepcion?.tipo_orden?.tipo_orden || (orden as any).particular_seguro || 'Particular';
                                    const isSeguro = String(tipo).toLowerCase().includes('seguro');

                                    return (
                                        <tr key={orden.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-4 text-blue-600 dark:text-blue-400 font-bold font-mono text-sm">
                                                #{String(orden.hoja_recepcion?.nro || (orden as any).nro_hoja || orden.id).padStart(6, '0')}
                                            </td>
                                            <td className="p-4 text-sm">
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                                                    isSeguro
                                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                                }`}>
                                                    {tipo}
                                                </span>
                                            </td>
                                            <td className="p-4 text-gray-700 dark:text-gray-200 text-sm whitespace-nowrap">
                                                {new Date(orden.fecha_registro).toLocaleDateString()}
                                            </td>
                                            <td className="p-4 text-gray-700 dark:text-gray-200">
                                                <div className="font-semibold text-gray-900 dark:text-white">
                                                    {orden.cliente_nombre || orden.cliente || 'N/A'}
                                                </div>
                                                {orden.hoja_recepcion?.seguro && (
                                                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                                        Seguro: {orden.hoja_recepcion.seguro.nombre}
                                                    </div>
                                                )}
                                                {orden.facturado && (
                                                    <div className="mt-1">
                                                        <span className="whitespace-nowrap inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                                            <ReceiptText size={10} className="shrink-0 text-blue-600" />
                                                            <span>Fact: {orden.nro_factura || 'S/N'}</span>
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-700 dark:text-gray-200">
                                                <div className="flex flex-col">
                                                    <span className="font-mono font-bold text-sm text-gray-900 dark:text-white">
                                                        {(orden.vehiculo_placa || orden.placa || 'S/P').toUpperCase()}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {orden.marca_auto?.marca || orden.vehiculo_marca} {orden.vehiculo_modelo || orden.modelo}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-700 dark:text-gray-200 text-right font-medium whitespace-nowrap">
                                                {formatCurrency(orden.total, orden.moneda)}
                                            </td>
                                            <td className="p-4 text-emerald-600 dark:text-emerald-400 text-right font-medium whitespace-nowrap">
                                                {formatCurrency(orden.total_pagado, orden.moneda)}
                                            </td>
                                            <td className="p-4 text-red-600 dark:text-red-400 text-right font-bold text-base whitespace-nowrap">
                                                {formatCurrency(orden.saldo, orden.moneda)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Deudas por Cobrar"
                sections={manualSections}
            />
        </div>

        {/* Print View Deudas por Cobrar */}
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
                    title="Reporte de Deudas por Cobrar"
                    subtitle="EDKOR MOTORS - Control de Cartera y Saldos Pendientes"
                    filtersText={
                        (selectedTipoOrden !== 'todos' ? `Tipo: ${selectedTipoOrden}` : '') +
                        (searchTerm ? ` | Búsqueda: "${searchTerm}"` : '')
                    }
                    totalRecords={filteredOrdenes.length}
                    totalRecordsLabel="Órdenes con Saldo"
                />

                <table className="w-full text-left border border-gray-400 text-[10px]">
                    <thead>
                        <tr className="bg-gray-100 text-gray-900 border-b border-gray-400 font-bold uppercase text-[9px]">
                            <th className="p-1.5 border-r border-gray-300 text-center w-8">#</th>
                            <th className="p-1.5 border-r border-gray-300 text-center w-16">N° Orden</th>
                            <th className="p-1.5 border-r border-gray-300 w-24">Tipo Orden</th>
                            <th className="p-1.5 border-r border-gray-300">Cliente</th>
                            <th className="p-1.5 border-r border-gray-300 w-22">Teléfono</th>
                            <th className="p-1.5 border-r border-gray-300 text-center w-16">Placa</th>
                            <th className="p-1.5 border-r border-gray-300 w-32">Vehículo</th>
                            <th className="p-1.5 border-r border-gray-300 text-right w-22">Total OT</th>
                            <th className="p-1.5 border-r border-gray-300 text-right w-22">Total Pagado</th>
                            <th className="p-1.5 text-right w-24">Saldo Deuda</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrdenes.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="p-4 text-center text-gray-500 italic">
                                    No hay órdenes con deudas por cobrar según los filtros seleccionados.
                                </td>
                            </tr>
                        ) : (
                            filteredOrdenes.map((orden, index) => (
                                <tr key={orden.id} className={`border-b border-gray-200 ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                                    <td className="p-1.5 border-r border-gray-200 text-center font-medium">{index + 1}</td>
                                    <td className="p-1.5 border-r border-gray-200 text-center font-bold text-gray-900">
                                        {String(orden.hoja_recepcion?.nro || (orden as any).nro_hoja || orden.id_hoja_recepcion || orden.id).padStart(6, '0')}
                                    </td>
                                    <td className="p-1.5 border-r border-gray-200">
                                        {orden.hoja_recepcion?.tipo_orden?.tipo_orden || (orden as any).particular_seguro || 'Particular'}
                                    </td>
                                    <td className="p-1.5 border-r border-gray-200">{orden.cliente_nombre || orden.cliente || '-'}</td>
                                    <td className="p-1.5 border-r border-gray-200 text-[9px]">{orden.cliente_telefono || (orden as any).celular || '-'}</td>
                                    <td className="p-1.5 border-r border-gray-200 text-center font-bold">
                                        {(orden.vehiculo_placa || orden.placa || 'S/P').toUpperCase()}
                                    </td>
                                    <td className="p-1.5 border-r border-gray-200 font-medium">
                                        {orden.marca_auto?.marca || orden.vehiculo_marca} {orden.vehiculo_modelo || orden.modelo}
                                    </td>
                                    <td className="p-1.5 border-r border-gray-200 text-right font-medium">
                                        {formatCurrency(orden.total, orden.moneda)}
                                    </td>
                                    <td className="p-1.5 border-r border-gray-200 text-right text-emerald-700 font-medium">
                                        {formatCurrency(orden.total_pagado, orden.moneda)}
                                    </td>
                                    <td className="p-1.5 text-right font-bold text-red-600">
                                        {formatCurrency(orden.saldo, orden.moneda)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {filteredOrdenes.length > 0 && (
                        <tfoot>
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-400 text-[10px]">
                                <td colSpan={9} className="p-2 text-right uppercase border-r border-gray-300">
                                    Total Saldos Pendientes ({filteredOrdenes.length} órdenes):
                                </td>
                                <td className="p-2 text-right text-red-600 font-black">
                                    Bs {totalDeudaSaldo.toFixed(2)}
                                </td>
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

export default DeudasPorCobrar;