import { useEffect, useState } from 'react';
import type { Personal } from '../types/personal';
import { getPersonal, deletePersonal, createPersonal, updatePersonal } from '../services/personalService';
import { PersonalForm } from '../components/personal/PersonalForm';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from '../components/Pagination';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import { Briefcase, Pencil, Trash2, RotateCcw, Plus, X } from 'lucide-react';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';
import { API_BASE_URL } from '../config';

const formatPhoneDisplay = (phone?: string): string => {
    if (!phone) return "-";
    const clean = phone.trim();
    if (!clean) return "-";
    if (clean.startsWith("(")) return clean;
    const KNOWN_CODES = [
        "+591", "+595", "+598", "+54", "+55", "+56", "+57", "+51", "+58", "+52", "+34", "+1"
    ];
    for (const code of KNOWN_CODES) {
        if (clean.startsWith(code)) {
            const rest = clean.slice(code.length).trim().replace(/^[\s-]+/, "");
            return `(${code}) ${rest}`;
        }
    }
    for (const code of KNOWN_CODES) {
        const rawCode = code.replace("+", "");
        if (clean.startsWith(rawCode) && clean.length > rawCode.length + 4) {
            const rest = clean.slice(rawCode.length).trim().replace(/^[\s-]+/, "");
            return `(${code}) ${rest}`;
        }
    }
    const onlyDigits = clean.replace(/[^0-9]/g, "");
    if (onlyDigits.length === 8 || onlyDigits.length === 7) {
        return `(+591) ${onlyDigits}`;
    }
    return clean;
};

