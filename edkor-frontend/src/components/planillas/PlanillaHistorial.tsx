import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, XCircle, Search, CreditCard, User as UserIcon, FileText, RotateCcw, Eye, Printer, X, Calendar, Plus, Save } from 'lucide-react';
import Pagination from '../Pagination';
import api from '../../services/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import type { User } from '../../types/user';
import { useAuth } from '../../context/AuthContext';
import { createFormaPago } from '../../services/formaPagoService';
import { exportStandardPDF } from '../../utils/pdfExportHelper';
import { StandardExportToolbar } from '../common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../common/StandardPrintHeader';
import ManualModal, { type ManualSection } from '../ManualModal';
import PlanillaPrintView from './PlanillaPrintView';
import { getLocalDateString } from '../../utils/dateUtils';

interface Planilla {
    id: number;
    mes: number;
    anio: number;
    fecha_generacion: string;
    total_planilla: number;
    estado: string;
    pago_planilla?: {
        id: number;
        fecha_pago: string;
    };
    detalles: {
        id: number;
        personal: {
            nombre: string;
            paterno: string;
            ci: string;
            area: { area: string };
            salario: number;
        };
        haber_basico?: number;
        horas_produccion?: number;
        monto_produccion?: number;
        dias_trabajados: number;
        faltas: number;
        bonos: number;
        descuentos: number;
        anticipos: number;
        liquido_pagable: number;
    }[];
}

interface FormaPago {
    id: number;
    forma_pago: string;
}

