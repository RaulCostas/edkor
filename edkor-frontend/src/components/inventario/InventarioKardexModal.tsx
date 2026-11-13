import React, { useState, useEffect } from 'react';
import { X, Layers, ShoppingBag, Wrench, Clock, AlertTriangle, CheckCircle, ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronRight, Package, DollarSign } from 'lucide-react';
import { getKardexInventario } from '../../services/inventarioService';
import type { Inventario } from '../../types/inventario';

interface InventarioKardexModalProps {
    inventario: Inventario;
    onClose: () => void;
}

export const InventarioKardexModal: React.FC<InventarioKardexModalProps> = ({ inventario, onClose }) => {
    const [activeTab, setActiveTab] = useState<'lotes' | 'consumos' | 'kardex'>('lotes');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedLoteId, setExpandedLoteId] = useState<number | null>(null);

    const unidad = inventario.unidad_medida?.medida || 'Unidades';

    useEffect(() => {
        const fetchKardex = async () => {
            try {
                setLoading(true);
                const res = await getKardexInventario(inventario.id);
                setData(res);
            } catch (err: any) {
                console.error('Error fetching kardex:', err);
                setError('No se pudo cargar la información de trazabilidad y kardex');
            } finally {
                setLoading(false);
            }
        };
        fetchKardex();
    }, [inventario.id]);

    const item = data?.item || inventario;
    const stockInicial = Number(item.stock_inicial ?? item.cantidad_existente ?? 0);
    const entradas = Number(item.entradas ?? 0);
    const salidas = Number(item.salidas ?? 0);
    const stockActual = Number(item.cantidad_existente ?? 0);
    const stockMinimo = Number(item.stock_minimo ?? 0);
    const isBajoStock = stockActual <= stockMinimo;

    const toggleExpandLote = (id: number) => {
        setExpandedLoteId(prev => prev === id ? null : id);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-gray-100 dark:border-gray-700 overflow-hidden transform transition-all animate-fadeIn">
                
                {/* HEADER */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/80 flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl">
                                <Layers className="w-5 h-5" />
                            </span>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                                        {item.descripcion}
                                    </h2>
                                    {item.codigo && (
                                        <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                                            {item.codigo}
                                        </span>
                                    )}
                                    <span className="text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2.5 py-0.5 rounded-full font-medium">
                                        Medida: {unidad}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Trazabilidad por Lotes (PEPS / FIFO) y Movimientos en Órdenes de Trabajo
                                </p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* KPI SUMMARY CARDS */}
                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Stock Inicial</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-bold text-gray-800 dark:text-gray-200">{stockInicial.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">{unidad}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block flex items-center gap-1">
                            <ArrowDownLeft className="w-3.5 h-3.5" /> Entradas (+)
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">+{entradas.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">{unidad}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider block flex items-center gap-1">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Salidas (-)
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-bold text-orange-600 dark:text-orange-400">-{salidas.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">{unidad}</span>
                        </div>
                    </div>

                    <div className={`bg-white dark:bg-gray-800 p-3 rounded-xl border shadow-sm ${isBajoStock ? 'border-red-400 dark:border-red-600 ring-1 ring-red-400' : 'border-blue-400 dark:border-blue-600'}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Stock Actual</span>
                            {isBajoStock && <AlertTriangle className="w-4 h-4 text-red-500" title="Bajo Stock Mínimo" />}
                        </div>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className={`text-xl font-black ${isBajoStock ? 'text-red-600 dark:text-red-400' : 'text-blue-700 dark:text-blue-300'}`}>
                                {stockActual.toLocaleString()}
                            </span>
                            <span className="text-xs font-semibold text-gray-500">{unidad}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Stock Mínimo</span>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xl font-bold text-gray-600 dark:text-gray-300">{stockMinimo.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">{unidad}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">Precios / {unidad}</span>
                        <div className="mt-1 text-xs">
                            <div className="text-gray-600 dark:text-gray-400">
                                Compra: <span className="font-semibold text-gray-800 dark:text-gray-200">Bs. {Number(item.precio_compra || 0).toFixed(2)}</span>
                            </div>
                            <div className="text-emerald-600 dark:text-emerald-400 font-bold">
                                Venta: <span>Bs. {Number(item.precio_venta || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 px-5 bg-white dark:bg-gray-800">
                    <button
                        onClick={() => setActiveTab('lotes')}
                        className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
                            activeTab === 'lotes'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        <ShoppingBag className="w-4 h-4" />
                        Lotes de Compra / Turriles ({data?.lotes?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('consumos')}
                        className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
                            activeTab === 'consumos'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        <Wrench className="w-4 h-4" />
                        Consumos en Órdenes de Trabajo ({data?.salidasOrdenes?.length || 0})
                    </button>
                    <button
                        onClick={() => setActiveTab('kardex')}
                        className={`py-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition-all ${
                            activeTab === 'kardex'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                        }`}
                    >
                        <Clock className="w-4 h-4" />
                        Historial Kardex Integral ({data?.movimientos?.length || 0})
                    </button>
                </div>

                {/* BODY / TABS CONTENT */}
                <div className="flex-1 overflow-y-auto p-5 bg-gray-50/30 dark:bg-gray-900/20">
                    {loading ? (
                        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                            <p>Cargando trazabilidad por lotes...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 bg-red-100 text-red-700 rounded-xl text-center">
                            {error}
                        </div>
                    ) : (
                        <>
                            {/* TAB 1: LOTES DE COMPRA */}
                            {activeTab === 'lotes' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900">
                                        <span>
                                            💡 <strong>Método PEPS / FIFO:</strong> Las órdenes de trabajo descuentan primero del lote o turril activo más antiguo que aún tenga saldo disponible.
                                        </span>
                                    </div>

                                    {(!data?.lotes || data.lotes.length === 0) ? (
                                        <div className="text-center py-12 text-gray-400">
                                            No hay lotes registrados para este ítem.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {data.lotes.map((lote: any, idx: number) => {
                                                const inicial = Number(lote.cantidad_inicial || 0);
                                                const disponible = Number(lote.cantidad_disponible || 0);
                                                const consumido = Math.max(0, inicial - disponible);
                                                const pctDisponible = inicial > 0 ? (disponible / inicial) * 100 : 0;
                                                const isAgotado = lote.estado === 'agotado' || disponible <= 0.0001;
                                                const isExpanded = expandedLoteId === lote.id;
                                                const numConsumos = lote.consumos ? lote.consumos.length : 0;

                                                return (
                                                    <div
                                                        key={lote.id}
                                                        className={`bg-white dark:bg-gray-800 rounded-xl border transition-all ${
                                                            isAgotado
                                                                ? 'border-gray-200 dark:border-gray-700 opacity-80'
                                                                : 'border-blue-200 dark:border-blue-900/60 shadow-sm'
                                                        }`}
                                                    >
                                                        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                                        isAgotado
                                                                            ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                                                    }`}>
                                                                        {isAgotado ? 'Agotado' : 'Activo (En uso)'}
                                                                    </span>
                                                                    <h3 className="font-bold text-gray-800 dark:text-white text-base">
                                                                        {lote.nro_lote || `LOTE #${lote.id}`}
                                                                    </h3>
                                                                    <span className="text-xs text-gray-500 font-mono">
                                                                        Ingreso: {formatDate(lote.fecha_ingreso)}
                                                                    </span>
                                                                </div>

                                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 text-xs text-gray-600 dark:text-gray-300">
                                                                    {lote.proveedor_nombre && (
                                                                        <div>
                                                                            <span className="text-gray-400">Proveedor:</span>{' '}
                                                                            <span className="font-semibold">{lote.proveedor_nombre}</span>
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <span className="text-gray-400">Costo Compra Unit:</span>{' '}
                                                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                                            Bs. {Number(lote.costo_unitario || 0).toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-gray-400">P. Venta Sugerido:</span>{' '}
                                                                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                                            Bs. {Number(lote.precio_venta_sugerido || 0).toFixed(2)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* STOCK RESTANTE Y BARRA DE PROGRESO */}
                                                            <div className="w-full md:w-64 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                                                <div className="flex justify-between items-baseline mb-1">
                                                                    <span className="text-xs text-gray-500">Saldo Restante:</span>
                                                                    <div className="text-right">
                                                                        <span className={`text-base font-black ${isAgotado ? 'text-gray-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                                                            {disponible.toFixed(2)}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500 ml-1">/ {inicial.toFixed(2)} {unidad}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full transition-all duration-500 ${
                                                                            isAgotado
                                                                                ? 'bg-gray-400'
                                                                                : pctDisponible > 40
                                                                                ? 'bg-emerald-500'
                                                                                : 'bg-amber-500'
                                                                        }`}
                                                                        style={{ width: `${Math.min(100, Math.max(0, pctDisponible))}%` }}
                                                                    ></div>
                                                                </div>

                                                                <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                                                                    <span>Consumido: {consumido.toFixed(2)} {unidad}</span>
                                                                    <span>{pctDisponible.toFixed(0)}% disp.</span>
                                                                </div>
                                                            </div>

                                                            {/* BOTÓN DESPLEGABLE CONSUMOS */}
                                                            <div>
                                                                <button
                                                                    onClick={() => toggleExpandLote(lote.id)}
                                                                    className={`w-full md:w-auto px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                                                                        isExpanded
                                                                            ? 'bg-blue-600 text-white'
                                                                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                                                                    }`}
                                                                >
                                                                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                                    <span>{numConsumos} Consumos en OT</span>
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* ACORDEON DETALLE CONSUMOS DE ESTE LOTE */}
                                                        {isExpanded && (
                                                            <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50/70 dark:bg-gray-900/40 rounded-b-xl">
                                                                <h4 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                                    <Wrench className="w-3.5 h-3.5 text-blue-500" />
                                                                    Órdenes de Trabajo que consumieron de este turril/lote:
                                                                </h4>

                                                                {numConsumos === 0 ? (
                                                                    <p className="text-xs text-gray-400 italic py-2">
                                                                        No se han registrado consumos en órdenes de trabajo para este lote todavía.
                                                                    </p>
                                                                ) : (
                                                                    <div className="overflow-x-auto">
                                                                        <table className="w-full text-left text-xs">
                                                                            <thead>
                                                                                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 font-semibold">
                                                                                    <th className="py-2 px-2">Fecha</th>
                                                                                    <th className="py-2 px-2">N° Orden</th>
                                                                                    <th className="py-2 px-2">Placa / Vehículo</th>
                                                                                    <th className="py-2 px-2">Cliente</th>
                                                                                    <th className="py-2 px-2 text-right">Cant. Descontada</th>
                                                                                    <th className="py-2 px-2 text-right">P. Venta Cobrado</th>
                                                                                    <th className="py-2 px-2 text-right">Subtotal</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                                                {lote.consumos.map((c: any) => {
                                                                                    const cant = Number(c.cantidad || 0);
                                                                                    const pVenta = Number(c.precio_venta_unitario || item.precio_venta || 0);
                                                                                    return (
                                                                                        <tr key={c.id} className="hover:bg-white dark:hover:bg-gray-800/80">
                                                                                            <td className="py-2 px-2 text-gray-500">{formatDate(c.fecha)}</td>
                                                                                            <td className="py-2 px-2 font-bold text-blue-600 dark:text-blue-400">
                                                                                                #{String(c.idorden_trabajo || c.orden_id).padStart(6, '0')}
                                                                                            </td>
                                                                                            <td className="py-2 px-2">
                                                                                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                                                                    {c.vehiculo_placa || '-'}
                                                                                                </span>
                                                                                                {c.vehiculo_modelo && (
                                                                                                    <span className="text-gray-400 ml-1">({c.vehiculo_modelo})</span>
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="py-2 px-2 text-gray-700 dark:text-gray-300">
                                                                                                {c.cliente_nombre || '-'}
                                                                                            </td>
                                                                                            <td className="py-2 px-2 text-right font-bold text-orange-600 dark:text-orange-400">
                                                                                                {cant.toFixed(2)} {unidad}
                                                                                            </td>
                                                                                            <td className="py-2 px-2 text-right text-gray-600 dark:text-gray-300">
                                                                                                Bs. {pVenta.toFixed(2)}
                                                                                            </td>
                                                                                            <td className="py-2 px-2 text-right font-bold text-gray-900 dark:text-gray-100">
                                                                                                Bs. {(cant * pVenta).toFixed(2)}
                                                                                            </td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: CONSUMOS EN ÓRDENES DE TRABAJO */}
                            {activeTab === 'consumos' && (
                                <div>
                                    {(!data?.salidasOrdenes || data.salidasOrdenes.length === 0) ? (
                                        <div className="text-center py-12 text-gray-400">
                                            No se han registrado consumos de este producto en ninguna orden de trabajo.
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider">
                                                            <th className="py-3 px-3">Fecha y Hora</th>
                                                            <th className="py-3 px-3">N° Orden</th>
                                                            <th className="py-3 px-3">Placa</th>
                                                            <th className="py-3 px-3">Cliente</th>
                                                            <th className="py-3 px-3">Lote Origen</th>
                                                            <th className="py-3 px-3 text-right">Cantidad ({unidad})</th>
                                                            <th className="py-3 px-3 text-right">P. Venta Cobrado</th>
                                                            <th className="py-3 px-3 text-right">Total Cobrado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {data.salidasOrdenes.map((s: any) => {
                                                            const cant = Number(s.cantidad || 0);
                                                            const pVenta = Number(s.precio_venta_unitario || item.precio_venta || 0);
                                                            return (
                                                                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                                    <td className="py-3 px-3 text-gray-500">{formatDate(s.fecha)}</td>
                                                                    <td className="py-3 px-3 font-bold text-blue-600 dark:text-blue-400">
                                                                        #{String(s.idorden_trabajo || s.orden_id).padStart(6, '0')}
                                                                    </td>
                                                                    <td className="py-3 px-3 font-semibold text-gray-800 dark:text-gray-200">
                                                                        {s.vehiculo_placa || '-'}
                                                                    </td>
                                                                    <td className="py-3 px-3 text-gray-700 dark:text-gray-300">
                                                                        {s.cliente_nombre || '-'}
                                                                    </td>
                                                                    <td className="py-3 px-3">
                                                                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded font-mono text-[11px]">
                                                                            {s.nro_lote || (s.idlote ? `Lote #${s.idlote}` : 'Sin lote')}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 px-3 text-right font-black text-orange-600 dark:text-orange-400">
                                                                        {cant.toFixed(2)}
                                                                    </td>
                                                                    <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-300">
                                                                        Bs. {pVenta.toFixed(2)}
                                                                    </td>
                                                                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                                                        Bs. {(cant * pVenta).toFixed(2)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: KARDEX INTEGRAL */}
                            {activeTab === 'kardex' && (
                                <div>
                                    {(!data?.movimientos || data.movimientos.length === 0) ? (
                                        <div className="text-center py-12 text-gray-400">
                                            No hay movimientos registrados en el Kardex.
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead>
                                                        <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold uppercase tracking-wider">
                                                            <th className="py-3 px-3">Fecha</th>
                                                            <th className="py-3 px-3">Tipo de Movimiento</th>
                                                            <th className="py-3 px-3">Lote</th>
                                                            <th className="py-3 px-3 text-right">Cantidad</th>
                                                            <th className="py-3 px-3 text-right">Costo Unit.</th>
                                                            <th className="py-3 px-3 text-right">P. Venta</th>
                                                            <th className="py-3 px-3 text-right">Saldo Resultante</th>
                                                            <th className="py-3 px-3">Detalle / Orden</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {data.movimientos.map((m: any) => {
                                                            const isEntrada = m.tipo_movimiento.startsWith('ENTRADA') || m.tipo_movimiento.includes('POSITIVO') || m.tipo_movimiento.includes('DEVOLUCION');
                                                            const cant = Number(m.cantidad || 0);

                                                            return (
                                                                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                                                                    <td className="py-3 px-3 text-gray-500">{formatDate(m.fecha)}</td>
                                                                    <td className="py-3 px-3">
                                                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                                                            m.tipo_movimiento === 'ENTRADA_COMPRA'
                                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                                                : m.tipo_movimiento === 'ENTRADA_INICIAL'
                                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                                                                : m.tipo_movimiento === 'DEVOLUCION_ORDEN'
                                                                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                                                                : 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                                                                        }`}>
                                                                            {m.tipo_movimiento}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3 px-3 font-mono text-gray-600 dark:text-gray-400">
                                                                        {m.nro_lote || (m.idlote ? `#${m.idlote}` : '-')}
                                                                    </td>
                                                                    <td className={`py-3 px-3 text-right font-black ${isEntrada ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                                                        {isEntrada ? `+${cant.toFixed(2)}` : `-${cant.toFixed(2)}`}
                                                                    </td>
                                                                    <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-300">
                                                                        Bs. {Number(m.costo_unitario || 0).toFixed(2)}
                                                                    </td>
                                                                    <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-300">
                                                                        Bs. {Number(m.precio_venta_unitario || 0).toFixed(2)}
                                                                    </td>
                                                                    <td className="py-3 px-3 text-right font-bold text-gray-900 dark:text-gray-100">
                                                                        {m.saldo_stock_resultante !== null && m.saldo_stock_resultante !== undefined ? `${Number(m.saldo_stock_resultante).toFixed(2)} ${unidad}` : '-'}
                                                                    </td>
                                                                    <td className="py-3 px-3 text-gray-600 dark:text-gray-300">
                                                                        {m.observaciones || (m.idorden_trabajo ? `Orden #${m.idorden_trabajo} (${m.vehiculo_placa || ''})` : '-')}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
                    >
                        Cerrar Trazabilidad
                    </button>
                </div>
            </div>
        </div>
    );
};