const PersonalRegistro = () => {
    const [personalList, setPersonalList] = useState<Personal[]>([]);
    const [filteredPersonal, setFilteredPersonal] = useState<Personal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingPersonal, setEditingPersonal] = useState<Personal | null>(null);
    const [showManual, setShowManual] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchPersonal();
    }, []);

    useEffect(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = personalList.filter(p =>
            p.nombre.toLowerCase().includes(lowerSearchTerm) ||
            p.paterno.toLowerCase().includes(lowerSearchTerm) ||
            p.ci.toLowerCase().includes(lowerSearchTerm)
        );
        setFilteredPersonal(filtered);
        setCurrentPage(1);
    }, [searchTerm, personalList]);

    const fetchPersonal = async () => {
        try {
            setLoading(true);
            const data = await getPersonal();
            setPersonalList(data);
            setFilteredPersonal(data);
        } catch (err: any) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Error al cargar personal: ${err.message}`
            });
        } finally {
            setLoading(false);
        }
    };

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredPersonal.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredPersonal.length / itemsPerPage);

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: '¿Desactivar personal?',
            text: 'Pasará a estado inactivo.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await deletePersonal(id);
                setPersonalList(personalList.map(p =>
                    p.id === id ? { ...p, estado: 'inactivo' } : p
                ));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Desactivado!',
                    text: 'Personal desactivado exitosamente.',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo desactivar'
                });
            }
        }
    };

    const handleReactivate = async (id: string) => {
        const result = await Swal.fire({
            title: '¿Reactivar personal?',
            text: 'Volverá a estar activo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await updatePersonal(id, { estado: 'activo' });
                setPersonalList(personalList.map(p =>
                    p.id === id ? { ...p, estado: 'activo' } : p
                ));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Reactivado!',
                    text: 'Personal reactivado exitosamente.',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar'
                });
            }
        }
    };

    const handleSave = async (data: any) => {
        try {
            if (editingPersonal) {
                await updatePersonal(editingPersonal.id, data);
            } else {
                await createPersonal(data);
            }
            await Swal.fire({
                icon: 'success',
                title: editingPersonal ? 'Actualizado' : 'Creado',
                text: `Personal ${editingPersonal ? 'actualizado' : 'creado'} exitosamente`,
                showConfirmButton: false,
                timer: 1500
            });
            setShowModal(false);
            setEditingPersonal(null);
            fetchPersonal();
        } catch (err: any) {
            console.error('Error al guardar personal:', err);
            const msg = err?.response?.data?.message || err?.message || 'Error al guardar';
            Swal.fire({
                icon: 'error',
                title: 'Error al guardar',
                text: Array.isArray(msg) ? msg.join(', ') : String(msg)
            });
            throw err;
        }
    };

    const openCreateModal = () => {
        setEditingPersonal(null);
        setShowModal(true);
    };

    const openEditModal = (personal: Personal) => {
        setEditingPersonal(personal);
        setShowModal(true);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredPersonal.map(p => ({
            'Nombre Completo': `${p.paterno} ${p.materno} ${p.nombre}`,
            'CI': p.ci,
            'Celular': formatPhoneDisplay(p.celular),
            'Tipo': p.tipo,
            'Área': p.area?.area,
            'Estado': p.estado
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Personal");
        XLSX.writeFile(workbook, `Personal_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        await exportStandardPDF({
            title: 'Reporte de Personal',
            subtitle: 'EDKOR MOTORS - Directorio de Personal y Equipo de Trabajo',
            filtersText: searchTerm ? `Búsqueda: "${searchTerm}"` : undefined,
            totalRecords: filteredPersonal.length,
            totalRecordsLabel: 'Personal Registrado',
            filename: `Personal_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'Nombre Completo', 'CI', 'Celular', 'Tipo', 'Área', 'Precio Hora (Bs)', 'Estado']],
                body: filteredPersonal.map((p, idx) => [
                    idx + 1,
                    `${p.paterno || ''} ${p.materno || ''} ${p.nombre}`.trim(),
                    p.ci || '-',
                    formatPhoneDisplay(p.celular),
                    p.tipo || 'Planta',
                    p.area?.area || '-',
                    Number(p.precio_hora || 0) > 0 ? `Bs ${Number(p.precio_hora).toFixed(2)}` : '-',
                    (p.estado || 'ACTIVO').toUpperCase()
                ]),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { cellWidth: 'auto', fontStyle: 'bold' },
                    2: { halign: 'center', cellWidth: 24 },
                    3: { halign: 'center', cellWidth: 26 },
                    4: { halign: 'center', cellWidth: 20 },
                    5: { cellWidth: 32 },
                    6: { halign: 'right', cellWidth: 28 },
                    7: { halign: 'center', fontStyle: 'bold', cellWidth: 20, fontSize: 6.5 }
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
        {
            title: 'Gestión de Personal',
            content: 'Aquí puede registrar y administrar todo el personal de la empresa.'
        },
        {
            title: 'Registrar Nuevo',
            content: 'Haga clic en "+ Nuevo Personal" y complete el formulario con los datos personales, de contacto y laborales.'
        },
        {
            title: 'Áreas',
            content: 'Debe tener áreas creadas en Configuraciones > Área de Personal para poder asignarlas.'
        }
    ];

    if (loading) return <div>Cargando...</div>;

    return (
        <>
        <div className="container mx-auto relative min-h-screen print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Briefcase className="text-blue-600" size={32} />
                        Registro de Personal
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona el equipo de trabajo y su información</p>
                </div>

                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={printList}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual"
                >
                    <button
                        onClick={openCreateModal}
                        className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium"
                    >
                        <Plus className="h-5 w-5" /> Nuevo Personal
                    </button>
                </StandardExportToolbar>
            </div>

            <div className="mb-6 flex items-center gap-2 no-print">
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por Nombre, CI..."
                        className="w-full md:w-96 pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors border border-red-200 shadow-sm"
                        title="Limpiar búsqueda"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
                Mostrando {filteredPersonal.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredPersonal.length)} de {filteredPersonal.length} registros
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">#</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre Completo</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">CI</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Celular</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Área</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right no-print">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {currentItems.map((p, index) => (
                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                                        {indexOfFirstItem + index + 1}
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200 font-medium">
                                        <div className="flex flex-col">
                                            <span className="font-bold">{p.paterno} {p.materno}</span>
                                            <span>{p.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{p.ci}</span>
                                            {(p.ci_anverso || p.ci_reverso) && (
                                                <div className="flex items-center gap-1">
                                                    {p.ci_anverso && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewImage(`${API_BASE_URL}/files/${p.ci_anverso}`)}
                                                            className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-[#3498db] dark:bg-blue-900/30 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800 transition-colors"
                                                            title="Ver CI Anverso (Frente)"
                                                        >
                                                            Anverso
                                                        </button>
                                                    )}
                                                    {p.ci_reverso && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewImage(`${API_BASE_URL}/files/${p.ci_reverso}`)}
                                                            className="px-1.5 py-0.5 text-[10px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 rounded border border-purple-200 dark:border-purple-800 transition-colors"
                                                            title="Ver CI Reverso (Dorso)"
                                                        >
                                                            Reverso
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300 font-mono text-xs">{formatPhoneDisplay(p.celular)}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${p.tipo === 'Planta'
                                            ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                                            : 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
                                            }`}>
                                            {p.tipo}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300">
                                        <div>{p.area?.area || 'Sin Asignar'}</div>
                                        {p.tipo === 'Planta' && Number(p.precio_hora || 0) > 0 && (
                                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                Bs. {Number(p.precio_hora).toFixed(2)} / hr
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${p.estado === 'activo'
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                            : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                            }`}>
                                            {p.estado}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2 justify-end no-print">
                                        <button
                                            onClick={() => openEditModal(p)}
                                            className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                            title="Editar"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        {p.estado === 'activo' ? (
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Desactivar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleReactivate(p.id)}
                                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Reactivar"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredPersonal.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="font-medium">
                                                {searchTerm ? 'No se encontraron resultados' : 'No hay personal registrado'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
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
                title="Manual de Registro de Personal"
                sections={manualSections}
            />

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                        <PersonalForm // Render form directly
                            initialData={editingPersonal}
                            onSubmit={handleSave}
                            onCancel={() => setShowModal(false)}
                        />
                    </div>
                </div>
            )}

            {/* Preview Modal for CI Image */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-2xl overflow-hidden flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all transform hover:-translate-y-0.5 z-10"
                            title="Cerrar vista previa"
                        >
                            <X size={20} />
                        </button>
                        <img
                            src={previewImage}
                            alt="Carnet de Identidad"
                            className="max-w-full max-h-[85vh] object-contain rounded-xl"
                        />
                    </div>
                </div>
            )}
        </div>

        {/* Print View Personal */}
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
                    title="Reporte de Personal"
                    subtitle="EDKOR MOTORS - Directorio de Personal y Equipo de Trabajo"
                    filtersText={searchTerm ? `Búsqueda: "${searchTerm}"` : undefined}
                    totalRecords={filteredPersonal.length}
                    totalRecordsLabel="Personal Registrado"
                />

                <table className="w-full text-left border border-gray-400 text-[10px]">
                    <thead>
                        <tr className="bg-gray-100 text-gray-900 border-b border-gray-400 font-bold uppercase text-[9px]">
                            <th className="p-1.5 border-r border-gray-300 text-center w-8">#</th>
                            <th className="p-1.5 border-r border-gray-300">Nombre Completo</th>
                            <th className="p-1.5 border-r border-gray-300 text-center w-24">CI</th>
                            <th className="p-1.5 border-r border-gray-300 text-center w-28">Celular</th>
                            <th className="p-1.5 border-r border-gray-300 text-center w-20">Tipo</th>
                            <th className="p-1.5 border-r border-gray-300 w-36">Área</th>
                            <th className="p-1.5 border-r border-gray-300 text-right w-28">Precio Hora</th>
                            <th className="p-1.5 text-center w-24">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPersonal.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-4 text-center text-gray-500 italic">
                                    No hay registros de personal.
                                </td>
                            </tr>
                        ) : (
                            filteredPersonal.map((p, idx) => (
                                <tr key={p.id} className={`border-b border-gray-200 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                                    <td className="p-1.5 border-r border-gray-200 text-center font-medium">{idx + 1}</td>
                                    <td className="p-1.5 border-r border-gray-200 font-bold text-gray-900">
                                        {`${p.paterno || ''} ${p.materno || ''} ${p.nombre}`.trim()}
                                    </td>
                                    <td className="p-1.5 border-r border-gray-200 text-center font-mono">{p.ci || '-'}</td>
                                    <td className="p-1.5 border-r border-gray-200 text-center text-[9px]">{formatPhoneDisplay(p.celular)}</td>
                                    <td className="p-1.5 border-r border-gray-200 text-center">{p.tipo || 'Planta'}</td>
                                    <td className="p-1.5 border-r border-gray-200">{p.area?.area || '-'}</td>
                                    <td className="p-1.5 border-r border-gray-200 text-right">
                                        {Number(p.precio_hora || 0) > 0 ? `Bs ${Number(p.precio_hora).toFixed(2)}` : '-'}
                                    </td>
                                    <td className="p-1.5 text-center uppercase font-semibold text-[9px]">
                                        {p.estado || 'ACTIVO'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {filteredPersonal.length > 0 && (
                        <tfoot>
                            <tr className="bg-gray-100 font-bold border-t-2 border-gray-400 text-[10px]">
                                <td colSpan={8} className="p-2 text-right uppercase">
                                    Total: {filteredPersonal.length} miembros del personal
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

export default PersonalRegistro;
