import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ComisionTarjeta } from '../types/comisionTarjeta';
import { ArrowLeft, CreditCard, Pencil, Trash2, RotateCcw, Plus } from 'lucide-react';
import { getComisionesTarjeta, deleteComisionTarjeta, createComisionTarjeta, updateComisionTarjeta } from '../services/comisionTarjetaService';
import { ComisionTarjetaForm } from '../components/comisionTarjeta/ComisionTarjetaForm';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import Pagination from '../components/Pagination';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';

const ComisionTarjetaList = () => {
    const navigate = useNavigate();
    const [comisiones, setComisiones] = useState<ComisionTarjeta[]>([]);
    const [filteredComisiones, setFilteredComisiones] = useState<ComisionTarjeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingComision, setEditingComision] = useState<ComisionTarjeta | null>(null);
    const [showManual, setShowManual] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchComisiones();
    }, []);

    useEffect(() => {
        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = comisiones
            .filter(ct => ct.red_banco.toLowerCase().includes(lowerSearchTerm))
            .sort((a, b) => (a.red_banco || '').localeCompare(b.red_banco || '', 'es', { sensitivity: 'base' }));
        setFilteredComisiones(filtered);
        setCurrentPage(1);
    }, [searchTerm, comisiones]);

    const fetchComisiones = async () => {
        try {
            setLoading(true);
            const data = await getComisionesTarjeta();
            const sorted = [...data].sort((a, b) => (a.red_banco || '').localeCompare(b.red_banco || '', 'es', { sensitivity: 'base' }));
            setComisiones(sorted);
            setFilteredComisiones(sorted);
        } catch (err: any) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Error al cargar comisiones: ${err.message || 'Error desconocido'}`
            });
        } finally {
            setLoading(false);
        }
    };

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredComisiones.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredComisiones.length / itemsPerPage);

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Desactivar Red Banco?',
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
                await deleteComisionTarjeta(id);
                setComisiones(comisiones.map(ct =>
                    ct.id === id ? { ...ct, estado: 'inactivo' } : ct
                ));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Desactivado!',
                    text: 'Red Banco desactivada exitosamente.',
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

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar Red Banco?',
            text: 'Volverá a estar activa.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await updateComisionTarjeta(id, { estado: 'activo' });
                setComisiones(comisiones.map(ct =>
                    ct.id === id ? { ...ct, estado: 'activo' } : ct
                ));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Reactivado!',
                    text: 'Red Banco reactivada exitosamente.',
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

    const handleSave = async (comisionData: Omit<ComisionTarjeta, 'id'>) => {
        const nombreNuevo = (comisionData.red_banco || '').trim();
        if (!nombreNuevo) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo obligatorio',
                text: 'El nombre de la Red Banco es obligatorio.'
            });
            return;
        }

        const duplicado = comisiones.find(c =>
            c.red_banco?.trim().toLowerCase() === nombreNuevo.toLowerCase() &&
            (!editingComision || String(c.id) !== String(editingComision.id))
        );

        if (duplicado) {
            if (duplicado.estado === 'inactivo') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Red Banco existente inactiva',
                    text: `La red banco "${nombreNuevo}" ya existe en estado inactivo. Puede reactivarla desde el listado.`
                });
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Red Banco duplicada',
                    text: `Ya existe una red banco con el nombre "${nombreNuevo}".`
                });
            }
            return;
        }

        try {
            if (editingComision) {
                await updateComisionTarjeta(editingComision.id, { ...comisionData, red_banco: nombreNuevo });
                await Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'Red Banco actualizada exitosamente',
                    showConfirmButton: false,
                    timer: 1500
                });
            } else {
                await createComisionTarjeta({ ...comisionData, red_banco: nombreNuevo });
                await Swal.fire({
                    icon: 'success',
                    title: 'Creado',
                    text: 'Red Banco creada exitosamente',
                    showConfirmButton: false,
                    timer: 1500
                });
            }
            setShowModal(false);
            setEditingComision(null);
            fetchComisiones();
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.message || 'Error al guardar'
            });
            throw err;
        }
    };

    const openCreateModal = () => {
        setEditingComision(null);
        setShowModal(true);
    };

    const openEditModal = (comision: ComisionTarjeta) => {
        setEditingComision(comision);
        setShowModal(true);
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredComisiones.map(ct => ({
            'Red Banco': ct.red_banco,
            'Comisión (%)': ct.comision,
            'Estado': ct.estado
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Comisiones Tarjeta");
        XLSX.writeFile(workbook, `ComisionesTarjeta_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        await exportStandardPDF({
            title: 'Reporte de Comisiones por Tarjeta (Red Banco)',
            subtitle: 'EDKOR MOTORS - Tarifario de Comisiones Bancarias',
            orientation: 'portrait',
            filtersText: searchTerm ? `Búsqueda: "${searchTerm}"` : undefined,
            totalRecords: filteredComisiones.length,
            totalRecordsLabel: 'Redes Registradas',
            filename: `Comisiones_Tarjeta_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'Red Banco / Entidad', 'Comisión (%)', 'Estado']],
                body: filteredComisiones.map((ct, idx) => [
                    idx + 1,
                    ct.red_banco,
                    `${Number(ct.comision || 0).toFixed(2)} %`,
                    ct.estado.toUpperCase()
                ]),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 15 },
                    1: { cellWidth: 'auto', fontStyle: 'bold' },
                    2: { halign: 'right', cellWidth: 35 },
                    3: { halign: 'center', cellWidth: 30 }
                }
            }
        });
    };

    const printList = () => {
        window.print();
    };

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Red Banco',
            content: 'Aquí puede administrar las redes de banco y sus comisiones.'
        },
        {
            title: 'Crear Red Banco',
            content: 'Haga clic en "+ Nueva Red Banco", ingrese el nombre y la comisión.'
        },
        {
            title: 'Desactivar/Reactivar',
            content: 'Use el botón rojo para desactivar y el verde para reactivar. No se eliminan permanentemente.'
        }
    ];

    if (loading) return <div>Cargando...</div>;

    return (
        <>
            <div className="hidden print:block mb-4">
                <StandardPrintHeader
                    title="Reporte de Red Banco y Comisiones"
                    subtitle="EDKOR MOTORS - Comisiones por Cobro con Tarjeta"
                    orientation="portrait"
                    totalRecords={filteredComisiones.length}
                    totalRecordsLabel="Total Redes"
                />
            </div>

            <div className="container mx-auto relative min-h-screen">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 no-print">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/configuraciones/general')}
                            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Volver"
                        >
                            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                                <CreditCard className="text-green-600" size={32} />
                                Red Banco
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Configura las comisiones por tarjeta</p>
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
                            <Plus className="h-5 w-5" /> Nueva Red Banco
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
                        placeholder="Buscar por Red Banco..."
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

            {/* Contador de registros detallado */}
            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
                Mostrando {filteredComisiones.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredComisiones.length)} de {filteredComisiones.length} registros
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">#</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Red Banco</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comisión (%)</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right no-print">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {currentItems.map((ct, index) => (
                                <tr key={ct.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                                        {indexOfFirstItem + index + 1}
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200 font-medium">{ct.red_banco}</td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200 font-medium">{ct.comision}%</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${ct.estado === 'activo'
                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                            : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                            }`}>
                                            {ct.estado}
                                        </span>
                                    </td>
                                    <td className="p-4 flex gap-2 justify-end no-print">
                                        <button
                                            onClick={() => openEditModal(ct)}
                                            className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                            title="Editar"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        {ct.estado === 'activo' ? (
                                            <button
                                                onClick={() => handleDelete(ct.id)}
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Desactivar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleReactivate(ct.id)}
                                                className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Reactivar"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredComisiones.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="font-medium">
                                                {searchTerm ? 'No se encontraron resultados' : 'No hay registros'}
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
                title="Manual de Red Banco"
                sections={manualSections}
            />

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                        <ComisionTarjetaForm
                            initialData={editingComision}
                            onSubmit={handleSave}
                            onCancel={() => { setShowModal(false); setEditingComision(null); }}
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

export default ComisionTarjetaList;
