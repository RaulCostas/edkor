import { useEffect, useState } from 'react';
import { Save, ShoppingCart, Plus, Trash2, FileText, Package, DollarSign, X, CreditCard, Calendar, Calculator, Percent } from 'lucide-react';
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
        idproveedor: '', // UUID string
        fecha: new Date().toISOString().split('T')[0],
        sub_total: 0,
        descuento: 0,
        total: 0,
        observaciones: '',
        pagado: false,
        estado: 'activo'
    });

    const [detalles, setDetalles] = useState<CreateDetalleMaterialPedidoData[]>([]);
    const [defaultPorcentaje, setDefaultPorcentaje] = useState<number>(30);

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
            fecha: new Date().toISOString().split('T')[0],
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
                idproveedor: String(pedido.proveedor.id),
                fecha: pedido.fecha.split('T')[0],
                sub_total: pedido.sub_total,
                descuento: pedido.descuento,
                total: pedido.total,
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
                const sellPrice = Number(d.inventario?.precio_venta || 0);
                const pct = buyPrice > 0 && sellPrice > 0
                    ? Number((((sellPrice - buyPrice) / buyPrice) * 100).toFixed(2))
                    : defaultPorcentaje;
                return {
                    id: d.id,
                    idmaterial_pedido: d.material_pedido.id,
                    idinventario: d.inventario.id,
                    cantidad: d.cantidad,
                    precio_unitario: buyPrice,
                    porcentaje_ganancia: pct,
                    precio_venta_sugerido: sellPrice,
                    total: d.total,
                    inventarioName: d.inventario.descripcion
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
                porcentaje_ganancia: defaultPorcentaje,
                precio_venta_sugerido: 0,
                total: 0
            }
        ]);
    };

    const handleApplyDefaultPercentageToAll = (pctToApply: number) => {
        if (readOnly) return;
        setDefaultPorcentaje(pctToApply);
        if (detalles.length === 0) return;
        const updated = detalles.map((det) => {
            const buyPrice = Number(det.precio_unitario) || 0;
            const suggestedSell = buyPrice > 0
                ? Number((buyPrice * (1 + pctToApply / 100)).toFixed(2))
                : Number(det.precio_venta_sugerido || 0);
            return {
                ...det,
                porcentaje_ganancia: pctToApply,
                precio_venta_sugerido: suggestedSell
            };
        });
        setDetalles(updated);
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
                confirmButtonText: 'Sí, eliminar'
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
                const lastSellPrice = Number(item.precio_venta || 0);
                newDetalles[index].precio_unitario = lastBuyPrice;

                if (lastBuyPrice > 0 && lastSellPrice > 0) {
                    const existingPct = Number((((lastSellPrice - lastBuyPrice) / lastBuyPrice) * 100).toFixed(2));
                    newDetalles[index].porcentaje_ganancia = existingPct;
                    newDetalles[index].precio_venta_sugerido = lastSellPrice;
                } else {
                    const pct = Number(newDetalles[index].porcentaje_ganancia ?? defaultPorcentaje);
                    newDetalles[index].porcentaje_ganancia = pct;
                    newDetalles[index].precio_venta_sugerido = lastBuyPrice > 0
                        ? Number((lastBuyPrice * (1 + pct / 100)).toFixed(2))
                        : lastSellPrice;
                }

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
            const pct = Number(newDetalles[index].porcentaje_ganancia ?? defaultPorcentaje);
            newDetalles[index].precio_venta_sugerido = Number((price * (1 + pct / 100)).toFixed(2));
        }

        if (field === 'porcentaje_ganancia') {
            const price = Number(newDetalles[index].precio_unitario) || 0;
            const pct = Number(newDetalles[index].porcentaje_ganancia) || 0;
            newDetalles[index].precio_venta_sugerido = Number((price * (1 + pct / 100)).toFixed(2));
        }

        if (field === 'total') {
            const qty = Number(newDetalles[index].cantidad) || 1;
            const totalVal = Number(newDetalles[index].total) || 0;
            if (qty > 0) {
                const unitPrice = Number((totalVal / qty).toFixed(2));
                newDetalles[index].precio_unitario = unitPrice;
                const pct = Number(newDetalles[index].porcentaje_ganancia ?? defaultPorcentaje);
                newDetalles[index].precio_venta_sugerido = Number((unitPrice * (1 + pct / 100)).toFixed(2));
            }
        }

        setDetalles(newDetalles);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (readOnly) return;
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
                    cantidad: detalle.cantidad,
                    precio_unitario: detalle.precio_unitario,
                    precio_venta_sugerido: detalle.precio_venta_sugerido,
                    total: detalle.total
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <ShoppingCart className="text-blue-600" size={28} />
                        {readOnly ? 'Detalle de Compra de Material / Repuestos' : (isEditMode ? 'Editar Compra de Material / Repuestos' : 'Nueva Compra de Material / Repuestos')}
                        {orderId && <span className="text-sm font-normal text-gray-500 ml-2">#{orderId}</span>}
                    </h2>
                </div>

                <div className="overflow-y-auto p-6 flex-grow">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Header Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Proveedor *</label>
                                <div className="relative">
                                    <select
                                        value={formData.idproveedor}
                                        onChange={(e) => setFormData({ ...formData, idproveedor: e.target.value })}
                                        required
                                        disabled={readOnly}
                                        className={`w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    >
                                        <option value="" className="text-gray-500">Seleccione...</option>
                                        {proveedores.map(p => (
                                            <option key={p.id} value={p.id} className="text-gray-900 dark:text-white">
                                                {p.proveedor}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                                        <ShoppingCart size={18} />
                                    </div>
                                </div>
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
                                        className={`w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                                    />
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                                        <FileText size={18} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</label>
                            <div className="relative">
                                <textarea
                                    rows={2}
                                    value={formData.observaciones}
                                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                    disabled={readOnly}
                                    className={`w-full pl-10 pr-4 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                                />
                                <div className="absolute left-3 top-3 text-gray-400 pointer-events-none">
                                    <FileText size={18} />
                                </div>
                            </div>
                        </div>

                        {/* Details Section */}
                        <div>
                            <div className="flex flex-wrap justify-between items-center gap-3 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <ShoppingCart size={20} className="text-blue-600" />
                                    Ítems
                                </h3>
                                {!readOnly && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 px-2.5 py-1 rounded-lg text-xs">
                                            <Calculator size={14} className="text-amber-600 dark:text-amber-400" />
                                            <span className="font-semibold text-amber-800 dark:text-amber-300">Fórmula % Ganancia:</span>
                                            {[20, 25, 30, 40, 50].map((pct) => (
                                                <button
                                                    key={pct}
                                                    type="button"
                                                    onClick={() => handleApplyDefaultPercentageToAll(pct)}
                                                    className={`px-2 py-0.5 rounded font-bold transition-colors ${
                                                        defaultPorcentaje === pct
                                                            ? 'bg-amber-500 text-white shadow-sm'
                                                            : 'bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-gray-600 border border-amber-200 dark:border-gray-600'
                                                    }`}
                                                    title={`Aplicar +${pct}% a todos los ítems`}
                                                >
                                                    +{pct}%
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddDetail}
                                            className="text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-full flex items-center gap-1 transition-all transform hover:-translate-y-0.5 font-medium"
                                        >
                                            <Plus size={16} /> Agregar Ítem
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="overflow-x-auto border rounded-lg border-gray-200 dark:border-gray-700">
                                <table className="w-full min-w-[820px] text-left border-collapse">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                                        <tr>
                                            <th className="p-3 text-xs font-bold text-gray-500 uppercase">Material / Repuesto</th>
                                            <th className="p-3 text-xs font-bold text-gray-500 uppercase w-24">Cant.</th>
                                            <th className="p-3 text-xs font-bold text-gray-500 uppercase w-36">P. Compra Unit. (Bs.)</th>
                                            <th className="p-3 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase w-32">% Ganancia</th>
                                            <th className="p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase w-48">P. Venta (Bs.)</th>
                                            <th className="p-3 text-xs font-bold text-gray-500 uppercase w-32 text-right">Total Compra</th>
                                            {!readOnly && <th className="p-3 text-xs font-bold text-gray-500 uppercase w-14 text-center"></th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {detalles.map((detalle, index) => {
                                            const unitCost = Number(detalle.precio_unitario) || 0;
                                            const currentSalePrice = Number(detalle.precio_venta_sugerido ?? 0);
                                            const gananciaUnit = Number((currentSalePrice - unitCost).toFixed(2));
                                            const realPct = unitCost > 0 ? Number((((currentSalePrice - unitCost) / unitCost) * 100).toFixed(1)) : 0;

                                            return (
                                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 align-top">
                                                    <td className="p-2">
                                                        <div className="relative">
                                                            <select
                                                                value={detalle.idinventario}
                                                                onChange={(e) => handleDetailChange(index, 'idinventario', parseInt(e.target.value))}
                                                                disabled={readOnly}
                                                                className={`w-full text-sm pl-8 pr-4 py-1.5 border rounded border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none ${readOnly ? 'opacity-80' : ''}`}
                                                            >
                                                                <option value={0} className="text-gray-500">Seleccione...</option>
                                                                {inventarios.map(i => (
                                                                    <option key={i.id} value={i.id}>
                                                                        {i.codigo ? `[${i.codigo}] ` : ''}{i.descripcion} (Stock: {i.cantidad_existente})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                                                                <Package size={14} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            step="any"
                                                            min="0.01"
                                                            value={detalle.cantidad}
                                                            onChange={(e) => handleDetailChange(index, 'cantidad', parseFloat(e.target.value))}
                                                            disabled={readOnly}
                                                            className={`w-full text-sm text-right px-2 py-1.5 border rounded border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnly ? 'opacity-80' : ''}`}
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">Bs.</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={detalle.precio_unitario}
                                                                onChange={(e) => handleDetailChange(index, 'precio_unitario', parseFloat(e.target.value))}
                                                                disabled={readOnly}
                                                                className={`w-full text-sm text-right pl-7 pr-2 py-1.5 border rounded border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${readOnly ? 'opacity-80' : ''}`}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="p-2">
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                value={detalle.porcentaje_ganancia ?? defaultPorcentaje}
                                                                onChange={(e) => handleDetailChange(index, 'porcentaje_ganancia', parseFloat(e.target.value))}
                                                                disabled={readOnly}
                                                                className={`w-full text-sm text-right pl-2 pr-6 py-1.5 border rounded border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 font-semibold ${readOnly ? 'opacity-80' : ''}`}
                                                                title="Porcentaje de ganancia para calcular el precio referencial"
                                                            />
                                                            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-amber-500 text-xs font-bold pointer-events-none">
                                                                <Percent size={12} />
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-2">
                                                        <div className="space-y-1">
                                                            <div className="relative">
                                                                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-emerald-500 text-xs">Bs.</span>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={detalle.precio_venta_sugerido ?? 0}
                                                                    onChange={(e) => handleDetailChange(index, 'precio_venta_sugerido', parseFloat(e.target.value))}
                                                                    disabled={readOnly}
                                                                    className={`w-full text-sm text-right pl-7 pr-2 py-1.5 border rounded border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-semibold ${readOnly ? 'opacity-80' : ''}`}
                                                                    title="Precio de Venta final (editable: puede aumentar o rebajar)"
                                                                />
                                                            </div>
                                                            {unitCost > 0 && (
                                                                <div className="flex flex-col gap-0.5 text-[11px] leading-tight">
                                                                    <div className={`flex items-center justify-between px-1.5 ${
                                                                        gananciaUnit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                                                                    }`}>
                                                                        <span>Utilidad:</span>
                                                                        <span className="font-semibold">
                                                                            {gananciaUnit >= 0 ? '+' : ''}Bs. {gananciaUnit.toFixed(2)} ({realPct}%)
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-2 text-right font-medium text-gray-900 dark:text-white text-sm pt-3.5">
                                                        {Number(detalle.total).toFixed(2)}
                                                    </td>
                                                    {!readOnly && (
                                                        <td className="p-2 text-center pt-2.5">
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
                                            );
                                        })}
                                        {detalles.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-gray-500 text-sm italic">
                                                    No se han agregado materiales o repuestos.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end">
                            <div className="w-full md:w-1/2 lg:w-1/3 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Sub Total:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{Number(formData.sub_total).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Descuento:</span>
                                    {readOnly ? (
                                        <span className="font-medium text-gray-900 dark:text-white">{Number(formData.descuento).toFixed(2)}</span>
                                    ) : (
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.descuento}
                                            onChange={(e) => setFormData({ ...formData, descuento: parseFloat(e.target.value) || 0 })}
                                            className="w-24 text-right text-sm border rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-1"
                                        />
                                    )}
                                </div>
                                <div className="flex justify-between items-center text-lg font-bold border-t border-gray-200 dark:border-gray-600 pt-2 text-blue-600 dark:text-blue-400">
                                    <span>Total:</span>
                                    <span>{Number(formData.total).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Info Section */}
                        {pagoInfo && (
                            <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 rounded-lg p-4 animate-fade-in">
                                <h3 className="text-md font-bold text-green-700 dark:text-green-400 flex items-center gap-2 mb-3">
                                    <DollarSign size={18} />
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
                                            {/* Assuming usuario has nombre or username */}
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