const PlanillaHistorial = () => {
    const { user } = useAuth();
    const [planillas, setPlanillas] = useState<Planilla[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedPlanilla, setSelectedPlanilla] = useState<Planilla | null>(null);
    const [viewPlanilla, setViewPlanilla] = useState<Planilla | null>(null);
    const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showManual, setShowManual] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const itemsPerPage = 10;

    // Payment Form State
    const [fechaPago, setFechaPago] = useState(getLocalDateString());
    const [idFormaPago, setIdFormaPago] = useState('');
    const [idUser, setIdUser] = useState(''); // Fallback user ID
    const [monto, setMonto] = useState('');
    const [observaciones, setObservaciones] = useState('');

    // Nueva Forma de Pago Modal State
    const [showModalFormaPago, setShowModalFormaPago] = useState(false);
    const [nuevaFormaPagoNombre, setNuevaFormaPagoNombre] = useState('');
    const [savingFormaPago, setSavingFormaPago] = useState(false);

    useEffect(() => {
        fetchPlanillas();
        fetchFormasPago();
        fetchUsers();
    }, []);

    const fetchPlanillas = async () => {
        try {
            const res = await api.get('/planillas');
            // Sort by year descending, then month descending
            const sorted = res.data.sort((a: Planilla, b: Planilla) => {
                if (a.anio !== b.anio) return b.anio - a.anio;
                return b.mes - a.mes;
            });
            setPlanillas(sorted);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchFormasPago = async () => {
        try {
            const res = await api.get('/forma-pago');
            setFormasPago(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
            // Basic auto-select active user if possible, for now just select first active
            const activeUser = res.data.find((u: User) => u.estado === 'activo');
            if (activeUser) setIdUser(activeUser.id.toString());
        } catch (error) {
            console.error(error);
        }
    };


    const openPaymentModal = (planilla: Planilla) => {
        setSelectedPlanilla(planilla);
        setMonto(Number(planilla.total_planilla).toFixed(2));
        setFechaPago(getLocalDateString());
        setModalOpen(true);
    };

    const closePaymentModal = () => {
        setModalOpen(false);
        setSelectedPlanilla(null);
        setIdFormaPago('');
        setObservaciones('');
        setFechaPago(getLocalDateString());
    };

    const openViewModal = (planilla: Planilla) => {
        setViewPlanilla(planilla);
        setViewModalOpen(true);
    };

    const closeViewModal = () => {
        setViewModalOpen(false);
        setViewPlanilla(null);
    };

    const handleCreateFormaPago = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = nuevaFormaPagoNombre.trim();
        if (!trimmed) return;
        setSavingFormaPago(true);
        try {
            const created = await createFormaPago({
                forma_pago: trimmed,
                estado: 'activo'
            });
            await fetchFormasPago();
            setIdFormaPago(String(created.id));
            setShowModalFormaPago(false);
            setNuevaFormaPagoNombre('');
            Swal.fire({
                icon: 'success',
                title: 'Forma de Pago Creada',
                text: `Se agregó "${created.forma_pago}"`,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error creando forma de pago:', error);
            Swal.fire('Error', 'No se pudo registrar la forma de pago', 'error');
        } finally {
            setSavingFormaPago(false);
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlanilla) return;

        try {
            await api.post('/pagos-planillas', {
                planilla_id: selectedPlanilla.id,
                idforma_pago: Number(idFormaPago),
                iduser: user?.id || (idUser ? Number(idUser) : 1),
                fecha_pago: fechaPago,
                monto: Number(monto),
                observaciones
            });

            Swal.fire({
                title: 'Pagado',
                text: 'Pago registrado correctamente',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
            closePaymentModal();
            fetchPlanillas();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo registrar el pago', 'error');
        }
    };

    const handleRevertPayment = async (planilla: Planilla) => {
        if (!planilla.pago_planilla?.id) return;

        const result = await Swal.fire({
            title: '¿Revertir Pago?',
            text: "Esta acción eliminará el registro del pago y devolverá la planilla a estado 'GENERADO'.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, revertir',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/pagos-planillas/${planilla.pago_planilla.id}`);
                Swal.fire({
                    title: 'Revertido',
                    text: 'El pago ha sido eliminado.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                fetchPlanillas();
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo revertir el pago', 'error');
            }
        }
    };

    const getMonthName = (month: number) => {
        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return months[month - 1] || 'Desconocido';
    };

    const filteredPlanillas = planillas.filter(p =>
        p.anio.toString().includes(searchTerm) ||
        getMonthName(p.mes).toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.estado.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredPlanillas.map(p => ({
            'Período': `${getMonthName(p.mes)} ${p.anio}`,
            'Fecha Generación': p.fecha_generacion ? p.fecha_generacion.split('T')[0] : '-',
            'Fecha Pago': p.pago_planilla?.fecha_pago ? p.pago_planilla.fecha_pago.split('T')[0] : '-',
            'Total Planilla (Bs)': Number(p.total_planilla || 0).toFixed(2),
            'Estado': p.estado
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Planillas");
        XLSX.writeFile(workbook, `Historial_Planillas_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        await exportStandardPDF({
            title: 'Historial de Planillas de Sueldos',
            subtitle: 'EDKOR MOTORS - Resumen de Haberes y Liquidaciones de Personal',
            filtersText: searchTerm ? `Búsqueda: "${searchTerm}"` : undefined,
            totalRecords: filteredPlanillas.length,
            totalRecordsLabel: 'Planillas Registradas',
            filename: `Planillas_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'Período', 'Fecha Generación', 'Fecha Pago', 'Total Planilla (Bs)', 'Estado']],
                body: filteredPlanillas.map((p, idx) => [
                    idx + 1,
                    `${getMonthName(p.mes)} ${p.anio}`,
                    p.fecha_generacion ? p.fecha_generacion.split('T')[0] : '-',
                    p.pago_planilla?.fecha_pago ? p.pago_planilla.fecha_pago.split('T')[0] : '-',
                    `Bs ${Number(p.total_planilla || 0).toFixed(2)}`,
                    p.estado.toUpperCase()
                ]),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },
                    1: { halign: 'center', cellWidth: 35, fontStyle: 'bold' },
                    2: { halign: 'center', cellWidth: 35 },
                    3: { halign: 'center', cellWidth: 35 },
                    4: { halign: 'right', cellWidth: 40, fontStyle: 'bold' },
                    5: { halign: 'center', cellWidth: 30, fontSize: 6.5, fontStyle: 'bold' }
                }
            }
        });
    };

    const printList = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 150);
    };

    const manualSections: ManualSection[] = [
        { title: 'Historial de Planillas', content: 'Consulte y gestione las planillas de sueldos generadas para cada mes y año.' },
        { title: 'Registro y Reversión de Pago', content: 'Puede marcar una planilla como pagada indicando la forma de pago, o revertir el pago si se cometió algún error.' },
        { title: 'Ver Detalles', content: 'Presione el botón del ojo para revisar el desglose individual por empleado con haber básico, producción, bonos, descuentos y líquido pagable.' }
    ];

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPlanillas.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPlanillas.length / itemsPerPage);

    return (
        <>
        <div className="space-y-6 print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 w-full max-w-sm">
                        <div className="relative w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar por año, mes o estado..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                                className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors flex items-center justify-center shadow-sm"
                                title="Limpiar búsqueda"
                                type="button"
                            >
                                <XCircle size={20} />
                            </button>
                        )}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 font-medium pl-1">
                        Mostrando {filteredPlanillas.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredPlanillas.length)} de {filteredPlanillas.length} registros
                    </div>
                </div>

                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={printList}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual"
                />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100 dark:bg-gray-700 text-xs uppercase text-gray-600 dark:text-gray-300">
                        <tr>
                            <th className="p-4 font-bold border-b dark:border-gray-600 w-16">#</th>
                            <th className="p-4 font-bold border-b dark:border-gray-600">Periodo</th>
                            <th className="p-4 font-bold border-b dark:border-gray-600">Fecha Generación</th>
                            <th className="p-4 font-bold border-b dark:border-gray-600">Fecha Pago</th>
                            <th className="p-4 font-bold border-b dark:border-gray-600 text-right">Total Planilla</th>
                            <th className="p-4 font-bold border-b dark:border-gray-600 text-center">Estado</th>
                            <th className="p-4 font-bold border-b dark:border-gray-600 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentItems.map((planilla, index) => (
                            <tr key={planilla.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-4 font-medium text-gray-900 dark:text-white">
                                    {indexOfFirstItem + index + 1}
                                </td>
                                <td className="p-4 font-medium text-gray-900 dark:text-white">
                                    {getMonthName(planilla.mes)} {planilla.anio}
                                </td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">
                                    {new Date(planilla.fecha_generacion).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-gray-600 dark:text-gray-300">
                                    {planilla.pago_planilla?.fecha_pago
                                        ? new Date(planilla.pago_planilla.fecha_pago).toLocaleDateString()
                                        : '-'}
                                </td>
                                <td className="p-4 text-right font-mono text-gray-700 dark:text-gray-300">
                                    Bs {Number(planilla.total_planilla).toFixed(2)}
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${planilla.estado === 'PAGADO'
                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                        : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
                                        }`}>
                                        {planilla.estado}
                                    </span>
                                </td>
                                <td className="p-4 flex justify-center gap-2">
                                    {planilla.estado !== 'PAGADO' && (
                                        <button
                                            onClick={() => openPaymentModal(planilla)}
                                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-transform hover:-translate-y-0.5"
                                            title="Registrar Pago"
                                        >
                                            <DollarSign size={18} />
                                        </button>
                                    )}
                                    {planilla.estado === 'PAGADO' && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openViewModal(planilla)}
                                                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg shadow-sm transition-transform hover:-translate-y-0.5"
                                                title="Ver Detalle"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            <div className="text-green-600" title="Pagado">
                                                <CheckCircle size={24} />
                                            </div>
                                            <button
                                                onClick={() => handleRevertPayment(planilla)}
                                                className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg shadow-sm transition-transform hover:-translate-y-0.5"
                                                title="Revertir Pago"
                                            >
                                                <RotateCcw size={18} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>

                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {modalOpen && selectedPlanilla && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                <DollarSign size={20} className="text-blue-600" />
                                Registrar Pago de Planilla
                            </h3>
                            <button
                                type="button"
                                onClick={closePaymentModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                                title="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handlePayment} className="p-6 space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                                    Planilla: {getMonthName(selectedPlanilla.mes)} {selectedPlanilla.anio}
                                </p>
                                <p className="text-xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                                    Total: Bs {Number(selectedPlanilla.total_planilla).toFixed(2)}
                                </p>
                            </div>

                            {/* Fecha de Pago */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="date"
                                        required
                                        value={fechaPago}
                                        onChange={(e) => setFechaPago(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Forma de Pago con Botón Naranja + */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de Pago</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1 min-w-0">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <CreditCard size={18} className="text-gray-400" />
                                        </div>
                                        <select
                                            required
                                            value={idFormaPago}
                                            onChange={(e) => setIdFormaPago(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white dark:bg-gray-700 dark:text-white appearance-none"
                                        >
                                            <option value="">Seleccione...</option>
                                            {formasPago.map(fp => (
                                                <option key={fp.id} value={fp.id}>{fp.forma_pago}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNuevaFormaPagoNombre('');
                                            setShowModalFormaPago(true);
                                        }}
                                        className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center shrink-0 cursor-pointer"
                                        title="Registrar nueva Forma de Pago"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto a Pagar</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <DollarSign size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={monto}
                                        readOnly
                                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 cursor-not-allowed dark:bg-gray-600 dark:border-gray-500 dark:text-gray-300 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
                                <div className="relative">
                                    <div className="absolute top-3 left-3 pointer-events-none">
                                        <FileText size={18} className="text-gray-400" />
                                    </div>
                                    <textarea
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white dark:bg-gray-700 dark:text-white"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700 mt-4">
                                <button
                                    type="button"
                                    onClick={closePaymentModal}
                                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all transform hover:-translate-y-0.5 active:scale-95 font-medium flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
                                >
                                    <XCircle size={18} />
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 active:scale-95 font-medium cursor-pointer"
                                >
                                    <CheckCircle size={18} />
                                    Confirmar Pago
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Registrar Nueva Forma de Pago */}
            {showModalFormaPago && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-orange-500" /> Nueva Forma de Pago
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowModalFormaPago(false)}
                                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center cursor-pointer"
                                title="Cerrar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFormaPago} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre de la Forma de Pago *
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="Ej: QR, Transferencia BNB, Efectivo..."
                                    value={nuevaFormaPagoNombre}
                                    onChange={(e) => setNuevaFormaPagoNombre(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModalFormaPago(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    <span>Cancelar</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingFormaPago || !nuevaFormaPagoNombre.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{savingFormaPago ? "Guardando..." : "Guardar Forma de Pago"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewModalOpen && viewPlanilla && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                <Eye size={20} className="text-gray-600" />
                                Detalle de Planilla - {getMonthName(viewPlanilla.mes)} {viewPlanilla.anio}
                            </h3>
                            <button
                                onClick={closeViewModal}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                                title="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-0 overflow-auto flex-grow">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-100 dark:bg-gray-700 text-xs uppercase text-gray-600 dark:text-gray-300 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-3 font-bold border-b dark:border-gray-600">Personal</th>
                                        <th className="p-3 font-bold border-b dark:border-gray-600">Area</th>
                                        <th className="p-3 font-bold border-b dark:border-gray-600 text-right">Haber Básico</th>
                                        <th className="p-3 font-bold border-b dark:border-gray-600 text-right">Horas Producción</th>
                                        <th className="p-3 font-bold border-b dark:border-gray-600 text-center">Faltas</th>
                                        <th className="p-3 font-bold border-b dark:border-gray-600 text-right">Bonos</th>
                                        <th className="p-3 font-bold border-b dark:border-gray-600 text-right">Descuentos</th>
                                        <th className="p-3 font-bold border-b dark:border-gray-600 text-right">Anticipos</th>
                                        <th className="p-3 font-bold border-b dark:border-gray-600 text-right bg-green-50 dark:bg-green-900/20">Líquido Pagable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {viewPlanilla.detalles?.map((detalle) => (
                                        <tr key={detalle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-3">
                                                <div className="font-medium text-gray-900 dark:text-white">{detalle.personal.nombre} {detalle.personal.paterno}</div>
                                                <div className="text-xs text-gray-500">{detalle.personal.ci}</div>
                                            </td>
                                            <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                                                {detalle.personal.area?.area || '-'}
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300">
                                                {Number(detalle.haber_basico !== undefined ? detalle.haber_basico : detalle.personal.salario).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-right font-mono text-gray-700 dark:text-gray-300">
                                                {Number(detalle.monto_produccion || 0) > 0 ? (
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        Bs {Number(detalle.monto_produccion).toFixed(2)}
                                                        <span className="text-[11px] text-gray-500 block">({Number(detalle.horas_produccion || 0).toFixed(1)} hrs)</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                {Number(detalle.faltas) > 0 ? (
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className="font-semibold text-red-600 dark:text-red-400">
                                                            {detalle.faltas} {detalle.faltas === 1 ? 'día' : 'días'}
                                                        </span>
                                                        <span className="text-[11px] font-mono text-red-500 dark:text-red-400 font-medium">
                                                            -Bs {(((Number(detalle.haber_basico !== undefined ? detalle.haber_basico : detalle.personal.salario) || 0) / 30) * Number(detalle.faltas)).toFixed(2)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 font-mono">0</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right text-gray-700 dark:text-gray-300">
                                                {Number(detalle.bonos).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-right text-red-600 dark:text-red-400">
                                                {Number(detalle.descuentos).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-right text-gray-700 dark:text-gray-300">
                                                {Number(detalle.anticipos).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-right font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/10">
                                                {Number(detalle.liquido_pagable).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-600 sticky bottom-0 z-10">
                                    <tr>
                                        <td colSpan={8} className="p-3 text-right font-bold text-gray-700 dark:text-gray-300 uppercase">Total Planilla:</td>
                                        <td className="p-3 text-right font-bold text-green-700 dark:text-green-400 text-lg">
                                            Bs {Number(viewPlanilla.total_planilla).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-lg shadow transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 font-medium cursor-pointer"
                                title="Abrir cuadro de diálogo de impresión"
                            >
                                <Printer size={18} />
                                Imprimir Planilla
                            </button>
                            <button
                                type="button"
                                onClick={closeViewModal}
                                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 font-medium cursor-pointer"
                            >
                                <X size={18} />
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Printable View de la Planilla Seleccionada */}
        {viewModalOpen && viewPlanilla && viewPlanilla.detalles && (
            <div className="hidden print:block">
                <PlanillaPrintView
                    mes={viewPlanilla.mes}
                    anio={viewPlanilla.anio}
                    items={viewPlanilla.detalles as any}
                    totalPlanilla={Number(viewPlanilla.total_planilla)}
                />
            </div>
        )}

        {/* Printable View (Historial general) */}
        <div className={`hidden ${viewModalOpen ? '' : 'print:block'} font-sans text-black p-4 bg-white min-h-screen`}>
            <StandardPrintHeader
                title="HISTORIAL DE PLANILLAS DE SUELDOS"
                subtitle="Resumen de Haberes Mensuales y Liquidaciones de Personal"
                filtersText={searchTerm ? `Búsqueda: "${searchTerm}"` : undefined}
            />

            <table className="w-full text-left border-collapse border border-gray-400 text-xs mt-3">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-400">
                        <th className="border border-gray-300 p-1.5 text-center w-8">#</th>
                        <th className="border border-gray-300 p-1.5 text-center">Período</th>
                        <th className="border border-gray-300 p-1.5 text-center">Fecha Generación</th>
                        <th className="border border-gray-300 p-1.5 text-center">Fecha Pago</th>
                        <th className="border border-gray-300 p-1.5 text-right">Total Planilla (Bs)</th>
                        <th className="border border-gray-300 p-1.5 text-center">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredPlanillas.map((p, idx) => (
                        <tr key={p.id} className="border-b border-gray-200">
                            <td className="border border-gray-200 p-1.5 text-center">{idx + 1}</td>
                            <td className="border border-gray-200 p-1.5 text-center font-bold">{getMonthName(p.mes)} {p.anio}</td>
                            <td className="border border-gray-200 p-1.5 text-center">{p.fecha_generacion ? p.fecha_generacion.split('T')[0] : '-'}</td>
                            <td className="border border-gray-200 p-1.5 text-center">{p.pago_planilla?.fecha_pago ? p.pago_planilla.fecha_pago.split('T')[0] : '-'}</td>
                            <td className="border border-gray-200 p-1.5 text-right font-bold">Bs {Number(p.total_planilla || 0).toFixed(2)}</td>
                            <td className="border border-gray-200 p-1.5 text-center font-bold uppercase">{p.estado}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-4 flex justify-between items-center text-xs border-t pt-2 border-gray-300">
                <span>Total Registros: <strong>{filteredPlanillas.length}</strong></span>
                <span className="font-bold">Total Liquidado: Bs {filteredPlanillas.reduce((acc, p) => acc + Number(p.total_planilla || 0), 0).toFixed(2)}</span>
            </div>

            <StandardPrintFooter />
        </div>

        <ManualModal
            isOpen={showManual}
            onClose={() => setShowManual(false)}
            title="Manual - Historial de Planillas"
            sections={manualSections}
        />
        </>
    );
};

export default PlanillaHistorial;
