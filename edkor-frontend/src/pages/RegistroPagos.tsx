import { useEffect, useState, useRef } from 'react';
import {
    Receipt,
    Search,
    DollarSign,
    CheckCircle,
    Clock,
    Calendar,
    Coins,
    FileText,
    CreditCard,
    Building,
    MessageSquare,
    MessageCircle,
    RefreshCw,
    Pencil,
    Trash2,
    Eye,
    Printer,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    X,
    ReceiptText,
    Plus,
    Save,
    Upload,
    ExternalLink
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { uploadFile } from '../services/fileService';
import Pagination from '../components/Pagination';
import Swal from 'sweetalert2';
import { updateOrdenTrabajo, getOrdenTrabajo } from '../services/ordenTrabajoService';
import {
    getOrdenesConSaldo,
    createPago,
    updatePago,
    deletePago,
    getPagos,
    type OrdenConSaldo,
    type PagoOrden
} from '../services/pagoOrdenService';
import { getFormasPago, createFormaPago } from '../services/formaPagoService';
import { getComisionesTarjeta } from '../services/comisionTarjetaService';
import type { FormaPago } from '../types/formaPago';
import type { ComisionTarjeta } from '../types/comisionTarjeta';
import { useAuth } from '../context/AuthContext';
import ReciboCobroModal, { type ReciboCobroInfo } from '../components/ReciboCobroModal';
import { ReciboCobroPrintView } from '../components/ReciboCobroPrintView';
import { API_BASE_URL } from '../config';
import { formatDate, getLocalDateString } from '../utils/dateUtils';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import * as XLSX from 'xlsx';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';

const RegistroPagos = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [ordenes, setOrdenes] = useState<OrdenConSaldo[]>([]);
    const [pagos, setPagos] = useState<PagoOrden[]>([]);
    const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
    const [comisionesTarjeta, setComisionesTarjeta] = useState<ComisionTarjeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal de Registro / Edición de Pago
    const [showModal, setShowModal] = useState(false);
    const [selectedOrden, setSelectedOrden] = useState<OrdenConSaldo | null>(null);
    const [editingPago, setEditingPago] = useState<PagoOrden | null>(null);
    const [modalidadPago, setModalidadPago] = useState<'total' | 'parcial'>('total');
    const [showPagosPreviosEnModal, setShowPagosPreviosEnModal] = useState(false);

    // Modal de Historial de Pagos de una orden específica
    const [showHistorialOrdenModal, setShowHistorialOrdenModal] = useState(false);
    const [selectedOrdenHistorial, setSelectedOrdenHistorial] = useState<OrdenConSaldo | null>(null);

    // Modal de Recibo Imprimible
    const [showReciboModal, setShowReciboModal] = useState(false);
    const [reciboData, setReciboData] = useState<ReciboCobroInfo | null>(null);
    const [whatsappReciboData, setWhatsappReciboData] = useState<ReciboCobroInfo | null>(null);
    const whatsappPrintRef = useRef<HTMLDivElement>(null);
    const [showManual, setShowManual] = useState(false);
    const [isPrintingList, setIsPrintingList] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [filtroFacturacion, setFiltroFacturacion] = useState<'todas' | 'facturadas' | 'sin_facturar'>('todas');
    const itemsPerPage = 10;

    // Modal rápida para nueva Forma de Pago
    const [showModalFormaPago, setShowModalFormaPago] = useState(false);
    const [nuevaFormaPagoNombre, setNuevaFormaPagoNombre] = useState('');
    const [savingFormaPago, setSavingFormaPago] = useState(false);

    // Obtener nombre del usuario que registró el pago
    const getUsuarioPagoNombre = (usuario?: any) => {
        if (!usuario) return '-';
        if (usuario.name) return usuario.name;
        if (usuario.nombre) return `${usuario.nombre} ${usuario.paterno || ''}`.trim();
        if (usuario.username) return usuario.username;
        if (usuario.email) return usuario.email.split('@')[0];
        return '-';
    };

    // Form state
    const [uploadingComprobante, setUploadingComprobante] = useState(false);
    const [formData, setFormData] = useState({
        fecha: getLocalDateString(),
        monto: '',
        moneda: 'Bolivianos',
        tc: '',
        factura: '',
        recibo: '',
        idforma_pago: '',
        observacion: '',
        idcomision_tarjeta: '',
        comprobante: '',
    });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'pending') {
                const [ordenesData, formasPagoData, comisionesData] = await Promise.all([
                    getOrdenesConSaldo(),
                    getFormasPago(),
                    getComisionesTarjeta(),
                ]);
                setOrdenes(ordenesData);
                setFormasPago(formasPagoData.filter(fp => fp.estado === 'activo'));
                setComisionesTarjeta(comisionesData.filter(ct => ct.estado === 'activo'));
            } else {
                const [pagosData, formasPagoData, comisionesData] = await Promise.all([
                    getPagos(),
                    getFormasPago(),
                    getComisionesTarjeta(),
                ]);
                setPagos(pagosData);
                setFormasPago(formasPagoData.filter(fp => fp.estado === 'activo'));
                setComisionesTarjeta(comisionesData.filter(ct => ct.estado === 'activo'));
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRegistrarPago = (orden: OrdenConSaldo, modoInicial: 'total' | 'parcial' = 'total') => {
        setSelectedOrden(orden);
        setEditingPago(null);
        setModalidadPago(modoInicial);
        setShowPagosPreviosEnModal(false);

        const montoInicial = Number(orden.saldo).toFixed(2);

        setFormData({
            fecha: getLocalDateString(),
            monto: montoInicial,
            moneda: orden.moneda || 'Bolivianos',
            tc: '',
            factura: '',
            recibo: '',
            idforma_pago: '',
            observacion: modoInicial === 'total' ? 'Cancelación total de saldo' : 'Abono parcial a cuenta',
            idcomision_tarjeta: '',
            comprobante: '',
        });
        setShowModal(true);
    };

    const handleEditPago = (pago: PagoOrden) => {
        if (pago.orden_trabajo) {
            const ordenMock: OrdenConSaldo = {
                id: pago.idorden_trabajo,
                fecha_registro: '',
                cliente: pago.orden_trabajo.cliente || pago.orden_trabajo.cliente_nombre || 'N/A',
                placa: pago.orden_trabajo.placa || pago.orden_trabajo.vehiculo_placa || 'N/A',
                sub_total: Number(pago.orden_trabajo.total || pago.orden_trabajo.sub_total || pago.monto),
                total: Number(pago.orden_trabajo.total || pago.monto),
                total_pagado: Number(pago.monto),
                saldo: 0,
                pagos: [],
                moneda: pago.moneda
            };
            setSelectedOrden(ordenMock);
        }

        setEditingPago(pago);
        setModalidadPago('parcial');
        setShowPagosPreviosEnModal(false);

        setFormData({
            fecha: getLocalDateString(pago.fecha),
            monto: pago.monto.toString(),
            moneda: pago.moneda,
            tc: pago.tc ? pago.tc.toString() : '',
            factura: pago.factura || '',
            recibo: pago.recibo || '',
            idforma_pago: pago.idforma_pago ? pago.idforma_pago.toString() : '',
            observacion: pago.observacion || '',
            idcomision_tarjeta: pago.idcomision_tarjeta ? pago.idcomision_tarjeta.toString() : '',
            comprobante: pago.comprobante || '',
        });
        setShowModal(true);
    };

    const handleSelectModalidad = (modo: 'total' | 'parcial') => {
        if (!selectedOrden) return;
        setModalidadPago(modo);
        const saldoActual = Number(selectedOrden.saldo);
        if (modo === 'total') {
            setFormData(prev => ({
                ...prev,
                monto: saldoActual.toFixed(2),
                observacion: (!prev.observacion || prev.observacion.includes('Abono')) ? 'Cancelación total de saldo' : prev.observacion,
            }));
        } else {
            // En pago parcial, jalar también el Saldo Actual
            setFormData(prev => ({
                ...prev,
                monto: saldoActual.toFixed(2),
                observacion: (!prev.observacion || prev.observacion.includes('Cancelación')) ? 'Abono parcial a cuenta' : prev.observacion,
            }));
        }
    };

    const handleComprobanteUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            Swal.fire('Archivo muy grande', 'El archivo no debe exceder los 15MB', 'warning');
            return;
        }

        setUploadingComprobante(true);
        try {
            const filename = await uploadFile(file);
            setFormData(prev => ({ ...prev, comprobante: filename }));
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
            setUploadingComprobante(false);
            e.target.value = '';
        }
    };

    const handleRemoveComprobante = () => {
        setFormData(prev => ({ ...prev, comprobante: '' }));
    };

    const handleDeletePago = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Eliminar pago?',
            text: 'Esta acción reajustará el saldo de la orden. ¿Está seguro?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await deletePago(id);
                await Swal.fire({
                    icon: 'success',
                    title: '¡Eliminado!',
                    text: 'El pago ha sido eliminado y el saldo reajustado.',
                    showConfirmButton: false,
                    timer: 1500
                });
                loadData();
            } catch (error) {
                console.error(error);
                Swal.fire('Error', 'No se pudo eliminar el pago', 'error');
            }
        }
    };

    const handleVerHistorialOrden = (orden: OrdenConSaldo) => {
        setSelectedOrdenHistorial(orden);
        setShowHistorialOrdenModal(true);
    };

    const handleCreateFormaPago = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = nuevaFormaPagoNombre.trim();
        if (!trimmed) return;

        try {
            setSavingFormaPago(true);
            const created = await createFormaPago({
                forma_pago: trimmed,
                estado: 'activo'
            });

            const updatedFormas = await getFormasPago();
            setFormasPago(updatedFormas.filter(fp => fp.estado === 'activo'));

            // Auto-seleccionar la recién creada
            setFormData(prev => ({ ...prev, idforma_pago: String(created.id) }));

            setShowModalFormaPago(false);
            setNuevaFormaPagoNombre('');

            Swal.fire({
                icon: 'success',
                title: 'Forma de Pago Creada',
                text: `Se agregó "${trimmed}" correctamente.`,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error al crear forma de pago:', error);
            Swal.fire('Error', 'No se pudo crear la forma de pago', 'error');
        } finally {
            setSavingFormaPago(false);
        }
    };

    const handleFacturarOrdenFromPagos = async (ordenItem: OrdenConSaldo) => {
        const isAlreadyFacturado = Boolean(ordenItem.facturado);
        const isInitiallyChecked = true;
        const currentNro = ordenItem.nro_factura || '';
        const currentFecha = getLocalDateString(ordenItem.fecha_facturado);

        const result = await Swal.fire({
            title: isAlreadyFacturado ? `Actualizar Facturación Orden #${ordenItem.id}` : `Facturar Orden #${ordenItem.id}`,
            html: `
                <div class="text-left space-y-3 p-1">
                    <p class="text-xs text-gray-500 mb-2">
                        Orden de: <strong>${ordenItem.cliente}</strong> (Placa: <strong>${ordenItem.placa}</strong>).<br/>
                        Indica si la orden ya fue emitida en factura ante el Seguro o Concesionaria. Esto no modifica el saldo pendiente de cobro.
                    </p>
                    <div class="flex items-center gap-2 p-2 bg-blue-50 dark:bg-gray-700/50 rounded-lg border border-blue-200 dark:border-gray-600 mb-3">
                        <input type="checkbox" id="swal-fact-check" ${isInitiallyChecked ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        <label for="swal-fact-check" class="text-sm font-bold text-gray-800 dark:text-gray-200 cursor-pointer">Marcar como Orden Facturada</label>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">N° de Factura *</label>
                        <input id="swal-fact-nro" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ej: F-002934 / 849302" value="${currentNro}" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Fecha de Facturación</label>
                        <input id="swal-fact-fecha" type="date" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" value="${currentFecha}" />
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar Facturación',
            cancelButtonText: 'Cancelar',
            focusConfirm: false,
            didOpen: () => {
                const check = document.getElementById('swal-fact-check') as HTMLInputElement;
                const nroInput = document.getElementById('swal-fact-nro') as HTMLInputElement;
                if (nroInput && check) {
                    nroInput.addEventListener('input', () => {
                        if (nroInput.value.trim().length > 0) {
                            check.checked = true;
                        }
                    });
                    check.addEventListener('change', () => {
                        if (!check.checked) {
                            nroInput.value = '';
                        }
                    });
                    nroInput.focus();
                }
            },
            preConfirm: () => {
                const isChecked = (document.getElementById('swal-fact-check') as HTMLInputElement)?.checked;
                const nroFactura = (document.getElementById('swal-fact-nro') as HTMLInputElement)?.value?.trim() || '';
                const fechaFactura = (document.getElementById('swal-fact-fecha') as HTMLInputElement)?.value || '';

                const isFacturado = Boolean(isChecked || nroFactura.length > 0);

                if (isFacturado && !nroFactura) {
                    Swal.showValidationMessage('Por favor ingrese el N° de Factura');
                    return false;
                }

                return {
                    facturado: isFacturado,
                    nro_factura: isFacturado ? nroFactura : null,
                    fecha_facturado: isFacturado ? (fechaFactura || getLocalDateString()) : null
                };
            }
        });

        if (result.isConfirmed && result.value) {
            try {
                await updateOrdenTrabajo(ordenItem.id, result.value as any);
                setOrdenes(prev => prev.map(o => o.id === ordenItem.id ? { ...o, ...result.value } : o));
                await loadData();
                Swal.fire({
                    icon: 'success',
                    title: '¡Guardado!',
                    text: 'Datos de facturación actualizados exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'No se pudo actualizar la facturación', 'error');
            }
        }
    };

    const buildReciboDataFromPago = (pago: PagoOrden, ordenContext?: OrdenConSaldo | null): ReciboCobroInfo => {
        const orden = ordenContext || pago.orden_trabajo;
        const totalOrden = Number(orden?.total || orden?.sub_total || pago.monto);
        const clienteNom = orden?.cliente || orden?.cliente_nombre || (pago.orden_trabajo as any)?.cliente || 'N/A';
        const clienteTel = orden?.cliente_telefono || (orden as any)?.celular || (pago.orden_trabajo as any)?.celular || '';
        const placaVeh = orden?.placa || orden?.vehiculo_placa || (pago.orden_trabajo as any)?.placa || 'N/A';
        const modVeh = orden?.vehiculo_modelo || (orden as any)?.modelo || '';
        const marcaVeh = orden?.vehiculo_marca || (orden as any)?.marca_auto?.marca || '';
        const montoCobrado = Number(pago.monto);

        return {
            id_pago: pago.id,
            idorden_trabajo: pago.idorden_trabajo,
            fecha: getLocalDateString(pago.fecha),
            cliente: clienteNom,
            cliente_telefono: clienteTel,
            placa: placaVeh,
            vehiculo_modelo: modVeh,
            vehiculo_marca: marcaVeh,
            total_orden: totalOrden,
            saldo_anterior: totalOrden, // Representativo
            monto_pagado: montoCobrado,
            saldo_restante: orden?.cancelado ? 0 : Math.max(0, Number(orden?.saldo || 0)),
            moneda: pago.moneda || 'Bolivianos',
            forma_pago: pago.forma_pago?.forma_pago || (formasPago.find(fp => String(fp.id) === String(pago.idforma_pago))?.forma_pago) || 'Efectivo',
            recibo: pago.recibo,
            factura: pago.factura,
            observacion: pago.observacion,
            usuario_nombre: getUsuarioPagoNombre(pago.usuario) !== '-' ? getUsuarioPagoNombre(pago.usuario) : (user?.name || 'Administración'),
        };
    };

    const handleImprimirReciboFromPago = (pago: PagoOrden, ordenContext?: OrdenConSaldo | null) => {
        const data = buildReciboDataFromPago(pago, ordenContext);
        setReciboData(data);
        setShowReciboModal(true);
    };

    const handleSendWhatsAppReceipt = async (pago: PagoOrden, ordenContext?: OrdenConSaldo | null) => {
        try {
            let fullOrden = ordenContext || pago.orden_trabajo;
            if ((!fullOrden?.cliente_telefono && !(fullOrden as any)?.celular) && pago.idorden_trabajo) {
                try {
                    const fetched = await getOrdenTrabajo(pago.idorden_trabajo);
                    if (fetched) {
                        fullOrden = { ...fullOrden, ...fetched };
                    }
                } catch (e) {
                    console.warn("No se pudo obtener detalles extra de la OT:", e);
                }
            }

            const recibo = buildReciboDataFromPago(pago, fullOrden);
            const telefonoInicial = recibo.cliente_telefono || '';

            const result = await Swal.fire({
                title: 'Enviar Recibo por WhatsApp',
                html: `
                    <div class="text-left">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Número de teléfono / WhatsApp del cliente:
                        </label>
                        <input 
                            type="text" 
                            id="swal-phone" 
                            class="swal2-input" 
                            value="${telefonoInicial}" 
                            placeholder="Ej: 59170000000"
                        />
                        <p class="text-xs text-gray-500 mt-2">
                            El recibo de pago N° #${String(recibo.id_pago).padStart(6, '0')} (OT #${recibo.idorden_trabajo}) se enviará en formato PDF mediante el chatbot.
                        </p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#25D366',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Enviar por WhatsApp',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const phone = (document.getElementById('swal-phone') as HTMLInputElement)?.value?.trim();
                    if (!phone) {
                        Swal.showValidationMessage('Ingrese un número de teléfono válido');
                        return false;
                    }
                    return phone;
                }
            });

            if (!result.isConfirmed || !result.value) return;
            const confirmedPhone = result.value;

            Swal.fire({
                title: 'Generando PDF del Recibo...',
                text: 'Por favor espere un momento',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Actualizar teléfono confirmado en el objeto de datos
            recibo.cliente_telefono = confirmedPhone;
            setWhatsappReciboData(recibo);

            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, 450);
                });
            });

            const element = whatsappPrintRef.current;
            if (!element) {
                throw new Error("No se pudo renderizar la vista de impresión del recibo");
            }

            // Esperar que carguen las imágenes
            const images = Array.from(element.querySelectorAll("img"));
            await Promise.all(
                images.map((img) => {
                    if (img.complete) return Promise.resolve();
                    return new Promise<void>((res) => {
                        img.onload = () => res();
                        img.onerror = () => res();
                    });
                })
            );

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff",
                logging: false,
            });

            const imgData = canvas.toDataURL("image/jpeg", 0.95);
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            const marginLeft = 10;
            const marginTop = 10;
            const renderWidth = 175;
            const renderHeight = (canvas.height * renderWidth) / canvas.width;

            doc.addImage(imgData, "JPEG", marginLeft, marginTop, renderWidth, renderHeight);

            const pdfBlob = doc.output('blob');

            Swal.update({
                title: 'Enviando por WhatsApp...',
                text: 'Conectando con el Chatbot...',
                showConfirmButton: false,
            });
            Swal.showLoading();

            const nroPagoStr = String(recibo.id_pago).padStart(6, '0');
            const nroOTStr = String(recibo.idorden_trabajo).padStart(6, '0');
            const placaSlug = (recibo.placa || "SIN_PLACA").replace(/[^a-zA-Z0-9_-]/g, "");

            const formData = new FormData();
            formData.append('file', pdfBlob, `Recibo_Pago_${nroPagoStr}_OT_${nroOTStr}_${placaSlug}.pdf`);
            formData.append('phoneNumber', confirmedPhone);
            formData.append('caption', `Recibo de Pago N° ${nroPagoStr} (OT #${nroOTStr}) - ${recibo.cliente} - EDKOR MOTORS`);

            const response = await fetch(`${API_BASE_URL}/chatbot/send-document`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errJson = await response.json().catch(() => null);
                throw new Error(errJson?.message || 'Error al enviar el recibo por WhatsApp');
            }

            await Swal.fire({
                icon: 'success',
                title: '¡Enviado!',
                text: 'El recibo en PDF ha sido enviado por WhatsApp exitosamente',
                timer: 2500,
                showConfirmButton: false
            });
        } catch (error: any) {
            console.error('Error sending WhatsApp receipt:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error al enviar por WhatsApp',
                text: error?.message || 'No se pudo enviar el recibo por WhatsApp. Verifique que el servicio de chatbot esté conectado.'
            });
        } finally {
            setWhatsappReciboData(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrden || !user) return;

        const montoNum = parseFloat(formData.monto);
        if (!formData.monto || isNaN(montoNum) || montoNum <= 0) {
            Swal.fire('Error', 'El monto a registrar debe ser mayor a 0', 'error');
            return;
        }

        const saldoActual = Number(selectedOrden.saldo);
        // Validar que el pago no supere el saldo pendiente si es nuevo pago
        if (!editingPago && saldoActual > 0 && montoNum > saldoActual + 0.05) {
            Swal.fire({
                icon: 'warning',
                title: 'Monto Excede el Saldo',
                text: `El monto ingresado (${montoNum.toFixed(2)} Bs) no puede ser mayor al saldo pendiente (${saldoActual.toFixed(2)} Bs).`,
            });
            return;
        }

        if (formData.moneda === 'Dólares' && (!formData.tc || parseFloat(formData.tc) <= 0)) {
            Swal.fire('Error', 'Debe ingresar un tipo de cambio válido para pagos en dólares', 'error');
            return;
        }

        if (!formData.idforma_pago) {
            Swal.fire('Error', 'Debe seleccionar una forma de pago', 'error');
            return;
        }

        try {
            let montoComision = 0;
            if (formData.idcomision_tarjeta) {
                const selectedComision = comisionesTarjeta.find(c => c.id.toString() === formData.idcomision_tarjeta);
                if (selectedComision) {
                    montoComision = montoNum * (Number(selectedComision.comision) / 100);
                }
            }

            const safeFloat = (val: any) => {
                const num = parseFloat(val);
                return isNaN(num) ? undefined : num;
            };
            const safeInt = (val: any) => {
                const num = parseInt(val);
                return isNaN(num) ? undefined : num;
            };

            const payload = {
                idorden_trabajo: selectedOrden.id,
                fecha: formData.fecha,
                monto: safeFloat(formData.monto),
                moneda: formData.moneda,
                tc: formData.moneda === 'Dólares' ? safeFloat(formData.tc) : undefined,
                factura: formData.factura || undefined,
                recibo: formData.recibo || undefined,
                idforma_pago: safeInt(formData.idforma_pago),
                observacion: formData.observacion || (modalidadPago === 'total' ? 'Cancelación total de saldo' : 'Abono parcial a cuenta'),
                idusers: safeInt(user.id),
                idcomision_tarjeta: safeInt(formData.idcomision_tarjeta),
                monto_comision: montoComision > 0 ? Number(montoComision.toFixed(2)) : undefined,
                comprobante: formData.comprobante || undefined,
            };

            let savedPago: PagoOrden;
            if (editingPago) {
                savedPago = await updatePago(editingPago.id, payload);
            } else {
                savedPago = await createPago(payload);
            }

            const nuevoSaldoRestante = Math.max(0, Number((saldoActual - montoNum).toFixed(2)));
            const esLiquidacionTotal = nuevoSaldoRestante <= 0.05;

            setShowModal(false);
            const ordenGuardada = { ...selectedOrden };
            setSelectedOrden(null);
            setEditingPago(null);
            loadData();

            // Preguntar para imprimir recibo
            const swalRes = await Swal.fire({
                icon: 'success',
                title: esLiquidacionTotal ? '¡Orden Totalmente Cancelada!' : '¡Abono Parcial Registrado!',
                html: `
                    <div class="text-left text-sm space-y-2 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div class="flex justify-between">
                            <span class="text-gray-600">Monto Abonado:</span>
                            <span class="font-bold text-gray-900">${montoNum.toFixed(2)} ${formData.moneda === 'Dólares' ? '$us' : 'Bs'}</span>
                        </div>
                        <div class="flex justify-between border-t border-gray-200 pt-1">
                            <span class="text-gray-600">Saldo Pendiente:</span>
                            <span class="font-bold ${esLiquidacionTotal ? 'text-green-600' : 'text-red-600'}">
                                ${esLiquidacionTotal ? '0.00 Bs (100% Saldado)' : `${nuevoSaldoRestante.toFixed(2)} Bs`}
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 pt-1">
                            ${esLiquidacionTotal ? 'La orden se marcó como cerrada y saldada.' : 'La orden permanecerá en cobros con el saldo pendiente.'}
                        </p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: '🖨️ Imprimir Recibo',
                cancelButtonText: 'Listo',
                confirmButtonColor: '#2563eb',
                cancelButtonColor: '#64748b',
            });

            if (swalRes.isConfirmed) {
                const formaPagoObj = formasPago.find(fp => fp.id.toString() === formData.idforma_pago);
                setReciboData({
                    id_pago: savedPago.id,
                    idorden_trabajo: ordenGuardada.id,
                    fecha: formData.fecha,
                    cliente: ordenGuardada.cliente,
                    cliente_telefono: ordenGuardada.cliente_telefono || (ordenGuardada as any).celular,
                    placa: ordenGuardada.placa,
                    vehiculo_modelo: ordenGuardada.vehiculo_modelo || (ordenGuardada as any).modelo,
                    vehiculo_marca: ordenGuardada.vehiculo_marca,
                    total_orden: Number(ordenGuardada.total || ordenGuardada.sub_total),
                    saldo_anterior: saldoActual,
                    monto_pagado: montoNum,
                    saldo_restante: nuevoSaldoRestante,
                    moneda: formData.moneda,
                    forma_pago: formaPagoObj?.forma_pago || 'Efectivo',
                    recibo: formData.recibo,
                    factura: formData.factura,
                    observacion: formData.observacion,
                    usuario_nombre: (user as any)?.name || (user as any)?.nombre || 'Administración',
                });
                setShowReciboModal(true);
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo guardar el pago', 'error');
        }
    };

    const filteredOrdenes = ordenes.filter(o => {
        const matchesSearch =
            o.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toString().includes(searchTerm) ||
            (o.nro_factura || '').toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filtroFacturacion === 'facturadas') return Boolean(o.facturado);
        if (filtroFacturacion === 'sin_facturar') return !o.facturado;
        return true;
    });

    const filteredPagos = pagos.filter(p =>
        p.orden_trabajo?.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.orden_trabajo?.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.idorden_trabajo?.toString().includes(searchTerm)
    );

    const currentFiltered = activeTab === 'pending' ? filteredOrdenes : filteredPagos;
    const totalPages = Math.ceil(currentFiltered.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItemsPending = filteredOrdenes.slice(indexOfFirstItem, indexOfLastItem);
    const currentItemsPagos = filteredPagos.slice(indexOfFirstItem, indexOfLastItem);

    const manualSections: ManualSection[] = [
        {
            title: 'Registro de Cobros y Pagos',
            content: 'Gestione los cobros de órdenes de trabajo. La pestaña "Pendientes con Saldo" lista las órdenes que aún deben cobrarse, y "Historial de Pagos" contiene los comprobantes de cobro emitidos.'
        },
        {
            title: 'Registro de Pagos a Cuenta o Totales',
            content: 'Haga clic en "Cobrar" en cualquier orden pendiente para registrar abonos parciales o la cancelación total. Se puede seleccionar la forma de pago (Efectivo, Tarjeta con comisión automática, Transferencia, QR, etc.) y emitir recibo o factura.'
        },
        {
            title: 'Exportación e Impresión',
            content: 'Utilice la barra superior para exportar la lista visualizada a Excel (.xlsx), generar un reporte formal en PDF con membrete y logo de EDKOR MOTORS o imprimir el reporte en papel.'
        }
    ];

    const exportToExcel = () => {
        if (activeTab === 'pending') {
            const data = filteredOrdenes.map((o, idx) => ({
                '#': idx + 1,
                'N° OT': o.nro_hoja ? String(o.nro_hoja).padStart(6, '0') : String(o.id).padStart(6, '0'),
                'Cliente': o.cliente,
                'Teléfono': o.cliente_telefono || (o as any).celular || '-',
                'Placa': (o.placa || '-').toUpperCase(),
                'Vehículo': `${o.vehiculo_marca || ''} ${o.vehiculo_modelo || ''}`.trim() || '-',
                'Fecha OT': o.fecha ? new Date(o.fecha).toLocaleDateString('es-ES') : '-',
                'Factura': o.nro_factura || 'Sin Factura',
                'Total OT': Number(o.total || o.sub_total || 0),
                'Saldo Pendiente': Number(o.saldo || 0),
                'Moneda': o.moneda || 'Bolivianos'
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'CobrosPendientes');
            XLSX.writeFile(wb, `Cobros_Pendientes_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
            const data = filteredPagos.map((p, idx) => ({
                '#': idx + 1,
                'N° OT': p.orden_trabajo?.id ? String(p.orden_trabajo.id).padStart(6, '0') : '-',
                'Fecha Pago': p.fecha ? new Date(p.fecha).toLocaleDateString('es-ES') : '-',
                'Cliente': p.orden_trabajo?.cliente || '-',
                'Placa': (p.orden_trabajo?.placa || '-').toUpperCase(),
                'Forma de Pago': p.forma_pago?.forma_pago || '-',
                'Monto Pagado': Number(p.monto || 0),
                'Moneda': p.moneda || 'Bolivianos',
                'N° Recibo': p.recibo || '-',
                'N° Factura': p.factura || '-',
                'Usuario': getUsuarioPagoNombre(p.usuario)
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'HistorialCobros');
            XLSX.writeFile(wb, `Historial_Cobros_${new Date().toISOString().split('T')[0]}.xlsx`);
        }
    };

    const exportToPDF = async () => {
        if (activeTab === 'pending') {
            const totalSaldoPendiente = filteredOrdenes.reduce((acc, curr) => acc + Number(curr.saldo || 0), 0);
            await exportStandardPDF({
                title: 'Reporte de Cobros Pendientes con Saldo',
                subtitle: 'EDKOR MOTORS - Gestión de Cobranza y Cuentas por Cobrar',
                filtersText: searchTerm ? `Búsqueda: "${searchTerm}"` : undefined,
                totalRecords: filteredOrdenes.length,
                totalRecordsLabel: 'Órdenes Pendientes',
                filename: `Cobros_Pendientes_${new Date().toISOString().split('T')[0]}.pdf`,
                tableOptions: {
                    head: [['#', 'N° OT', 'Cliente', 'Teléfono', 'Placa', 'Vehículo', 'Fecha OT', 'Factura', 'Total OT', 'Saldo Pendiente']],
                    body: filteredOrdenes.map((o, idx) => [
                        idx + 1,
                        o.nro_hoja ? String(o.nro_hoja).padStart(6, '0') : String(o.id).padStart(6, '0'),
                        o.cliente,
                        o.cliente_telefono || (o as any).celular || '-',
                        (o.placa || '-').toUpperCase(),
                        `${o.vehiculo_marca || ''} ${o.vehiculo_modelo || ''}`.trim() || '-',
                        o.fecha ? new Date(o.fecha).toLocaleDateString('es-ES') : '-',
                        o.nro_factura || 'S/N',
                        `Bs ${Number(o.total || o.sub_total || 0).toFixed(2)}`,
                        `Bs ${Number(o.saldo || 0).toFixed(2)}`
                    ]),
                    foot: [
                        [
                            { content: `TOTAL SALDOS PENDIENTES (${filteredOrdenes.length} ÓRDENES):`, colSpan: 9, styles: { halign: 'right', fontStyle: 'bold' } },
                            { content: `Bs ${totalSaldoPendiente.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } }
                        ]
                    ],
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 8 },
                        1: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
                        2: { cellWidth: 'auto' },
                        3: { cellWidth: 22, fontSize: 6.5 },
                        4: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
                        5: { cellWidth: 32 },
                        6: { halign: 'center', cellWidth: 20 },
                        7: { halign: 'center', cellWidth: 18, fontSize: 6.5 },
                        8: { halign: 'right', cellWidth: 24 },
                        9: { halign: 'right', fontStyle: 'bold', cellWidth: 26, textColor: [220, 38, 38] }
                    }
                }
            });
        } else {
            const totalMontoCobrado = filteredPagos.reduce((acc, curr) => acc + Number(curr.monto || 0), 0);
            await exportStandardPDF({
                title: 'Historial de Cobros y Recibos Emitidos',
                subtitle: 'EDKOR MOTORS - Reporte de Pagos Recibidos',
                filtersText: searchTerm ? `Búsqueda: "${searchTerm}"` : undefined,
                totalRecords: filteredPagos.length,
                totalRecordsLabel: 'Pagos Registrados',
                filename: `Historial_Cobros_${new Date().toISOString().split('T')[0]}.pdf`,
                tableOptions: {
                    head: [['#', 'N° OT', 'Fecha Pago', 'Cliente', 'Placa', 'Forma Pago', 'N° Recibo', 'N° Factura', 'Usuario', 'Monto Cobrado']],
                    body: filteredPagos.map((p, idx) => [
                        idx + 1,
                        p.orden_trabajo?.id ? String(p.orden_trabajo.id).padStart(6, '0') : '-',
                        p.fecha ? formatDate(p.fecha) : '-',
                        p.orden_trabajo?.cliente || '-',
                        (p.orden_trabajo?.placa || '-').toUpperCase(),
                        p.forma_pago?.forma_pago || 'Efectivo',
                        p.recibo || '-',
                        p.factura || '-',
                        getUsuarioPagoNombre(p.usuario),
                        `Bs ${Number(p.monto || 0).toFixed(2)}`
                    ]),
                    foot: [
                        [
                            { content: `TOTAL COBRADO (${filteredPagos.length} PAGOS):`, colSpan: 9, styles: { halign: 'right', fontStyle: 'bold' } },
                            { content: `Bs ${totalMontoCobrado.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [22, 101, 52] } }
                        ]
                    ],
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 8 },
                        1: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
                        2: { halign: 'center', cellWidth: 20 },
                        3: { cellWidth: 'auto' },
                        4: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
                        5: { cellWidth: 26 },
                        6: { halign: 'center', cellWidth: 20 },
                        7: { halign: 'center', cellWidth: 20 },
                        8: { cellWidth: 28, fontSize: 6.5 },
                        9: { halign: 'right', fontStyle: 'bold', cellWidth: 26, textColor: [22, 101, 52] }
                    }
                }
            });
        }
    };

    const handlePrintList = () => {
        setIsPrintingList(true);
        setTimeout(() => {
            window.print();
            setIsPrintingList(false);
        }, 150);
    };

    const montoIngresadoNum = parseFloat(formData.monto) || 0;
    const saldoActualSeleccionado = selectedOrden ? Number(selectedOrden.saldo) : 0;
    const nuevoSaldoCalculado = Math.max(0, Number((saldoActualSeleccionado - montoIngresadoNum).toFixed(2)));
    const esMontoExcedido = !editingPago && montoIngresadoNum > saldoActualSeleccionado + 0.05;
    const esCancelacionExacta = !editingPago && Math.abs(montoIngresadoNum - saldoActualSeleccionado) <= 0.05 && montoIngresadoNum > 0;

    return (
        <>
            <div className="container mx-auto p-6 max-w-7xl print:hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Receipt className="text-green-600" size={32} />
                        Cobros y Registro de Pagos
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Control de cobros a clientes, pagos parciales a cuenta y saldos pendientes
                    </p>
                </div>

                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={handlePrintList}
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
                        Pendientes con Saldo ({ordenes.length})
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
                        Historial de Pagos
                    </div>
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[400px]">
                {/* Search Bar & Filtros de Facturación */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
                        <div className="relative max-w-xs w-full">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por orden, cliente, placa o factura..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-all shadow-sm text-sm"
                            />
                        </div>

                        {activeTab === 'pending' && (
                            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => { setFiltroFacturacion('todas'); setCurrentPage(1); }}
                                    className={`px-2.5 py-1.5 rounded-md transition-colors ${filtroFacturacion === 'todas' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100'}`}
                                >
                                    Todas ({ordenes.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setFiltroFacturacion('facturadas'); setCurrentPage(1); }}
                                    className={`px-2.5 py-1.5 rounded-md transition-colors flex items-center gap-1 ${filtroFacturacion === 'facturadas' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100'}`}
                                >
                                    <ReceiptText size={13} />
                                    Facturadas ({ordenes.filter(o => o.facturado).length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setFiltroFacturacion('sin_facturar'); setCurrentPage(1); }}
                                    className={`px-2.5 py-1.5 rounded-md transition-colors ${filtroFacturacion === 'sin_facturar' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100'}`}
                                >
                                    Sin Facturar ({ordenes.filter(o => !o.facturado).length})
                                </button>
                            </div>
                        )}
                    </div>

                    {activeTab === 'pending' && ordenes.length > 0 && (
                        <div className="flex items-center gap-4 text-xs font-semibold">
                            <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                                Con Abonos: {ordenes.filter(o => Number(o.total_pagado) > 0).length}
                            </span>
                            <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                                Sin Abonos: {ordenes.filter(o => Number(o.total_pagado) === 0).length}
                            </span>
                        </div>
                    )}
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
                                    <th className="p-4 w-12">#</th>
                                    <th className="p-4">N° Orden</th>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4">Cliente</th>
                                    <th className="p-4">Placa</th>
                                    {activeTab === 'pending' ? (
                                        <>
                                            <th className="p-4">Facturación</th>
                                            <th className="p-4 text-right">Total Orden</th>
                                            <th className="p-4 text-right">Abonado</th>
                                            <th className="p-4 text-right">Saldo Pendiente</th>
                                            <th className="p-4 text-center">Estado Pago</th>
                                            <th className="p-4 text-center">Acciones</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="p-4 text-right">Monto Pagado</th>
                                            <th className="p-4">Forma Pago</th>
                                            <th className="p-4">Usuario</th>
                                            <th className="p-4">Concepto</th>
                                            <th className="p-4 text-center">Acciones</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                                {activeTab === 'pending' ? (
                                    filteredOrdenes.length > 0 ? (
                                        currentItemsPending.map((orden, index) => {
                                            const totalOrdenVal = Number(orden.total || orden.sub_total || 0);
                                            const pagadoVal = Number(orden.total_pagado || 0);
                                            const saldoVal = Number(orden.saldo || 0);
                                            const porcentajePagado = totalOrdenVal > 0 ? Math.min(100, Math.round((pagadoVal / totalOrdenVal) * 100)) : 0;
                                            const tienePagosPrevios = pagadoVal > 0;

                                            return (
                                                <tr key={orden.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="p-4 text-gray-500 dark:text-gray-400 font-medium">{indexOfFirstItem + index + 1}</td>
                                                    <td className="p-4">
                                                        <span className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer" onClick={() => handleVerHistorialOrden(orden)}>
                                                            #{orden.id}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-gray-700 dark:text-gray-300">
                                                        {formatDate(orden.fecha_registro)}
                                                    </td>
                                                    <td className="p-4">
                                                        {(() => {
                                                            const tipo = (orden as any).hoja_recepcion?.tipo_orden?.tipo_orden || (orden as any).particular_seguro || 'Particular';
                                                            const isSeguro = String(tipo).toLowerCase().includes('seguro');
                                                            return (
                                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${isSeguro
                                                                    ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                                                                    : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                                                    }`}>
                                                                    {tipo}
                                                                </span>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="p-4 font-medium text-gray-900 dark:text-white">
                                                        {orden.cliente}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="font-mono font-bold uppercase text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                            {orden.placa}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        {orden.facturado ? (
                                                            <div className="flex flex-col items-start gap-0.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFacturarOrdenFromPagos(orden)}
                                                                    className="whitespace-nowrap inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-200 cursor-pointer transition-colors"
                                                                    title="Clic para editar N° o fecha de factura"
                                                                >
                                                                    <ReceiptText size={12} className="text-blue-600 dark:text-blue-400" />
                                                                    <span>Fact: {orden.nro_factura || 'S/N'}</span>
                                                                </button>
                                                                {orden.fecha_facturado && (
                                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                                                                        {formatDate(orden.fecha_facturado)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleFacturarOrdenFromPagos(orden)}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-transparent transition-colors cursor-pointer"
                                                                title="Clic para registrar factura"
                                                            >
                                                                <ReceiptText size={12} className="text-gray-400" />
                                                                <span>Sin facturar</span>
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-gray-900 dark:text-white">
                                                        {totalOrdenVal.toFixed(2)} Bs
                                                    </td>
                                                    <td className="p-4 text-right font-semibold text-green-600 dark:text-green-400">
                                                        {pagadoVal.toFixed(2)} Bs
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-red-600 dark:text-red-400 text-base">
                                                        {saldoVal.toFixed(2)} Bs
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {tienePagosPrevios ? (
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                                    Abonado {porcentajePagado}%
                                                                </span>
                                                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                                                    {orden.pagos?.length || 1} {orden.pagos?.length === 1 ? 'abono' : 'abonos'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                                                Sin Abonos (0%)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                onClick={() => handleRegistrarPago(orden, 'total')}
                                                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-all"
                                                                title="Cobrar / Registrar Pago"
                                                            >
                                                                <DollarSign size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleVerHistorialOrden(orden)}
                                                                className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg transition-all"
                                                                title="Ver Historial de Abonos y Saldo"
                                                            >
                                                                <Eye size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleFacturarOrdenFromPagos(orden)}
                                                                className="p-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-lg transition-all"
                                                                title={orden.facturado ? "Modificar Datos de Facturación" : "Registrar Factura de la Orden"}
                                                            >
                                                                <ReceiptText size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={12} className="p-12 text-center text-gray-500 dark:text-gray-400">
                                                <div className="flex flex-col items-center gap-3">
                                                    <CheckCircle size={48} className="text-green-500/50" />
                                                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">¡Al día! No hay órdenes con saldo pendiente de cobro</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ) : (
                                    filteredPagos.length > 0 ? (
                                        currentItemsPagos.map((pago, index) => (
                                            <tr key={pago.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                <td className="p-4 text-gray-500 dark:text-gray-400 font-medium">{indexOfFirstItem + index + 1}</td>
                                                <td className="p-4 text-blue-600 dark:text-blue-400 font-bold text-sm">#{pago.idorden_trabajo}</td>
                                                <td className="p-4 text-gray-700 dark:text-gray-300">
                                                    {formatDate(pago.fecha)}
                                                </td>
                                                <td className="p-4">
                                                    {(() => {
                                                        const tipo = (pago.orden_trabajo as any)?.hoja_recepcion?.tipo_orden?.tipo_orden || (pago.orden_trabajo as any)?.particular_seguro || 'Particular';
                                                        const isSeguro = String(tipo).toLowerCase().includes('seguro');
                                                        return (
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${isSeguro
                                                                ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                                                                : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                                                                }`}>
                                                                {tipo}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="p-4 text-gray-800 dark:text-gray-200 font-medium">
                                                    {pago.orden_trabajo?.cliente || pago.orden_trabajo?.cliente_nombre || 'N/A'}
                                                </td>
                                                <td className="p-4">
                                                    <span className="font-mono font-bold uppercase text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">
                                                        {pago.orden_trabajo?.placa || pago.orden_trabajo?.vehiculo_placa || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-bold text-green-600 dark:text-green-400">
                                                    {Number(pago.monto).toFixed(2)} {pago.moneda === 'Dólares' ? '$us' : 'Bs'}
                                                    {pago.moneda === 'Dólares' && pago.tc && (
                                                        <span className="block text-[11px] text-gray-500 font-normal">
                                                            TC: {Number(pago.tc).toFixed(2)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-gray-700 dark:text-gray-300 text-sm">
                                                    {pago.forma_pago?.forma_pago || 'N/A'}
                                                </td>
                                                <td className="p-4 text-gray-700 dark:text-gray-300 text-sm">
                                                    {pago.usuario?.nombre ? `${pago.usuario.nombre} ${pago.usuario.paterno || ''}`.trim() : (pago.usuario?.name || 'N/A')}
                                                </td>
                                                <td className="p-4 text-gray-500 dark:text-gray-400 text-xs italic">
                                                    {pago.observacion || '-'}
                                                </td>
                                                <td className="p-4 flex gap-1.5 justify-center">
                                                    {pago.comprobante && (
                                                        <a
                                                            href={`${API_BASE_URL}/files/${pago.comprobante}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition-all flex items-center justify-center"
                                                            title="Ver Comprobante / Transferencia"
                                                        >
                                                            <ExternalLink size={15} />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleImprimirReciboFromPago(pago)}
                                                        className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                                                        title="Imprimir Comprobante de Cobro"
                                                    >
                                                        <Printer size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSendWhatsAppReceipt(pago)}
                                                        className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                                                        title="Enviar Recibo por WhatsApp"
                                                    >
                                                        <MessageCircle size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditPago(pago)}
                                                        className="p-1.5 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                                                        title="Editar Pago"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePago(pago.id)}
                                                        className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                                                        title="Eliminar Pago"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={11} className="p-12 text-center text-gray-500 dark:text-gray-400">
                                                No hay pagos registrados en el historial
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

                {filteredOrdenes.length > 0 && activeTab === 'pending' && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800 flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-300">
                            Total de órdenes con saldo: <strong className="text-gray-900 dark:text-white">{filteredOrdenes.length}</strong>
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-600 dark:text-gray-300 font-semibold">Total Saldo Pendiente de Cobro:</span>
                            <span className="text-2xl font-black text-red-600 dark:text-red-400">
                                {filteredOrdenes.reduce((sum, o) => sum + Number(o.saldo), 0).toFixed(2)} Bs
                            </span>
                        </div>
                    </div>
                )}
            </div>
            </div>

            {/* Modal de Registro / Edición de Pago con Manejo de Saldo y Pagos Parciales */}
            {showModal && selectedOrden && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-xs print:hidden">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in duration-200">
                        
                        {/* Header Modal */}
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <DollarSign size={24} />
                                        {editingPago ? 'Editar Registro de Pago' : 'Registrar Cobro / Abono'}
                                    </h2>
                                    <p className="text-emerald-100 text-xs mt-0.5">
                                        Orden #{selectedOrden.id} • Cliente: <strong className="text-white">{selectedOrden.cliente}</strong> • Placa: <strong className="text-white font-mono uppercase">{selectedOrden.placa}</strong>
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setSelectedOrden(null);
                                        setEditingPago(null);
                                    }}
                                    className="p-1.5 text-white/80 hover:text-white rounded-lg transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer hover:bg-white/10"
                                    title="Cerrar ventana"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tarjetas de Resumen Financiero de la Orden */}
                            {!editingPago && (
                                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-emerald-500/40 text-center">
                                    <div className="bg-white/10 rounded-lg p-2 backdrop-blur-xs">
                                        <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-semibold">Total Orden</p>
                                        <p className="text-base font-black text-white">
                                            {Number(selectedOrden.total || selectedOrden.sub_total).toFixed(2)} Bs
                                        </p>
                                    </div>
                                    <div className="bg-white/10 rounded-lg p-2 backdrop-blur-xs">
                                        <p className="text-[10px] text-emerald-100 uppercase tracking-wider font-semibold">Ya Abonado</p>
                                        <p className="text-base font-black text-emerald-200">
                                            {Number(selectedOrden.total_pagado).toFixed(2)} Bs
                                        </p>
                                    </div>
                                    <div className="bg-white/20 rounded-lg p-2 backdrop-blur-xs border border-white/30">
                                        <p className="text-[10px] text-yellow-200 uppercase tracking-wider font-bold">Saldo Actual</p>
                                        <p className="text-base font-black text-yellow-300">
                                            {Number(selectedOrden.saldo).toFixed(2)} Bs
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            
                            {/* Selector de Modalidad: Saldo Total vs Pago Parcial */}
                            {!editingPago && (
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                                        Modalidad de Cobro:
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleSelectModalidad('total')}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                                                modalidadPago === 'total'
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            <CheckCircle size={14} /> Liquidar Saldo Total ({Number(selectedOrden.saldo).toFixed(2)} Bs)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectModalidad('parcial')}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                                                modalidadPago === 'parcial'
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            <Coins size={14} /> Pago Parcial / A Cuenta
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Fecha de Pago *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="date"
                                            value={formData.fecha}
                                            onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Monto a Cobrar *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <DollarSign className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.monto}
                                            onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                                            className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold ${
                                                esMontoExcedido
                                                    ? 'border-red-500 focus:ring-red-500 text-red-600'
                                                    : 'border-gray-300 dark:border-gray-600 focus:ring-emerald-500'
                                            }`}
                                            placeholder="0.00"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Moneda *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Coins className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <select
                                            value={formData.moneda}
                                            onChange={(e) => setFormData({ ...formData, moneda: e.target.value, tc: '' })}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                            required
                                        >
                                            <option value="Bolivianos">Bolivianos (Bs)</option>
                                            <option value="Dólares">Dólares ($us)</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.moneda === 'Dólares' ? (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Tipo de Cambio *
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <RefreshCw className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.tc}
                                                onChange={(e) => setFormData({ ...formData, tc: e.target.value })}
                                                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                placeholder="6.96"
                                                required
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Forma de Pago *
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <div className="relative flex-1">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CreditCard className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <select
                                                    value={formData.idforma_pago}
                                                    onChange={(e) => setFormData({ ...formData, idforma_pago: e.target.value })}
                                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                    required
                                                >
                                                    <option value="">-- Seleccionar --</option>
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
                                                className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0 cursor-pointer"
                                                title="Registrar nueva Forma de Pago"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {formData.moneda === 'Dólares' && (
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Forma de Pago *
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <div className="relative flex-1">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CreditCard className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <select
                                                    value={formData.idforma_pago}
                                                    onChange={(e) => setFormData({ ...formData, idforma_pago: e.target.value })}
                                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                                    required
                                                >
                                                    <option value="">-- Seleccionar --</option>
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
                                                className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0 cursor-pointer"
                                                title="Registrar nueva Forma de Pago"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        N° Recibo Físico (Opcional)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Receipt className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.recibo}
                                            onChange={(e) => setFormData({ ...formData, recibo: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                            placeholder="Ej: REC-00123"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        N° Factura (Opcional)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FileText className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.factura}
                                            onChange={(e) => setFormData({ ...formData, factura: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                            placeholder="Ej: FAC-4589"
                                        />
                                    </div>
                                </div>

                                {formData.idforma_pago && formasPago.find(fp => fp.id.toString() === formData.idforma_pago)?.forma_pago.toLowerCase().includes('tarjeta') && (
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                            Red de Banco (Comisión)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Building className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <select
                                                value={formData.idcomision_tarjeta}
                                                onChange={(e) => setFormData({ ...formData, idcomision_tarjeta: e.target.value })}
                                                className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                            >
                                                <option value="">Seleccione Red de Banco</option>
                                                {comisionesTarjeta.map(ct => (
                                                    <option key={ct.id} value={ct.id}>
                                                        {ct.red_banco} ({Number(ct.comision)}%)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Observación / Concepto
                                    </label>
                                    <div className="relative">
                                        <div className="absolute top-2.5 left-3 pointer-events-none">
                                            <MessageSquare className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <textarea
                                            value={formData.observacion}
                                            onChange={(e) => setFormData({ ...formData, observacion: e.target.value })}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                            rows={2}
                                            placeholder="Notas del cobro (ej: Abono a cuenta por repuestos...)"
                                        />
                                    </div>
                                </div>

                                {/* Comprobante de Pago (Transferencia / Imagen o PDF) */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                        Comprobante de Pago (Transferencia / Depósito / Foto o PDF)
                                    </label>
                                    {formData.comprobante ? (
                                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {formData.comprobante.toLowerCase().endsWith('.pdf') ? (
                                                    <div className="w-12 h-12 flex-shrink-0 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400">
                                                        <FileText size={24} />
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={`${API_BASE_URL}/files/${formData.comprobante}`}
                                                        alt="Comprobante"
                                                        className="w-12 h-12 flex-shrink-0 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                                        onError={(e) => {
                                                            (e.target as any).style.display = 'none';
                                                        }}
                                                    />
                                                )}
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-xs">
                                                        {formData.comprobante}
                                                    </p>
                                                    <a
                                                        href={`${API_BASE_URL}/files/${formData.comprobante}`}
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
                                                onClick={handleRemoveComprobante}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors ml-2"
                                                title="Quitar comprobante"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-emerald-500 rounded-lg p-3.5 text-center transition-colors bg-white dark:bg-gray-700/50">
                                            <input
                                                type="file"
                                                accept="image/*,application/pdf"
                                                onChange={handleComprobanteUpload}
                                                disabled={uploadingComprobante}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                {uploadingComprobante ? (
                                                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-medium py-1">
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                        Subiendo archivo de comprobante...
                                                    </div>
                                                ) : (
                                                    <>
                                                        <Upload className="w-5 h-5 text-gray-400 dark:text-gray-400" />
                                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                            Haga clic o arrastre aquí el comprobante de transferencia (Imagen o PDF)
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

                            {/* Caja Dinámica de Proyección de Saldo */}
                            {!editingPago && selectedOrden && (
                                <div className={`p-3.5 rounded-xl border transition-all text-xs ${
                                    esMontoExcedido
                                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                                        : esCancelacionExacta
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
                                }`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold flex items-center gap-1.5">
                                            {esMontoExcedido ? (
                                                <AlertCircle size={15} className="text-red-600" />
                                            ) : esCancelacionExacta ? (
                                                <CheckCircle size={15} className="text-emerald-600" />
                                            ) : (
                                                <Coins size={15} className="text-blue-600" />
                                            )}
                                            {esMontoExcedido
                                                ? '¡Error de Saldo Excedido!'
                                                : esCancelacionExacta
                                                ? '¡Cancelación Total del Saldo!'
                                                : 'Abono Parcial a Cuenta'}
                                        </span>
                                        <span className="font-mono text-sm font-black">
                                            Nuevo Saldo: {nuevoSaldoCalculado.toFixed(2)} Bs
                                        </span>
                                    </div>
                                    <p className="text-[11px] opacity-90">
                                        {esMontoExcedido
                                            ? `El monto cobrado no puede superar el saldo pendiente de ${saldoActualSeleccionado.toFixed(2)} Bs.`
                                            : esCancelacionExacta
                                            ? 'Con este pago, la orden quedará completamente saldada al 100% y se cerrará automáticamente.'
                                            : `El cliente mantendrá un saldo pendiente de ${nuevoSaldoCalculado.toFixed(2)} Bs que podrá abonar posteriormente.`}
                                    </p>
                                </div>
                            )}

                            {/* Pagos Anteriores Colapsables */}
                            {!editingPago && selectedOrden.pagos && selectedOrden.pagos.length > 0 && (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setShowPagosPreviosEnModal(!showPagosPreviosEnModal)}
                                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Receipt size={14} className="text-blue-600" />
                                            Ver Abonos Parciales Previos ({selectedOrden.pagos.length} registrados)
                                        </span>
                                        {showPagosPreviosEnModal ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    {showPagosPreviosEnModal && (
                                        <div className="p-3 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700 text-xs max-h-36 overflow-y-auto">
                                            {selectedOrden.pagos.map((p, idx) => (
                                                <div key={p.id || idx} className="py-1.5 flex justify-between items-center">
                                                    <div>
                                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                            Abono #{idx + 1} ({formatDate(p.fecha)})
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 block">
                                                            {p.forma_pago?.forma_pago || 'Pago'} {p.recibo ? `• Recibo: ${p.recibo}` : ''}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {p.comprobante && (
                                                            <a
                                                                href={`${API_BASE_URL}/files/${p.comprobante}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 text-[11px] font-medium"
                                                                title="Ver Comprobante de Transferencia"
                                                            >
                                                                <FileText size={12} /> Comprobante
                                                            </a>
                                                        )}
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                                            +{Number(p.monto).toFixed(2)} {p.moneda === 'Dólares' ? '$us' : 'Bs'}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Botones de Acción */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={esMontoExcedido || montoIngresadoNum <= 0}
                                    className={`flex-1 px-6 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 text-white cursor-pointer ${
                                        esMontoExcedido || montoIngresadoNum <= 0
                                            ? 'bg-gray-400 cursor-not-allowed opacity-60 !transform-none !shadow-none'
                                            : esCancelacionExacta
                                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                                    }`}
                                >
                                    <DollarSign size={18} />
                                    {editingPago
                                        ? 'Actualizar Registro de Pago'
                                        : esCancelacionExacta
                                        ? 'Liquidar Saldo Total (100%)'
                                        : `Registrar Abono (${montoIngresadoNum.toFixed(2)} Bs)`}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setSelectedOrden(null);
                                        setEditingPago(null);
                                    }}
                                    className="flex items-center justify-center gap-1.5 px-5 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer text-sm"
                                >
                                    <X size={16} /> Cerrar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Historial de Abonos y Saldo de una Orden Específica */}
            {showHistorialOrdenModal && selectedOrdenHistorial && (
                <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-xs print:hidden">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in duration-200">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <Receipt size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Estado de Cuenta y Abonos</h2>
                                    <p className="text-blue-100 text-xs">
                                        Orden #{selectedOrdenHistorial.id} • Cliente: {selectedOrdenHistorial.cliente} • Placa: {selectedOrdenHistorial.placa}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowHistorialOrdenModal(false);
                                    setSelectedOrdenHistorial(null);
                                }}
                                className="p-1 text-white/80 hover:text-white rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Contenido */}
                        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                            {/* Estado de Facturación de la Orden */}
                            <div className="p-3 bg-blue-50/70 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <ReceiptText size={18} className="text-blue-600 dark:text-blue-400" />
                                    <div>
                                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                                            {selectedOrdenHistorial.facturado
                                                ? `Orden Facturada: N° ${selectedOrdenHistorial.nro_factura || 'S/N'}`
                                                : 'Orden Sin Facturar'}
                                        </p>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                            {selectedOrdenHistorial.facturado
                                                ? `Fecha de emisión: ${selectedOrdenHistorial.fecha_facturado ? formatDate(selectedOrdenHistorial.fecha_facturado) : 'No especificada'}`
                                                : 'Aún no se ha registrado número de factura para esta orden.'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowHistorialOrdenModal(false);
                                        handleFacturarOrdenFromPagos(selectedOrdenHistorial);
                                    }}
                                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all"
                                >
                                    {selectedOrdenHistorial.facturado ? 'Modificar Factura' : 'Facturar Orden'}
                                </button>
                            </div>

                            {/* Resumen Financiero */}
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 font-semibold uppercase">Total Trabajo</p>
                                    <p className="text-lg font-black text-gray-900 dark:text-white">
                                        {Number(selectedOrdenHistorial.total || selectedOrdenHistorial.sub_total).toFixed(2)} Bs
                                    </p>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                                    <p className="text-xs text-green-700 dark:text-green-300 font-semibold uppercase">Total Pagado</p>
                                    <p className="text-lg font-black text-green-600 dark:text-green-400">
                                        {Number(selectedOrdenHistorial.total_pagado).toFixed(2)} Bs
                                    </p>
                                </div>
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                    <p className="text-xs text-red-700 dark:text-red-300 font-semibold uppercase">Saldo Pendiente</p>
                                    <p className="text-lg font-black text-red-600 dark:text-red-400">
                                        {Number(selectedOrdenHistorial.saldo).toFixed(2)} Bs
                                    </p>
                                </div>
                            </div>

                            {/* Barra de Progreso */}
                            <div className="p-3 bg-gray-50 dark:bg-gray-700/20 rounded-xl border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-center text-xs font-semibold mb-1 text-gray-600 dark:text-gray-300">
                                    <span>Progreso del Pago:</span>
                                    <span>
                                        {Math.min(100, Math.round((Number(selectedOrdenHistorial.total_pagado) / (Number(selectedOrdenHistorial.total || selectedOrdenHistorial.sub_total) || 1)) * 100))}%
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${Math.min(100, Math.round((Number(selectedOrdenHistorial.total_pagado) / (Number(selectedOrdenHistorial.total || selectedOrdenHistorial.sub_total) || 1)) * 100))}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Lista de Abonos */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                                    Historial de Abonos Realizados:
                                </h3>
                                {selectedOrdenHistorial.pagos && selectedOrdenHistorial.pagos.length > 0 ? (
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                                        {selectedOrdenHistorial.pagos.map((pago, idx) => (
                                            <div key={pago.id || idx} className="p-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900 dark:text-white">
                                                            Abono #{idx + 1}
                                                        </span>
                                                        <span className="text-gray-500">
                                                            • {formatDate(pago.fecha)}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                            {pago.forma_pago?.forma_pago || 'Pago'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {pago.recibo && <span className="mr-2">Recibo: <strong>{pago.recibo}</strong></span>}
                                                        {pago.observacion && <span>Obs: {pago.observacion}</span>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                        +{Number(pago.monto).toFixed(2)} {pago.moneda === 'Dólares' ? '$us' : 'Bs'}
                                                    </span>
                                                    {pago.comprobante && (
                                                        <a
                                                            href={`${API_BASE_URL}/files/${pago.comprobante}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 rounded-lg transition-all flex items-center justify-center"
                                                            title="Ver Comprobante / Transferencia"
                                                        >
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => handleImprimirReciboFromPago(pago, selectedOrdenHistorial)}
                                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg transition-all"
                                                        title="Imprimir Comprobante de este Abono"
                                                    >
                                                        <Printer size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSendWhatsAppReceipt(pago, selectedOrdenHistorial)}
                                                        className="p-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg transition-all"
                                                        title="Enviar Recibo por WhatsApp"
                                                    >
                                                        <MessageCircle size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 text-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-xs">
                                        No hay pagos parciales registrados aún para esta orden.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/40 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                                Saldo actual: <strong className="text-red-600 font-bold">{Number(selectedOrdenHistorial.saldo).toFixed(2)} Bs</strong>
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const ord = selectedOrdenHistorial;
                                        setShowHistorialOrdenModal(false);
                                        setSelectedOrdenHistorial(null);
                                        handleRegistrarPago(ord, 'parcial');
                                    }}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center gap-1.5"
                                >
                                    <DollarSign size={15} /> Registrar Nuevo Abono
                                </button>
                                <button
                                    onClick={() => {
                                        setShowHistorialOrdenModal(false);
                                        setSelectedOrdenHistorial(null);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                                >
                                    <X size={14} /> Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Recibo Imprimible */}
            <ReciboCobroModal
                isOpen={showReciboModal}
                onClose={() => setShowReciboModal(false)}
                reciboData={reciboData}
            />

            {/* Modal: Registrar Nueva Forma de Pago */}
            {showModalFormaPago && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs print:hidden">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-orange-500" /> Nueva Forma de Pago
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowModalFormaPago(false)}
                                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center cursor-pointer"
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
                                    placeholder="Ej: Transferencia QR, Cheque, Depósito Banco, etc."
                                    value={nuevaFormaPagoNombre}
                                    onChange={(e) => setNuevaFormaPagoNombre(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModalFormaPago(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    <span>Cancelar</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingFormaPago || !nuevaFormaPagoNombre.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{savingFormaPago ? 'Guardando...' : 'Guardar Forma de Pago'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual - Registro de Cobros"
                sections={manualSections}
            />

            {/* Print View Cobros */}
            {isPrintingList && (
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
                        title={activeTab === 'pending' ? 'Reporte de Cobros Pendientes con Saldo' : 'Historial de Cobros y Recibos'}
                        subtitle="EDKOR MOTORS - Gestión de Cobranza y Cuentas por Cobrar"
                        filtersText={searchTerm ? `Búsqueda: "${searchTerm}"` : undefined}
                        totalRecords={activeTab === 'pending' ? filteredOrdenes.length : filteredPagos.length}
                        totalRecordsLabel={activeTab === 'pending' ? 'Órdenes Pendientes' : 'Pagos Registrados'}
                    />

                    {activeTab === 'pending' ? (
                        <table className="w-full text-left border border-gray-400 text-[10px]">
                            <thead>
                                <tr className="bg-gray-100 text-gray-900 border-b border-gray-400 font-bold uppercase text-[9px]">
                                    <th className="p-1.5 border-r border-gray-300 text-center w-8">#</th>
                                    <th className="p-1.5 border-r border-gray-300 text-center w-16">N° OT</th>
                                    <th className="p-1.5 border-r border-gray-300">Cliente</th>
                                    <th className="p-1.5 border-r border-gray-300 w-22">Teléfono</th>
                                    <th className="p-1.5 border-r border-gray-300 text-center w-16">Placa</th>
                                    <th className="p-1.5 border-r border-gray-300 w-32">Vehículo</th>
                                    <th className="p-1.5 border-r border-gray-300 text-center w-20">Fecha OT</th>
                                    <th className="p-1.5 border-r border-gray-300 text-center w-18">Factura</th>
                                    <th className="p-1.5 border-r border-gray-300 text-right w-22">Total OT</th>
                                    <th className="p-1.5 text-right w-24">Saldo Pendiente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrdenes.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-4 text-center text-gray-500 italic">
                                            No hay órdenes pendientes con saldo.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrdenes.map((o, idx) => (
                                        <tr key={o.id} className={`border-b border-gray-200 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                                            <td className="p-1.5 border-r border-gray-200 text-center font-medium">{idx + 1}</td>
                                            <td className="p-1.5 border-r border-gray-200 text-center font-bold text-gray-900">
                                                {o.nro_hoja ? String(o.nro_hoja).padStart(6, '0') : String(o.id).padStart(6, '0')}
                                            </td>
                                            <td className="p-1.5 border-r border-gray-200">{o.cliente}</td>
                                            <td className="p-1.5 border-r border-gray-200 text-[9px]">{o.cliente_telefono || (o as any).celular || '-'}</td>
                                            <td className="p-1.5 border-r border-gray-200 text-center font-bold">{(o.placa || '-').toUpperCase()}</td>
                                            <td className="p-1.5 border-r border-gray-200 font-medium">{`${o.vehiculo_marca || ''} ${o.vehiculo_modelo || ''}`.trim() || '-'}</td>
                                            <td className="p-1.5 border-r border-gray-200 text-center">{o.fecha ? new Date(o.fecha).toLocaleDateString('es-ES') : '-'}</td>
                                            <td className="p-1.5 border-r border-gray-200 text-center text-[9px]">{o.nro_factura || 'S/N'}</td>
                                            <td className="p-1.5 border-r border-gray-200 text-right">Bs {Number(o.total || o.sub_total || 0).toFixed(2)}</td>
                                            <td className="p-1.5 text-right font-bold text-red-600">Bs {Number(o.saldo || 0).toFixed(2)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {filteredOrdenes.length > 0 && (
                                <tfoot>
                                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-400 text-[10px]">
                                        <td colSpan={9} className="p-2 text-right uppercase border-r border-gray-300">
                                            Total Saldos Pendientes ({filteredOrdenes.length} órdenes):
                                        </td>
                                        <td className="p-2 text-right text-red-600 font-black">
                                            Bs {filteredOrdenes.reduce((acc, curr) => acc + Number(curr.saldo || 0), 0).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    ) : (
                        <table className="w-full text-left border border-gray-400 text-[10px]">
                            <thead>
                                <tr className="bg-gray-100 text-gray-900 border-b border-gray-400 font-bold uppercase text-[9px]">
                                    <th className="p-1.5 border-r border-gray-300 text-center w-8">#</th>
                                    <th className="p-1.5 border-r border-gray-300 text-center w-16">N° OT</th>
                                    <th className="p-1.5 border-r border-gray-300 text-center w-20">Fecha Pago</th>
                                    <th className="p-1.5 border-r border-gray-300">Cliente</th>
                                    <th className="p-1.5 border-r border-gray-300 text-center w-16">Placa</th>
                                    <th className="p-1.5 border-r border-gray-300 w-24">Forma Pago</th>
                                    <th className="p-1.5 border-r border-gray-300 text-center w-18">N° Recibo</th>
                                    <th className="p-1.5 border-r border-gray-300 text-center w-18">N° Factura</th>
                                    <th className="p-1.5 border-r border-gray-300 text-center w-28">Usuario</th>
                                    <th className="p-1.5 text-right w-24">Monto Cobrado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPagos.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="p-4 text-center text-gray-500 italic">
                                            No hay pagos registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPagos.map((p, idx) => (
                                        <tr key={p.id} className={`border-b border-gray-200 ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
                                            <td className="p-1.5 border-r border-gray-200 text-center font-medium">{idx + 1}</td>
                                            <td className="p-1.5 border-r border-gray-200 text-center font-bold text-gray-900">
                                                {p.orden_trabajo?.id ? String(p.orden_trabajo.id).padStart(6, '0') : '-'}
                                            </td>
                                            <td className="p-1.5 border-r border-gray-200 text-center">{p.fecha ? formatDate(p.fecha) : '-'}</td>
                                            <td className="p-1.5 border-r border-gray-200">{p.orden_trabajo?.cliente || '-'}</td>
                                            <td className="p-1.5 border-r border-gray-200 text-center font-bold">{(p.orden_trabajo?.placa || '-').toUpperCase()}</td>
                                            <td className="p-1.5 border-r border-gray-200">{p.forma_pago?.forma_pago || 'Efectivo'}</td>
                                            <td className="p-1.5 border-r border-gray-200 text-center text-[9px]">{p.recibo || '-'}</td>
                                            <td className="p-1.5 border-r border-gray-200 text-center text-[9px]">{p.factura || '-'}</td>
                                            <td className="p-1.5 border-r border-gray-200 text-[9px] text-center">{getUsuarioPagoNombre(p.usuario)}</td>
                                            <td className="p-1.5 text-right font-bold text-green-700">Bs {Number(p.monto || 0).toFixed(2)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {filteredPagos.length > 0 && (
                                <tfoot>
                                    <tr className="bg-gray-100 font-bold border-t-2 border-gray-400 text-[10px]">
                                        <td colSpan={9} className="p-2 text-right uppercase border-r border-gray-300">
                                            Total Cobrado ({filteredPagos.length} pagos):
                                        </td>
                                        <td className="p-2 text-right text-green-700 font-black">
                                            Bs {filteredPagos.reduce((acc, curr) => acc + Number(curr.monto || 0), 0).toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    )}

                    <StandardPrintFooter />
                </div>
            )}

            {/* Offscreen Print Container para generar PDF idéntico al de impresión para WhatsApp */}
            {whatsappReciboData && (
                <div
                    style={{
                        position: "fixed",
                        left: "-99999px",
                        top: 0,
                        width: "720px",
                        backgroundColor: "#ffffff",
                        color: "#000000",
                        zIndex: -1,
                    }}
                >
                    <div ref={whatsappPrintRef} className="bg-white text-black p-4">
                        <ReciboCobroPrintView reciboData={whatsappReciboData} />
                    </div>
                </div>
            )}
        </>
    );
};

export default RegistroPagos;
