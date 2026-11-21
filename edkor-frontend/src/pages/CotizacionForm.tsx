import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, Save, FileText, User, Phone, Car, Hash, Gauge,
    Briefcase, Shield, Calendar, Plus, X
} from 'lucide-react';
import Swal from 'sweetalert2';
import type { CreateCotizacionData } from '../types/cotizacion';
import { createCotizacion, updateCotizacion, getCotizacion } from '../services/cotizacionesService';
import { getAllMarcasAuto, createMarcaAuto } from '../services/marcaAutoService';
import { getTiposOrden, createTipoOrden } from '../services/tipoOrdenService';
import { getSeguros } from '../services/seguroService';
import { getInspectores } from '../services/inspectorService';
import { getOrdenTrabajoByPlaca } from '../services/ordenTrabajoService';
import type { MarcaAuto } from '../types/marcaAuto';
import type { TipoOrden } from '../types/tipoOrden';
import type { Seguro } from '../types/seguro';
import type { Inspector } from '../types/inspector';
import { useAuth } from '../context/AuthContext';
import OrdenTrabajoDetalles from './OrdenTrabajoDetalles';

const CotizacionForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [marcas, setMarcas] = useState<MarcaAuto[]>([]);
    const [tiposOrden, setTiposOrden] = useState<TipoOrden[]>([]);
    const [seguros, setSeguros] = useState<Seguro[]>([]);
    const [inspectores, setInspectores] = useState<Inspector[]>([]);
    const [localDetalles, setLocalDetalles] = useState<any[]>([]);

    // Modales de creación rápida con botones naranja
    const [showModalTipoOrden, setShowModalTipoOrden] = useState(false);
    const [nuevoTipoOrdenNombre, setNuevoTipoOrdenNombre] = useState('');
    const [savingTipoOrden, setSavingTipoOrden] = useState(false);

    const [showModalMarca, setShowModalMarca] = useState(false);
    const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState('');
    const [savingMarca, setSavingMarca] = useState(false);

    const [formData, setFormData] = useState<CreateCotizacionData>({
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
        observaciones: '',
        idusuario: user?.id ? Number(user.id) : 0,
        id_tipo_orden: undefined,
        idseguro: undefined,
        idinspector: undefined,
        estado: 'activo',
        detalles: []
    });

    const handleAddLocal = (detalle: any) => {
        setLocalDetalles(prev => [...prev, { ...detalle, id: Date.now() + Math.random() }]);
    };

    const handleUpdateLocal = (index: number, updated: any) => {
        setLocalDetalles(prev => prev.map((item, i) => i === index ? { ...item, ...updated } : item));
    };

    const handleRemoveLocal = (index: number) => {
        setLocalDetalles(prev => prev.filter((_, i) => i !== index));
    };

    const handleTotalChange = useCallback((total: number) => {
        setFormData(prev => {
            const roundedTotal = Number(Number(total || 0).toFixed(2));
            if (prev.sub_total !== roundedTotal) {
                return { ...prev, sub_total: roundedTotal };
            }
            return prev;
        });
    }, []);

    useEffect(() => {
        loadRelatedData();
        if (isEditMode) {
            loadCotizacionData(Number(id));
        }
    }, [id]);

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
            setFormData(prev => ({ ...prev, idusuario: Number(user.id) }));
        }
    }, [user]);

    // Autocompletar datos basados en la placa desde órdenes de trabajo previas
    useEffect(() => {
        const fetchDataByPlaca = async () => {
            if (isEditMode || !formData.vehiculo_placa || formData.vehiculo_placa.trim().length < 3) {
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
    }, [formData.vehiculo_placa, isEditMode]);

    const loadRelatedData = async () => {
        try {
            const [marcasData, tiposData, segurosData, inspectoresData] = await Promise.all([
                getAllMarcasAuto(),
                getTiposOrden().catch(() => []),
                getSeguros().catch(() => []),
                getInspectores().catch(() => [])
            ]);
            setMarcas(marcasData.filter((m: MarcaAuto) => m.estado === 'activo'));
            const activeTipos = tiposData.filter((t: TipoOrden) => t.estado === 'activo');
            setTiposOrden(activeTipos);
            setSeguros(segurosData.filter((s: Seguro) => s.estado === 'activo'));
            setInspectores(inspectoresData.filter((i: Inspector) => i.estado === 'activo'));

            if (!isEditMode && activeTipos.length > 0) {
                const particular = activeTipos.find((t: TipoOrden) => t.tipo_orden.toLowerCase().includes('particular')) || activeTipos[0];
                if (particular) {
                    setFormData(prev => ({ ...prev, id_tipo_orden: prev.id_tipo_orden || particular.id }));
                }
            }
        } catch (error) {
            console.error('Error loading related data:', error);
        }
    };

    const handleCreateTipoOrden = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = nuevoTipoOrdenNombre.trim();
        if (!clean) return;

        const duplicado = tiposOrden.find(t => t.tipo_orden?.trim().toLowerCase() === clean.toLowerCase());
        if (duplicado) {
            Swal.fire({
                icon: 'warning',
                title: 'Tipo de Orden existente',
                text: `Ya existe un tipo de orden con el nombre "${clean}".`,
            });
            return;
        }

        try {
            setSavingTipoOrden(true);
            const created = await createTipoOrden({ tipo_orden: clean, estado: 'activo' });
            const tiposData = await getTiposOrden();
            setTiposOrden(tiposData.filter((t: TipoOrden) => t.estado === 'activo'));
            setFormData(prev => ({ ...prev, id_tipo_orden: Number(created.id) }));
            setShowModalTipoOrden(false);
            setNuevoTipoOrdenNombre('');
            Swal.fire({
                icon: 'success',
                title: 'Tipo de Orden Creado',
                text: `"${clean}" se registró correctamente.`,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error: any) {
            console.error('Error creando Tipo de Orden:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error?.response?.data?.message || 'No se pudo registrar el Tipo de Orden'
            });
        } finally {
            setSavingTipoOrden(false);
        }
    };

    const handleCreateMarcaAuto = async (e: React.FormEvent) => {
        e.preventDefault();
        const clean = nuevaMarcaNombre.trim();
        if (!clean) return;

        const duplicado = marcas.find(m => m.marca?.trim().toLowerCase() === clean.toLowerCase());
        if (duplicado) {
            Swal.fire({
                icon: 'warning',
                title: 'Marca existente',
                text: `Ya existe una marca con el nombre "${clean}".`,
            });
            return;
        }

        try {
            setSavingMarca(true);
            const created = await createMarcaAuto({ marca: clean, estado: 'activo' });
            const marcasData = await getAllMarcasAuto();
            setMarcas(marcasData.filter((m: MarcaAuto) => m.estado === 'activo'));
            setFormData(prev => ({ ...prev, idmarca_auto: created.id }));
            setShowModalMarca(false);
            setNuevaMarcaNombre('');
            Swal.fire({
                icon: 'success',
                title: 'Marca Creada',
                text: `"${clean}" se registró correctamente.`,
                timer: 1500,
                showConfirmButton: false
            });
        } catch (error: any) {
            console.error('Error creando Marca de Auto:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error?.response?.data?.message || 'No se pudo registrar la Marca'
            });
        } finally {
            setSavingMarca(false);
        }
    };

    const loadCotizacionData = async (cotId: number) => {
        try {
            setLoading(true);
            const cot = await getCotizacion(cotId);
            if (!cot) return;

            setFormData({
                cliente_nombre: cot.cliente_nombre || cot.cliente || '',
                cliente_telefono: cot.cliente_telefono || cot.celular || '',
                idmarca_auto: cot.marca_auto?.id || cot.idmarca_auto || 0,
                vehiculo_modelo: cot.vehiculo_modelo || cot.modelo || '',
                vehiculo_placa: cot.vehiculo_placa || cot.placa || '',
                vehiculo_color: cot.vehiculo_color || cot.color || '',
                vehiculo_kilometraje: cot.vehiculo_kilometraje || cot.km_ingreso || '',
                vehiculo_chasis: cot.vehiculo_chasis || cot.chasis || '',
                plazo_entrega: cot.plazo_entrega || 1,
                moneda: cot.moneda || 'Bolivianos',
                sub_total: Number(cot.sub_total) || 0,
                descuento: Number(cot.descuento) || 0,
                total: Number(cot.total) || 0,
                observaciones: cot.observaciones || '',
                idusuario: cot.usuario?.id || user?.id || 0,
                id_tipo_orden: cot.id_tipo_orden || (cot.tipo_orden as any)?.id || undefined,
                idseguro: cot.idseguro || (cot.seguro as any)?.id || undefined,
                idinspector: cot.idinspector || (cot.inspector as any)?.id || undefined,
                estado: cot.estado || 'activo',
                detalles: []
            });

            if (cot.detalles && cot.detalles.length > 0) {
                const mappedDetalles = cot.detalles.map((d: any, idx: number) => ({
                    id: Date.now() + idx,
                    idcotizacion: cot.id,
                    idprecio_taller: d.precio_taller?.id || d.idprecio_taller || undefined,
                    idprecio_seguro: d.precio_seguro?.id || d.idprecio_seguro || undefined,
                    id_inventario: d.inventario?.id || d.id_inventario || undefined,
                    idpersonal_mecanico: d.personal_mecanico?.id || d.idpersonal_mecanico || undefined,
                    personal_mecanico: d.personal_mecanico,
                    precio_taller: d.precio_taller,
                    precio_seguro: d.precio_seguro,
                    inventario: d.inventario,
                    estado_trabajo: d.estado_trabajo || 'confirmado',
                    tiempo_estimado: d.tiempo_estimado !== undefined ? d.tiempo_estimado : (d.precio_taller?.tiempo_estimado || undefined),
                    precio_hora: d.precio_hora !== undefined ? Number(d.precio_hora) : (d.precio_taller?.precio_hora ? Number(d.precio_taller.precio_hora) : undefined),
                    total_costo: d.total_costo !== undefined ? Number(d.total_costo) : (d.precio_taller?.total_costo ? Number(d.precio_taller.total_costo) : undefined),
                    detalle: d.detalle || d.precio_taller?.detalle || d.precio_seguro?.detalle || d.inventario?.descripcion || '',
                    cantidad: Number(d.cantidad) || 1,
                    precio_unitario: Number(d.precio_unitario) || 0,
                    total: Number(d.total) || 0,
                    nivel: d.nivel || undefined,
                    observaciones: d.observaciones || undefined,
                    imagenes: d.imagenes || []
                }));
                setLocalDetalles(mappedDetalles);
            }
        } catch (error) {
            console.error('Error al cargar cotización:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar la información de la cotización'
            });
        } finally {
            setLoading(false);
        }
    };

    const selectedTipoOrden = tiposOrden.find(t => t.id === formData.id_tipo_orden);
    const isSeguro = String(selectedTipoOrden?.tipo_orden || '').toLowerCase().includes('seguro');
    const inspectoresFiltrados = formData.idseguro
        ? inspectores.filter(i => Number(i.seguro_id) === Number(formData.idseguro))
        : inspectores;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.cliente_nombre.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo Requerido',
                text: 'Por favor ingresa el nombre del cliente.'
            });
            return;
        }

        if (!formData.vehiculo_placa.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo Requerido',
                text: 'Por favor ingresa la placa del vehículo.'
            });
            return;
        }

        if (isSeguro && !formData.idseguro) {
            Swal.fire({
                icon: 'warning',
                title: 'Aseguradora Requerida',
                text: 'Para órdenes de tipo Seguro, debes seleccionar la Aseguradora.'
            });
            return;
        }

        setLoading(true);

        try {
            const mappedDetalles = localDetalles.map(d => ({
                idprecio_taller: d.idprecio_taller || d.precio_taller?.id || undefined,
                idprecio_seguro: d.precio_seguro?.id || d.idprecio_seguro || undefined,
                id_inventario: d.id_inventario || d.inventario?.id || undefined,
                idpersonal_mecanico: d.idpersonal_mecanico || d.personal_mecanico?.id || undefined,
                estado_trabajo: d.estado_trabajo || 'confirmado',
                tiempo_estimado: d.tiempo_estimado !== undefined && d.tiempo_estimado !== '' ? Number(d.tiempo_estimado) : undefined,
                precio_hora: d.precio_hora !== undefined && d.precio_hora !== '' ? Number(d.precio_hora) : undefined,
                total_costo: d.total_costo !== undefined && d.total_costo !== '' ? Number(d.total_costo) : undefined,
                detalle: d.detalle || d.precio_taller?.detalle || d.precio_seguro?.detalle || d.inventario?.descripcion || '',
                cantidad: Number(d.cantidad) || 1,
                precio_unitario: Number(d.precio_unitario) || 0,
                total: Number(d.total) || 0,
                nivel: d.nivel || undefined,
                observaciones: d.observaciones || undefined,
                imagenes: d.imagenes || []
            }));

            const payload: CreateCotizacionData = {
                ...formData,
                cliente_nombre: formData.cliente_nombre.trim(),
                cliente_telefono: formData.cliente_telefono?.trim() || '',
                vehiculo_placa: formData.vehiculo_placa.toUpperCase().trim(),
                vehiculo_modelo: formData.vehiculo_modelo?.trim() || '',
                vehiculo_color: formData.vehiculo_color?.trim() || '',
                vehiculo_chasis: formData.vehiculo_chasis?.trim() || '',
                vehiculo_kilometraje: formData.vehiculo_kilometraje ? String(formData.vehiculo_kilometraje) : '',
                idmarca_auto: formData.idmarca_auto ? Number(formData.idmarca_auto) : undefined,
                id_tipo_orden: formData.id_tipo_orden ? Number(formData.id_tipo_orden) : undefined,
                idseguro: isSeguro && formData.idseguro ? Number(formData.idseguro) : undefined,
                idinspector: isSeguro && formData.idinspector ? Number(formData.idinspector) : undefined,
                sub_total: Number(Number(formData.sub_total || 0).toFixed(2)),
                descuento: Number(Number(formData.descuento || 0).toFixed(2)),
                total: Number(Number(formData.total || 0).toFixed(2)),
                detalles: mappedDetalles
            };

            if (isEditMode) {
                await updateCotizacion(Number(id), payload);
                await Swal.fire({
                    icon: 'success',
                    title: 'Actualizado',
                    text: 'Cotización actualizada exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await createCotizacion(payload);
                await Swal.fire({
                    icon: 'success',
                    title: 'Creada',
                    text: 'Cotización creada exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            navigate('/cotizaciones');
        } catch (error: any) {
            console.error('Error al guardar cotización:', error);
            const msg = error.response?.data?.message || 'Error al procesar la cotización';
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: Array.isArray(msg) ? msg.join(', ') : msg
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6">
            {/* Header Superior con botones de acción */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                    <button
                        type="button"
                        onClick={() => navigate('/cotizaciones')}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <ArrowLeft size={20} />
                        Volver
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                        {isEditMode ? 'Editar Cotización' : 'Nueva Cotización'}
                    </h1>
                    {isEditMode && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                            {formData.estado}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        form="cotizacion-form"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <Save size={18} />
                        )}
                        <span>{isEditMode ? 'Guardar Cambios' : 'Guardar Cotización'}</span>
                    </button>
                </div>
            </div>

            <form id="cotizacion-form" onSubmit={handleSubmit} className="space-y-6">

                {/* 1. SECCIÓN: TIPO DE ORDEN (EL PRIMER REGISTRO) */}
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Shield size={20} className="text-blue-600" />
                            Tipo de Orden
                        </h2>
                        {isSeguro && (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
                                Cotización con Seguro
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Tipo de Orden *
                            </label>
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Briefcase size={16} className="text-gray-400" />
                                    </div>
                                    <select
                                        value={formData.id_tipo_orden || ''}
                                        onChange={(e) => {
                                            const val = e.target.value ? Number(e.target.value) : undefined;
                                            setFormData(prev => ({
                                                ...prev,
                                                id_tipo_orden: val,
                                                idseguro: undefined,
                                                idinspector: undefined
                                            }));
                                        }}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-medium"
                                    >
                                        <option value="">-- Seleccionar Tipo de Orden --</option>
                                        {tiposOrden.map(t => (
                                            <option key={t.id} value={t.id}>{t.tipo_orden}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNuevoTipoOrdenNombre('');
                                        setShowModalTipoOrden(true);
                                    }}
                                    className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0"
                                    title="Registrar nuevo Tipo de Orden"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>
                        </div>

                        {isSeguro && (
                            <>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Aseguradora *
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Shield size={16} className="text-blue-500" />
                                        </div>
                                        <select
                                            value={formData.idseguro || ''}
                                            onChange={(e) => {
                                                const sId = e.target.value ? Number(e.target.value) : undefined;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    idseguro: sId,
                                                    idinspector: undefined
                                                }));
                                            }}
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-medium"
                                        >
                                            <option value="">-- Seleccionar Seguro --</option>
                                            {seguros.map(s => (
                                                <option key={s.id} value={s.id}>{s.seguro}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Inspector Asignado
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <User size={16} className="text-blue-500" />
                                        </div>
                                        <select
                                            value={formData.idinspector || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, idinspector: e.target.value ? Number(e.target.value) : undefined }))}
                                            disabled={!formData.idseguro}
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-medium disabled:opacity-50"
                                        >
                                            <option value="">-- Seleccionar Inspector --</option>
                                            {inspectoresFiltrados.map(i => (
                                                <option key={i.id} value={i.id}>{i.inspector}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* 2. GRID: DATOS DEL CLIENTE Y VEHÍCULO */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card: Datos del Propietario */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <User size={20} className="text-blue-600" />
                                Datos del Propietario
                            </h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Nombre del Cliente / Propietario *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={formData.cliente_nombre}
                                        onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-medium"
                                        placeholder="Nombre completo del cliente"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Teléfono / Celular
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Phone size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.cliente_telefono || ''}
                                        onChange={(e) => setFormData({ ...formData, cliente_telefono: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-medium"
                                        placeholder="Ej. +591 70000000"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card: Datos del Vehículo */}
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Car size={20} className="text-green-600" />
                                Datos del Vehículo
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Placa *
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FileText size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={formData.vehiculo_placa}
                                        onChange={(e) => setFormData({ ...formData, vehiculo_placa: e.target.value.toUpperCase() })}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-bold tracking-wider"
                                        placeholder="ABC-1234"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Marca
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Car size={16} className="text-gray-400" />
                                        </div>
                                        <select
                                            value={formData.idmarca_auto || ''}
                                            onChange={(e) => setFormData({ ...formData, idmarca_auto: Number(e.target.value) || 0 })}
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-medium"
                                        >
                                            <option value="">-- Seleccionar Marca --</option>
                                            {marcas.map(m => (
                                                <option key={m.id} value={m.id}>{m.marca}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNuevaMarcaNombre('');
                                            setShowModalMarca(true);
                                        }}
                                        className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0"
                                        title="Registrar nueva Marca de Auto"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Modelo
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Car size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.vehiculo_modelo}
                                        onChange={(e) => setFormData({ ...formData, vehiculo_modelo: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-medium"
                                        placeholder="Ej. Corolla, Hilux..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Kilometraje
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Gauge size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.vehiculo_kilometraje ?? ''}
                                        onChange={(e) => setFormData({ ...formData, vehiculo_kilometraje: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-medium"
                                        placeholder="Ej. 45000"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Color
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <div className="w-4 h-4 rounded-full border border-gray-300" style={{ backgroundColor: formData.vehiculo_color || 'transparent' }}></div>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.vehiculo_color || ''}
                                        onChange={(e) => setFormData({ ...formData, vehiculo_color: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-medium"
                                        placeholder="Ej. Blanco, Rojo..."
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Chasis
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Hash size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.vehiculo_chasis || ''}
                                        onChange={(e) => setFormData({ ...formData, vehiculo_chasis: e.target.value.toUpperCase() })}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-medium"
                                        placeholder="Nro. Chasis"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* 3. SECCIÓN: DETALLES DE TRABAJO */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <FileText size={24} className="text-blue-600" />
                    Detalles del Trabajo
                </h2>
                <OrdenTrabajoDetalles
                    localDetalles={localDetalles}
                    onAddLocal={handleAddLocal}
                    onUpdateLocal={handleUpdateLocal}
                    onRemoveLocal={handleRemoveLocal}
                    embedded={true}
                    particularSeguro={selectedTipoOrden?.tipo_orden || 'Particular'}
                    idseguro={formData.idseguro}
                    onTotalChange={handleTotalChange}
                />
            </div>

            {/* 4. SECCIÓN: INFORMACIÓN ADICIONAL Y TOTALES */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-gray-700">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                    <FileText size={20} className="text-blue-600" />
                    Información Adicional
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Observaciones Generales
                        </label>
                        <textarea
                            form="cotizacion-form"
                            rows={3}
                            value={formData.observaciones || ''}
                            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                            placeholder="Observaciones generales de la cotización..."
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-medium resize-y"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Plazo de Entrega (Días) *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Calendar size={16} className="text-gray-400" />
                                </div>
                                <input
                                    form="cotizacion-form"
                                    type="number"
                                    min="1"
                                    required
                                    value={formData.plazo_entrega || ''}
                                    onChange={(e) => setFormData({ ...formData, plazo_entrega: parseInt(e.target.value) || 0 })}
                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Moneda
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Briefcase size={16} className="text-gray-400" />
                                </div>
                                <select
                                    form="cotizacion-form"
                                    value={formData.moneda}
                                    onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm"
                                >
                                    <option value="Bolivianos">Bolivianos</option>
                                    <option value="Dolares">Dólares</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Estado
                            </label>
                            <select
                                form="cotizacion-form"
                                value={formData.estado || 'activo'}
                                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm font-bold capitalize"
                            >
                                <option value="activo">Activo</option>
                                <option value="aprobada">Aprobada</option>
                                <option value="pendiente">Pendiente</option>
                                <option value="anulada">Anulada</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Sub Total
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 text-sm font-semibold">{formData.moneda === 'Bolivianos' ? 'Bs' : '$'}</span>
                                </div>
                                <input
                                    type="text"
                                    value={Number(formData.sub_total || 0).toFixed(2)}
                                    readOnly
                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/60 text-gray-900 dark:text-white focus:outline-none text-sm font-bold cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Descuento
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 text-sm font-semibold">{formData.moneda === 'Bolivianos' ? 'Bs' : '$'}</span>
                                </div>
                                <input
                                    form="cotizacion-form"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0"
                                    value={!formData.descuento || Number(formData.descuento) === 0 ? '' : formData.descuento}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, descuento: val === '' ? 0 : parseFloat(val) || 0 });
                                    }}
                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                Total
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">{formData.moneda === 'Bolivianos' ? 'Bs' : '$'}</span>
                                </div>
                                <input
                                    type="text"
                                    value={Number(formData.total || 0).toFixed(2)}
                                    readOnly
                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 focus:outline-none text-base font-extrabold cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL CREAR TIPO DE ORDEN */}
            {showModalTipoOrden && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Plus size={20} className="text-orange-500" />
                                Nuevo Tipo de Orden
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModalTipoOrden(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTipoOrden} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre del Tipo de Orden *
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="Ej. Particular, Seguro, Flota..."
                                    value={nuevoTipoOrdenNombre}
                                    onChange={(e) => setNuevoTipoOrdenNombre(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModalTipoOrden(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingTipoOrden || !nuevoTipoOrdenNombre.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                                >
                                    <Save size={16} />
                                    {savingTipoOrden ? 'Guardando...' : 'Guardar Tipo de Orden'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CREAR MARCA DE AUTO */}
            {showModalMarca && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Plus size={20} className="text-orange-500" />
                                Nueva Marca de Auto
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowModalMarca(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateMarcaAuto} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre de la Marca *
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="Ej. Toyota, Nissan, Hyundai..."
                                    value={nuevaMarcaNombre}
                                    onChange={(e) => setNuevaMarcaNombre(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModalMarca(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingMarca || !nuevaMarcaNombre.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                                >
                                    <Save size={16} />
                                    {savingMarca ? 'Guardando...' : 'Guardar Marca'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CotizacionForm;
