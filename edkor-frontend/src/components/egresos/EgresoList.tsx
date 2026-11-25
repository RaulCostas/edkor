import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Download, Printer, CreditCard, ExternalLink, Wrench } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { getEgresos, deleteEgreso } from '../../services/egresosService';
import type { Egreso } from '../../types/egreso';
import EgresoForm from './EgresoForm';
import CalendarWidget from '../CalendarWidget';
import ManualModal, { type ManualSection } from '../ManualModal';
import Pagination from '../Pagination';
import { exportStandardPDF } from '../../utils/pdfExportHelper';
import { StandardExportToolbar } from '../common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../common/StandardPrintHeader';
import { API_BASE_URL } from '../../config';
import { getLocalDateString } from '../../utils/dateUtils';
import { getComprobantesList } from '../../utils/comprobanteUtils';

const EgresoList = () => {
    const [egresos, setEgresos] = useState<Egreso[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(getLocalDateString());
    const [endDate, setEndDate] = useState(getLocalDateString());

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit] = useState(50);

    const [totals, setTotals] = useState<Record<string, { bolivianos: number; dolares: number }>>({});

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEgreso, setSelectedEgreso] = useState<Egreso | null>(null);
    const [showManual, setShowManual] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    const manualSections: ManualSection[] = [
        { title: 'Gestión de Egresos', content: 'Administre los egresos diarios del taller y casa, filtrando por fecha y detalle.' },
        { title: 'Filtrado', content: 'Use el calendario lateral para seleccionar un día específico o el rango de fechas para búsquedas más amplias.' },
        { title: 'Exportación', content: 'Puede exportar los datos visibles a Excel, PDF o imprimirlos directamente usando los botones superiores.' }
    ];

    useEffect(() => {
        loadEgresos();
    }, [startDate, endDate, currentPage, searchTerm]);

    const loadEgresos = async () => {
        setLoading(true);
        try {
            const response = await getEgresos({
                page: currentPage,
                limit,
                startDate,
                endDate,
                search: searchTerm
            });
            setEgresos(response.data);
            setTotalPages(response.totalPages);
            setTotalItems(response.total);
            setTotals(response.totals);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los egresos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedEgreso(null);
        setIsModalOpen(true);
    };

    const handleEdit = (egreso: Egreso) => {
        setSelectedEgreso(egreso);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "No podrás revertir esta acción",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await deleteEgreso(id);
                Swal.fire('Eliminado', 'El egreso ha sido eliminado.', 'success');
                loadEgresos();
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo eliminar el egreso', 'error');
            }
        }
    };

    const handleDateSelect = (date: string) => {
        setStartDate(date);
        setEndDate(date);
    };

    const handleToday = () => {
        const today = getLocalDateString();
        setStartDate(today);
        setEndDate(today);
    };

    const exportToPDF = async () => {
        const filtros: string[] = [];
        if (startDate === endDate) {
            filtros.push(`Fecha: ${startDate}`);
        } else {
            filtros.push(`Período: ${startDate} al ${endDate}`);
        }
        if (searchTerm) filtros.push(`Búsqueda: "${searchTerm}"`);

        await exportStandardPDF({
            title: 'Reporte de Egresos y Gastos Diarios',
            subtitle: 'EDKOR MOTORS - Control de Desembolsos y Salidas de Caja',
            filtersText: filtros.join(' | '),
            totalRecords: egresos.length,
            totalRecordsLabel: 'Egresos Registrados',
            filename: `Egresos_${startDate}_${endDate}.pdf`,
            tableOptions: {
                head: [['#', 'Fecha', 'Detalle', 'OT Asignada', 'Monto', 'Moneda', 'Forma Pago']],
                body: egresos.map((e, idx) => [
                    idx + 1,
                    new Date(e.fecha + 'T12:00:00').toLocaleDateString(),
                    e.detalle,
                    e.ordenTrabajo ? `OT #${e.ordenTrabajo.id} (${e.ordenTrabajo.vehiculo_placa || 'S/P'})` : 'General',
                    Number(e.monto || 0).toFixed(2),
                    e.moneda,
                    e.formaPago?.forma_pago || '-'
                ]),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { halign: 'center', cellWidth: 22 },
                    2: { cellWidth: 'auto', fontStyle: 'bold' },
                    3: { cellWidth: 45 },
                    4: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
                    5: { halign: 'center', cellWidth: 18 },
                    6: { halign: 'center', cellWidth: 28 }
                }
            }
        });
    };

    const exportToExcel = () => {
        const ws = XLSX.utils.json_to_sheet(egresos.map(e => ({
            Fecha: new Date(e.fecha + 'T12:00:00').toLocaleDateString(),
            Detalle: e.detalle,
            'OT Asignada': e.ordenTrabajo ? `OT #${e.ordenTrabajo.id} (${e.ordenTrabajo.vehiculo_placa || 'S/P'})` : 'General',
            Monto: Number(e.monto || 0).toFixed(2),
            Moneda: e.moneda,
            'Forma Pago': e.formaPago?.forma_pago || ''
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Egresos");
        XLSX.writeFile(wb, `egresos_${startDate}_${endDate}.xlsx`);
    };

    const printList = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 150);
    };

    return (
        <>
        <div className="container mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen print:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left Sidebar */}
                <div className="lg:col-span-1">
                    <CalendarWidget selectedDate={startDate === endDate ? startDate : ''} onDateSelect={handleDateSelect} />
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Header Row */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <CreditCard className="text-red-600" size={32} />
                                Lista de Egresos
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Administra los gastos y salidas de dinero</p>
                            <p className="text-blue-500 text-sm font-medium mt-1">
                                Del {new Date(startDate + 'T12:00:00').toLocaleDateString()}
                            </p>
                        </div>

                        <StandardExportToolbar
                            onExportExcel={exportToExcel}
                            onExportPDF={exportToPDF}
                            onPrint={printList}
                            onHelp={() => setShowManual(true)}
                            helpTitle="Ayuda / Manual"
                        >
                            <button
                                onClick={handleCreate}
                                className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                            >
                                <Plus size={18} /> Nuevo Egreso
                            </button>
                        </StandardExportToolbar>
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                            <div className="lg:col-span-6">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Buscar por Detalle:</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Escribe para buscar..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                    />
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Desde:</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="lg:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Hasta:</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div className="lg:col-span-2">
                                <button
                                    onClick={handleToday}
                                    className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Hoy
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Mostrando {egresos.length > 0 ? (currentPage - 1) * 50 + 1 : 0} - {Math.min(currentPage * 50, totalItems)} de {totalItems} registros
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">#</th>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Detalle</th>
                                        <th className="px-6 py-4">OT Asignada</th>
                                        <th className="px-6 py-4">Monto</th>
                                        <th className="px-6 py-4">Moneda</th>
                                        <th className="px-6 py-4">Forma Pago</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {egresos.map((egreso, index) => (
                                        <tr key={egreso.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-medium text-sm">
                                                {index + 1}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300 text-sm">
                                                {new Date(egreso.fecha + 'T12:00:00').toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300 text-sm max-w-xs truncate" title={egreso.detalle}>
                                                {egreso.detalle}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {egreso.ordenTrabajo ? (
                                                    <a
                                                        href={`/ordenes-trabajo/${egreso.ordenTrabajo.id}`}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                                                        title={`Cliente: ${egreso.ordenTrabajo.cliente_nombre || 'N/A'}`}
                                                    >
                                                        <Wrench size={13} className="text-amber-600 dark:text-amber-400" />
                                                        OT #{egreso.ordenTrabajo.id} {egreso.ordenTrabajo.vehiculo_placa ? `(${egreso.ordenTrabajo.vehiculo_placa})` : ''}
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">General</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 dark:text-white font-bold text-sm">
                                                {Number(egreso.monto).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm uppercase">
                                                {egreso.moneda}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                                                {egreso.formaPago?.forma_pago}
                                            </td>
                                            <td className="px-6 py-4 flex flex-wrap gap-1.5 justify-center items-center">
                                                {(() => {
                                                    const comps = getComprobantesList(egreso.imagen);
                                                    return comps.map((comp, cIdx) => (
                                                        <a
                                                            key={cIdx}
                                                            href={`${API_BASE_URL}/files/${comp}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-1 text-xs font-semibold"
                                                            title={`Ver Comprobante ${comps.length > 1 ? `#${cIdx + 1}` : ''} / Factura`}
                                                        >
                                                            <ExternalLink size={15} />
                                                            {comps.length > 1 && <span>#{cIdx + 1}</span>}
                                                        </a>
                                                    ));
                                                })()}
                                                <button
                                                    onClick={() => handleEdit(egreso)}
                                                    className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                    title="Editar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(egreso.id)}
                                                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                    title="Eliminar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {egresos.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-12 text-center text-gray-400 dark:text-gray-500">
                                                No hay egresos registrados para esta fecha o criterios de búsqueda.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals Section */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-2 text-sm uppercase">Totales por Forma de Pago (Según filtros)</h3>

                        {Object.keys(totals).length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                {Object.entries(totals).map(([fp, amounts]) => (
                                    <div key={fp} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                        <div className="font-bold text-gray-700 dark:text-gray-300 mb-2 truncate" title={fp}>{fp}</div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">Bs:</span>
                                                <span className="font-mono font-bold text-gray-900 dark:text-white">{amounts.bolivianos.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">$us:</span>
                                                <span className="font-mono font-bold text-gray-900 dark:text-white">{amounts.dolares.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 italic text-sm">No hay totales para mostrar.</p>
                        )}
                    </div>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            <EgresoForm
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadEgresos}
                egreso={selectedEgreso}
            />

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Egresos Diarios"
                sections={manualSections}
            />

            {loading && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-[60]">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl flex items-center gap-3">
                        <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-medium text-gray-700 dark:text-gray-200">Cargando...</span>
                    </div>
                </div>
            )}
        </div>

        {/* Printable View */}
        <div className="hidden print:block font-sans text-black p-4 bg-white min-h-screen">
            <StandardPrintHeader
                title="REPORTE DE EGRESOS Y GASTOS"
                subtitle="Control de Egresos y Salidas de Caja del Taller"
                filtersText={startDate === endDate ? `Fecha: ${startDate}` : `Período: ${startDate} al ${endDate}`}
            />

            <table className="w-full text-left border-collapse border border-gray-400 text-xs mt-3">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-400">
                        <th className="border border-gray-300 p-1.5 text-center w-8">#</th>
                        <th className="border border-gray-300 p-1.5 text-center">Fecha</th>
                        <th className="border border-gray-300 p-1.5">Detalle</th>
                        <th className="border border-gray-300 p-1.5">OT Asignada</th>
                        <th className="border border-gray-300 p-1.5 text-right">Monto</th>
                        <th className="border border-gray-300 p-1.5 text-center">Moneda</th>
                        <th className="border border-gray-300 p-1.5 text-center">Forma Pago</th>
                    </tr>
                </thead>
                <tbody>
                    {egresos.map((e, idx) => (
                        <tr key={e.id} className="border-b border-gray-200">
                            <td className="border border-gray-200 p-1.5 text-center">{idx + 1}</td>
                            <td className="border border-gray-200 p-1.5 text-center">{new Date(e.fecha + 'T12:00:00').toLocaleDateString()}</td>
                            <td className="border border-gray-200 p-1.5 font-bold">{e.detalle}</td>
                            <td className="border border-gray-200 p-1.5">{e.ordenTrabajo ? `OT #${e.ordenTrabajo.id} (${e.ordenTrabajo.vehiculo_placa || 'S/P'})` : 'General'}</td>
                            <td className="border border-gray-200 p-1.5 text-right font-bold">{Number(e.monto || 0).toFixed(2)}</td>
                            <td className="border border-gray-200 p-1.5 text-center font-bold">{e.moneda}</td>
                            <td className="border border-gray-200 p-1.5 text-center">{e.formaPago?.forma_pago || '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-4 flex justify-between items-center text-xs border-t pt-2 border-gray-300">
                <span>Total Registros: <strong>{egresos.length}</strong></span>
                <span className="font-bold">Total Egresos (Bs): {egresos.filter(e => e.moneda === 'Bs' || !e.moneda).reduce((acc, e) => acc + Number(e.monto || 0), 0).toFixed(2)} Bs</span>
            </div>

            <StandardPrintFooter />
        </div>
        </>
    );
};

export default EgresoList;
