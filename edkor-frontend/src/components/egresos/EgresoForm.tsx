import React, { useState, useEffect, useMemo } from 'react';
import { Save, X, Calendar, FileText, DollarSign, CreditCard, Upload, Trash2, ExternalLink, RefreshCw, Wrench, CheckCircle2, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { createEgreso, updateEgreso, getOrdenesPendientesEgreso, type OrdenPendienteEgreso } from '../../services/egresosService';
import { getFormasPago } from '../../services/formaPagoService';
import { uploadFile } from '../../services/fileService';
import { API_BASE_URL } from '../../config';
import type { FormaPago } from '../../types/formaPago';
import type { CreateEgresoData, Egreso } from '../../types/egreso';

interface EgresoFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    egreso?: Egreso | null;
    initialOrdenId?: number | null;
}

const EgresoForm: React.FC<EgresoFormProps> = ({ isOpen, onClose, onSuccess, egreso, initialOrdenId }) => {
    const isEditMode = !!egreso;

    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [detalle, setDetalle] = useState('');
    const [monto, setMonto] = useState('');
    const [moneda, setMoneda] = useState('Bolivianos');
    const [formaPagoId, setFormaPagoId] = useState('');
    const [idordenTrabajo, setIdordenTrabajo] = useState<string>('');
    const [imagen, setImagen] = useState('');
    const [uploadingImg, setUploadingImg] = useState(false);

    const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
    const [ordenesPendientes, setOrdenesPendientes] = useState<OrdenPendienteEgreso[]>([]);
    const [mostrarTodasLasOrdenes, setMostrarTodasLasOrdenes] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchFormasPago();
            fetchOrdenes();
            if (egreso) {
                setFecha(new Date(egreso.fecha).toISOString().split('T')[0]);
                setDetalle(egreso.detalle);
                setMonto(egreso.monto.toString());
                setMoneda(egreso.moneda);
                setFormaPagoId(egreso.formaPago?.id ? egreso.formaPago.id.toString() : (egreso.forma_pago_id || ''));
                setIdordenTrabajo(egreso.idorden_trabajo ? String(egreso.idorden_trabajo) : (egreso.ordenTrabajo?.id ? String(egreso.ordenTrabajo.id) : ''));
                setImagen(egreso.imagen || '');
            } else {
                // Reset form for new entry
                setFecha(new Date().toISOString().split('T')[0]);
                setDetalle('');
                setMonto('');
                setMoneda('Bolivianos');
                setFormaPagoId('');
                setIdordenTrabajo(initialOrdenId ? String(initialOrdenId) : '');
                setImagen('');
                setMostrarTodasLasOrdenes(false);
            }
        }
    }, [isOpen, egreso, initialOrdenId]);

    const fetchFormasPago = async () => {
        try {
            const data = await getFormasPago();
            setFormasPago(data.filter(f => f.estado === 'activo'));
        } catch (error) {
            console.error('Error fetching formas pago:', error);
        }
    };

    const fetchOrdenes = async () => {
        try {
            const data = await getOrdenesPendientesEgreso(true);
            setOrdenesPendientes(data);
        } catch (error) {
            console.error('Error fetching ordenes pendientes:', error);
        }
    };

    // Auto-completar cuando se pasa initialOrdenId
    useEffect(() => {
        if (initialOrdenId && ordenesPendientes.length > 0 && !egreso) {
            handleSelectOrden(String(initialOrdenId));
        }
    }, [initialOrdenId, ordenesPendientes]);

    // Filtrar órdenes: por defecto solo aquellas con saldo pendiente a terceros > 0, o la orden actualmente seleccionada
    const ordenesFiltradas = useMemo(() => {
        return ordenesPendientes.filter(ot => {
            if (mostrarTodasLasOrdenes) return true;
            if (idordenTrabajo && String(ot.id) === String(idordenTrabajo)) return true;
            return Number(ot.saldo_terceros) > 0;
        });
    }, [ordenesPendientes, mostrarTodasLasOrdenes, idordenTrabajo]);

    const selectedOt = useMemo(() => {
        if (!idordenTrabajo) return null;
        return ordenesPendientes.find(o => String(o.id) === String(idordenTrabajo)) || null;
    }, [idordenTrabajo, ordenesPendientes]);

    const handleSelectOrden = (selectedId: string) => {
        setIdordenTrabajo(selectedId);
        if (!selectedId) return;

        const orden = ordenesPendientes.find(o => String(o.id) === String(selectedId));
        if (orden) {
            // Jalar el monto a cancelar (saldo pendiente o costo total)
            const montoSugerido = orden.saldo_terceros > 0 ? orden.saldo_terceros : orden.costo_terceros;
            if (montoSugerido > 0) {
                setMonto(montoSugerido.toFixed(2));
            }

            // Jalar la descripción del trabajo realizado a terceros
            if (orden.detalle_sugerido) {
                setDetalle(orden.detalle_sugerido);
            }
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            Swal.fire('Archivo muy grande', 'El archivo no debe exceder los 15MB', 'warning');
            return;
        }

        setUploadingImg(true);
        try {
            const filename = await uploadFile(file);
            setImagen(filename);
            Swal.fire({
                icon: 'success',
                title: 'Comprobante cargado',
                text: 'El archivo se subió correctamente',
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error('Error al subir comprobante:', error);
            Swal.fire('Error', 'No se pudo subir el archivo del comprobante', 'error');
        } finally {
            setUploadingImg(false);
            e.target.value = '';
        }
    };

    const handleRemoveImage = () => {
        setImagen('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formaPagoId) {
            Swal.fire('Error', 'Seleccione una forma de pago', 'error');
            return;
        }

        const egresoData: CreateEgresoData = {
            fecha,
            detalle,
            monto: Number(monto),
            moneda,
            formaPagoId,
            idorden_trabajo: idordenTrabajo ? Number(idordenTrabajo) : undefined,
            imagen: imagen || undefined,
        };

        setLoading(true);
        try {
            if (isEditMode && egreso) {
                await updateEgreso(egreso.id, egresoData);
                Swal.fire({
                    title: 'Actualizado',
                    text: 'Egreso actualizado correctamente',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await createEgreso(egresoData);
                Swal.fire({
                    title: 'Creado',
                    text: 'Egreso registrado correctamente',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            const errorMessage = error.response?.data?.message || 'No se pudo guardar el egreso';
            Swal.fire('Error', Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-hidden">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all scale-100">
                {/* Fixed Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <CreditCard className="text-green-600 dark:text-green-400" size={22} />
                        {isEditMode ? 'Editar Egreso' : 'Nuevo Egreso Diario'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Wrapper with Scrollable Content & Fixed Sticky Footer */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
                        {/* Selector de Orden de Trabajo */}
                        <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                <label className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                                    <Wrench size={16} className="text-blue-600 dark:text-blue-400" />
                                    Vincular a Orden de Trabajo
                                    <span className="text-xs font-normal text-blue-600 dark:text-blue-400">(Opcional)</span>
                                </label>
                                <div className="flex items-center gap-2 text-xs">
                                    <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 dark:text-gray-300 hover:text-blue-600">
                                        <input
                                            type="checkbox"
                                            checked={mostrarTodasLasOrdenes}
                                            onChange={(e) => setMostrarTodasLasOrdenes(e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span>Mostrar todas</span>
                                    </label>
                                    {idordenTrabajo && (
                                        <button
                                            type="button"
                                            onClick={() => setIdordenTrabajo('')}
                                            className="text-red-500 hover:text-red-700 underline font-medium ml-1"
                                        >
                                            Desvincular
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="relative">
                                <select
                                    value={idordenTrabajo}
                                    onChange={(e) => handleSelectOrden(e.target.value)}
                                    className="w-full pl-3 pr-8 py-2.5 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                                >
                                    <option value="">-- Sin vincular a OT (Gasto Operativo General del Taller) --</option>
                                    {ordenesFiltradas.map(ot => {
                                        const tieneTerceros = Number(ot.costo_terceros) > 0;
                                        const saldo = Number(ot.saldo_terceros);
                                        const labelStatus = tieneTerceros
                                            ? (saldo > 0 ? `👉 Pendiente Terceros: Bs ${saldo.toFixed(2)}` : '✅ Terceros Pagado')
                                            : `[${ot.estado}]`;
                                        return (
                                            <option key={ot.id} value={ot.id}>
                                                OT #{ot.id} - Placa: {ot.vehiculo_placa || 'S/P'} | {ot.cliente_nombre || 'S/N'} {ot.vehiculo_modelo ? `(${ot.vehiculo_modelo})` : ''} - {labelStatus}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Banner Informativo de la OT Seleccionada */}
                            {selectedOt && (
                                <div className="mt-2 p-3 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800/60 rounded-lg text-xs space-y-1.5 shadow-sm">
                                    <div className="flex items-center justify-between font-semibold">
                                        <span className="text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                            <CheckCircle2 size={14} className="text-green-500" />
                                            OT #{selectedOt.id} • Placa: {selectedOt.vehiculo_placa || 'S/P'} ({selectedOt.cliente_nombre})
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full font-bold ${
                                            selectedOt.saldo_terceros > 0
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
                                                : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                        }`}>
                                            {selectedOt.saldo_terceros > 0
                                                ? `Pendiente: Bs ${selectedOt.saldo_terceros.toFixed(2)}`
                                                : 'Terceros Pagado'}
                                        </span>
                                    </div>
                                    {selectedOt.trabajos && selectedOt.trabajos.length > 0 ? (
                                        <div className="text-gray-600 dark:text-gray-300 flex flex-wrap gap-1 items-center">
                                            <span className="font-medium text-gray-500 dark:text-gray-400">Trabajos de Terceros:</span>
                                            {selectedOt.trabajos.map((t, idx) => (
                                                <span key={idx} className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-[11px] text-gray-700 dark:text-gray-200">
                                                    {t.detalle} (Bs {Number(t.costo_tercero || 0).toFixed(2)})
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 italic text-[11px]">Esta orden no registra aranceles de tipo Trabajos de Terceros.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Fecha */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        {/* Detalle del Gasto */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Detalle del Gasto</label>
                                {idordenTrabajo && selectedOt?.detalle_sugerido && (
                                    <button
                                        type="button"
                                        onClick={() => setDetalle(selectedOt.detalle_sugerido)}
                                        className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                                    >
                                        Reaplicar descripción de la OT
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                                <textarea
                                    value={detalle}
                                    onChange={(e) => setDetalle(e.target.value)}
                                    rows={2}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                    placeholder="Descripción del egreso (ej. Torneado de discos, compra de insumos, etc.)..."
                                    required
                                />
                            </div>
                        </div>

                        {/* Monto y Moneda */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto</label>
                                    {selectedOt && selectedOt.saldo_terceros > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setMonto(selectedOt.saldo_terceros.toFixed(2))}
                                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                                        >
                                            Usar saldo (Bs {selectedOt.saldo_terceros.toFixed(2)})
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={monto}
                                        onChange={(e) => setMonto(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm font-semibold text-base"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Moneda</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <select
                                        value={moneda}
                                        onChange={(e) => setMoneda(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm appearance-none"
                                    >
                                        <option value="Bolivianos">Bolivianos</option>
                                        <option value="Dólares">Dólares</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Forma de Pago */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de Pago</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <select
                                    value={formaPagoId}
                                    onChange={(e) => setFormaPagoId(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm appearance-none"
                                    required
                                >
                                    <option value="">Seleccione forma de pago...</option>
                                    {formasPago.map(fp => (
                                        <option key={fp.id} value={fp.id}>{fp.forma_pago}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Subir Comprobante (Imagen o PDF) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Comprobante de Egreso (Transferencia / Recibo / Factura - Imagen o PDF)
                            </label>
                            {imagen ? (
                                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {imagen.toLowerCase().endsWith('.pdf') ? (
                                            <div className="w-12 h-12 flex-shrink-0 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400">
                                                <FileText size={24} />
                                            </div>
                                        ) : (
                                            <img
                                                src={`${API_BASE_URL}/files/${imagen}`}
                                                alt="Comprobante"
                                                className="w-12 h-12 flex-shrink-0 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                                onError={(e) => {
                                                    (e.target as any).style.display = 'none';
                                                }}
                                            />
                                        )}
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-xs">
                                                {imagen}
                                            </p>
                                            <a
                                                href={`${API_BASE_URL}/files/${imagen}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1 font-medium mt-0.5"
                                            >
                                                <ExternalLink size={11} /> Ver archivo completo
                                            </a>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors ml-2"
                                        title="Quitar comprobante"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 rounded-lg p-3 text-center transition-colors bg-white dark:bg-gray-700/40">
                                    <input
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={handleFileChange}
                                        disabled={uploadingImg}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center gap-1">
                                        {uploadingImg ? (
                                            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium py-1">
                                                <RefreshCw className="w-4 h-4 animate-spin" />
                                                Subiendo comprobante...
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-5 h-5 text-gray-400" />
                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                    Haga clic o arrastre aquí el comprobante (Imagen o PDF)
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    Soporta JPG, PNG, WEBP o PDF hasta 15MB
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fixed Sticky Footer with Cancel and Save Buttons */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/95 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2.5 px-4 rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                        >
                            <X size={18} />
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2 transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 text-sm"
                        >
                            <Save size={18} />
                            {loading ? 'Guardando...' : (isEditMode ? 'Actualizar Egreso' : 'Guardar Egreso')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EgresoForm;
