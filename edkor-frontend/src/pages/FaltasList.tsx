import { useState, useEffect } from 'react';
import { Calendar, Plus, Minus, Edit, Trash2, Save, Users, AlignLeft, X, FileEdit, Clock } from 'lucide-react';
import api from '../services/api';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import type { Personal } from '../types/personal';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import Pagination from '../components/Pagination';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';
import { getLocalDateString } from '../utils/dateUtils';

interface Falta {
    id: number;
    personal: Personal;
    personal_id: number;
    fecha: string;
    fecha_fin?: string;
    dias?: number;
    motivo: string;
    observaciones: string;
}

const addDaysToDateStr = (dateStr: string, daysCount: number): string => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + Math.max(0, daysCount - 1));
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
};

const calcInclusiveDays = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 1;
    const [y1, m1, d1] = startStr.split('T')[0].split('-').map(Number);
    const [y2, m2, d2] = endStr.split('T')[0].split('-').map(Number);
    const dt1 = new Date(y1, m1 - 1, d1);
    const dt2 = new Date(y2, m2 - 1, d2);
    const diff = Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
};

const formatDateDisplay = (dateStr?: string): string => {
    if (!dateStr) return '-';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const FaltasList = () => {
    const [faltas, setFaltas] = useState<Falta[]>([]);

    const [personalList, setPersonalList] = useState<Personal[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showManual, setShowManual] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Form State
    const todayStr = getLocalDateString();
    const [selectedPersonalId, setSelectedPersonalId] = useState('');
    const [fecha, setFecha] = useState(todayStr);
    const [fechaFin, setFechaFin] = useState(todayStr);
    const [dias, setDias] = useState<number>(1);
    const [motivo, setMotivo] = useState('');
    const [observaciones, setObservaciones] = useState('');

    useEffect(() => {
        fetchFaltas();
        fetchPersonal();
    }, []);

    const fetchFaltas = async () => {
        try {
            const response = await api.get('/faltas');
            setFaltas(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchPersonal = async () => {
        try {
            const response = await api.get('/personal');
            setPersonalList(response.data.filter((p: Personal) => p.estado === 'activo'));
        } catch (error) {
            console.error(error);
        }
    };

    const handleFechaInicioChange = (newFecha: string) => {
        setFecha(newFecha);
        const computedFin = addDaysToDateStr(newFecha, dias);
        setFechaFin(computedFin);
    };

    const handleDiasChange = (newDias: number) => {
        const validDias = Math.max(1, Math.floor(Number(newDias) || 1));
        setDias(validDias);
        if (fecha) {
            setFechaFin(addDaysToDateStr(fecha, validDias));
        }
    };

    const handleFechaFinChange = (newFechaFin: string) => {
        setFechaFin(newFechaFin);
        if (fecha && newFechaFin >= fecha) {
            setDias(calcInclusiveDays(fecha, newFechaFin));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                personal_id: Number(selectedPersonalId),
                fecha,
                fecha_fin: fechaFin || addDaysToDateStr(fecha, dias),
                dias: Math.max(1, Number(dias) || 1),
                motivo,
                observaciones
            };

            if (editingId) {
                await api.patch(`/faltas/${editingId}`, data);
                Swal.fire('Actualizado', 'Registro de falta actualizado', 'success');
            } else {
                await api.post('/faltas', data);
                Swal.fire('Registrado', 'Falta registrada correctamente', 'success');
            }
            closeModal();
            fetchFaltas();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar el registro', 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Eliminar registro?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/faltas/${id}`);
                Swal.fire('Eliminado', 'Registro eliminado', 'success');
                fetchFaltas();
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo eliminar el registro', 'error');
            }
        }
    };

    const openEdit = (falta: Falta) => {
        const startStr = falta.fecha ? falta.fecha.split('T')[0] : todayStr;
        const faltaDias = Math.max(1, Number(falta.dias) || 1);
        const endStr = falta.fecha_fin ? falta.fecha_fin.split('T')[0] : addDaysToDateStr(startStr, faltaDias);

        setEditingId(falta.id);
        setSelectedPersonalId(falta.personal.id.toString());
        setFecha(startStr);
        setFechaFin(endStr);
        setDias(faltaDias);
        setMotivo(falta.motivo);
        setObservaciones(falta.observaciones || '');
        setModalOpen(true);
    };

    const closeModal = () => {
        const nowStr = getLocalDateString();
        setModalOpen(false);
        setEditingId(null);
        setSelectedPersonalId('');
        setFecha(nowStr);
        setFechaFin(nowStr);
        setDias(1);
        setMotivo('');
        setObservaciones('');
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(faltas.map(f => {
            const faltaDias = Math.max(1, Number(f.dias) || 1);
            const startStr = f.fecha ? f.fecha.split('T')[0] : '';
            const endStr = f.fecha_fin ? f.fecha_fin.split('T')[0] : (faltaDias > 1 ? addDaysToDateStr(startStr, faltaDias) : startStr);
            const periodo = endStr && endStr !== startStr ? `${formatDateDisplay(startStr)} al ${formatDateDisplay(endStr)}` : formatDateDisplay(startStr);
            return {
                'Período': periodo,
                'Días': faltaDias,
                'Personal': f.personal ? `${f.personal.nombre} ${f.personal.paterno}` : '-',
                'CI': f.personal?.ci || '-',
                'Motivo': f.motivo,
                'Observaciones': f.observaciones || '-'
            };
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Faltas");
        XLSX.writeFile(workbook, `Faltas_Personal_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        await exportStandardPDF({
            title: 'Control de Asistencia y Faltas',
            subtitle: 'EDKOR MOTORS - Registro de Inasistencias y Licencias de Personal',
            orientation: 'portrait',
            totalRecords: faltas.length,
            totalRecordsLabel: 'Registros de Faltas',
            filename: `Faltas_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'Período', 'Días', 'Personal', 'CI', 'Motivo', 'Observaciones']],
                body: faltas.map((f, idx) => {
                    const faltaDias = Math.max(1, Number(f.dias) || 1);
                    const startStr = f.fecha ? f.fecha.split('T')[0] : '';
                    const endStr = f.fecha_fin ? f.fecha_fin.split('T')[0] : (faltaDias > 1 ? addDaysToDateStr(startStr, faltaDias) : startStr);
                    const periodo = endStr && endStr !== startStr ? `${formatDateDisplay(startStr)} al ${formatDateDisplay(endStr)}` : formatDateDisplay(startStr);
                    return [
                        idx + 1,
                        periodo,
                        faltaDias,
                        f.personal ? `${f.personal.nombre} ${f.personal.paterno}` : '-',
                        f.personal?.ci || '-',
                        f.motivo || '-',
                        f.observaciones || '-'
                    ];
                }),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { halign: 'center', cellWidth: 32 },
                    2: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
                    3: { cellWidth: 40, fontStyle: 'bold' },
                    4: { halign: 'center', cellWidth: 22 },
                    5: { cellWidth: 40 },
                    6: { cellWidth: 'auto' }
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
        { title: 'Gestión de Faltas', content: 'Administre las inasistencias y licencias del personal.' },
        { title: 'Registrar Falta', content: 'Utilice el botón "Nueva Falta" para registrar una inasistencia con fecha, cantidad de días y motivo.' },
        { title: 'Impacto en Planilla', content: 'Los días de falta registrados se descuentan automáticamente al momento de calcular la planilla de haberes mensual.' }
    ];

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = faltas.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(faltas.length / itemsPerPage);

    return (
        <>
        <div className="container mx-auto p-6 print:hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Calendar className="text-blue-600" size={32} />
                        Control de Asistencia / Faltas
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona las inasistencias del personal</p>
                </div>
                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={printList}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual"
                >
                    <button
                        onClick={() => setModalOpen(true)}
                        className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium"
                    >
                        <Plus size={20} />
                        Nueva Falta
                    </button>
                </StandardExportToolbar>
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
                Mostrando {faltas.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, faltas.length)} de {faltas.length} registros
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Fecha / Período</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Días</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Personal</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Motivo</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Observaciones</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {currentItems.map((falta) => {
                                const faltaDias = Math.max(1, Number(falta.dias) || 1);
                                const startStr = falta.fecha ? falta.fecha.split('T')[0] : '';
                                const endStr = falta.fecha_fin ? falta.fecha_fin.split('T')[0] : (faltaDias > 1 ? addDaysToDateStr(startStr, faltaDias) : startStr);
                                const hasRange = endStr && endStr !== startStr;

                                return (
                                    <tr key={falta.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-4 text-gray-700 dark:text-gray-200">
                                            {hasRange ? (
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 dark:text-white">
                                                        Del {formatDateDisplay(startStr)}
                                                    </span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        al {formatDateDisplay(endStr)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="font-medium">{formatDateDisplay(startStr)}</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                faltaDias > 1
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                                                    : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                            }`}>
                                                <Clock size={12} />
                                                {faltaDias} {faltaDias === 1 ? 'día' : 'días'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {falta.personal?.nombre} {falta.personal?.paterno}
                                            </div>
                                            <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded inline-block mt-1">
                                                {falta.personal?.tipo}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-600 dark:text-gray-300">{falta.motivo}</td>
                                        <td className="p-4 text-gray-500 dark:text-gray-400 text-sm max-w-xs truncate">{falta.observaciones || '-'}</td>
                                        <td className="p-4 flex gap-2 justify-center">
                                            <button onClick={() => openEdit(falta)} className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5" title="Editar">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(falta.id)} className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5" title="Eliminar">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {faltas.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">No hay faltas registradas</td>
                                </tr>
                            )}
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

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Faltas"
                sections={manualSections}
            />

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                                <FileEdit size={20} className="text-blue-600" />
                                {editingId ? 'Editar Falta' : 'Registrar Falta'}
                            </h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Personal</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Users className="text-gray-400" size={18} />
                                    </div>
                                    <select
                                        required
                                        value={selectedPersonalId}
                                        onChange={(e) => setSelectedPersonalId(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500 invalid:text-gray-400"
                                    >
                                        <option value="">Seleccione personal...</option>
                                        {personalList.map(p => (
                                            <option key={p.id} value={p.id} className="text-gray-900 dark:text-white">{p.nombre} {p.paterno} ({p.tipo})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="bg-blue-50/60 dark:bg-gray-700/40 border border-blue-100 dark:border-gray-600 rounded-xl p-3.5 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                            {dias > 1 ? 'Fecha Inicio (Desde)' : 'Fecha de Falta'}
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Calendar className="text-gray-400" size={16} />
                                            </div>
                                            <input
                                                type="date"
                                                required
                                                value={fecha}
                                                onChange={(e) => handleFechaInicioChange(e.target.value)}
                                                className="w-full pl-9 pr-2.5 py-2 text-sm border rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                            Días de Falta
                                        </label>
                                        <div className="flex items-center">
                                            <button
                                                type="button"
                                                onClick={() => handleDiasChange(dias - 1)}
                                                disabled={dias <= 1}
                                                className="px-3 py-2 border border-r-0 border-gray-300 dark:border-gray-600 rounded-l-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                title="Disminuir días"
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <input
                                                type="number"
                                                min={1}
                                                max={365}
                                                required
                                                value={dias}
                                                onChange={(e) => handleDiasChange(Number(e.target.value))}
                                                className="w-full py-2 text-center font-bold text-sm border-y border-gray-300 dark:border-gray-600 bg-white text-gray-900 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleDiasChange(dias + 1)}
                                                className="px-3 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                                                title="Aumentar días de falta"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {dias > 1 && (
                                    <div className="pt-1 border-t border-blue-100 dark:border-gray-600">
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                            Fecha Fin (Hasta)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Calendar className="text-blue-500" size={16} />
                                            </div>
                                            <input
                                                type="date"
                                                min={fecha}
                                                value={fechaFin}
                                                onChange={(e) => handleFechaFinChange(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-xs pt-1 text-blue-800 dark:text-blue-300">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <Clock size={14} />
                                        Total inasistencia: <strong>{dias} {dias === 1 ? 'día' : 'días'}</strong>
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {dias > 1
                                            ? `${formatDateDisplay(fecha)} → ${formatDateDisplay(fechaFin)}`
                                            : formatDateDisplay(fecha)}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FileEdit className="text-gray-400" size={18} />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={motivo}
                                        onChange={(e) => setMotivo(e.target.value)}
                                        placeholder="Ej: Enfermedad, Personal, Sin aviso"
                                        className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observaciones</label>
                                <div className="relative">
                                    <div className="absolute top-3 left-3 pointer-events-none">
                                        <AlignLeft className="text-gray-400" size={18} />
                                    </div>
                                    <textarea
                                        value={observaciones}
                                        onChange={(e) => setObservaciones(e.target.value)}
                                        rows={3}
                                        className="w-full pl-10 pr-3 py-2 border rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
                                    <X size={18} />
                                    Cancelar
                                </button>
                                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition-all transform hover:-translate-y-0.5">
                                    <Save size={18} />
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>

        {/* Printable View */}
        <div className="hidden print:block font-sans text-black p-4 bg-white min-h-screen">
            <StandardPrintHeader
                title="CONTROL DE ASISTENCIA Y FALTAS"
                subtitle="Registro de Inasistencias y Licencias del Personal"
                orientation="portrait"
                totalRecords={faltas.length}
                totalRecordsLabel="Total Faltas"
            />

            <table className="w-full text-left border-collapse border border-gray-400 text-xs mt-3">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-400">
                        <th className="border border-gray-300 p-1.5 text-center w-8">#</th>
                        <th className="border border-gray-300 p-1.5 text-center">Período</th>
                        <th className="border border-gray-300 p-1.5 text-center">Días</th>
                        <th className="border border-gray-300 p-1.5">Personal</th>
                        <th className="border border-gray-300 p-1.5 text-center">CI</th>
                        <th className="border border-gray-300 p-1.5">Motivo</th>
                        <th className="border border-gray-300 p-1.5">Observaciones</th>
                    </tr>
                </thead>
                <tbody>
                    {faltas.map((f, idx) => {
                        const faltaDias = Math.max(1, Number(f.dias) || 1);
                        const startStr = f.fecha ? f.fecha.split('T')[0] : '';
                        const endStr = f.fecha_fin ? f.fecha_fin.split('T')[0] : (faltaDias > 1 ? addDaysToDateStr(startStr, faltaDias) : startStr);
                        const periodo = endStr && endStr !== startStr ? `${formatDateDisplay(startStr)} al ${formatDateDisplay(endStr)}` : formatDateDisplay(startStr);
                        return (
                            <tr key={f.id} className="border-b border-gray-200">
                                <td className="border border-gray-200 p-1.5 text-center">{idx + 1}</td>
                                <td className="border border-gray-200 p-1.5 text-center font-bold">{periodo}</td>
                                <td className="border border-gray-200 p-1.5 text-center font-bold">{faltaDias}</td>
                                <td className="border border-gray-200 p-1.5 font-bold">{f.personal ? `${f.personal.nombre} ${f.personal.paterno}` : '-'}</td>
                                <td className="border border-gray-200 p-1.5 text-center">{f.personal?.ci || '-'}</td>
                                <td className="border border-gray-200 p-1.5">{f.motivo || '-'}</td>
                                <td className="border border-gray-200 p-1.5">{f.observaciones || '-'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="mt-4 flex justify-between items-center text-xs border-t pt-2 border-gray-300">
                <span>Total Registros: <strong>{faltas.length}</strong></span>
                <span className="font-bold">Total Días Faltas: {faltas.reduce((acc, f) => acc + (Math.max(1, Number(f.dias) || 1)), 0)} días</span>
            </div>

            <StandardPrintFooter />
        </div>
        </>
    );
};

export default FaltasList;
