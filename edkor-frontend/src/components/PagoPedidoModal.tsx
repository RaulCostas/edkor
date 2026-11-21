import { useState, useEffect } from 'react';
import { X, Calendar, FileText, DollarSign, CreditCard, Hash, Plus, Upload, Trash2, Save, Image as ImageIcon } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { getFormasPago, createFormaPago } from '../services/formaPagoService';
import { createPagoPedido, updatePagoPedido } from '../services/pagoPedidoService';
import { uploadFile } from '../services/fileService';
import { API_BASE_URL } from '../config';
import type { FormaPago } from '../types/formaPago';
import type { MaterialPedido } from '../types/materialPedido';
import { getLocalDateString } from '../utils/dateUtils';

export interface PagoPedidoItem {
    id: number;
    fecha: string;
    factura: string;
    recibo: string;
    moneda: string;
    tc?: number;
    imagen?: string;
    material_pedido?: MaterialPedido;
    usuario?: { id: number; name: string };
    forma_pago?: { id: number; forma_pago: string };
}

interface PagoPedidoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPaymentSuccess: () => void;
    pedido: MaterialPedido | null;
    pagoToEdit?: PagoPedidoItem | null;
}

const PagoPedidoModal = ({ isOpen, onClose, onPaymentSuccess, pedido, pagoToEdit }: PagoPedidoModalProps) => {
    const { user } = useAuth();
    const [formasPago, setFormasPago] = useState<FormaPago[]>([]);

    // Form State
    const [fecha, setFecha] = useState(getLocalDateString());
    const [factura, setFactura] = useState('');
    const [recibo, setRecibo] = useState('');
    const [moneda, setMoneda] = useState('Bolivianos');
    const [tc, setTc] = useState<number>(6.96); // Default TC
    const [idformaPago, setIdFormaPago] = useState('');
    const [imagen, setImagen] = useState('');
    const [uploadingImg, setUploadingImg] = useState(false);

    // Modal rápida para nueva Forma de Pago
    const [showModalFormaPago, setShowModalFormaPago] = useState(false);
    const [nuevaFormaPagoNombre, setNuevaFormaPagoNombre] = useState('');
    const [savingFormaPago, setSavingFormaPago] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchFormasPago();
            if (pagoToEdit) {
                setFecha(pagoToEdit.fecha ? getLocalDateString(pagoToEdit.fecha) : getLocalDateString());
                setFactura(pagoToEdit.factura || '');
                setRecibo(pagoToEdit.recibo || '');
                setMoneda(pagoToEdit.moneda || 'Bolivianos');
                setTc(pagoToEdit.tc ? Number(pagoToEdit.tc) : 6.96);
                setIdFormaPago(String(pagoToEdit.forma_pago?.id || ''));
                setImagen(pagoToEdit.imagen || '');
            } else {
                resetForm();
            }
        }
    }, [isOpen, pagoToEdit]);

    const fetchFormasPago = async () => {
        try {
            const data = await getFormasPago();
            setFormasPago(data.filter(f => f.estado === 'activo'));
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Error al cargar formas de pago', 'error');
        }
    };

    const resetForm = () => {
        setFecha(getLocalDateString());
        setFactura('');
        setRecibo('');
        setMoneda('Bolivianos');
        setTc(6.96);
        setIdFormaPago('');
        setImagen('');
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingImg(true);
        try {
            const filename = await uploadFile(file);
            setImagen(filename);
            Swal.fire({
                icon: 'success',
                title: 'Comprobante cargado',
                text: 'La imagen se subió correctamente',
                timer: 1200,
                showConfirmButton: false,
            });
        } catch (err) {
            console.error('Error subiendo comprobante:', err);
            Swal.fire('Error', 'No se pudo subir la imagen del comprobante', 'error');
        } finally {
            setUploadingImg(false);
        }
    };

    const handleCreateFormaPago = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = nuevaFormaPagoNombre.trim();
        if (!trimmed) return;
        setSavingFormaPago(true);
        try {
            const created = await createFormaPago({
                forma_pago: trimmed,
                estado: 'activo'
            });
            await fetchFormasPago();
            setIdFormaPago(String(created.id));
            setShowModalFormaPago(false);
            setNuevaFormaPagoNombre('');
            Swal.fire({
                icon: 'success',
                title: 'Forma de Pago Creada',
                text: `Se agregó "${created.forma_pago}"`,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error creando forma de pago:', error);
            Swal.fire('Error', 'No se pudo registrar la forma de pago', 'error');
        } finally {
            setSavingFormaPago(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;
        if (!pedido && !pagoToEdit) return;

        if (!factura && !recibo) {
            Swal.fire('Atención', 'Debe ingresar al menos la Factura o el Recibo.', 'warning');
            return;
        }

        try {
            if (pagoToEdit) {
                await updatePagoPedido(pagoToEdit.id, {
                    idforma_pago: idformaPago,
                    fecha,
                    factura: factura || '',
                    recibo: recibo || '',
                    moneda,
                    tc: moneda === 'Dólares' ? tc : undefined,
                    imagen: imagen || undefined,
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Pago actualizado correctamente',
                    showConfirmButton: false,
                    timer: 1500
                });
            } else if (pedido) {
                await createPagoPedido({
                    idmaterial_pedido: pedido.id,
                    idusers: String(user.id),
                    idforma_pago: idformaPago,
                    fecha,
                    factura: factura || '',
                    recibo: recibo || '',
                    moneda,
                    tc: moneda === 'Dólares' ? tc : undefined,
                    imagen: imagen || undefined,
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Éxito',
                    text: 'Pago registrado correctamente',
                    showConfirmButton: false,
                    timer: 1500
                });
            }
            onPaymentSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar el pago', 'error');
        }
    };

    if (!isOpen) return null;

    const displayPedidoId = pedido?.id || pagoToEdit?.material_pedido?.id;
    const displayProveedor = pedido?.proveedor?.proveedor || pagoToEdit?.material_pedido?.proveedor?.proveedor;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <DollarSign className="text-green-600" />
                        {pagoToEdit ? 'Editar Pago' : 'Registrar Pago'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        title="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-center gap-3">
                        <FileText className="text-blue-500" size={20} />
                        <div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase">Pedido #{displayPedidoId}</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-white">{displayProveedor || 'Proveedor'}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha de Pago</label>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Factura</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={factura}
                                    onChange={(e) => setFactura(e.target.value)}
                                    placeholder="Nº Factura"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recibo</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    value={recibo}
                                    onChange={(e) => setRecibo(e.target.value)}
                                    placeholder="Nº Recibo"
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                        {moneda === 'Dólares' && (
                            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">T. Cambio</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={tc}
                                        onChange={(e) => setTc(parseFloat(e.target.value))}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                        required
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Forma de Pago con Botón "+" */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Forma de Pago</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <select
                                    value={idformaPago}
                                    onChange={(e) => setIdFormaPago(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm appearance-none"
                                    required
                                >
                                    <option value="">Seleccione forma de pago...</option>
                                    {formasPago.map(fp => (
                                        <option key={fp.id} value={fp.id}>{fp.forma_pago}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setNuevaFormaPagoNombre('');
                                    setShowModalFormaPago(true);
                                }}
                                className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0"
                                title="Registrar nueva Forma de Pago"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Subir Imagen de Factura / Recibo */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Comprobante / Foto de Factura o Recibo
                        </label>
                        {imagen ? (
                            <div className="relative border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700/40 flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <img
                                        src={`${API_BASE_URL}/files/${imagen}`}
                                        alt="Comprobante"
                                        className="w-14 h-14 object-cover rounded-md border border-gray-200 dark:border-gray-600"
                                        onError={(e) => {
                                            (e.target as any).style.display = 'none';
                                        }}
                                    />
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{imagen}</p>
                                        <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">✓ Archivo cargado</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setImagen('')}
                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                    title="Quitar comprobante"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 rounded-lg p-3 text-center transition-colors bg-white dark:bg-gray-700">
                                <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                    disabled={uploadingImg}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center justify-center gap-1">
                                    {uploadingImg ? (
                                        <div className="flex items-center gap-2 text-sm text-blue-600">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                            Subiendo comprobante...
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-5 h-5 text-gray-400" />
                                            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                                Haz clic o arrastra la foto de la factura / recibo
                                            </p>
                                            <p className="text-[10px] text-gray-400">PNG, JPG, JPEG o PDF</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <X size={18} />
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all font-medium flex items-center gap-2 transform active:scale-95"
                        >
                            {pagoToEdit ? <Save size={18} /> : <DollarSign size={18} />}
                            {pagoToEdit ? 'Guardar Cambios' : 'Confirmar Pago'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal: Registrar Nueva Forma de Pago */}
            {showModalFormaPago && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-orange-500" /> Nueva Forma de Pago
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowModalFormaPago(false)}
                                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                title="Cerrar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateFormaPago} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre de la Forma de Pago *
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="Ej: QR, Transferencia BNB, Efectivo..."
                                    value={nuevaFormaPagoNombre}
                                    onChange={(e) => setNuevaFormaPagoNombre(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModalFormaPago(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                                >
                                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    <span>Cancelar</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingFormaPago || !nuevaFormaPagoNombre.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{savingFormaPago ? "Guardando..." : "Guardar Forma de Pago"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PagoPedidoModal;
