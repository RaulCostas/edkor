import { useEffect, useState } from 'react';
import { DollarSign, Search, CheckCircle, Clock, Eye, Image as ImageIcon, X } from 'lucide-react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import type { MaterialPedido } from '../types/materialPedido';
import { getMaterialPedidos } from '../services/materialPedidoService';
import { getPagoPedidos } from '../services/pagoPedidoService';
import PagoPedidoModal from '../components/PagoPedidoModal';
import MaterialPedidoModal from './MaterialPedidoModal';
import Pagination from '../components/Pagination';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import { API_BASE_URL } from '../config';

// Define Interface for PagoPedido since it might not be in a shared type file yet
interface PagoPedido {
    id: number;
    fecha: string;
    factura: string;
    recibo: string;
    moneda: string;
    tc?: number;
    imagen?: string;
    material_pedido: MaterialPedido;
    usuario: { id: number; name: string };
    forma_pago: { id: number; forma_pago: string };
}

const ProveedoresPagos = () => {
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [pendingOrders, setPendingOrders] = useState<MaterialPedido[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<PagoPedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showManual, setShowManual] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const itemsPerPage = 10;

    // Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedPedidoForPayment, setSelectedPedidoForPayment] = useState<MaterialPedido | null>(null);

    // Order Details Modal State
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'pending') {
                const data = await getMaterialPedidos();
                // Filter for unpaid orders
                setPendingOrders(data.filter((p: any) => !p.pagado && p.estado === 'activo'));
            } else {
                const data = await getPagoPedidos();
                setPaymentHistory(data);
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handlePay = (pedido: MaterialPedido) => {
        setSelectedPedidoForPayment(pedido);
        setIsPaymentModalOpen(true);
    };

    const handleViewOrder = (id: number) => {
        setSelectedOrderId(id);
        setIsOrderModalOpen(true);
    };

    const handlePaymentSuccess = () => {
        loadData(); // Reload current tab data
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString();
    };

    const filteredPending = pendingOrders.filter(p =>
        p.proveedor.proveedor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredHistory = paymentHistory.filter(p =>
        p.material_pedido?.proveedor?.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.factura?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.recibo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const currentFiltered = activeTab === 'pending' ? filteredPending : filteredHistory;
    const totalPages = Math.ceil(currentFiltered.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItemsPending = filteredPending.slice(indexOfFirstItem, indexOfLastItem);
    const currentItemsHistory = filteredHistory.slice(indexOfFirstItem, indexOfLastItem);

    const exportToExcel = () => {
        let worksheet;
        if (activeTab === 'pending') {
            worksheet = XLSX.utils.json_to_sheet(filteredPending.map(p => ({
                'ID Compra': p.id,
                'Fecha Pedido': formatDate(p.fecha),
                'Proveedor': p.proveedor?.proveedor || '-',
                'Total (Bs)': Number(p.total || 0).toFixed(2),
                'Estado': 'Pendiente de Pago',
                'Observaciones': p.observaciones || '-'
            })));
        } else {
            worksheet = XLSX.utils.json_to_sheet(filteredHistory.map(p => ({
                'ID Pago': p.id,
                'Fecha Pago': formatDate(p.fecha),
                'Proveedor': p.material_pedido?.proveedor?.proveedor || '-',
                'Documento': p.factura ? `Factura: ${p.factura}` : (p.recibo ? `Recibo: ${p.recibo}` : '-'),
                'Monto (Bs)': Number(p.material_pedido?.total || 0).toFixed(2),
                'Moneda': p.moneda,
                'Forma de Pago': p.forma_pago?.forma_pago || '-',
                'Registrado Por': p.usuario?.name || '-'
            })));
        }
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, activeTab === 'pending' ? "PagosPendientes" : "HistorialPagos");
        XLSX.writeFile(workbook, `Pagos_Proveedores_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        if (activeTab === 'pending') {
            await exportStandardPDF({
                title: 'Pagos Pendientes a Proveedores',
                subtitle: 'EDKOR MOTORS - Cuentas por Pagar por Compra de Materiales y Repuestos',
                filtersText: searchTerm ? `Búsqueda: "${searchTerm}"` : undefined,
                totalRecords: filteredPending.length,
                totalRecordsLabel: 'Compras Pendientes',
                filename: `Pagos_Pendientes_Proveedores_${new Date().toISOString().split('T')[0]}.pdf`,
                tableOptions: {
                    head: [['#', 'N° Compra', 'Fecha Pedido', 'Proveedor', 'Total (Bs)', 'Estado']],
                    body: filteredPending.map((p, idx) => [
                        idx + 1,
                        `#${p.id}`,
                        formatDate(p.fecha),
                        p.proveedor?.proveedor || '-',
                        `Bs ${Number(p.total || 0).toFixed(2)}`,
                        'PENDIENTE'
                    ]),
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 10 },
                        1: { halign: 'center', cellWidth: 25, fontStyle: 'bold' },
                        2: { halign: 'center', cellWidth: 30 },
                        3: { cellWidth: 'auto', fontStyle: 'bold' },
                        4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
                        5: { halign: 'center', cellWidth: 28, fontSize: 6.5, fontStyle: 'bold' }
                    }
                }
            });
        } else {
            await exportStandardPDF({
                title: 'Historial de Pagos a Proveedores',
                subtitle: 'EDKOR MOTORS - Registro de Desembolsos y Cancelación a Proveedores',
                filtersText: searchTerm ? `Búsqueda: "${searchTerm}"` : undefined,
                totalRecords: filteredHistory.length,
                totalRecordsLabel: 'Pagos Realizados',
                filename: `Historial_Pagos_Proveedores_${new Date().toISOString().split('T')[0]}.pdf`,
                tableOptions: {
                    head: [['#', 'Fecha Pago', 'Proveedor', 'Documento', 'Monto (Bs)', 'Forma Pago', 'Usuario']],
                    body: filteredHistory.map((p, idx) => [
                        idx + 1,
                        formatDate(p.fecha),
                        p.material_pedido?.proveedor?.proveedor || '-',
                        p.factura ? `Fact. ${p.factura}` : (p.recibo ? `Rec. ${p.recibo}` : '-'),
                        `Bs ${Number(p.material_pedido?.total || 0).toFixed(2)}`,
                        p.forma_pago?.forma_pago || '-',
                        p.usuario?.name || '-'
                    ]),
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 8 },
                        1: { halign: 'center', cellWidth: 24 },
                        2: { cellWidth: 45, fontStyle: 'bold' },
                        3: { halign: 'center', cellWidth: 30 },
                        4: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
                        5: { halign: 'center', cellWidth: 28 },
                        6: { cellWidth: 'auto' }
                    }
                }
            });
        }
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
            title: 'Pago a Proveedores',
            content: 'Controle los saldos adeudados por compras y registre los desembolsos a cada proveedor.'
        },
        {
            title: 'Pestaña Pendientes',
            content: 'Muestra todas las compras registradas que aún no han sido pagadas. Puede presionar "Pagar" para asentar el número de factura/recibo, forma de pago y foto de respaldo.'
        },
        {
            title: 'Pestaña Historial',
            content: 'Muestra los pagos completados, permitiendo ver el detalle de la compra o abrir el comprobante/recibo adjunto.'
        }
    ];

    return (
        <>
        <div className="container mx-auto p-6 max-w-7xl print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <DollarSign className="text-green-600" size={32} />
                        Pago a Proveedores
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona los pagos pendientes y revisa el historial</p>
                </div>

                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={printList}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual"
                />
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-700/50 p-1 mb-6 max-w-md">
                <button
                    onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                    className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-offset-2 focus:outline-none focus:ring-2 transition-all duration-200 border-0
                        ${activeTab === 'pending'
                            ? 'bg-blue-600 text-white shadow-md ring-white/60 ring-offset-blue-400'
                            : 'bg-transparent text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Clock size={16} />
                        Pendientes ({pendingOrders.length})
                    </div>
                </button>
                <button
                    onClick={() => { setActiveTab('history'); setCurrentPage(1); }}
                    className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-offset-2 focus:outline-none focus:ring-2 transition-all duration-200 border-0
                        ${activeTab === 'history'
                            ? 'bg-blue-600 text-white shadow-md ring-white/60 ring-offset-blue-400'
                            : 'bg-transparent text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600'}`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <CheckCircle size={16} />
                        Historial
                    </div>
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[400px]">
                {/* Search Bar */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={activeTab === 'pending' ? "Buscar por proveedor..." : "Buscar por proveedor, factura o recibo..."}
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 no-print">
                    Mostrando {currentFiltered.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, currentFiltered.length)} de {currentFiltered.length} registros
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="p-4">#</th>
                                    <th className="p-4">Fecha {activeTab === 'history' ? 'Pago' : 'Pedido'}</th>
                                    <th className="p-4">Proveedor</th>
                                    {activeTab === 'history' && <th className="p-4">Documento</th>}
                                    <th className="p-4 text-right">Monto</th>
                                    {activeTab === 'history' && <th className="p-4">Forma Pago</th>}
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {activeTab === 'pending' ? (
                                    filteredPending.length > 0 ? (
                                        currentItemsPending.map((pedido, index) => (
                                            <tr key={pedido.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-gray-900 dark:text-gray-200 font-medium">{indexOfFirstItem + index + 1}</td>
                                                <td className="p-4 text-gray-700 dark:text-gray-300">
                                                    {formatDate(pedido.fecha)}
                                                </td>
                                                <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">{pedido.proveedor.proveedor}</td>
                                                <td className="p-4 text-right font-bold text-gray-900 dark:text-white">
                                                    {Number(pedido.total).toFixed(2)} Bs
                                                </td>
                                                <td className="p-4 flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleViewOrder(pedido.id)}
                                                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                        title="Ver Detalle"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePay(pedido)}
                                                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                        title="Registrar Pago"
                                                    >
                                                        <DollarSign size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-12 text-center text-gray-500 dark:text-gray-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <CheckCircle size={48} className="text-green-200 dark:text-green-900" />
                                                    <p className="text-lg">¡Al día! No tienes pagos pendientes.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ) : (
                                    filteredHistory.length > 0 ? (
                                        currentItemsHistory.map((pago, index) => (
                                            <tr key={pago.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-gray-900 dark:text-gray-200 font-medium">{indexOfFirstItem + index + 1}</td>
                                                <td className="p-4 text-gray-700 dark:text-gray-300">
                                                    {formatDate(pago.fecha)}
                                                </td>
                                                <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">
                                                    {pago.material_pedido?.proveedor?.proveedor || 'N/A'}
                                                </td>
                                                <td className="p-4 text-gray-700 dark:text-gray-300">
                                                    <div className="flex flex-col text-sm">
                                                        {pago.factura && <span>F: {pago.factura}</span>}
                                                        {pago.recibo && <span>R: {pago.recibo}</span>}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right font-bold text-gray-900 dark:text-white">
                                                    {Number(pago.material_pedido?.total || 0).toFixed(2)} Bs
                                                    {pago.moneda === 'Dólares' && (
                                                        <span className="block text-xs text-green-600 font-normal">
                                                            (Pagado en USD)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-gray-700 dark:text-gray-300 text-sm">
                                                    {pago.forma_pago?.forma_pago}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {pago.imagen && (
                                                            <button
                                                                onClick={() => setPreviewImage(`${API_BASE_URL}/files/${pago.imagen}`)}
                                                                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                                title="Ver Comprobante / Factura"
                                                            >
                                                                <ImageIcon size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => pago.material_pedido && handleViewOrder(pago.material_pedido.id)}
                                                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                            title="Ver Detalle del Pedido"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center text-gray-500 dark:text-gray-400">
                                                No hay historial de pagos registrado.
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    )}
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
                {activeTab === 'pending' && filteredPending.length > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800 flex justify-end items-center">
                        <span className="text-gray-600 dark:text-gray-300 font-semibold mr-4">Total Deuda:</span>
                        <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {filteredPending.reduce((sum, p) => sum + Number(p.total), 0).toFixed(2)} Bs
                        </span>
                    </div>
                )}
            </div>

            <PagoPedidoModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onPaymentSuccess={handlePaymentSuccess}
                pedido={selectedPedidoForPayment}
            />

            <MaterialPedidoModal
                isOpen={isOrderModalOpen}
                onClose={() => setIsOrderModalOpen(false)}
                onSuccess={() => { }} // Read only, so success doesn't matter much
                orderId={selectedOrderId}
                readOnly={true}
            />

            {/* Modal de Vista Previa de Comprobante / Factura */}
            {previewImage && (
                <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setPreviewImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl p-4 border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center pb-3 mb-2 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white text-base flex items-center gap-2">
                                <ImageIcon className="text-emerald-500" size={18} />
                                Comprobante de Pago a Proveedor
                            </h3>
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-300 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-2 flex items-center justify-center max-h-[72vh] overflow-auto">
                            <img src={previewImage} alt="Comprobante" className="max-w-full max-h-[68vh] object-contain rounded-lg shadow border border-gray-100 dark:border-gray-700" />
                        </div>
                        <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-700">
                            <a
                                href={previewImage}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                            >
                                Abrir en pantalla completa
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Printable View */}
        <div className="hidden print:block font-sans text-black p-4 bg-white min-h-screen">
            <StandardPrintHeader
                title={activeTab === 'pending' ? "PAGOS PENDIENTES A PROVEEDORES" : "HISTORIAL DE PAGOS A PROVEEDORES"}
                subtitle={activeTab === 'pending' ? "Cuentas por Pagar por Compra de Materiales y Repuestos" : "Registro de Liquidaciones y Cancelación a Proveedores"}
                filtersText={searchTerm ? `Búsqueda: "${searchTerm}"` : undefined}
            />

            {activeTab === 'pending' ? (
                <table className="w-full text-left border-collapse border border-gray-400 text-xs mt-3">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-400">
                            <th className="border border-gray-300 p-1.5 text-center w-8">#</th>
                            <th className="border border-gray-300 p-1.5 text-center">N° Compra</th>
                            <th className="border border-gray-300 p-1.5 text-center">Fecha Pedido</th>
                            <th className="border border-gray-300 p-1.5">Proveedor</th>
                            <th className="border border-gray-300 p-1.5 text-right">Total (Bs)</th>
                            <th className="border border-gray-300 p-1.5 text-center">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPending.map((p, idx) => (
                            <tr key={p.id} className="border-b border-gray-200">
                                <td className="border border-gray-200 p-1.5 text-center">{idx + 1}</td>
                                <td className="border border-gray-200 p-1.5 text-center font-bold">#{p.id}</td>
                                <td className="border border-gray-200 p-1.5 text-center">{formatDate(p.fecha)}</td>
                                <td className="border border-gray-200 p-1.5 font-bold">{p.proveedor?.proveedor || '-'}</td>
                                <td className="border border-gray-200 p-1.5 text-right font-bold">Bs {Number(p.total || 0).toFixed(2)}</td>
                                <td className="border border-gray-200 p-1.5 text-center font-bold text-amber-600">PENDIENTE</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <table className="w-full text-left border-collapse border border-gray-400 text-xs mt-3">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-400">
                            <th className="border border-gray-300 p-1.5 text-center w-8">#</th>
                            <th className="border border-gray-300 p-1.5 text-center">Fecha Pago</th>
                            <th className="border border-gray-300 p-1.5">Proveedor</th>
                            <th className="border border-gray-300 p-1.5 text-center">Documento</th>
                            <th className="border border-gray-300 p-1.5 text-right">Monto (Bs)</th>
                            <th className="border border-gray-300 p-1.5 text-center">Forma Pago</th>
                            <th className="border border-gray-300 p-1.5">Usuario</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredHistory.map((p, idx) => (
                            <tr key={p.id} className="border-b border-gray-200">
                                <td className="border border-gray-200 p-1.5 text-center">{idx + 1}</td>
                                <td className="border border-gray-200 p-1.5 text-center">{formatDate(p.fecha)}</td>
                                <td className="border border-gray-200 p-1.5 font-bold">{p.material_pedido?.proveedor?.proveedor || '-'}</td>
                                <td className="border border-gray-200 p-1.5 text-center">{p.factura ? `Fact. ${p.factura}` : (p.recibo ? `Rec. ${p.recibo}` : '-')}</td>
                                <td className="border border-gray-200 p-1.5 text-right font-bold">Bs {Number(p.material_pedido?.total || 0).toFixed(2)}</td>
                                <td className="border border-gray-200 p-1.5 text-center">{p.forma_pago?.forma_pago || '-'}</td>
                                <td className="border border-gray-200 p-1.5">{p.usuario?.name || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <div className="mt-4 flex justify-between items-center text-xs border-t pt-2 border-gray-300">
                <span>Total Registros: <strong>{activeTab === 'pending' ? filteredPending.length : filteredHistory.length}</strong></span>
                <span className="font-bold">Total: Bs {activeTab === 'pending'
                    ? filteredPending.reduce((acc, p) => acc + Number(p.total || 0), 0).toFixed(2)
                    : filteredHistory.reduce((acc, p) => acc + Number(p.material_pedido?.total || 0), 0).toFixed(2)}
                </span>
            </div>

            <StandardPrintFooter />
        </div>

        <ManualModal
            isOpen={showManual}
            onClose={() => setShowManual(false)}
            title="Manual - Pago a Proveedores"
            sections={manualSections}
        />
        </>
    );
};

export default ProveedoresPagos;
