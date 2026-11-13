import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Calendar, Briefcase, User, Phone, FileText, Car, Hash, Gauge, Wrench, CheckCircle, XCircle, RotateCcw, FileSpreadsheet, Unlink, Download, ReceiptText, TrendingUp, History, Plus } from 'lucide-react';
import Swal from 'sweetalert2';
import type { CreateOrdenTrabajoData } from '../types/ordenTrabajo';
import { createOrdenTrabajo, updateOrdenTrabajo, getOrdenTrabajo, getOrdenTrabajoByPlaca, getTrabajosRechazadosByPlaca, type TrabajoRechazadoHistorial } from '../services/ordenTrabajoService';
import { getCotizacion, getCotizaciones } from '../services/cotizacionesService';
import type { Cotizacion } from '../types/cotizacion';
import { getHojasRecepcionPendientes, getHojaRecepcion, type HojaRecepcion } from '../services/hojaRecepcionService';
import { getAllMarcasAuto } from '../services/marcaAutoService';
import type { MarcaAuto } from '../types/marcaAuto';
import { createDetalleOrdenTrabajo, getDetallesByOrden } from '../services/detalleOrdenTrabajoService';
import { useAuth } from '../context/AuthContext';
import OrdenTrabajoDetalles from './OrdenTrabajoDetalles';
import UtilidadOrdenModal from '../components/UtilidadOrdenModal';
import { getLocalDateString } from '../utils/dateUtils';


const OrdenTrabajoForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const cotizacionIdParam = searchParams.get('cotizacionId');
    const hojaIdParam = searchParams.get('hojaId');
    const { user } = useAuth();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [showUtilidadModal, setShowUtilidadModal] = useState(false);
    const [mecanicoAsignadoInfo] = useState<{ id: string; nombre: string; cargo?: string } | null>(null);
    const [marcas, setMarcas] = useState<MarcaAuto[]>([]);
    const [hojasPendientes, setHojasPendientes] = useState<HojaRecepcion[]>([]);
    const [hojaInfo, setHojaInfo] = useState<HojaRecepcion | null>(null);
    const [cotizacionesList, setCotizacionesList] = useState<Cotizacion[]>([]);
    const [selectedCotizacionToJalar, setSelectedCotizacionToJalar] = useState<string>('');

    const [trabajosRechazados, setTrabajosRechazados] = useState<TrabajoRechazadoHistorial[]>([]);
    const [loadingRechazados, setLoadingRechazados] = useState(false);
    const [trabajosAgregadosIds, setTrabajosAgregadosIds] = useState<number[]>([]);

    const [localDetalles, setLocalDetalles] = useState<any[]>([]);

    const handleAddLocal = (detalle: any) => {
        setLocalDetalles(prev => [...prev, { ...detalle, id: Date.now() + Math.random() }]);
    };

    const handleUpdateLocal = (index: number, updated: any) => {
        setLocalDetalles(prev => prev.map((item, i) => i === index ? { ...item, ...updated } : item));
    };

    const handleRemoveLocal = (index: number) => {
        setLocalDetalles(localDetalles.filter((_, i) => i !== index));
    };

    // Memoize onTotalChange to prevent infinite re-renders
    const handleTotalChange = useCallback((total: number) => {
        setFormData(prev => {
            const roundedTotal = Number(Number(total || 0).toFixed(2));
            if (prev.sub_total !== roundedTotal) {
                return { ...prev, sub_total: roundedTotal };
            }
            return prev;
        });
    }, []);

    const [formData, setFormData] = useState<CreateOrdenTrabajoData>({
        fecha_recepcion: getLocalDateString(),
        cliente_nombre: '',
        cliente_telefono: '',
        idmarca_auto: 0,
        vehiculo_modelo: '',
        vehiculo_placa: '',
        vehiculo_color: '',
        vehiculo_kilometraje: '',
        vehiculo_chasis: '',
        plazo_entrega: 1,
        moneda: 'Bolivianos',
        sub_total: 0,
        descuento: 0,
        total: 0,
        facturado: false,
        nro_factura: '',
        fecha_facturado: '',
        observaciones: '',
        cancelado: false,
        idusuario: user?.id || '',
        id_cotizacion: cotizacionIdParam ? Number(cotizacionIdParam) : undefined,
        id_hoja_recepcion: hojaIdParam ? Number(hojaIdParam) : undefined,
        estado: 'en_proceso'
    });

    useEffect(() => {
        loadRelatedData();
        if (isEditMode) {
            loadOrdenData();
        } else if (cotizacionIdParam) {
            loadCotizacionData(Number(cotizacionIdParam));
        } else if (hojaIdParam) {
            loadHojaRecepcionData(Number(hojaIdParam));
        }
    }, [id, cotizacionIdParam, hojaIdParam]);

    useEffect(() => {
        const subTotal = isNaN(Number(formData.sub_total)) ? 0 : Number(formData.sub_total);
        const descuento = isNaN(Number(formData.descuento)) ? 0 : Number(formData.descuento);
        const newTotal = Number(Math.max(0, subTotal - descuento).toFixed(2));

        if (formData.total !== newTotal) {
            setFormData(prev => ({ ...prev, total: newTotal }));
        }
    }, [formData.sub_total, formData.descuento]);

    useEffect(() => {
        if (user?.id && !formData.idusuario) {
            setFormData(prev => ({ ...prev, idusuario: user.id }));
        }
    }, [user]);

    // Autocompletar datos basados en la placa
    useEffect(() => {
        const fetchDataByPlaca = async () => {
            if (isEditMode || cotizacionIdParam || hojaIdParam || formData.id_hoja_recepcion || !formData.vehiculo_placa || formData.vehiculo_placa.length < 3) {
                return;
            }

            try {
                const ordenAnterior = await getOrdenTrabajoByPlaca(formData.vehiculo_placa);

                if (ordenAnterior) {
                    setFormData(prev => ({
                        ...prev,
                        idmarca_auto: ordenAnterior.marca_auto?.id || ordenAnterior.idmarca_auto || prev.idmarca_auto,
                        vehiculo_modelo: ordenAnterior.vehiculo_modelo || ordenAnterior.modelo || prev.vehiculo_modelo,
                        vehiculo_color: ordenAnterior.vehiculo_color || ordenAnterior.color || prev.vehiculo_color,
                        vehiculo_kilometraje: ordenAnterior.vehiculo_kilometraje ?? ordenAnterior.km_ingreso ?? prev.vehiculo_kilometraje,
                        vehiculo_chasis: ordenAnterior.vehiculo_chasis || ordenAnterior.chasis || prev.vehiculo_chasis,
                        cliente_nombre: ordenAnterior.cliente_nombre || ordenAnterior.cliente || prev.cliente_nombre,
                        cliente_telefono: ordenAnterior.cliente_telefono || ordenAnterior.celular || prev.cliente_telefono,
                    }));
                }
            } catch (error) {
                console.error('Error fetching data by placa:', error);
            }
        };

        const timeoutId = setTimeout(fetchDataByPlaca, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.vehiculo_placa, isEditMode, cotizacionIdParam, hojaIdParam, formData.id_hoja_recepcion]);

    // Cargar historial de trabajos rechazados por el cliente para el mismo vehículo
    useEffect(() => {
        const fetchRechazados = async () => {
            const placa = (formData.vehiculo_placa || '').trim();
            if (placa.length < 3) {
                setTrabajosRechazados([]);
                return;
            }

            setLoadingRechazados(true);
            try {
                const data = await getTrabajosRechazadosByPlaca(placa);
                // Si se está editando una orden existente, excluir los de la orden actual
                const filtered = isEditMode && id
                    ? data.filter(t => Number(t.idorden_trabajo) !== Number(id))
                    : data;
                setTrabajosRechazados(filtered);
            } catch (err) {
                console.error('Error al consultar trabajos rechazados:', err);
                setTrabajosRechazados([]);
            } finally {
                setLoadingRechazados(false);
            }
        };

        const timer = setTimeout(fetchRechazados, 500);
        return () => clearTimeout(timer);
    }, [formData.vehiculo_placa, isEditMode, id]);

    const handleAgregarTrabajoRechazado = async (trabajo: TrabajoRechazadoHistorial) => {
        const obs = trabajo.observaciones
            ? `(Recuperado de OT #${trabajo.idorden_trabajo}) ${trabajo.observaciones}`
            : `Recuperado de OT #${trabajo.idorden_trabajo}`;

        if (!isEditMode) {
            const nuevoDetalle = {
                idprecio_taller: trabajo.idprecio_taller || undefined,
                idprecio_seguro: trabajo.idprecio_seguro || undefined,
                id_inventario: trabajo.id_inventario || undefined,
                detalle: trabajo.detalle,
                cantidad: Number(trabajo.cantidad) || 1,
                precio_unitario: Number(trabajo.precio_unitario) || 0,
                total: Number(trabajo.total) || 0,
                observaciones: obs,
                estado_trabajo: 'confirmado',
                precio_taller: trabajo.idprecio_taller ? { detalle: trabajo.detalle, categoria: { categoria_servicio: trabajo.categoria } } : undefined,
                inventario: trabajo.id_inventario ? { descripcion: trabajo.detalle, codigo: trabajo.codigo_repuesto } : undefined,
            };

            handleAddLocal(nuevoDetalle);
            setTrabajosAgregadosIds(prev => [...prev, trabajo.id]);

            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
            });
            Toast.fire({
                icon: 'success',
                title: 'Trabajo agregado a la orden',
                text: `${trabajo.detalle} añadido a la lista de trabajos.`
            });
        } else if (id) {
            try {
                await createDetalleOrdenTrabajo({
                    idorden_trabajo: Number(id),
                    idprecio_taller: trabajo.idprecio_taller ? String(trabajo.idprecio_taller) : undefined,
                    idprecio_seguro: trabajo.idprecio_seguro ? String(trabajo.idprecio_seguro) : undefined,
                    id_inventario: trabajo.id_inventario ? Number(trabajo.id_inventario) : undefined,
                    detalle: trabajo.detalle,
                    cantidad: Number(trabajo.cantidad) || 1,
                    precio_unitario: Number(trabajo.precio_unitario) || 0,
                    total: Number(trabajo.total) || 0,
                    observaciones: obs,
                    estado_trabajo: 'confirmado',
                    idusuario: user?.id ? Number(user.id) : undefined,
                });

                setTrabajosAgregadosIds(prev => [...prev, trabajo.id]);
                await loadOrdenData();

                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                });
                Toast.fire({
                    icon: 'success',
                    title: 'Trabajo agregado a la orden',
                    text: `${trabajo.detalle} añadido a la orden #${id}.`
                });
            } catch (err) {
                console.error('Error al agregar trabajo rechazado a la orden:', err);
                Swal.fire('Error', 'No se pudo agregar el trabajo a la orden.', 'error');
            }
        }
    };

    const handleJalarCotizacion = async (cotizacionId: number) => {
        try {
            const cotizacion = await getCotizacion(cotizacionId);
            if (!cotizacion) return;

            setFormData(prev => ({
                ...prev,
                id_cotizacion: cotizacion.id,
                plazo_entrega: cotizacion.plazo_entrega || prev.plazo_entrega,
                moneda: cotizacion.moneda || prev.moneda,
                descuento: Number(cotizacion.descuento) || prev.descuento || 0,
                observaciones: prev.observaciones
                    ? (cotizacion.observaciones ? `${prev.observaciones}\n[Cotización #${cotizacion.id}]: ${cotizacion.observaciones}` : prev.observaciones)
                    : (cotizacion.observaciones || '')
            }));

            if (cotizacion.detalles && cotizacion.detalles.length > 0) {
                const seenPrecioTallerGroups = new Set<number>();
                const mappedDetalles = cotizacion.detalles.map((d: any, idx: number) => {
                    const idPt = d.precio_taller?.id || d.idprecio_taller || undefined;
                    const isGroupSubItem = idPt && Array.isArray(d.precio_taller?.items) && d.precio_taller.items.length > 0;
                    const isFirstInGroup = isGroupSubItem ? !seenPrecioTallerGroups.has(Number(idPt)) : true;
                    if (isGroupSubItem && idPt) {
                        seenPrecioTallerGroups.add(Number(idPt));
                    }

                    return {
                        id: Date.now() + idx,
                        idorden_trabajo: 0,
                        idprecio_taller: idPt,
                        idprecio_seguro: d.precio_seguro?.id || d.idprecio_seguro || undefined,
                        id_inventario: d.inventario?.id || d.id_inventario || undefined,
                        idpersonal_mecanico: d.personal_mecanico?.id || d.idpersonal_mecanico || undefined,
                        personal_mecanico: d.personal_mecanico,
                        estado_trabajo: d.estado_trabajo || 'confirmado',
                        tiempo_estimado: isFirstInGroup
                            ? (d.tiempo_estimado !== undefined ? d.tiempo_estimado : (d.precio_taller?.tiempo_estimado || undefined))
                            : '0',
                        precio_hora: d.precio_hora !== undefined ? Number(d.precio_hora) : (d.precio_taller?.precio_hora ? Number(d.precio_taller.precio_hora) : undefined),
                        total_costo: isFirstInGroup
                            ? (d.total_costo !== undefined ? Number(d.total_costo) : (d.precio_taller?.total_costo ? Number(d.precio_taller.total_costo) : undefined))
                            : 0,
                        costo_tercero: d.costo_tercero !== undefined ? Number(d.costo_tercero) : undefined,
                        precio_taller: d.precio_taller,
                        precio_seguro: d.precio_seguro,
                        inventario: d.inventario,
                        detalle: d.detalle || d.precio_taller?.detalle || d.precio_seguro?.detalle || d.inventario?.descripcion || '',
                        cantidad: Number(d.cantidad) || 1,
                        precio_unitario: Number(d.precio_unitario) || 0,
                        total: Number(d.total) || 0,
                        nivel: d.nivel || undefined,
                        observaciones: d.observaciones || undefined,
                        imagenes: d.imagenes || []
                    };
                });
                setLocalDetalles(mappedDetalles);
            }

            Swal.fire({
                icon: 'success',
                title: 'Cotización importada',
                text: `Se importaron ${cotizacion.detalles?.length || 0} trabajos y precios de la Cotización #${String(cotizacion.id).padStart(6, '0')}.`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            console.error('Error al jalar cotización:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar la cotización seleccionada.'
            });
        }
    };

    const handleUnlinkCotizacion = () => {
        setFormData(prev => ({ ...prev, id_cotizacion: undefined }));
        setSelectedCotizacionToJalar('');
    };

    const loadCotizacionData = async (cotizacionId: number) => {
        try {
            const cotizacion = await getCotizacion(cotizacionId);
            if (!cotizacion) return;

            if (cotizacion.id_hoja_recepcion) {
                await loadHojaRecepcionData(cotizacion.id_hoja_recepcion);
            }

            await handleJalarCotizacion(cotizacionId);
        } catch (error) {
            console.error('Error loading cotización for Orden de Trabajo:', error);
        }
    };

    const loadHojaRecepcionData = async (hojaId: number) => {
        try {
            const hoja = await getHojaRecepcion(hojaId);
            if (!hoja) return;
            setHojaInfo(hoja);

            const h: any = hoja;
            const placaVehiculo = (h.vehiculo_placa || h.placa || '').toUpperCase().trim();

            setFormData(prev => ({
                ...prev,
                id_hoja_recepcion: hoja.id,
                cliente_nombre: h.cliente_nombre || h.cliente || prev.cliente_nombre,
                cliente_telefono: h.cliente_telefono || h.celular || prev.cliente_telefono,
                idmarca_auto: hoja.marca_auto?.id || h.idmarca_auto || prev.idmarca_auto,
                vehiculo_marca: hoja.marca_auto?.marca || h.vehiculo_marca || prev.vehiculo_marca,
                vehiculo_modelo: h.vehiculo_modelo || h.modelo || prev.vehiculo_modelo,
                vehiculo_placa: placaVehiculo || prev.vehiculo_placa,
                vehiculo_color: h.vehiculo_color || h.color || prev.vehiculo_color,
                vehiculo_kilometraje: h.vehiculo_kilometraje !== undefined && h.vehiculo_kilometraje !== null
                    ? String(h.vehiculo_kilometraje)
                    : h.km_ingreso !== undefined && h.km_ingreso !== null
                    ? String(h.km_ingreso)
                    : prev.vehiculo_kilometraje,
                vehiculo_chasis: h.vehiculo_chasis || h.chasis || prev.vehiculo_chasis,
            }));

            // Preseleccionar cotización coincidente si existe
            if (placaVehiculo && cotizacionesList.length > 0) {
                const match = cotizacionesList.find((c: any) => (c.vehiculo_placa || c.placa || '').toUpperCase().trim() === placaVehiculo);
                if (match) {
                    setSelectedCotizacionToJalar(String(match.id));
                }
            }
        } catch (error) {
            console.error('Error loading hoja de recepción:', error);
        }
    };

    const handleSelectHoja = (hojaIdStr: string) => {
        if (!hojaIdStr) {
            setHojaInfo(null);
            setFormData(prev => ({ ...prev, id_hoja_recepcion: undefined }));
            return;
        }
        loadHojaRecepcionData(Number(hojaIdStr));
    };

    const handleUnlinkHoja = () => {
        setHojaInfo(null);
        setFormData(prev => ({
            ...prev,
            id_hoja_recepcion: undefined,
            id_cotizacion: undefined
        }));
        setSelectedCotizacionToJalar('');
    };

    const loadRelatedData = async () => {
        try {
            const [marcasData, cotizacionesData] = await Promise.all([
                getAllMarcasAuto(),
                getCotizaciones().catch(() => [])
            ]);
            setMarcas(marcasData.filter((m: MarcaAuto) => m.estado === 'activo'));
            setCotizacionesList(
                (cotizacionesData || []).filter((c: any) => {
                    const est = (c.estado || '').toLowerCase().trim();
                    return est !== 'anulada' && est !== 'anulado' && est !== 'inactivo' && est !== 'aprobada' && est !== 'en_orden' && est !== 'orden_creada';
                })
            );
            if (!isEditMode) {
                const pendientes = await getHojasRecepcionPendientes();
                setHojasPendientes(pendientes || []);
            }
        } catch (error) {
            console.error('Error loading related data:', error);
        }
    };

    const loadOrdenData = async () => {
        try {
            const orden = await getOrdenTrabajo(Number(id!));

            const est = (orden.estado || '').toLowerCase();
            const isCerrada = est === 'cerrada' || est === 'orden_cerrada' || est === 'orden cerrada' || (Boolean(orden.cancelado) && (est === 'terminado' || est === 'finalizado'));
            if (est === 'anulada' || est === 'anulado' || est === 'inactivo' || est === 'terminado' || est === 'finalizado' || isCerrada) {
                await Swal.fire({
                    icon: 'info',
                    title: est.includes('anula') || est === 'inactivo'
                        ? 'Orden de Trabajo Anulada'
                        : isCerrada
                        ? 'Orden de Trabajo Cerrada'
                        : 'Orden de Trabajo Terminada en Taller',
                    text: est.includes('anula') || est === 'inactivo'
                        ? 'Esta orden de trabajo ha sido anulada y no puede ser modificada.'
                        : isCerrada
                        ? 'Esta orden de trabajo ya está cerrada y pagada en su totalidad, no puede ser modificada.'
                        : 'Esta orden de trabajo ya ha sido terminada en taller y no puede ser modificada.',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#2563eb'
                });
                navigate('/ordenes-trabajo');
                return;
            }

            setFormData({
                cliente_nombre: orden.cliente_nombre || orden.cliente || '',
                cliente_telefono: orden.cliente_telefono || orden.celular || '',
                idmarca_auto: orden.marca_auto?.id || orden.idmarca_auto || 0,
                vehiculo_modelo: orden.vehiculo_modelo || orden.modelo || '',
                vehiculo_placa: orden.vehiculo_placa || orden.placa || '',
                vehiculo_color: orden.vehiculo_color || orden.color || '',
                vehiculo_kilometraje: orden.vehiculo_kilometraje ?? orden.km_ingreso ?? '',
                vehiculo_chasis: orden.vehiculo_chasis || orden.chasis || '',
                plazo_entrega: orden.plazo_entrega || 1,
                moneda: orden.moneda || 'Bolivianos',
                sub_total: orden.sub_total,
                descuento: Number(orden.descuento) || 0,
                total: orden.total,
                facturado: Boolean(orden.facturado),
                nro_factura: orden.nro_factura || '',
                fecha_facturado: orden.fecha_facturado ? getLocalDateString(orden.fecha_facturado) : '',
                observaciones: orden.observaciones || '',
                cancelado: orden.cancelado,
                idusuario: orden.usuario?.id || user?.id || '',
                id_hoja_recepcion: orden.id_hoja_recepcion,
                id_cotizacion: orden.id_cotizacion,
                estado: orden.estado
            });

            const targetHojaId = orden.id_hoja_recepcion || orden.hoja_recepcion?.id;
            if (targetHojaId) {
                try {
                    const hoja = await getHojaRecepcion(targetHojaId);
                    setHojaInfo(hoja);
                } catch (e) {
                    if (orden.hoja_recepcion) setHojaInfo(orden.hoja_recepcion as any);
                    console.error('Error loading hoja vinculada:', e);
                }
            }
        } catch (error) {
            console.error('Error loading orden:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar la orden'
            });
        }
    };




    const handleCancel = async () => {
        try {
            if (isEditMode && id) {
                const detalles = await getDetallesByOrden(Number(id));
                const activeDetalles = detalles ? detalles.filter((d: any) => d.estado_trabajo !== 'descartado') : [];
                if (activeDetalles.length === 0) {
                    await updateOrdenTrabajo(Number(id), { estado: 'pendiente' });
                }
            }
        } catch (err) {
            console.error('Error al verificar detalles al cancelar:', err);
        }
        navigate('/ordenes-trabajo/list');
    };

    const getEstadoBadgeClass = (estado?: string) => {
        switch ((estado || '').toLowerCase()) {
            case "activo":
            case "orden creada":
                return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700";
            case "en_proceso":
            case "en proceso":
                return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700";
            case "terminado":
            case "finalizado":
                return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-300 dark:border-green-700";
            case "inactivo":
            case "anulado":
                return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-300 dark:border-red-700";
            case "pendiente":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700";
            default:
                return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
        }
    };

    const handleDarPorTerminada = async () => {
        const now = new Date();
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        const result = await Swal.fire({
            title: '¿Dar por Terminada esta Orden?',
            text: 'La orden cambiará al estado "Terminado" y se registrará la fecha de finalización.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, Dar como Terminada',
            cancelButtonText: 'Cancelar',
            html: `
                <div class="mt-3 text-left w-full p-1.5" style="box-sizing: border-box;">
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fecha y hora de finalización:</label>
                    <div class="relative flex items-center w-full">
                        <span class="absolute left-3 text-gray-400 pointer-events-none flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </span>
                        <input
                            type="datetime-local"
                            id="swal-fecha-fin"
                            class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            style="width: 100%; box-sizing: border-box; margin: 0; font-size: 14px; height: 42px;"
                            value="${localIso}"
                        />
                    </div>
                </div>
            `,
            preConfirm: () => {
                const input = document.getElementById('swal-fecha-fin') as HTMLInputElement;
                return input ? input.value : localIso;
            }
        });

        if (result.isConfirmed) {
            const fechaFin = result.value ? new Date(result.value).toISOString() : new Date().toISOString();
            try {
                if (isEditMode && id) {
                    await updateOrdenTrabajo(Number(id), {
                        estado: 'terminado'
                    });
                }
                setFormData(prev => ({ ...prev, estado: 'terminado' }));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Orden Terminada!',
                    text: 'La orden ha sido marcada como terminada exitosamente.',
                    timer: 1600,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Error al finalizar orden:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo actualizar el estado de la orden'
                });
            }
        }
    };

    const handleReabrirOrden = async () => {
        const result = await Swal.fire({
            title: '¿Reabrir Orden de Trabajo?',
            text: 'La orden volverá al estado "En Proceso" para permitir modificaciones y seguimiento.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, Reabrir Orden',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                if (isEditMode && id) {
                    await updateOrdenTrabajo(Number(id), {
                        estado: 'en_proceso'
                    });
                }
                setFormData(prev => ({ ...prev, estado: 'en_proceso' }));
                await Swal.fire({
                    icon: 'success',
                    title: 'Orden Reabierta',
                    text: 'La orden ahora está en estado "En Proceso".',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Error al reabrir orden:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reabrir la orden'
                });
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);

        try {
            if (isEditMode) {
                const targetId = Number(id);
                const detalles = await getDetallesByOrden(targetId);
                const activeDetalles = detalles ? detalles.filter((d: any) => d.estado_trabajo !== 'descartado') : [];
                const hasTrabajos = activeDetalles.length > 0;
                const finalEstado = formData.estado === 'terminado'
                    ? 'terminado'
                    : (hasTrabajos
                        ? (formData.estado === 'pendiente' ? 'en_proceso' : formData.estado)
                        : 'pendiente');

                const { id_tipo_orden, idseguro, idinspector, ...cleanFormData } = formData as any;
                const payload = {
                    ...cleanFormData,
                    sub_total: Number(Number(formData.sub_total || 0).toFixed(2)),
                    descuento: Number(Number(formData.descuento || 0).toFixed(2)),
                    total: Number(Number(formData.total || 0).toFixed(2)),
                    estado: finalEstado
                };
                await updateOrdenTrabajo(targetId, payload);
                await Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'Orden actualizada exitosamente',
                    showConfirmButton: false,
                    timer: 1500
                });
                navigate('/ordenes-trabajo/list');
            } else {
                // Crear la orden (Header)
                const hasTrabajos = localDetalles && localDetalles.length > 0;
                const { detalles, id_tipo_orden, idseguro, idinspector, ...orderData } = formData as any; // Exclude detalles from header creation if present
                orderData.sub_total = Number(Number(orderData.sub_total || 0).toFixed(2));
                orderData.descuento = Number(Number(orderData.descuento || 0).toFixed(2));
                orderData.total = Number(Number(orderData.total || 0).toFixed(2));
                orderData.estado = hasTrabajos ? 'en_proceso' : 'pendiente';
                const newOrden = await createOrdenTrabajo(orderData);
                console.log('Orden Header Created:', newOrden.id);

                // Guardar detalles secuencialmente
                if (localDetalles.length > 0) {
                    for (const detalle of localDetalles) {
                        try {
                            const pt = detalle.precio_taller;
                            const cat = (pt?.categoria?.categoria_servicio || '').toLowerCase();
                            const esTercero = cat.includes('tercero') || Number(detalle.costo_tercero) > 0;
                            const costoTerceroVal = Number(detalle.costo_tercero || 0);

                            const tiempoEstVal = detalle.tiempo_estimado !== undefined && detalle.tiempo_estimado !== ''
                                ? Number(detalle.tiempo_estimado)
                                : Number(pt?.tiempo_estimado || 0);
                            const precioHoraVal = detalle.precio_hora !== undefined && detalle.precio_hora !== ''
                                ? Number(detalle.precio_hora)
                                : Number(pt?.precio_hora || 0);
                            const totalCostoCalc = esTercero
                                ? (costoTerceroVal > 0 ? costoTerceroVal : Number(detalle.total_costo || 0))
                                : (detalle.total_costo !== undefined && Number(detalle.total_costo) > 0
                                    ? Number(detalle.total_costo)
                                    : Number((tiempoEstVal * precioHoraVal).toFixed(2)));

                            const detallePayload = {
                                idorden_trabajo: newOrden.id,
                                idprecio_taller: detalle.idprecio_taller || undefined,
                                idprecio_seguro: detalle.idprecio_seguro || undefined,
                                id_inventario: detalle.id_inventario || undefined,
                                idpersonal_mecanico: detalle.idpersonal_mecanico || undefined,
                                estado_trabajo: detalle.estado_trabajo || 'confirmado',
                                tiempo_estimado: detalle.tiempo_estimado !== undefined ? String(detalle.tiempo_estimado) : (pt?.tiempo_estimado ? String(pt.tiempo_estimado) : undefined),
                                precio_hora: precioHoraVal,
                                costo_tercero: costoTerceroVal,
                                total_costo: totalCostoCalc,
                                cantidad: detalle.cantidad,
                                precio_unitario: detalle.precio_unitario,
                                total: detalle.total,
                                nivel: detalle.nivel || undefined,
                                detalle: detalle.detalle || undefined,
                                observaciones: detalle.observaciones || undefined,
                                imagenes: detalle.imagenes || undefined,
                                idusuario: user?.id ? Number(user.id) : undefined
                            };
                            await createDetalleOrdenTrabajo(detallePayload);
                        } catch (err) {
                            console.error('Error saving detail:', err);
                        }
                    }
                }

                await Swal.fire({
                    icon: 'success',
                    title: 'Creado',
                    text: 'Orden guardada exitosamente',
                    showConfirmButton: false,
                    timer: 1500
                });

                // Navigate to order list
                navigate('/ordenes-trabajo/list');
            }
        } catch (error: any) {
            console.error('Error saving orden:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar la orden';
            const formattedMessage = Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage;
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: formattedMessage
            });
        } finally {
            setLoading(false);
        }
    };

    const placaActual = (formData.vehiculo_placa || '').toUpperCase().trim();
    const cotizacionesCoincidentes = cotizacionesList.filter((c: any) => {
        if (!placaActual) return false;
        const placaCot = (c.vehiculo_placa || c.placa || '').toUpperCase().trim();
        return placaCot === placaActual;
    });

    const shouldShowCotizacionSection = Boolean(
        formData.id_cotizacion || 
        (formData.id_hoja_recepcion && placaActual && cotizacionesCoincidentes.length > 0)
    );

    useEffect(() => {
        if (!selectedCotizacionToJalar && formData.id_hoja_recepcion && cotizacionesCoincidentes.length > 0) {
            setSelectedCotizacionToJalar(String(cotizacionesCoincidentes[0].id));
        }
    }, [formData.id_hoja_recepcion, cotizacionesCoincidentes, selectedCotizacionToJalar]);

    return (
        <div className="container mx-auto p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <button
                        type="button"
                        onClick={() => navigate('/ordenes-trabajo/list')}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <ArrowLeft size={20} />
                        Volver
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                        {isEditMode ? 'Editar Orden de Trabajo' : 'Nueva Orden de Trabajo'}
                    </h1>
                    {(formData.id_hoja_recepcion || hojaInfo) && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 flex items-center gap-1.5 shadow-xs">
                            <FileSpreadsheet size={14} />
                            Hoja {String(hojaInfo?.nro || formData.id_hoja_recepcion).padStart(6, '0')}
                        </span>
                    )}
                    {isEditMode && (
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getEstadoBadgeClass(formData.estado)}`}>
                            {formData.estado?.replace('_', ' ')}
                        </span>
                    )}
                </div>

                {isEditMode && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setShowUtilidadModal(true)}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2 cursor-pointer"
                            title="Ver utilidad neta descontando pago a mecánicos y costo de compra de repuestos"
                        >
                            <TrendingUp size={18} />
                            Ver Utilidad Neta
                        </button>
                        {formData.estado === 'terminado' ? (
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold text-sm border border-emerald-300 dark:border-emerald-700 shadow-xs">
                                    <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                                    Orden Terminada
                                </span>
                                <button
                                    type="button"
                                    onClick={handleReabrirOrden}
                                    className="px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                    title="Reabrir orden a estado En Proceso"
                                >
                                    <RotateCcw size={14} />
                                    Reabrir
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={handleDarPorTerminada}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2 cursor-pointer"
                                title="Dar esta orden como terminada"
                            >
                                <CheckCircle size={18} />
                                Dar como Terminada
                            </button>
                        )}
                    </div>
                )}
            </div>

            <form id="orden-form" onSubmit={handleSubmit} className="space-y-6">

                {/* Sección Hoja de Recepción vinculada / Selector */}
                <div className="mb-6 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-blue-50/40 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-blue-950/20 shadow-xs">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                                <FileSpreadsheet size={20} />
                            </div>
                            <div>
                                {(() => {
                                    const placaHoja = (hojaInfo as any)?.vehiculo_placa || (hojaInfo as any)?.placa || formData.vehiculo_placa;
                                    const clienteHoja = (hojaInfo as any)?.cliente_nombre || (hojaInfo as any)?.cliente || formData.cliente_nombre;
                                    const tipoOrdenText = hojaInfo?.tipo_orden?.tipo_orden || (hojaInfo as any)?.tipo_orden || '';
                                    const rawFechaHoja = (hojaInfo as any)?.created_at || (hojaInfo as any)?.fecha_registro;
                                    const formatFechaHoja = (dStr?: string | Date) => {
                                        if (!dStr) return '';
                                        const d = new Date(dStr);
                                        if (isNaN(d.getTime())) return '';
                                        const day = String(d.getDate()).padStart(2, '0');
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const year = d.getFullYear();
                                        return `${day}/${month}/${year}`;
                                    };
                                    const fechaHojaText = formatFechaHoja(rawFechaHoja);

                                    return (
                                        <>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                                                    Hoja de Recepción
                                                </h3>
                                                {(formData.id_hoja_recepcion || hojaInfo) && (
                                                    <>
                                                        <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-200/80 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-bold">
                                                            {String(hojaInfo?.nro || formData.id_hoja_recepcion).padStart(6, '0')}
                                                        </span>
                                                        {tipoOrdenText && (
                                                            <span className="text-xs px-2.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                                                                {tipoOrdenText}
                                                            </span>
                                                        )}
                                                        {fechaHojaText && (
                                                            <span className="text-xs px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                                                <Calendar size={12} className="text-purple-600 dark:text-purple-400" />
                                                                {fechaHojaText}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-x-2">
                                                {(formData.id_hoja_recepcion || hojaInfo) ? (
                                                    <>
                                                        <span>
                                                            Vinculada a {placaHoja ? `placa ${placaHoja}` : 'vehículo'} ({clienteHoja || 'Cliente'})
                                                        </span>
                                                        {tipoOrdenText && (
                                                            <>
                                                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                <span>Tipo de Orden: <strong className="text-gray-700 dark:text-gray-300 font-semibold">{tipoOrdenText}</strong></span>
                                                            </>
                                                        )}
                                                        {fechaHojaText && (
                                                            <>
                                                                <span className="text-gray-300 dark:text-gray-600">•</span>
                                                                <span>Fecha Hoja: <strong className="text-gray-700 dark:text-gray-300 font-semibold">{fechaHojaText}</strong></span>
                                                            </>
                                                        )}
                                                    </>
                                                ) : (
                                                    'Selecciona una hoja de recepción pendiente para autocompletar cliente, vehículo y observaciones'
                                                )}
                                            </p>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {!isEditMode && (
                            <div className="w-full sm:w-auto flex items-center gap-2">
                                {formData.id_hoja_recepcion ? (
                                    <button
                                        type="button"
                                        onClick={handleUnlinkHoja}
                                        className="text-xs px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                                        title="Desvincular hoja de recepción"
                                    >
                                        <Unlink size={14} />
                                        Desvincular Hoja
                                    </button>
                                ) : (
                                    <div className="w-full sm:w-80">
                                        <select
                                            value={formData.id_hoja_recepcion || ''}
                                            onChange={(e) => handleSelectHoja(e.target.value)}
                                            className="w-full text-xs py-2 px-3 border border-indigo-300 dark:border-indigo-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                                        >
                                            <option value="">-- Seleccionar Hoja pendiente ({hojasPendientes.length}) --</option>
                                            {hojasPendientes.map((h: any) => {
                                                const placa = h.vehiculo_placa || h.placa || 'S/P';
                                                const cliente = h.cliente_nombre || h.cliente || 'Sin cliente';
                                                const vehiculo = [h.vehiculo_marca || h.marca_auto?.marca || h.marca, h.vehiculo_modelo || h.modelo].filter(Boolean).join(' ');
                                                const descVehiculo = vehiculo ? ` - ${vehiculo}` : '';
                                                return (
                                                    <option key={h.id} value={h.id}>
                                                        Hoja {String(h.nro || h.id).padStart(6, '0')} - {placa}{descVehiculo} ({cliente})
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sección Cotización: Jalar o Vinculada (Solo si coincide la placa con una cotización de la hoja de recepción) */}
                {shouldShowCotizacionSection && (
                    <div className="mb-6 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-r from-emerald-50/50 via-teal-50/30 to-green-50/40 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-green-950/20 shadow-xs animate-fade-in">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-emerald-600 text-white shadow-sm">
                                    <FileSpreadsheet size={20} />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                                            Cotización
                                        </h3>
                                        {formData.id_cotizacion && (
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold">
                                                #{String(formData.id_cotizacion).padStart(6, '0')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        {formData.id_cotizacion ? (
                                            <span>
                                                Trabajos y precios jalados desde la cotización (#{String(formData.id_cotizacion).padStart(6, '0')}). Total de ítems importados: <strong>{localDetalles.length}</strong>
                                            </span>
                                        ) : (
                                            <span>
                                                Se encontró cotización previa para la placa <strong className="text-emerald-700 dark:text-emerald-300 font-semibold">{formData.vehiculo_placa}</strong>. Puedes importar sus trabajos y precios.
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {!isEditMode && (
                                <div className="w-full sm:w-auto flex items-center gap-2">
                                    {formData.id_cotizacion ? (
                                        <button
                                            type="button"
                                            onClick={handleUnlinkCotizacion}
                                            className="text-xs px-3 py-2 text-red-600 hover:text-red-700 dark:text-red-400 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg font-medium transition-colors flex items-center gap-1.5 shadow-xs"
                                            title="Desvincular cotización"
                                        >
                                            <Unlink size={14} />
                                            Desvincular Cotización
                                        </button>
                                    ) : (
                                        <div className="w-full sm:w-auto flex items-center gap-2">
                                            <select
                                                value={selectedCotizacionToJalar}
                                                onChange={(e) => setSelectedCotizacionToJalar(e.target.value)}
                                                className="w-full sm:w-72 text-xs py-2 px-3 border border-emerald-300 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                                            >
                                                <option value="">-- Seleccionar Cotización ({cotizacionesCoincidentes.length}) --</option>
                                                {cotizacionesCoincidentes.map((c: any) => {
                                                    const placa = c.vehiculo_placa || c.placa || 'S/P';
                                                    const cliente = c.cliente_nombre || c.cliente || 'Sin cliente';
                                                    return (
                                                        <option key={c.id} value={c.id}>
                                                            Cot. #{String(c.id).padStart(6, '0')} - {placa} ({cliente}) - {c.moneda === 'Bolivianos' ? 'Bs' : '$us'} {Number(c.total || 0).toFixed(2)}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <button
                                                type="button"
                                                disabled={!selectedCotizacionToJalar}
                                                onClick={() => handleJalarCotizacion(Number(selectedCotizacionToJalar))}
                                                className="text-xs px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-xs"
                                                title="Jalar trabajos y precios de la cotización seleccionada"
                                            >
                                                <Download size={14} />
                                                Jalar Cotización
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sección 1: Datos del Propietario / Cliente (Solo lectura) */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <User size={20} className="text-blue-600" />
                                Datos del Propietario
                            </h2>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium border border-gray-200 dark:border-gray-600">
                                Solo lectura
                            </span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Nombre</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.cliente_nombre}
                                        readOnly
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 cursor-not-allowed text-sm font-medium"
                                        placeholder="Nombre del cliente"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Teléfono</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.cliente_telefono || ''}
                                        readOnly
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 cursor-not-allowed text-sm font-medium"
                                        placeholder="Teléfono / Celular"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sección 2: Datos del Vehículo (Solo lectura) */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Car size={20} className="text-green-600" />
                                Datos del Vehículo
                            </h2>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium border border-gray-200 dark:border-gray-600">
                                Solo lectura
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Marca</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Car size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={marcas.find((m) => m.id === formData.idmarca_auto)?.marca || ''}
                                        readOnly
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 cursor-not-allowed text-sm font-medium"
                                        placeholder="Marca"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Placa</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FileText size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.vehiculo_placa}
                                        readOnly
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 cursor-not-allowed text-sm font-bold tracking-wider"
                                        placeholder="Placa"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Modelo</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Car size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.vehiculo_modelo}
                                        readOnly
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 cursor-not-allowed text-sm font-medium"
                                        placeholder="Modelo"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Kilometraje</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Gauge size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.vehiculo_kilometraje ?? ''}
                                        readOnly
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 cursor-not-allowed text-sm font-medium"
                                        placeholder="Kilometraje"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: formData.vehiculo_color || 'transparent' }}></div>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.vehiculo_color || ''}
                                        readOnly
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 cursor-not-allowed text-sm font-medium"
                                        placeholder="Color"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Chasis</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Hash size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.vehiculo_chasis || ''}
                                        readOnly
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 cursor-not-allowed text-sm font-medium"
                                        placeholder="Chasis"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sección 3: Trabajos a Realizar / Solicitud del Cliente (desde Hoja de Recepción - Solo lectura) */}
                <div className="mt-6 bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Wrench size={20} className="text-amber-600" />
                            Trabajos a Realizar / Solicitud del Cliente
                        </h2>
                        <div className="flex items-center gap-2">
                            {hojaInfo?.nro && (
                                <span className="text-xs px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                                    Hoja {String(hojaInfo.nro).padStart(6, '0')}
                                </span>
                            )}
                            <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium border border-gray-200 dark:border-gray-600">
                                Solo lectura
                            </span>
                        </div>
                    </div>
                    <div className="relative">
                        <textarea
                            readOnly
                            rows={3}
                            value={hojaInfo?.trabajos_solicitados || ''}
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 cursor-not-allowed text-sm font-medium leading-relaxed resize-none"
                            placeholder="Trabajos a realizar solicitados por el cliente en la hoja de recepción (Solo lectura)..."
                        />
                    </div>
                </div>
            </form >

            {/* Sección de Detalles de Trabajo */}
            <div className="mt-8">
                {mecanicoAsignadoInfo && (
                    <div className="mb-6 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-600 text-white rounded-lg shadow-sm">
                                <Wrench size={22} />
                            </div>
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                    <CheckCircle size={14} className="text-emerald-600" />
                                    Mecánico Encargado de los Trabajos (Asignado desde Diagnóstico)
                                </span>
                                <p className="text-base font-bold text-gray-900 dark:text-white">
                                    {mecanicoAsignadoInfo.nombre}
                                    {mecanicoAsignadoInfo.cargo && (
                                        <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                                            ({mecanicoAsignadoInfo.cargo})
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    El mecánico que realizó el diagnóstico técnico previo queda automáticamente registrado como el responsable de ejecutar las tareas de esta Orden de Trabajo.
                                </p>
                            </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-200/70 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 text-xs font-bold rounded-full border border-emerald-300 dark:border-emerald-600 self-start sm:self-center">
                            Responsable Asignado
                        </span>
                    </div>
                )}

                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <FileText size={24} className="text-blue-600" />
                    Detalles del Trabajo
                </h2>
                <OrdenTrabajoDetalles
                    ordenId={isEditMode ? Number(id) : undefined}
                    localDetalles={!isEditMode ? localDetalles : undefined}
                    onAddLocal={!isEditMode ? handleAddLocal : undefined}
                    onUpdateLocal={!isEditMode ? handleUpdateLocal : undefined}
                    onRemoveLocal={!isEditMode ? handleRemoveLocal : undefined}
                    embedded={true}
                    particularSeguro={hojaInfo?.tipo_orden?.tipo_orden || (hojaInfo as any)?.tipo_orden || 'Particular'}
                    idseguro={hojaInfo?.idseguro || (hojaInfo?.seguro as any)?.id}
                    onTotalChange={handleTotalChange}
                    defaultMecanicoId={mecanicoAsignadoInfo?.id}
                />
            </div>

            {/* Sección: Información Adicional (Al final de la página) */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" />
                    Información Adicional
                </h2>

                {/* Observaciones generales de la orden (encima de Plazo de entrega, moneda, etc.) */}
                <div className="mb-5">
                    <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Observaciones
                    </label>
                    <textarea
                        form="orden-form"
                        rows={3}
                        value={formData.observaciones || ''}
                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                        placeholder="Observaciones generales de la orden de trabajo..."
                        className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm font-medium leading-relaxed resize-y"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Plazo de Entrega (Días) *</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar size={16} className="text-gray-400" />
                            </div>
                            <input
                                form="orden-form"
                                type="number"
                                value={formData.plazo_entrega || ''}
                                onChange={(e) => setFormData({ ...formData, plazo_entrega: parseInt(e.target.value) || 0 })}
                                required
                                min="1"
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Moneda</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Briefcase size={16} className="text-gray-400" />
                            </div>
                            <select
                                form="orden-form"
                                value={formData.moneda}
                                onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            >
                                <option value="Bolivianos">Bolivianos</option>
                                <option value="Dolares">Dólares</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Estado de la Orden</label>
                        <select
                            form="orden-form"
                            value={formData.estado || 'en_proceso'}
                            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm font-bold capitalize"
                        >
                            <option value="en_proceso">En Proceso</option>
                            <option value="terminado">Terminado</option>
                            <option value="pendiente">Pendiente</option>
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Sub Total</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-400 text-sm font-semibold">{formData.moneda === 'Bolivianos' ? 'Bs' : '$'}</span>
                            </div>
                            <input
                                type="text"
                                value={Number(formData.sub_total || 0).toFixed(2)}
                                readOnly
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white focus:outline-none text-sm font-bold cursor-not-allowed"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Descuento</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-400 text-sm font-semibold">{formData.moneda === 'Bolivianos' ? 'Bs' : '$'}</span>
                            </div>
                            <input
                                form="orden-form"
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0"
                                value={!formData.descuento || Number(formData.descuento) === 0 ? '' : formData.descuento}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({ ...formData, descuento: val === '' ? 0 : parseFloat(val) || 0 });
                                }}
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Total</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">{formData.moneda === 'Bolivianos' ? 'Bs' : '$'}</span>
                            </div>
                            <input
                                type="text"
                                value={Number(formData.total || 0).toFixed(2)}
                                readOnly
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 focus:outline-none text-base font-bold cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                {/* Sección de Facturación (Seguro / Concesionaria / Cliente) */}
                <div className="mt-6 p-5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-sky-50/50 dark:from-blue-950/20 dark:via-indigo-950/15 dark:to-sky-950/20 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-blue-200/80 dark:border-blue-800/80">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
                                <ReceiptText size={18} />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    Estado de Facturación
                                    {formData.facturado && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-700">
                                            Facturada
                                        </span>
                                    )}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Permite registrar la orden como facturada ante un Seguro o Concesionaria manteniendo el saldo pendiente de cobro.
                                </p>
                            </div>
                        </div>

                        {/* Switch / Toggle */}
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                                form="orden-form"
                                type="checkbox"
                                checked={Boolean(formData.facturado)}
                                onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setFormData({
                                        ...formData,
                                        facturado: isChecked,
                                        fecha_facturado: isChecked && !formData.fecha_facturado
                                            ? getLocalDateString()
                                            : formData.fecha_facturado
                                    });
                                }}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            <span className="ml-3 text-sm font-bold text-gray-800 dark:text-gray-200">
                                {formData.facturado ? '¿Facturada? SÍ' : '¿Facturada? NO'}
                            </span>
                        </label>
                    </div>

                    {formData.facturado ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    N° de Factura *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Hash size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        form="orden-form"
                                        type="text"
                                        placeholder="Ej: F-002934 / 849302"
                                        value={formData.nro_factura || ''}
                                        onChange={(e) => setFormData({ ...formData, nro_factura: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    Fecha de Facturación
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        form="orden-form"
                                        type="date"
                                        value={formData.fecha_facturado ? String(formData.fecha_facturado).split('T')[0] : ''}
                                        onChange={(e) => setFormData({ ...formData, fecha_facturado: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            La orden se mantendrá en estado pendiente de facturación. Podrás marcarla como facturada en cualquier momento desde esta pantalla, el detalle de la orden o desde el módulo de cobros.
                        </p>
                    )}
                </div>
            </div>

            {/* Sección: Trabajos Rechazados por el Cliente de Órdenes Anteriores */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-amber-200/80 dark:border-amber-900/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-amber-500 text-white shadow-xs">
                            <History size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                                    Historial de Trabajos Rechazados por el Cliente
                                </h2>
                                {trabajosRechazados.length > 0 && (
                                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                        {trabajosRechazados.length} {trabajosRechazados.length === 1 ? 'trabajo rechazado' : 'trabajos rechazados'}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                Trabajos o repuestos descartados por el cliente en órdenes de trabajo anteriores {formData.vehiculo_placa ? `para el vehículo con placa ${formData.vehiculo_placa.toUpperCase()}` : ''}.
                                Permite al asesor técnico hacerle recuerdo y consultar si desea agregarlos a esta orden.
                            </p>
                        </div>
                    </div>
                </div>

                {!formData.vehiculo_placa || formData.vehiculo_placa.trim().length < 3 ? (
                    <div className="p-5 rounded-lg bg-gray-50 dark:bg-gray-750 text-center text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700">
                        Ingrese o seleccione la placa de un vehículo para consultar automáticamente si tiene trabajos rechazados en visitas u órdenes anteriores.
                    </div>
                ) : loadingRechazados ? (
                    <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-amber-500 border-t-transparent"></div>
                        <span>Consultando historial de trabajos rechazados para la placa {formData.vehiculo_placa.toUpperCase()}...</span>
                    </div>
                ) : trabajosRechazados.length === 0 ? (
                    <div className="p-4 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
                        <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Este vehículo no tiene trabajos rechazados registrados en órdenes anteriores.</span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                    <th className="py-2.5 px-3">Orden Origen</th>
                                    <th className="py-2.5 px-3">Fecha OT</th>
                                    <th className="py-2.5 px-3">Categoría</th>
                                    <th className="py-2.5 px-3">Trabajo / Repuesto Rechazado</th>
                                    <th className="py-2.5 px-3 text-center">Cant.</th>
                                    <th className="py-2.5 px-3 text-right">Precio Ref.</th>
                                    <th className="py-2.5 px-3 text-right">Total Ref.</th>
                                    <th className="py-2.5 px-3 text-center">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {trabajosRechazados.map((trabajo) => {
                                    const yaAgregado = trabajosAgregadosIds.includes(trabajo.id);
                                    const fechaFormatted = trabajo.fecha_orden
                                        ? new Date(trabajo.fecha_orden).toLocaleDateString('es-BO', {
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric',
                                          })
                                        : '-';

                                    return (
                                        <tr
                                            key={trabajo.id}
                                            className="hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors"
                                        >
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                                                    OT #{trabajo.idorden_trabajo}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
                                                {fechaFormatted}
                                            </td>
                                            <td className="py-2.5 px-3 whitespace-nowrap">
                                                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                    {trabajo.categoria || 'Servicio'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3">
                                                <div className="font-medium text-gray-900 dark:text-white text-xs">
                                                    {trabajo.codigo_repuesto && (
                                                        <span className="text-gray-500 font-mono text-[11px] mr-1">
                                                            [{trabajo.codigo_repuesto}]
                                                        </span>
                                                    )}
                                                    {trabajo.detalle}
                                                </div>
                                                {trabajo.observaciones && (
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 italic mt-0.5">
                                                        Obs: {trabajo.observaciones}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-xs text-gray-700 dark:text-gray-300">
                                                {trabajo.cantidad || 1}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-xs font-mono text-gray-700 dark:text-gray-300">
                                                {Number(trabajo.precio_unitario || 0).toFixed(2)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right text-xs font-mono font-bold text-gray-900 dark:text-white">
                                                {trabajo.moneda === 'Dólares' ? '$' : 'Bs.'}{' '}
                                                {Number(trabajo.total || 0).toFixed(2)}
                                            </td>
                                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                                {yaAgregado ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                                        <CheckCircle size={14} /> Agregado
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAgregarTrabajoRechazado(trabajo)}
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded-lg shadow-xs hover:shadow transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                                        title="Agregar este trabajo a la orden actual"
                                                    >
                                                        <Plus size={14} /> Recordar y Agregar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div>
                    {isEditMode && (
                        formData.estado === 'terminado' ? (
                            <button
                                type="button"
                                onClick={handleReabrirOrden}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-5 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2 cursor-pointer"
                            >
                                <RotateCcw size={18} />
                                Reabrir Orden
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleDarPorTerminada}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2 cursor-pointer"
                                title="Dar esta orden como terminada"
                            >
                                <CheckCircle size={18} />
                                Dar como Terminada
                            </button>
                        )
                    )}
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2 cursor-pointer"
                    >
                        <XCircle size={18} />
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="orden-form"
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50 text-sm cursor-pointer"
                    >
                        <Save size={18} />
                        {loading ? 'Guardando...' : (isEditMode ? 'Actualizar Cambios' : 'Guardar Orden')}
                    </button>
                </div>
            </div>

            {showUtilidadModal && id && (
                <UtilidadOrdenModal
                    ordenId={Number(id)}
                    onClose={() => setShowUtilidadModal(false)}
                />
            )}
        </div >
    );
};

export default OrdenTrabajoForm;
