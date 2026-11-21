import { useState, useEffect } from 'react';
import { Plus, Search, Package, Pencil, Trash2, RotateCcw, Layers } from 'lucide-react';
import { getInventarios, createInventario, updateInventario, deleteInventario } from '../services/inventarioService';
import type { Inventario, CreateInventarioData } from '../types/inventario';
import { InventarioForm } from '../components/inventario/InventarioForm';
import { InventarioKardexModal } from '../components/inventario/InventarioKardexModal';
import * as XLSX from 'xlsx';
import Pagination from '../components/Pagination';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import Swal from 'sweetalert2';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';

export const InventarioList = () => {
    const [inventarios, setInventarios] = useState<Inventario[]>([]);
    const [filteredInventarios, setFilteredInventarios] = useState<Inventario[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<Inventario | null>(null);
    const [kardexItem, setKardexItem] = useState<Inventario | null>(null);
    const [showManual, setShowManual] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const loadInventarios = async () => {
        try {
            setLoading(true);
            const data = await getInventarios();
            setInventarios(data);
            setFilteredInventarios(data);
            setError(null);
        } catch (err) {
            setError('Error al cargar inventario');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInventarios();
    }, []);

    useEffect(() => {
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = inventarios.filter(item =>
            item.descripcion.toLowerCase().includes(lowerTerm) ||
            (item.codigo && item.codigo.toLowerCase().includes(lowerTerm)) ||
            item.grupo_inventario?.grupo.toLowerCase().includes(lowerTerm)
        );
        setFilteredInventarios(filtered);
        setCurrentPage(1);
    }, [searchTerm, inventarios]);

    // Pagination logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredInventarios.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredInventarios.length / itemsPerPage);

    const handleCreate = async (data: CreateInventarioData) => {
        try {
            await createInventario(data);
            await loadInventarios();
            setIsModalOpen(false);
            Swal.fire({
                icon: 'success',
                title: 'Creado',
                text: 'Item creado exitosamente',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al crear el item'
            });
        }
    };

    const handleUpdate = async (data: CreateInventarioData) => {
        if (!selectedItem) return;
        try {
            await updateInventario(selectedItem.id, data);
            await loadInventarios();
            setIsModalOpen(false);
            setSelectedItem(null);
            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: 'Item actualizado exitosamente',
                timer: 1500,
                showConfirmButton: false
            });
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al actualizar el item'
            });
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Desactivar item?',
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
                await deleteInventario(id);
                await loadInventarios();
                Swal.fire({
                    icon: 'success',
                    title: 'Desactivado',
                    text: 'Item desactivado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (err) {
                console.error(err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al desactivar el item'
                });
            }
        }
    };

    const handleReactivate = async (item: Inventario) => {
        const result = await Swal.fire({
            title: '¿Reactivar item?',
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
                const updateData: CreateInventarioData = {
                    codigo: item.codigo || '',
                    descripcion: item.descripcion,
                    cantidad_existente: item.cantidad_existente,
                    stock_minimo: item.stock_minimo,
                    precio_compra: Number(item.precio_compra || 0),
                    precio_venta: Number(item.precio_venta || 0),
                    estado: 'activo',
                    idunidad_medida: item.unidad_medida?.id || '',
                    id_grupo_inventario: item.grupo_inventario?.id || ''
                };

                await updateInventario(item.id, updateData);
                await loadInventarios();

                Swal.fire({
                    icon: 'success',
                    title: 'Reactivado',
                    text: 'Item reactivado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (err) {
                console.error(err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al reactivar el item'
                });
            }
        }
    };


    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredInventarios.map(item => ({
            'Código': item.codigo || '-',
            'Descripción': item.descripcion,
            'Stock Inicial': item.stock_inicial ?? item.cantidad_existente ?? 0,
            'Entradas (+)': item.entradas ?? 0,
            'Salidas (-)': item.salidas ?? 0,
            'Stock Actual': item.cantidad_existente,
            'Stock Mínimo': item.stock_minimo,
            'Unidad': item.unidad_medida?.medida || '-',
            'Grupo': item.grupo_inventario?.grupo || '-',
            'Estado': item.estado
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
        XLSX.writeFile(workbook, `Inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        await exportStandardPDF({
            title: 'Control de Inventario y Stock',
            subtitle: 'EDKOR MOTORS - Existencias y Kardex de Materiales y Repuestos',
            filtersText: searchTerm ? `Búsqueda: "${searchTerm}"` : undefined,
            totalRecords: filteredInventarios.length,
            totalRecordsLabel: 'Items Registrados',
            filename: `Inventario_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'Código', 'Descripción', 'Stock Ini.', 'Entr.', 'Sal.', 'Stock Act.', 'Mín.', 'Unidad', 'Grupo', 'Estado']],
                body: filteredInventarios.map((item, idx) => [
                    idx + 1,
                    item.codigo || '-',
                    item.descripcion,
                    item.stock_inicial ?? item.cantidad_existente ?? 0,
                    item.entradas ?? 0,
                    item.salidas ?? 0,
                    item.cantidad_existente,
                    item.stock_minimo,
                    item.unidad_medida?.medida || '-',
                    item.grupo_inventario?.grupo || '-',
                    (item.estado || 'ACTIVO').toUpperCase()
                ]),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
                    2: { cellWidth: 65, fontStyle: 'bold' },
                    3: { halign: 'center', cellWidth: 16 },
                    4: { halign: 'center', cellWidth: 14 },
                    5: { halign: 'center', cellWidth: 14 },
                    6: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
                    7: { halign: 'center', cellWidth: 14 },
                    8: { halign: 'center', cellWidth: 20 },
                    9: { cellWidth: 32 },
                    10: { halign: 'center', cellWidth: 18, fontSize: 6.5, fontStyle: 'bold' }
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
            title: 'Gestión de Inventario y Kardex',
            content: 'Aquí puede administrar los items del inventario, controlando Stock Inicial, Entradas por compras, Salidas por órdenes de trabajo, Stock Actual y Stock Mínimo.'
        },
        {
            title: 'Trazabilidad de Lotes (PEPS / FIFO)',
            content: 'Haga clic en el botón azul de capas (Trazabilidad) para ver los turriles/lotes de compra, cuánto saldo le queda a cada uno y en qué órdenes de trabajo se consumieron (ej. 3L, 4L, etc.).'
        },
        {
            title: 'Crear / Editar Item',
            content: 'Al registrar o modificar un producto puede definir el Stock Inicial, Stock Mínimo, Precio de Compra y Precio de Venta por unidad de medida.'
        },
        {
            title: 'Desactivar / Reactivar',
            content: 'Use el botón rojo para desactivar items y el verde para reactivarlos. El stock bajo se marcará automáticamente.'
        }
    ];

    if (loading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Cargando...</div>;

    return (
        <>
        <div className="container mx-auto relative min-h-screen print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Package className="text-amber-600" size={32} />
                        Inventario
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona el stock de repuestos e insumos</p>
                </div>

                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={printList}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual"
                >
                    <button
                        onClick={() => {
                            setSelectedItem(null);
                            setIsModalOpen(true);
                        }}
                        className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium"
                    >
                        <Plus className="w-5 h-5" /> Nuevo Item
                    </button>
                </StandardExportToolbar>
            </div>

            <div className="mb-6 flex items-center gap-2 no-print">
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por descripción o grupo..."
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

            {error && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
                Mostrando {filteredInventarios.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredInventarios.length)} de {filteredInventarios.length} registros
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">#</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Código</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Descripción</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center" title="Stock con el que arrancó">Stock Ini.</th>
                                <th className="p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-center" title="Entradas por compras/pedidos">Entradas (+)</th>
                                <th className="p-3 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider text-center" title="Salidas consumidas en órdenes de trabajo">Salidas (-)</th>
                                <th className="p-3 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-center" title="Stock Actual Disponible (Stock Ini + Entradas - Salidas)">Stock Actual</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Mín.</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Unidad</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grupo</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right no-print">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={12} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        Cargando...
                                    </td>
                                </tr>
                            ) : currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="font-medium">
                                                No se encontraron registros
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((item, index) => {
                                    const stockIni = Number(item.stock_inicial ?? item.cantidad_existente ?? 0);
                                    const entradas = Number(item.entradas ?? 0);
                                    const salidas = Number(item.salidas ?? 0);
                                    const stockAct = Number(item.cantidad_existente ?? 0);
                                    const isBajo = !(stockAct === 0 && Number(item.stock_minimo || 0) === 0) && stockAct <= Number(item.stock_minimo || 0);

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                                                {indexOfFirstItem + index + 1}
                                            </td>
                                            <td className="p-3 text-gray-600 dark:text-gray-300 font-mono text-xs">
                                                {item.codigo || '-'}
                                            </td>
                                            <td className="p-3 text-gray-900 dark:text-gray-200 font-medium">
                                                {item.descripcion}
                                                {isBajo && (
                                                    <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 rounded font-bold">
                                                        Bajo Stock
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center text-gray-600 dark:text-gray-300 text-xs font-medium">
                                                {stockIni}
                                            </td>
                                            <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                                                {entradas > 0 ? `+${entradas}` : '0'}
                                            </td>
                                            <td className="p-3 text-center text-orange-600 dark:text-orange-400 text-xs font-semibold">
                                                {salidas > 0 ? `-${salidas}` : '0'}
                                            </td>
                                            <td className="p-3 text-center font-bold">
                                                <span className={`px-2 py-0.5 rounded-md text-xs ${
                                                    isBajo
                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                        : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                                }`}>
                                                    {stockAct}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center text-gray-500 dark:text-gray-400 text-xs">
                                                {item.stock_minimo}
                                            </td>
                                            <td className="p-3 text-gray-500 dark:text-gray-400 text-xs">
                                                {item.unidad_medida?.medida || '-'}
                                            </td>
                                            <td className="p-3 text-gray-500 dark:text-gray-400 text-xs">
                                                {item.grupo_inventario?.grupo || '-'}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap border ${item.estado === 'activo'
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                                    : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                                    }`}>
                                                    {item.estado}
                                                </span>
                                            </td>
                                            <td className="p-3 flex gap-1.5 justify-end no-print">
                                                <button
                                                    onClick={() => setKardexItem(item)}
                                                    className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                    title="Trazabilidad por Lotes y Kardex"
                                                >
                                                    <Layers size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-1.5 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                    title="Editar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                {item.estado === 'activo' ? (
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                        title="Desactivar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleReactivate(item)}
                                                        className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                        title="Reactivar"
                                                    >
                                                        <RotateCcw size={16} />
                                                    </button>
                                                )}
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
                title="Manual de Inventario"
                sections={manualSections}
            />

            {isModalOpen && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl transform transition-all">
                        <InventarioForm
                            initialData={selectedItem}
                            onSubmit={selectedItem ? handleUpdate : handleCreate}
                            onCancel={() => {
                                setIsModalOpen(false);
                                setSelectedItem(null);
                            }}
                        />
                    </div>
                </div>
            )}

            {kardexItem && (
                <InventarioKardexModal
                    inventario={kardexItem}
                    onClose={() => setKardexItem(null)}
                />
            )}
        </div>

        {/* Printable View */}
        <div className="hidden print:block font-sans text-black p-4 bg-white min-h-screen">
            <StandardPrintHeader
                title="CONTROL DE INVENTARIO Y STOCK"
                subtitle="Existencias, Precios y Kardex de Materiales y Repuestos"
                filtersText={searchTerm ? `Búsqueda: "${searchTerm}"` : undefined}
            />

            <table className="w-full text-left border-collapse border border-gray-400 text-xs mt-3">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-400">
                        <th className="border border-gray-300 p-1.5 text-center w-8">#</th>
                        <th className="border border-gray-300 p-1.5 text-center">Código</th>
                        <th className="border border-gray-300 p-1.5">Descripción</th>
                        <th className="border border-gray-300 p-1.5 text-center">Stock Ini.</th>
                        <th className="border border-gray-300 p-1.5 text-center">Entr.</th>
                        <th className="border border-gray-300 p-1.5 text-center">Sal.</th>
                        <th className="border border-gray-300 p-1.5 text-center">Stock Act.</th>
                        <th className="border border-gray-300 p-1.5 text-center">Mín.</th>
                        <th className="border border-gray-300 p-1.5 text-center">Unidad</th>
                        <th className="border border-gray-300 p-1.5">Grupo</th>
                        <th className="border border-gray-300 p-1.5 text-center">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredInventarios.map((item, idx) => (
                        <tr key={item.id} className="border-b border-gray-200">
                            <td className="border border-gray-200 p-1.5 text-center">{idx + 1}</td>
                            <td className="border border-gray-200 p-1.5 text-center font-bold">{item.codigo || '-'}</td>
                            <td className="border border-gray-200 p-1.5 font-bold">{item.descripcion}</td>
                            <td className="border border-gray-200 p-1.5 text-center">{item.stock_inicial ?? item.cantidad_existente ?? 0}</td>
                            <td className="border border-gray-200 p-1.5 text-center text-green-700">{item.entradas ?? 0}</td>
                            <td className="border border-gray-200 p-1.5 text-center text-red-700">{item.salidas ?? 0}</td>
                            <td className="border border-gray-200 p-1.5 text-center font-bold">{item.cantidad_existente}</td>
                            <td className="border border-gray-200 p-1.5 text-center">{item.stock_minimo}</td>
                            <td className="border border-gray-200 p-1.5 text-center">{item.unidad_medida?.medida || '-'}</td>
                            <td className="border border-gray-200 p-1.5">{item.grupo_inventario?.grupo || '-'}</td>
                            <td className="border border-gray-200 p-1.5 text-center font-bold uppercase">{item.estado}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-4 flex justify-between items-center text-xs border-t pt-2 border-gray-300">
                <span>Total Items: <strong>{filteredInventarios.length}</strong></span>
                <span className="font-semibold text-gray-600">EDKOR MOTORS - Sistema de Control Automotriz</span>
            </div>

            <StandardPrintFooter />
        </div>
        </>
    );
};
