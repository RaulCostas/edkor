import { useEffect, useState } from 'react';
import { Save, ShoppingCart, Plus, Trash2, FileText, X, CreditCard, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';
import type { CreateMaterialPedidoData, CreateDetalleMaterialPedidoData } from '../types/materialPedido';
import type { Proveedor } from '../types/proveedor';
import type { Inventario } from '../types/inventario';
import { getProveedores } from '../services/proveedorService';
import { getInventarios } from '../services/inventarioService';
import { createMaterialPedido, updateMaterialPedido, getMaterialPedido } from '../services/materialPedidoService';
import { createDetalleMaterialPedido, updateDetalleMaterialPedido, getDetallesByPedido, deleteDetalleMaterialPedido } from '../services/detalleMaterialPedidoService';
import { getPagoByPedido } from '../services/pagoPedidoService';
import { useAuth } from '../context/AuthContext';
import SearchableSelect from '../components/common/SearchableSelect';
import { getLocalDateString } from '../utils/dateUtils';

interface MaterialPedidoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    orderId: number | null; // null for new
    readOnly?: boolean;
}

const MaterialPedidoModal = ({ isOpen, onClose, onSuccess, orderId, readOnly = false }: MaterialPedidoModalProps) => {
    const isEditMode = !!orderId;
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [inventarios, setInventarios] = useState<Inventario[]>([]);
    const [pagoInfo, setPagoInfo] = useState<any>(null);

    const [formData, setFormData] = useState<CreateMaterialPedidoData>({
        idproveedor: '', // UUID string or ID
        fecha: getLocalDateString(new Date()),
        sub_total: 0,
        descuento: 0,
        total: 0,
        observaciones: '',
        pagado: false,
        estado: 'activo'
    });

    const [detalles, setDetalles] = useState<CreateDetalleMaterialPedidoData[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadCatalogs();
            if (orderId) {
                loadPedido(orderId);
            } else {
                resetForm();
            }
        }
    }, [isOpen, orderId]);

    useEffect(() => {
        calculateTotals();
    }, [detalles, formData.descuento]);

    const resetForm = () => {
        setFormData({
            idproveedor: '',
            fecha: getLocalDateString(new Date()),
            sub_total: 0,
            descuento: 0,
            total: 0,
            observaciones: '',
            pagado: false,
            estado: 'activo'
        });
        setDetalles([]);
        setPagoInfo(null);
    };

    const loadCatalogs = async () => {
        try {
            const [provData, invData] = await Promise.all([
                getProveedores(),
                getInventarios()
            ]);
            setProveedores(provData.filter((p: Proveedor) => p.estado === 'activo'));
            setInventarios(invData.filter((i: Inventario) => i.estado === 'activo'));
        } catch (error) {
            console.error(error);
        }
    };

    const loadPedido = async (pedidoId: number) => {
        try {
            const pedido = await getMaterialPedido(pedidoId);
            setFormData({
                idproveedor: String(pedido.proveedor?.id || ''),
                fecha: pedido.fecha ? getLocalDateString(pedido.fecha) : getLocalDateString(new Date()),
                sub_total: Number(pedido.sub_total || 0),
                descuento: Number(pedido.descuento || 0),
                total: Number(pedido.total || 0),
                observaciones: pedido.observaciones || '',
                pagado: pedido.pagado,
                estado: pedido.estado
            });

            if (pedido.pagado) {
                try {
                    const pago = await getPagoByPedido(pedidoId);
                    setPagoInfo(pago);
                } catch (pagoError) {
                    console.error('Error fetching pago info:', pagoError);
                    setPagoInfo(null);
                }
            } else {
                setPagoInfo(null);
            }

            const serverDetalles = await getDetallesByPedido(pedidoId);
            const mappedDetalles = serverDetalles.map((d: any) => {
                const buyPrice = Number(d.precio_unitario || 0);
                return {
                    id: d.id,
                    idmaterial_pedido: d.material_pedido?.id || d.idmaterial_pedido,
                    idinventario: d.inventario?.id || d.idinventario,
                    cantidad: Number(d.cantidad || 0),
                    precio_unitario: buyPrice,
                    total: Number(d.total || 0),
                    inventarioName: d.inventario?.descripcion
                };
            });

            setDetalles(mappedDetalles);
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo cargar la compra', 'error');
        }
    };

    const calculateTotals = () => {
        const subTotal = detalles.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
        const total = subTotal - (Number(formData.descuento) || 0);
        setFormData(prev => ({
            ...prev,
            sub_total: subTotal,
            total: Math.max(0, total)
        }));
    };

    const handleAddDetail = () => {
        if (readOnly) return;
        setDetalles([
            ...detalles,
            {
                idmaterial_pedido: 0,
                idinventario: 0,
                cantidad: 1,
                precio_unitario: 0,
                total: 0
            }
        ]);
    };

    const handleRemoveDetail = async (index: number) => {
        if (readOnly) return;
        const detalle = detalles[index] as any;
        if (detalle.id && isEditMode) {
            const result = await Swal.fire({
                title: '¿Eliminar ítem?',
                text: 'Se eliminará inmediatamente de la base de datos y se descontará del stock',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });
            if (result.isConfirmed) {
                try {
                    await deleteDetalleMaterialPedido(detalle.id);
                    const newDetalles = [...detalles];
                    newDetalles.splice(index, 1);
                    setDetalles(newDetalles);
                } catch (e) {
                    Swal.fire('Error', 'No se pudo eliminar el detalle', 'error');
                }
            }
        } else {
            const newDetalles = [...detalles];
            newDetalles.splice(index, 1);
            setDetalles(newDetalles);
        }
    };

    const handleDetailChange = (index: number, field: keyof CreateDetalleMaterialPedidoData, value: number) => {
        if (readOnly) return;
        const newDetalles = [...detalles] as any[];
        const safeValue = isNaN(value) ? 0 : value;
        newDetalles[index][field] = safeValue;

        if (field === 'idinventario') {
            const item = inventarios.find(i => i.id === safeValue);
            if (item) {
                newDetalles[index].inventarioName = item.descripcion;
                const lastBuyPrice = Number(item.precio_compra || 0);
                newDetalles[index].precio_unitario = lastBuyPrice;
                const qty = Number(newDetalles[index].cantidad) || 1;
                newDetalles[index].total = Number((qty * lastBuyPrice).toFixed(2));
            }
        }

        if (field === 'cantidad') {
            const qty = Number(newDetalles[index].cantidad) || 0;
            const price = Number(newDetalles[index].precio_unitario) || 0;
            newDetalles[index].total = Number((qty * price).toFixed(2));
        }

        if (field === 'precio_unitario') {
            const qty = Number(newDetalles[index].cantidad) || 0;
            const price = Number(newDetalles[index].precio_unitario) || 0;
            newDetalles[index].total = Number((qty * price).toFixed(2));
        }

        if (field === 'total') {
            const qty = Number(newDetalles[index].cantidad) || 1;
            const totalVal = Number(newDetalles[index].total) || 0;
            if (qty > 0) {
                const unitPrice = Number((totalVal / qty).toFixed(2));
                newDetalles[index].precio_unitario = unitPrice;
            }
        }

        setDetalles(newDetalles);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) return;

        if (!formData.idproveedor) {
            Swal.fire('Atención', 'Por favor seleccione un proveedor', 'warning');
            return;
        }

        if (detalles.length === 0) {
            Swal.fire('Atención', 'Debe agregar al menos un ítem al pedido', 'warning');
            return;
        }

        const invalidItem = detalles.find(d => !d.idinventario || Number(d.cantidad) <= 0);
        if (invalidItem) {
            Swal.fire('Atención', 'Todos los ítems deben tener un material seleccionado y cantidad mayor a cero', 'warning');
            return;
        }

        setLoading(true);

        try {
            let pedidoId = orderId ? orderId : 0;
            const orderPayload = {
                ...formData,
                idusuario: user?.id
            };

            if (isEditMode) {
                await updateMaterialPedido(pedidoId, orderPayload);
            } else {
                const newPedido = await createMaterialPedido(orderPayload);
                pedidoId = newPedido.id;
            }

            for (const detalle of detalles as any[]) {
                const payload: CreateDetalleMaterialPedidoData = {
                    idmaterial_pedido: pedidoId,
                    idinventario: detalle.idinventario,
                    cantidad: Number(detalle.cantidad),
                    precio_unitario: Number(detalle.precio_unitario),
                    total: Number(detalle.total)
                };

                if (!detalle.id) {
                    await createDetalleMaterialPedido(payload);
                } else {
                    await updateDetalleMaterialPedido(detalle.id, payload);
                }
            }

            Swal.fire({
                icon: 'success',
                title: 'Guardado',
                text: 'Compra guardada e inventario actualizado exitosamente',
                timer: 1500,
                showConfirmButton: false
            });
            onSuccess();
            onClose();

        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Error al guardar la compra', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col animate-fade-in-up">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <ShoppingCart className="text-blue-600" size={28} />
                        {readOnly ? 'Detalle de Compra de Material / Repuestos' : (isEditMode ? 'Editar Compra de Material / Repuestos' : 'Nueva Compra de Material / Repuestos')}
                        {orderId && <span className="text-sm font-normal text-gray-500 ml-2">#{orderId}</span>}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg transition-colors"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6 flex-grow">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Header Fields: Proveedor & Fecha */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Proveedor *</label>
                                <SearchableSelect
                                    value={formData.idproveedor}
                                    onChange={(val) => setFormData({ ...formData, idproveedor: String(val || '') })}
                                    placeholder="Seleccione proveedor..."
                                    searchPlaceholder="Buscar proveedor por nombre..."
                                    disabled={readOnly}
                                    required
                                    options={proveedores.map(p => ({
                                        value: String(p.id),
                                        label: p.proveedor,
                                        sublabel: p.contacto ? `Contacto: ${p.contacto}` : undefined
                                    }))}
                                    icon={<ShoppingCart size={18} className="text-gray-400" />}
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Fecha *</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.fecha}
                                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                        required
                                        disabled={readOnly}
                                        className={`w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    />
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                                        <Calendar size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Details Section */}
                        <div>
                            <div className="flex justify-between items-center mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <ShoppingCart size={20} className="text-blue-600" />
                                    Ítems
                                </h3>
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={handleAddDetail}
                                        className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all transform hover:-translate-y-0.5 font-medium shadow-sm"
                                    >
                                        <Plus size={16} /> Agregar Ítem
                                    </button>
                                )}
                            </div>

                            <div className="overflow-x-auto min-h-[220px] border rounded-lg border-gray-200 dark:border-gray-700">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Material / Repuesto</th>
                                            <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase w-28">Cant.</th>
                                            <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase w-36">P. Compra Unit. (Bs.)</th>
                                            <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase w-36 text-right">Total Compra</th>
                                            {!readOnly && <th className="p-3 text-xs font-bold text-gray-500 uppercase w-14 text-center"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {detalles.map((detalle, index) => (
                                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 align-top">
                                                <td className="p-2 min-w-[280px]">
                                                    <SearchableSelect
                                                        value={detalle.idinventario || ''}
                                                        onChange={(val) => handleDetailChange(index, 'idinventario', parseInt(val) || 0)}
                                                        placeholder="Seleccione material o repuesto..."
                                                        searchPlaceholder="Buscar por código o descripción..."
                                                        disabled={readOnly}
                                                        options={inventarios.map(i => ({
                                                            value: i.id,
                                                            label: `${i.codigo ? `[${i.codigo}] ` : ''}${i.descripcion}`,
                                                            sublabel: `Stock: ${i.cantidad_existente}`
                                                        }))}
                                                        className="w-full text-sm"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0.01"
                                                        value={detalle.cantidad}
                                                        onChange={(e) => handleDetailChange(index, 'cantidad', parseFloat(e.target.value))}
                                                        disabled={readOnly}
                                                        className={`w-full text-sm text-right px-2.5 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnly ? 'opacity-80' : ''}`}
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">Bs.</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={detalle.precio_unitario}
                                                            onChange={(e) => handleDetailChange(index, 'precio_unitario', parseFloat(e.target.value))}
                                                            disabled={readOnly}
                                                            className={`w-full text-sm text-right pl-8 pr-2.5 py-2 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnly ? 'opacity-80' : ''}`}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-2 text-right font-semibold text-gray-900 dark:text-white text-sm pt-4">
                                                    Bs. {Number(detalle.total).toFixed(2)}
                                                </td>
                                                {!readOnly && (
                                                    <td className="p-2 text-center pt-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveDetail(index)}
                                                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {detalles.length === 0 && (
                                            <tr>
                                                <td colSpan={readOnly ? 4 : 5} className="p-8 text-center text-gray-500 text-sm italic">
                                                    No se han agregado materiales o repuestos.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Bottom Section: Observaciones on the left, Totals on the right */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                            {/* Observaciones a la izquierda */}
                            <div className="md:col-span-7">
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Observaciones
                                </label>
                                <div className="relative">
                                    <textarea
                                        rows={4}
                                        value={formData.observaciones}
                                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                        disabled={readOnly}
                                        placeholder="Notas adicionales, número de factura o detalle del pedido..."
                                        className={`w-full pl-10 pr-4 p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    />
                                    <div className="absolute left-3 top-3 text-gray-400 pointer-events-none">
                                        <FileText size={18} />
                                    </div>
                                </div>
                            </div>

                            {/* Totales a la derecha */}
                            <div className="md:col-span-5 flex flex-col justify-end">
                                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2.5">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Sub Total:</span>
                                        <span className="font-semibold text-gray-900 dark:text-white">Bs. {Number(formData.sub_total).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">Descuento:</span>
                                        {readOnly ? (
                                            <span className="font-semibold text-gray-900 dark:text-white">Bs. {Number(formData.descuento).toFixed(2)}</span>
                                        ) : (
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">Bs.</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={formData.descuento}
                                                    onChange={(e) => setFormData({ ...formData, descuento: parseFloat(e.target.value) || 0 })}
                                                    className="w-28 text-right text-sm pl-7 pr-2.5 py-1.5 border rounded-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center text-lg font-bold border-t border-gray-200 dark:border-gray-600 pt-2 text-blue-600 dark:text-blue-400">
                                        <span>Total:</span>
                                        <span>Bs. {Number(formData.total).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Info Section */}
                        {pagoInfo && (
                            <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 rounded-lg p-4 animate-fade-in">
                                <h3 className="text-md font-bold text-green-700 dark:text-green-400 flex items-center gap-2 mb-3">
                                    <CreditCard size={18} />
                                    Detalle del Pago
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <label className="block text-gray-500 dark:text-gray-400 text-xs">Fecha Pago</label>
                                        <span className="font-medium text-gray-800 dark:text-white flex items-center gap-1">
                                            <Calendar size={12} />
                                            {pagoInfo.fecha ? new Date(pagoInfo.fecha).toLocaleDateString() : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 dark:text-gray-400 text-xs">Forma Pago</label>
                                        <span className="font-medium text-gray-800 dark:text-white flex items-center gap-1">
                                            <CreditCard size={12} />
                                            {pagoInfo.forma_pago?.forma_pago || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 dark:text-gray-400 text-xs">Factura / Recibo</label>
                                        <span className="font-medium text-gray-800 dark:text-white flex items-center gap-1">
                                            <FileText size={12} />
                                            {pagoInfo.factura || '-'}/{pagoInfo.recibo || '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-gray-500 dark:text-gray-400 text-xs">Pagado Por</label>
                                        <span className="font-medium text-gray-800 dark:text-white">
                                            {pagoInfo.usuario?.name || 'Usuario'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={onClose}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2"
                            >
                                <X size={18} />
                                {readOnly ? 'Cerrar' : 'Cancelar'}
                            </button>
                            {!readOnly && (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5"
                                >
                                    <Save size={18} />
                                    {loading ? 'Guardando...' : 'Guardar Pedido'}
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MaterialPedidoModal;
