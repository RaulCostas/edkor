import { useEffect, useState } from 'react';
import type { Inspector } from '../types/inspector';
import { getInspectores, deleteInspector, createInspector, updateInspector } from '../services/inspectorService';
import { InspectoresForm } from '../components/inspectores/InspectoresForm';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import Pagination from '../components/Pagination';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import { UserCheck, Pencil, Trash2, RotateCcw, Plus } from 'lucide-react';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';

const SegurosInspectores = () => {
    const [inspectores, setInspectores] = useState<Inspector[]>([]);
    const [filteredInspectores, setFilteredInspectores] = useState<Inspector[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingInspector, setEditingInspector] = useState<Inspector | null>(null);
    const [showManual, setShowManual] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchInspectores();
    }, []);

    useEffect(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = inspectores.filter(i =>
            i.inspector.toLowerCase().includes(lowerSearchTerm) ||
            i.seguro.seguro.toLowerCase().includes(lowerSearchTerm)
        );
        setFilteredInspectores(filtered);
        setCurrentPage(1);
    }, [searchTerm, inspectores]);

    const fetchInspectores = async () => {
        try {
            setLoading(true);
            const data = await getInspectores();
            setInspectores(data);
            setFilteredInspectores(data);
        } catch (err: any) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Error al cargar inspectores: ${err.message}`
            });
        } finally {
            setLoading(false);
        }
    };

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredInspectores.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredInspectores.length / itemsPerPage);

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: '¿Desactivar inspector?',
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
                await deleteInspector(id);
                setInspectores(inspectores.map(i =>
                    i.id === id ? { ...i, estado: 'inactivo' } : i
                ));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Desactivado!',
                    text: 'Inspector desactivado exitosamente.',
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
            title: '¿Reactivar inspector?',
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
                await updateInspector(id, { estado: 'activo' });
                setInspectores(inspectores.map(i =>
                    i.id === id ? { ...i, estado: 'activo' } : i
                ));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Reactivado!',
                    text: 'Inspector reactivado exitosamente.',
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

    const handleSave = async (inspectorData: any) => {
        try {
            if (editingInspector) {
                await updateInspector(editingInspector.id, inspectorData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'Inspector actualizado exitosamente',
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                await createInspector(inspectorData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Creado',
                    text: 'Inspector creado exitosamente',
                    showConfirmButton: false,
                    timer: 1500
                });
            }
            setShowModal(false);
            setEditingInspector(null);
            fetchInspectores();
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message || 'Error al guardar'
            });
            throw err;
        }
    };

    const openCreateModal = () => {
        setEditingInspector(null);
        setShowModal(true);
    };

    const openEditModal = (inspector: Inspector) => {
        setEditingInspector(inspector);
        setShowModal(true);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredInspectores.map(i => ({
            'Seguro': i.seguro.seguro,
            'Inspector': i.inspector,
            'Celular': i.celular,
            'Email': i.correo,
            'Estado': i.estado
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inspectores");
        XLSX.writeFile(workbook, `Inspectores_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        await exportStandardPDF({
            title: 'Reporte de Inspectores de Seguros',
            subtitle: 'EDKOR MOTORS - Gestión de Inspectores por Aseguradora',
            orientation: 'portrait',
            filtersText: searchTerm ? `Búsqueda: "${searchTerm}"` : undefined,
            totalRecords: filteredInspectores.length,
            totalRecordsLabel: 'Inspectores Registrados',
            filename: `Inspectores_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'Aseguradora / Seguro', 'Inspector', 'Celular', 'Email', 'Estado']],
                body: filteredInspectores.map((i, idx) => [
                    idx + 1,
                    i.seguro?.seguro || '-',
                    i.inspector,
                    i.celular || '-',
                    i.correo || '-',
                    i.estado.toUpperCase()
                ]),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },
                    1: { cellWidth: 50, fontStyle: 'bold' },
                    2: { cellWidth: 50 },
                    3: { cellWidth: 35 },
                    4: { cellWidth: 'auto' },
                    5: { halign: 'center', cellWidth: 25 }
                }
            }
        });
    };

    const printList = () => {
        window.print();
    };

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Inspectores',
            content: 'Modulo para administrar inspectores asociados a las aseguradoras.'
        },
        {
            title: 'Crear',
            content: 'Clic en Nuevo Inspector, seleccione el Seguro, llene Nombre, Celular, etc.'
        }
    ];

    if (loading) return <div>Cargando...</div>;

    return (
        <>
            <div className="hidden print:block mb-4">
                <StandardPrintHeader
                    title="Reporte de Inspectores de Seguros"
                    subtitle="EDKOR MOTORS - Gestión de Inspectores"
                    orientation="portrait"
                    totalRecords={filteredInspectores.length}
                    totalRecordsLabel="Total Inspectores"
                />
            </div>

            <div className="container mx-auto relative min-h-screen">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 no-print">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <UserCheck className="text-indigo-600" size={32} />
                                Inspectores
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona los inspectores asignados por las aseguradoras</p>
                        </div>
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
                            <Plus className="h-5 w-5" /> Nuevo Inspector
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
                        placeholder="Buscar por inspector o seguro..."
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
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
                Mostrando {filteredInspectores.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredInspectores.length)} de {filteredInspectores.length} registros
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">#</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Seguro</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inspector</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Celular</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right no-print">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {currentItems.map((i, index) => (
                                <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                                        {indexOfFirstItem + index + 1}
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200 font-medium">
                                        {i.seguro.seguro}
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200">
                                        <div className="flex flex-col">
                                            <span>{i.inspector}</span>
                                            {i.correo && <span className="text-xs text-gray-500">{i.correo}</span>}
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300">
                                        {i.celular}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${i.estado === 'activo'
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                            : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                            }`}>
                                            {i.estado}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2 justify-end no-print">
                                        <button
                                            onClick={() => openEditModal(i)}
                                            className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                            title="Editar"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        {i.estado === 'activo' ? (
                                            <button
                                                onClick={() => handleDelete(i.id)}
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Desactivar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleReactivate(i.id)}
                                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Reactivar"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredInspectores.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="font-medium">
                                                {searchTerm ? 'No se encontraron resultados' : 'No hay inspectores registrados'}
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
                title="Manual de Inspectores"
                sections={manualSections}
            />

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all scale-100">
                        <InspectoresForm
                            initialData={editingInspector}
                            onSubmit={handleSave}
                            onCancel={() => { setShowModal(false); setEditingInspector(null); }}
                        />
                    </div>
                </div>
            )}

            <div className="hidden print:block mt-8">
                <StandardPrintFooter />
            </div>
        </div>
        </>
    );
};

export default SegurosInspectores;
