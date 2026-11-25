import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, FileText, Calendar, DollarSign, Trash2, Edit, Save, X, Hash, Layers, Image as ImageIcon, Upload, Check, Package, User, Clock, CheckCircle, XCircle, RotateCcw, RotateCw, ReceiptText, ExternalLink, KeyRound, AlertCircle, Lock, Calculator, Wrench } from 'lucide-react';
import { uploadFile } from '../services/fileService';
import Swal from 'sweetalert2';
import type { DetalleOrdenTrabajo, CreateDetalleOrdenTrabajoData } from '../types/detalleOrdenTrabajo';
import type { PrecioTaller } from '../types/precioTaller';
import type { PrecioSeguro } from '../types/precioSeguro';
import type { Inventario } from '../types/inventario';
import type { Personal } from '../types/personal';
import { getDetallesByOrden, createDetalleOrdenTrabajo, deleteDetalleOrdenTrabajo, updateDetalleOrdenTrabajo } from '../services/detalleOrdenTrabajoService';
import { getPreciosTaller } from '../services/precioTallerService';
import { getPreciosSeguros } from '../services/precioSeguroService';
import { getInventarios } from '../services/inventarioService';
import { getPersonal } from '../services/personalService';
import { getOrdenTrabajo, updateOrdenTrabajo } from '../services/ordenTrabajoService';
import type { OrdenTrabajo } from '../types/ordenTrabajo';
import { normalizeItems } from '../components/taller/MantenimientoDetalleModal';
import { useAuth } from '../context/AuthContext';
import { getLocalDateString, formatDate } from '../utils/dateUtils';
import { API_BASE_URL } from '../config';
import SearchableSelect from '../components/common/SearchableSelect';


interface OrdenTrabajoDetallesProps {
    ordenId?: number;
    localDetalles?: any[];
    onAddLocal?: (detalle: any) => void;
    onUpdateLocal?: (index: number, updated: any) => void;
    onRemoveLocal?: (index: number) => void;
    embedded?: boolean;
    particularSeguro?: string;
    idseguro?: number;
    onTotalChange?: (total: number) => void;
    defaultMecanicoId?: string;
}

const OrdenTrabajoDetalles = ({ ordenId, localDetalles, onAddLocal, onUpdateLocal, onRemoveLocal, embedded, particularSeguro, idseguro, onTotalChange, defaultMecanicoId }: OrdenTrabajoDetallesProps) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const activeId = ordenId || (id ? Number(id) : null);

    // Si estamos en modo embebido (por prop o por id), no mostrar ciertas secciones
    const isEmbedded = embedded || !!ordenId;

    const [orden, setOrden] = useState<OrdenTrabajo | null>(null);
    const [detalles, setDetalles] = useState<DetalleOrdenTrabajo[]>([]);
    const [preciosTaller, setPreciosTaller] = useState<PrecioTaller[]>([]);
    const [preciosSeguros, setPreciosSeguros] = useState<PrecioSeguro[]>([]);
    const [inventarios, setInventarios] = useState<Inventario[]>([]);
    const [personalList, setPersonalList] = useState<Personal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const tipoOrdenNombre = orden?.tipo_orden?.tipo_orden || orden?.hoja_recepcion?.tipo_orden?.tipo_orden || (orden as any)?.particular_seguro || particularSeguro || 'Particular';
    const isSeguro = String(tipoOrdenNombre).toLowerCase().includes('seguro');

    const activeSeguroId = idseguro || orden?.idseguro || (orden?.seguro as any)?.id || orden?.hoja_recepcion?.idseguro || (orden?.hoja_recepcion?.seguro as any)?.id;
    const preciosSegurosFiltrados = activeSeguroId
        ? preciosSeguros.filter(p => Number((p as any).idseguro || p.seguro?.id) === Number(activeSeguroId))
        : preciosSeguros;

    const isCategoriaChaperia = (precio?: PrecioTaller | null, detalleObj?: DetalleOrdenTrabajo | null) => {
        const catName = (precio?.categoria?.categoria_servicio || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        if (catName.includes('chaper')) return true;
        const detCat = ((detalleObj?.precio_taller?.categoria as any)?.categoria_servicio || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        return detCat.includes('chaper');
    };

    const isCategoriaTercero = (precio?: PrecioTaller | null, detalleObj?: DetalleOrdenTrabajo | null) => {
        if (isCategoriaChaperia(precio, detalleObj)) return false;
        if (detalleObj?.costo_tercero && Number(detalleObj.costo_tercero) > 0 && !isCategoriaChaperia(precio, detalleObj)) return true;
        const catName = (precio?.categoria?.categoria_servicio || '').toLowerCase().trim();
        if (catName.includes('tercero')) return true;
        const detCat = ((detalleObj?.precio_taller?.categoria as any)?.categoria_servicio || '').toLowerCase().trim();
        return detCat.includes('tercero');
    };

    const getPersonalOpciones = (esChaperia: boolean) => {
        if (esChaperia) {
            const chapistas = personalList.filter(p => {
                const area = (p.area?.area || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                const tipo = (p.tipo || '').toLowerCase();
                return area.includes('chaper') || tipo.includes('contrat');
            });
            return chapistas.length > 0 ? chapistas : personalList;
        }
        const mecanicos = personalList.filter(p => {
            const area = (p.area?.area || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            return (area === 'mecanico' || area === 'mecanica') && !area.includes('jefe');
        });
        return mecanicos.length > 0 ? mecanicos : personalList;
    };

    const isTrabajoLiquidadoPlanilla = (d?: DetalleOrdenTrabajo | null) => {
        if (!d) return false;
        return Boolean(d.trabajo_asignado?.cancelado || d.trabajo_asignado?.idplanilla);
    };

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        idprecio_taller: '',
        idprecio_seguro: '',
        id_inventario: '',
        idpersonal_mecanico: defaultMecanicoId || '',
        estado_trabajo: 'confirmado' as 'confirmado' | 'descartado' | 'pendiente',
        tiempo_estimado: '',
        precio_hora: 0,
        total_costo: 0,
        costo_tercero: 0,
        cantidad: 1 as number | string,
        precio_unitario: 0,
        nivel: '',
        detalle: '',
        observaciones: '',
        imagenes: [] as string[]
    });

    const selectedInvItem = inventarios.find(i => String(i.id) === String(formData.id_inventario));
    const costoCompraForm = Number(selectedInvItem?.precio_compra || selectedInvItem?.costo || 0);
    const gananciaUnitForm = Number(formData.precio_unitario || 0) - costoCompraForm;
    const gananciaPctForm = costoCompraForm > 0 ? Number(((gananciaUnitForm / costoCompraForm) * 100).toFixed(1)) : 0;

    useEffect(() => {
        if (defaultMecanicoId && !formData.idpersonal_mecanico) {
            setFormData(prev => ({ ...prev, idpersonal_mecanico: defaultMecanicoId }));
        }
    }, [defaultMecanicoId]);
    const [uploading, setUploading] = useState(false);

    // Estado para edición de detalles (Observaciones e Imágenes)
    const [editingDetalle, setEditingDetalle] = useState<DetalleOrdenTrabajo | null>(null);
    const [detailForm, setDetailForm] = useState({
        observaciones: '',
        imagenes: [] as string[]
    });

    // Estado para edición de detalle completo (todos los campos)
    const [editingDetalleMain, setEditingDetalleMain] = useState<DetalleOrdenTrabajo | null>(null);
    const [editingDetalleMainIndex, setEditingDetalleMainIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        idprecio_taller: '',
        idprecio_seguro: '',
        id_inventario: '',
        idpersonal_mecanico: '',
        estado_trabajo: 'confirmado' as 'confirmado' | 'descartado' | 'pendiente',
        tiempo_estimado: '',
        precio_hora: 0,
        total_costo: 0,
        costo_tercero: 0,
        detalle: '',
        cantidad: 1 as number | string,
        precio_unitario: 0,
        nivel: '',
        observaciones: ''
    });

    // Estado para vista previa de imagen
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // Estado para calculadora de precio de venta (ítems de inventario)
    const [showPriceCalcModal, setShowPriceCalcModal] = useState(false);
    const [calcPrecioCompra, setCalcPrecioCompra] = useState<number>(0);
    const [calcPorcentaje, setCalcPorcentaje] = useState<number>(30);
    const [calcPrecioVenta, setCalcPrecioVenta] = useState<number>(0);
    const [calcItemNombre, setCalcItemNombre] = useState<string>('');

    const openPriceCalculator = (precioCompra: number, itemNombre: string, precioActual: number, precioVentaInv?: number) => {
        setCalcPrecioCompra(precioCompra);
        setCalcItemNombre(itemNombre);

        let initialVenta = precioActual > 0 ? precioActual : (precioVentaInv && precioVentaInv > 0 ? precioVentaInv : 0);
        let initialPct = 30;

        if (precioCompra > 0) {
            if (initialVenta > 0) {
                initialPct = Number((((initialVenta - precioCompra) / precioCompra) * 100).toFixed(2));
            } else {
                initialVenta = Number((precioCompra * 1.3).toFixed(2));
            }
        }

        setCalcPorcentaje(initialPct);
        setCalcPrecioVenta(initialVenta);
        setShowPriceCalcModal(true);
    };

    // Estados para edición de información adicional de la orden
    const [ordenForm, setOrdenForm] = useState({
        plazo_entrega: 0,
        moneda: 'bolivianos',
        observaciones: ''
    });
    const [savingOrden, setSavingOrden] = useState(false);

    const handleToggleForm = () => {
        if (!showForm) {
            setFormData({
                idprecio_taller: '',
                idprecio_seguro: '',
                id_inventario: '',
                idpersonal_mecanico: '',
                estado_trabajo: 'confirmado',
                tiempo_estimado: '',
                precio_hora: 0,
                total_costo: 0,
                costo_tercero: 0,
                cantidad: 1,
                precio_unitario: 0,
                nivel: '',
                detalle: '',
                observaciones: '',
                imagenes: []
            });
        }
        setShowForm(!showForm);
    };
    useEffect(() => {
        loadData();
    }, [activeId]);

    // Sync localDetalles to detalles for display
    useEffect(() => {
        if (!activeId && localDetalles) {
            setDetalles(localDetalles as DetalleOrdenTrabajo[]);
        }
    }, [localDetalles, activeId]);

    // Calculate total and notify parent whenever details change (excluding discarded items)
    useEffect(() => {
        if (onTotalChange) {
            const total = detalles
                .filter(d => d.estado_trabajo !== 'descartado')
                .reduce((sum, d) => sum + Math.round(Number(d.total || (Number(d.cantidad || 0) * Number(d.precio_unitario || 0)))), 0);
            onTotalChange(Math.round(total));
        }
    }, [detalles, onTotalChange]);

    // Sync particularSeguro prop to orden state
    useEffect(() => {
        if (!activeId && particularSeguro) {
            setOrden(prev => prev ? { ...prev, particular_seguro: particularSeguro } : { moneda: 'Bolivianos', particular_seguro: particularSeguro } as any);
        }
    }, [particularSeguro, activeId]);

    useEffect(() => {
        // Auto-set detalle, precio_unitario, tiempo_estimado, precio_hora, total_costo and costo_tercero when selecting a price for Particular
        if (formData.idprecio_taller) {
            const precio = preciosTaller.find(p => String(p.id) === String(formData.idprecio_taller));
            if (precio) {
                const esTercero = isCategoriaTercero(precio);
                const esChaperia = isCategoriaChaperia(precio);
                const esExternoOObra = esTercero || esChaperia;
                const selectedMec = personalList.find(p => String(p.id) === String(formData.idpersonal_mecanico));
                const precioHoraUsar = selectedMec && Number(selectedMec.precio_hora) > 0
                    ? Number(selectedMec.precio_hora)
                    : Number(precio.precio_hora || 0);
                const tiempoNum = Number(precio.tiempo_estimado || 0);
                const costoTerceroVal = esExternoOObra
                    ? (formData.costo_tercero > 0 ? formData.costo_tercero : (precio.total_costo ? Number(precio.total_costo) : 0))
                    : 0;
                const totalCostoCalc = esExternoOObra
                    ? costoTerceroVal
                    : Number((tiempoNum * precioHoraUsar).toFixed(2));

                setFormData(prev => ({
                    ...prev,
                    detalle: precio.detalle,
                    precio_unitario: Number(precio.precio),
                    tiempo_estimado: esExternoOObra ? '' : (precio.tiempo_estimado ? String(precio.tiempo_estimado) : ''),
                    precio_hora: esExternoOObra ? 0 : precioHoraUsar,
                    costo_tercero: costoTerceroVal,
                    total_costo: totalCostoCalc
                }));
            }
        }
    }, [formData.idprecio_taller, preciosTaller, formData.idpersonal_mecanico, personalList]);

    const handleMecanicoFormChange = (mecanicoId: string) => {
        const mec = personalList.find(p => String(p.id) === String(mecanicoId));
        const mecPrecioHora = mec && Number(mec.precio_hora) > 0 ? Number(mec.precio_hora) : undefined;
        setFormData(prev => {
            const selectedPrecio = preciosTaller.find(p => String(p.id) === String(prev.idprecio_taller));
            const esTercero = isCategoriaTercero(selectedPrecio);
            const esChaperia = isCategoriaChaperia(selectedPrecio);
            const esExternoOObra = esTercero || esChaperia;
            const newPrecioHora = mecPrecioHora !== undefined ? mecPrecioHora : prev.precio_hora;
            const t = Number(prev.tiempo_estimado || 0);
            return {
                ...prev,
                idpersonal_mecanico: mecanicoId,
                precio_hora: esExternoOObra ? 0 : newPrecioHora,
                total_costo: esExternoOObra ? prev.costo_tercero : Number((t * Number(newPrecioHora || 0)).toFixed(2))
            };
        });
    };

    useEffect(() => {
        // Auto-set detalle when selecting a price for Seguro (precio depends on nivel)
        if (formData.idprecio_seguro) {
            const precio = preciosSeguros.find(p => String(p.id) === String(formData.idprecio_seguro));
            if (precio) {
                setFormData(prev => ({
                    ...prev,
                    detalle: precio.detalle
                }));
            }
        }
    }, [formData.idprecio_seguro, preciosSeguros]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [tallerData, segurosData, inventariosData, personalData] = await Promise.all([
                getPreciosTaller(),
                getPreciosSeguros(),
                getInventarios(),
                getPersonal()
            ]);
            setPreciosTaller(tallerData.filter(p => p.estado === 'activo'));
            setPreciosSeguros(segurosData.filter(p => p.estado === 'activo'));
            setInventarios(inventariosData.filter((i: Inventario) => i.estado === 'activo'));
            const personalOperativo = personalData.filter((p: Personal) => {
                if (p.estado !== 'activo') return false;
                const area = (p.area?.area || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                const tipo = (p.tipo || '').toLowerCase();
                const esMecanico = (area === 'mecanico' || area === 'mecanica') && !area.includes('jefe');
                const esChapistaOContratista = area.includes('chaper') || tipo.includes('contrat');
                return esMecanico || esChapistaOContratista;
            });
            setPersonalList(personalOperativo);

            if (activeId) {
                const [ordenData, detallesData] = await Promise.all([
                    getOrdenTrabajo(Number(activeId)),
                    getDetallesByOrden(Number(activeId))
                ]);
                setOrden(ordenData);
                setDetalles(detallesData);

                // Inicializar formulario de orden
                setOrdenForm({
                    plazo_entrega: ordenData.plazo_entrega || 0,
                    moneda: ordenData.moneda || 'bolivianos',
                    observaciones: ordenData.observaciones || ''
                });
            } else if (localDetalles) {
                setDetalles(localDetalles as DetalleOrdenTrabajo[]);
                setOrden({ moneda: 'Bolivianos', particular_seguro: particularSeguro || 'Particular' } as any);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar los datos'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            if (activeId) {
                const [ordenData, detallesData, invData] = await Promise.all([
                    getOrdenTrabajo(Number(activeId)),
                    getDetallesByOrden(Number(activeId)),
                    getInventarios()
                ]);
                setOrden(ordenData);
                setDetalles(detallesData);
                setInventarios(invData.filter((i: Inventario) => i.estado === 'activo'));

                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 1500,
                    timerProgressBar: true
                });
                Toast.fire({
                    icon: 'success',
                    title: 'Lista de trabajos y repuestos actualizada'
                });
            } else {
                await loadData();
            }
        } catch (error) {
            console.error('Error refreshing data:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron actualizar los datos'
            });
        } finally {
            setRefreshing(false);
        }
    };


    // Autocompletar precio unitario cuando se selecciona un nivel en órdenes de Seguro (formulario de creación)
    useEffect(() => {
        if (isSeguro && formData.idprecio_seguro && formData.nivel && formData.nivel !== 'otro') {
            const precioSeleccionado = preciosSeguros.find(p => String(p.id) === String(formData.idprecio_seguro));

            if (precioSeleccionado) {
                let precioNivel: number | undefined;

                switch (formData.nivel) {
                    case 'nivel1':
                        precioNivel = precioSeleccionado.nivel1;
                        break;
                    case 'nivel2':
                        precioNivel = precioSeleccionado.nivel2;
                        break;
                    case 'nivel3':
                        precioNivel = precioSeleccionado.nivel3;
                        break;
                    case 'pintado':
                        precioNivel = precioSeleccionado.pintado;
                        break;
                    case 'instalacion':
                        precioNivel = precioSeleccionado.instalacion;
                        break;
                }

                if (precioNivel !== undefined && precioNivel !== null) {
                    setFormData(prev => ({
                        ...prev,
                        precio_unitario: Number(precioNivel)
                    }));
                }
            }
        }
    }, [formData.idprecio_seguro, formData.nivel, isSeguro, preciosSeguros]);

    // Autocompletar precio unitario en formulario de edición
    useEffect(() => {
        if (isSeguro && editForm.idprecio_seguro && editForm.nivel && editForm.nivel !== 'otro') {
            const precioSeleccionado = preciosSeguros.find(p => String(p.id) === String(editForm.idprecio_seguro));

            if (precioSeleccionado) {
                let precioNivel: number | undefined;

                switch (editForm.nivel) {
                    case 'nivel1':
                        precioNivel = precioSeleccionado.nivel1;
                        break;
                    case 'nivel2':
                        precioNivel = precioSeleccionado.nivel2;
                        break;
                    case 'nivel3':
                        precioNivel = precioSeleccionado.nivel3;
                        break;
                    case 'pintado':
                        precioNivel = precioSeleccionado.pintado;
                        break;
                    case 'instalacion':
                        precioNivel = precioSeleccionado.instalacion;
                        break;
                }

                if (precioNivel !== undefined && precioNivel !== null) {
                    setEditForm(prev => ({
                        ...prev,
                        precio_unitario: Number(precioNivel)
                    }));
                }
            }
        }
    }, [editForm.idprecio_seguro, editForm.nivel, isSeguro, preciosSeguros]);


    const handleUpdateOrden = async () => {
        if (!orden) return;
        try {
            setSavingOrden(true);
            await updateOrdenTrabajo(Number(orden.id), {
                ...orden,
                plazo_entrega: ordenForm.plazo_entrega,
                moneda: ordenForm.moneda,
                observaciones: ordenForm.observaciones,
                idseguro: orden.seguro?.id || '',
                idinspector: orden.inspector?.id || '',
                idmarca_auto: orden.marca_auto?.id || 0,
                idtipo_vehiculo: orden.tipo_vehiculo?.id || 0,
                idusuario: orden.usuario?.id || ''
            });
            await Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: 'Información actualizada correctamente',
                showConfirmButton: false,
                timer: 1500
            });
            setTimeout(() => {
                window.location.href = '/ordenes-trabajo/list';
            }, 1600);
        } catch (error) {
            console.error('Error updating orden:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al actualizar la información'
            });
        } finally {
            setSavingOrden(false);
        }
    };



    const addBreakdownItems = async (selectedPrecio: PrecioTaller) => {
        const normItems = normalizeItems(selectedPrecio.items);
        if (normItems.length === 0) return false;

        const cant = Math.max(0.01, parseFloat(String(formData.cantidad)) || 1);
        const esTercero = isCategoriaTercero(selectedPrecio);
        const esChaperia = isCategoriaChaperia(selectedPrecio);
        const esExternoOObra = esTercero || esChaperia;
        const costoTerceroVal = esExternoOObra ? Number(formData.costo_tercero || selectedPrecio.total_costo || 0) : 0;
        const tiempoUsar = formData.tiempo_estimado !== '' && formData.tiempo_estimado !== undefined
            ? Number(formData.tiempo_estimado)
            : Number(selectedPrecio.tiempo_estimado || 0);
        const precioHoraUsar = formData.precio_hora !== undefined && formData.precio_hora !== null
            ? Number(formData.precio_hora)
            : Number(selectedPrecio.precio_hora || 0);
        const totalCostoCalc = esExternoOObra ? costoTerceroVal : Number((tiempoUsar * precioHoraUsar).toFixed(2));

        if (!activeId && onAddLocal) {
            normItems.forEach((item, idx) => {
                const precioUnit = Number(item.precio);
                const isFirstOfGroup = idx === 0;
                const enrichedData: any = {
                    idorden_trabajo: 0,
                    idprecio_taller: String(selectedPrecio.id),
                    idpersonal_mecanico: formData.idpersonal_mecanico || undefined,
                    personal_mecanico: formData.idpersonal_mecanico ? personalList.find(p => String(p.id) === String(formData.idpersonal_mecanico)) : undefined,
                    estado_trabajo: 'confirmado',
                    tiempo_estimado: isFirstOfGroup ? String(tiempoUsar) : '0',
                    precio_hora: precioHoraUsar,
                    costo_tercero: isFirstOfGroup ? costoTerceroVal : 0,
                    total_costo: isFirstOfGroup ? totalCostoCalc : 0,
                    cantidad: cant,
                    precio_unitario: precioUnit,
                    total: Math.round(cant * precioUnit),
                    detalle: item.detalle,
                    observaciones: formData.observaciones || undefined,
                    precio_taller: selectedPrecio
                };
                onAddLocal(enrichedData);
            });
            setFormData({
                idprecio_taller: '',
                idprecio_seguro: '',
                id_inventario: '',
                idpersonal_mecanico: '',
                estado_trabajo: 'confirmado',
                tiempo_estimado: '',
                precio_hora: 0,
                total_costo: 0,
                costo_tercero: 0,
                cantidad: 1,
                precio_unitario: 0,
                nivel: '',
                detalle: '',
                observaciones: '',
                imagenes: []
            });
            setShowForm(false);
            return true;
        }

        if (activeId) {
            try {
                for (let idx = 0; idx < normItems.length; idx++) {
                    const item = normItems[idx];
                    const isFirstOfGroup = idx === 0;
                    const precioUnit = Number(item.precio);
                    await createDetalleOrdenTrabajo({
                        idorden_trabajo: Number(activeId),
                        idprecio_taller: String(selectedPrecio.id),
                        idpersonal_mecanico: formData.idpersonal_mecanico || undefined,
                        estado_trabajo: 'confirmado',
                        tiempo_estimado: isFirstOfGroup ? String(tiempoUsar) : '0',
                        precio_hora: precioHoraUsar,
                        costo_tercero: isFirstOfGroup ? costoTerceroVal : 0,
                        total_costo: isFirstOfGroup ? totalCostoCalc : 0,
                        cantidad: cant,
                        precio_unitario: precioUnit,
                        total: Math.round(cant * precioUnit),
                        detalle: item.detalle,
                        observaciones: formData.observaciones || undefined,
                        idusuario: user?.id ? Number(user.id) : undefined
                    });
                }
                setShowForm(false);
                loadData();
                setFormData({
                    idprecio_taller: '',
                    idprecio_seguro: '',
                    id_inventario: '',
                    idpersonal_mecanico: '',
                    estado_trabajo: 'confirmado',
                    tiempo_estimado: '',
                    precio_hora: 0,
                    total_costo: 0,
                    costo_tercero: 0,
                    cantidad: 1,
                    precio_unitario: 0,
                    nivel: '',
                    detalle: '',
                    observaciones: '',
                    imagenes: []
                });
            } catch (error) {
                console.error('Error creating breakdown detalles:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al agregar los ítems del trabajo'
                });
            }
            return true;
        }

        return false;
    };

    const handleSelectPrecioTaller = async (precioId: string) => {
        const selectedPrecio = preciosTaller.find(p => String(p.id) === String(precioId));
        const esTercero = isCategoriaTercero(selectedPrecio);
        const esChaperia = isCategoriaChaperia(selectedPrecio);
        const esExternoOObra = esTercero || esChaperia;
        const costoTerceroVal = esExternoOObra ? (selectedPrecio?.total_costo ? Number(selectedPrecio.total_costo) : 0) : 0;
        setFormData(prev => ({
            ...prev,
            idprecio_taller: precioId,
            idprecio_seguro: '',
            id_inventario: '',
            costo_tercero: costoTerceroVal,
            total_costo: esExternoOObra ? costoTerceroVal : prev.total_costo
        }));
    };

    const handleSelectInventario = (inventarioId: string) => {
        if (!inventarioId) {
            setFormData(prev => ({ ...prev, id_inventario: '' }));
            return;
        }
        const inv = inventarios.find(i => String(i.id) === String(inventarioId));
        if (inv) {
            const pCompra = Number(inv.precio_compra || inv.costo || 0);
            const precioVenta = Number(inv.precio_venta && Number(inv.precio_venta) > 0 ? inv.precio_venta : pCompra);
            setFormData(prev => ({
                ...prev,
                id_inventario: inventarioId,
                idprecio_taller: '',
                idprecio_seguro: '',
                detalle: inv.descripcion,
                precio_unitario: precioVenta,
                tiempo_estimado: ''
            }));
        }
    };

    const handleApplyProfitMargin = (pct: number) => {
        const inv = inventarios.find(i => String(i.id) === String(formData.id_inventario));
        if (!inv) return;
        const pCompra = Number(inv.precio_compra || inv.costo || 0);
        if (pCompra > 0) {
            const nuevoPrecioVenta = Number((pCompra * (1 + pct / 100)).toFixed(2));
            setFormData(prev => ({
                ...prev,
                precio_unitario: nuevoPrecioVenta
            }));
        }
    };

    const handleAssignMecanico = async (detalle: DetalleOrdenTrabajo, index: number, mecanicoId: string) => {
        const mecanicoObj = personalList.find(p => String(p.id) === String(mecanicoId));
        const mecPrecioHora = mecanicoObj && Number(mecanicoObj.precio_hora) > 0 ? Number(mecanicoObj.precio_hora) : undefined;
        const ptId = detalle.precio_taller?.id || (detalle as any).idprecio_taller;
        const isGroupItem = Boolean(
            ptId &&
            !detalle.id_inventario &&
            !detalle.inventario &&
            (normalizeItems(detalle.precio_taller?.items).length > 0 ||
                detalles.filter(d => !d.id_inventario && !d.inventario && String(d.precio_taller?.id || (d as any).idprecio_taller) === String(ptId)).length > 1)
        );

        if (!activeId && onUpdateLocal) {
            if (isGroupItem) {
                detalles.forEach((d, idx) => {
                    const dPtId = d.precio_taller?.id || (d as any).idprecio_taller;
                    if (!d.id_inventario && !d.inventario && String(dPtId) === String(ptId)) {
                        const newPrecioHora = mecPrecioHora !== undefined ? mecPrecioHora : Number(d.precio_hora || 0);
                        const newTotalCosto = Number((Number(d.tiempo_estimado || 0) * newPrecioHora).toFixed(2));
                        onUpdateLocal(idx, {
                            idpersonal_mecanico: mecanicoId || undefined,
                            personal_mecanico: mecanicoObj || undefined,
                            ...(mecPrecioHora !== undefined ? { precio_hora: newPrecioHora, total_costo: newTotalCosto } : {})
                        });
                    }
                });
            } else {
                const newPrecioHora = mecPrecioHora !== undefined ? mecPrecioHora : Number(detalle.precio_hora || 0);
                const newTotalCosto = Number((Number(detalle.tiempo_estimado || 0) * newPrecioHora).toFixed(2));
                onUpdateLocal(index, {
                    idpersonal_mecanico: mecanicoId || undefined,
                    personal_mecanico: mecanicoObj || undefined,
                    ...(mecPrecioHora !== undefined ? { precio_hora: newPrecioHora, total_costo: newTotalCosto } : {})
                });
            }
            return;
        }

        if (activeId) {
            try {
                if (isGroupItem) {
                    const groupItems = detalles.filter(
                        d => !d.id_inventario && !d.inventario && String(d.precio_taller?.id || (d as any).idprecio_taller) === String(ptId)
                    );
                    for (const gItem of groupItems) {
                        const newPrecioHora = mecPrecioHora !== undefined ? mecPrecioHora : Number(gItem.precio_hora || 0);
                        const newTotalCosto = Number((Number(gItem.tiempo_estimado || 0) * newPrecioHora).toFixed(2));
                        await updateDetalleOrdenTrabajo(Number(gItem.id), {
                            idpersonal_mecanico: mecanicoId || undefined,
                            ...(mecPrecioHora !== undefined ? { precio_hora: newPrecioHora, total_costo: newTotalCosto } : {}),
                            idusuario: user?.id ? Number(user.id) : undefined
                        });
                    }
                } else {
                    const newPrecioHora = mecPrecioHora !== undefined ? mecPrecioHora : Number(detalle.precio_hora || 0);
                    const newTotalCosto = Number((Number(detalle.tiempo_estimado || 0) * newPrecioHora).toFixed(2));
                    await updateDetalleOrdenTrabajo(Number(detalle.id), {
                        idpersonal_mecanico: mecanicoId || undefined,
                        ...(mecPrecioHora !== undefined ? { precio_hora: newPrecioHora, total_costo: newTotalCosto } : {}),
                        idusuario: user?.id ? Number(user.id) : undefined
                    });
                }
                loadData();
            } catch (error) {
                console.error('Error assigning mecanico:', error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo asignar el mecánico' });
            }
        }
    };

    const handleChangeRateLocalOrState = (
        detalle: DetalleOrdenTrabajo,
        index: number,
        newTiempoRaw: string | number,
        newPrecioHoraRaw: string | number,
        isGroup = false
    ) => {
        const ptId = detalle.precio_taller?.id || (detalle as any).idprecio_taller;
        const tiempoStr = String(newTiempoRaw ?? '');
        const tiempoNum = Number(newTiempoRaw) || 0;
        const precioHoraNum = Number(newPrecioHoraRaw) || 0;
        const nuevoCosto = Number((tiempoNum * precioHoraNum).toFixed(2));

        if (!activeId && onUpdateLocal) {
            if (isGroup && ptId) {
                let firstFound = false;
                detalles.forEach((d, idx) => {
                    const dPtId = d.precio_taller?.id || (d as any).idprecio_taller;
                    if (!d.id_inventario && !d.inventario && String(dPtId) === String(ptId)) {
                        const isFirst = !firstFound;
                        firstFound = true;
                        onUpdateLocal(idx, {
                            tiempo_estimado: isFirst ? tiempoStr : '0',
                            precio_hora: precioHoraNum,
                            total_costo: isFirst ? nuevoCosto : 0
                        });
                    }
                });
            } else {
                onUpdateLocal(index, {
                    tiempo_estimado: tiempoStr,
                    precio_hora: precioHoraNum,
                    total_costo: nuevoCosto
                });
            }
            return;
        }

        // Update local display state while typing when activeId is present
        if (isGroup && ptId) {
            let firstFound = false;
            setDetalles(prev =>
                prev.map(d => {
                    const dPtId = d.precio_taller?.id || (d as any).idprecio_taller;
                    if (!d.id_inventario && !d.inventario && String(dPtId) === String(ptId)) {
                        const isFirst = !firstFound;
                        firstFound = true;
                        return {
                            ...d,
                            tiempo_estimado: isFirst ? tiempoStr : '0',
                            precio_hora: precioHoraNum,
                            total_costo: isFirst ? nuevoCosto : 0
                        };
                    }
                    return d;
                })
            );
        } else {
            setDetalles(prev =>
                prev.map((d, i) =>
                    i === index
                        ? { ...d, tiempo_estimado: tiempoStr, precio_hora: precioHoraNum, total_costo: nuevoCosto }
                        : d
                )
            );
        }
    };

    const handleSaveRateBackend = async (
        detalle: DetalleOrdenTrabajo,
        newTiempoRaw: string | number,
        newPrecioHoraRaw: string | number,
        isGroup = false
    ) => {
        if (!activeId) return;
        const ptId = detalle.precio_taller?.id || (detalle as any).idprecio_taller;
        const tiempoStr = String(newTiempoRaw ?? '');
        const tiempoNum = Number(newTiempoRaw) || 0;
        const precioHoraNum = Number(newPrecioHoraRaw) || 0;
        const nuevoCosto = Number((tiempoNum * precioHoraNum).toFixed(2));

        try {
            if (isGroup && ptId) {
                const groupItems = detalles.filter(
                    d => !d.id_inventario && !d.inventario && String(d.precio_taller?.id || (d as any).idprecio_taller) === String(ptId)
                );
                for (let idx = 0; idx < groupItems.length; idx++) {
                    const gItem = groupItems[idx];
                    const isFirst = idx === 0;
                    await updateDetalleOrdenTrabajo(Number(gItem.id), {
                        tiempo_estimado: isFirst ? tiempoStr : '0',
                        precio_hora: precioHoraNum,
                        total_costo: isFirst ? nuevoCosto : 0,
                        idusuario: user?.id ? Number(user.id) : undefined
                    });
                }
            } else {
                await updateDetalleOrdenTrabajo(Number(detalle.id), {
                    tiempo_estimado: tiempoStr,
                    precio_hora: precioHoraNum,
                    total_costo: nuevoCosto,
                    idusuario: user?.id ? Number(user.id) : undefined
                });
            }
            loadData();
        } catch (error) {
            console.error('Error updating precio_hora / tiempo_estimado:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar el precio por hora' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!activeId && !onAddLocal) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se encontró el ID de la orden de trabajo'
            });
            return;
        }

        if (!formData.idprecio_taller && !formData.idprecio_seguro && !formData.id_inventario && !formData.detalle) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'Debe seleccionar un trabajo, un repuesto de inventario o ingresar un detalle'
            });
            return;
        }

        if (formData.idprecio_taller) {
            const selectedPrecio = preciosTaller.find(p => String(p.id) === String(formData.idprecio_taller));
            if (selectedPrecio && (!formData.detalle || formData.detalle === selectedPrecio.detalle)) {
                const normItems = normalizeItems(selectedPrecio.items);
                if (normItems.length > 0) {
                    await addBreakdownItems(selectedPrecio);
                    return;
                }
            }
        }

        const selectedPt = formData.idprecio_taller
            ? preciosTaller.find(p => String(p.id) === String(formData.idprecio_taller))
            : undefined;
        const esTercero = isCategoriaTercero(selectedPt);
        const esChaperia = isCategoriaChaperia(selectedPt);
        const esExternoOObra = esTercero || esChaperia;
        const costoTerceroVal = esExternoOObra ? Number(formData.costo_tercero || 0) : 0;

        if (esChaperia && !formData.idpersonal_mecanico) {
            Swal.fire({
                icon: 'warning',
                title: 'Asignar Chapista',
                text: 'Por favor seleccione el chapista (contratista) asignado a este trabajo de chapería'
            });
            return;
        }

        const cantNum = Math.max(0.01, parseFloat(String(formData.cantidad)) || 1);
        const puNum = Number(formData.precio_unitario || 0);
        const total = Math.round(cantNum * puNum);
        const tiempoVal = formData.tiempo_estimado !== '' && formData.tiempo_estimado !== undefined ? Number(formData.tiempo_estimado) : 0;
        const precioHoraVal = formData.precio_hora !== undefined && formData.precio_hora !== null ? Number(formData.precio_hora) : 0;
        const totalCostoCalc = esExternoOObra ? costoTerceroVal : Number((tiempoVal * precioHoraVal).toFixed(2));

        const data: CreateDetalleOrdenTrabajoData = {
            idorden_trabajo: Number(activeId || 0),
            idprecio_taller: formData.idprecio_taller || undefined,
            idprecio_seguro: formData.idprecio_seguro || undefined,
            id_inventario: formData.id_inventario ? Number(formData.id_inventario) : undefined,
            idpersonal_mecanico: formData.idpersonal_mecanico || undefined,
            estado_trabajo: formData.estado_trabajo || 'confirmado',
            tiempo_estimado: formData.tiempo_estimado ? String(formData.tiempo_estimado) : undefined,
            precio_hora: precioHoraVal,
            costo_tercero: costoTerceroVal,
            total_costo: totalCostoCalc,
            cantidad: cantNum,
            precio_unitario: puNum,
            total,
            nivel: formData.nivel || undefined,
            detalle: formData.detalle || undefined,
            observaciones: formData.observaciones || undefined,
            idusuario: user?.id ? Number(user.id) : undefined
        };

        if (!activeId && onAddLocal) {
            const enrichedData: any = { ...data };
            if (data.idprecio_taller) {
                enrichedData.precio_taller = preciosTaller.find(p => String(p.id) === String(data.idprecio_taller));
            }
            if (data.idprecio_seguro) {
                enrichedData.precio_seguro = preciosSeguros.find(p => String(p.id) === String(data.idprecio_seguro));
            }
            if (data.id_inventario) {
                enrichedData.inventario = inventarios.find(i => Number(i.id) === Number(data.id_inventario));
            }
            if (data.idpersonal_mecanico) {
                enrichedData.personal_mecanico = personalList.find(p => String(p.id) === String(data.idpersonal_mecanico));
            }
            onAddLocal(enrichedData);
            setFormData({
                idprecio_taller: '',
                idprecio_seguro: '',
                id_inventario: '',
                idpersonal_mecanico: '',
                estado_trabajo: 'confirmado',
                tiempo_estimado: '',
                precio_hora: 0,
                total_costo: 0,
                costo_tercero: 0,
                cantidad: 1,
                precio_unitario: 0,
                nivel: '',
                detalle: '',
                observaciones: '',
                imagenes: []
            });
            setShowForm(false);
            return;
        }

        if (!activeId) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se encontró el ID de la orden de trabajo'
            });
            return;
        }

        try {
            await createDetalleOrdenTrabajo(data);
            setShowForm(false);
            loadData();
            setFormData({
                idprecio_taller: '',
                idprecio_seguro: '',
                id_inventario: '',
                idpersonal_mecanico: '',
                estado_trabajo: 'confirmado',
                tiempo_estimado: '',
                precio_hora: 0,
                total_costo: 0,
                costo_tercero: 0,
                cantidad: 1,
                precio_unitario: 0,
                nivel: '',
                detalle: '',
                observaciones: '',
                imagenes: []
            });
        } catch (error) {
            console.error('Error creating detalle:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al agregar trabajo'
            });
        }
    };

    // Manejadores para el Modal de Detalles
    const handleEditDetails = (detalle: DetalleOrdenTrabajo) => {
        setEditingDetalle(detalle);
        setDetailForm({
            observaciones: detalle.observaciones || '',
            imagenes: detalle.imagenes || []
        });
    };

    const handleCloseModal = () => {
        setEditingDetalle(null);
        setDetailForm({ observaciones: '', imagenes: [] });
    };

    const handleSaveDetails = async () => {
        if (!editingDetalle) return;
        try {
            await updateDetalleOrdenTrabajo(Number(editingDetalle.id), {
                observaciones: detailForm.observaciones,
                imagenes: detailForm.imagenes
            });
            handleCloseModal();
            loadData();
            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: 'Detalles actualizados correctamente',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (error) {
            console.error('Error updating details:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al actualizar detalles'
            });
        }
    };

    const handleDetailFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            try {
                setUploading(true);
                const files = Array.from(e.target.files);
                const uploadedFiles = await Promise.all(files.map(file => uploadFile(file)));
                setDetailForm(prev => ({ ...prev, imagenes: [...prev.imagenes, ...uploadedFiles] }));
            } catch (error) {
                console.error('Error uploading file:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al subir imagen'
                });
            } finally {
                setUploading(false);
            }
        }
    };

    const removeDetailImage = (index: number) => {
        setDetailForm(prev => ({
            ...prev,
            imagenes: prev.imagenes.filter((_, i) => i !== index)
        }));
    };

    // Manejadores para edición de detalle principal
    const handleEditMain = (detalle: DetalleOrdenTrabajo, index?: number) => {
        setEditingDetalleMain(detalle);
        setEditingDetalleMainIndex(index !== undefined ? index : null);
        const ptId = detalle.precio_taller?.id || (detalle as any).idprecio_taller || '';
        const ptFound = ptId ? preciosTaller.find(p => String(p.id) === String(ptId)) : detalle.precio_taller;
        const esTercero = isCategoriaTercero(ptFound, detalle);
        const esChaperia = isCategoriaChaperia(ptFound, detalle);
        const esExternoOObra = esTercero || esChaperia;
        const tiempoVal = detalle.tiempo_estimado ?? detalle.precio_taller?.tiempo_estimado ?? '';
        const precioHoraVal = Number(detalle.precio_hora ?? detalle.precio_taller?.precio_hora ?? 0);
        const costoTerceroVal = detalle.costo_tercero !== undefined && detalle.costo_tercero !== null
            ? Number(detalle.costo_tercero)
            : (detalle.total_costo !== undefined && detalle.total_costo !== null && esExternoOObra
                ? Number(detalle.total_costo)
                : (esExternoOObra ? Number(ptFound?.total_costo || 0) : 0));
        const costoCalc = esExternoOObra
            ? costoTerceroVal
            : Number(detalle.total_costo ?? (Number(tiempoVal || 0) * precioHoraVal));

        setEditForm({
            idprecio_taller: ptId,
            idprecio_seguro: detalle.precio_seguro?.id || (detalle as any).idprecio_seguro || '',
            id_inventario: detalle.inventario?.id ? String(detalle.inventario.id) : (detalle.id_inventario ? String(detalle.id_inventario) : ''),
            idpersonal_mecanico: detalle.personal_mecanico?.id || detalle.idpersonal_mecanico || '',
            estado_trabajo: (detalle.estado_trabajo as any) || 'confirmado',
            tiempo_estimado: String(tiempoVal),
            precio_hora: precioHoraVal,
            costo_tercero: costoTerceroVal,
            total_costo: costoCalc,
            detalle: detalle.detalle || detalle.precio_taller?.detalle || detalle.precio_seguro?.detalle || detalle.inventario?.descripcion || '',
            cantidad: detalle.cantidad,
            precio_unitario: Number(detalle.precio_unitario),
            nivel: detalle.nivel || '',
            observaciones: detalle.observaciones || ''
        });
    };

    const handleCloseEditMain = () => {
        setEditingDetalleMain(null);
        setEditingDetalleMainIndex(null);
        setEditForm({
            idprecio_taller: '',
            idprecio_seguro: '',
            id_inventario: '',
            idpersonal_mecanico: '',
            estado_trabajo: 'confirmado',
            tiempo_estimado: '',
            precio_hora: 0,
            costo_tercero: 0,
            total_costo: 0,
            detalle: '',
            cantidad: 1,
            precio_unitario: 0,
            nivel: '',
            observaciones: ''
        });
    };

    const handleSaveEditMain = async () => {
        if (!editingDetalleMain) return;
        const ptId = editForm.idprecio_taller || editingDetalleMain.precio_taller?.id || (editingDetalleMain as any).idprecio_taller;
        const ptFound = ptId ? preciosTaller.find(p => String(p.id) === String(ptId)) : editingDetalleMain.precio_taller;
        const esTercero = isCategoriaTercero(ptFound, editingDetalleMain);
        const esChaperia = isCategoriaChaperia(ptFound, editingDetalleMain);
        const esExternoOObra = esTercero || esChaperia;
        const costoTerceroVal = esExternoOObra ? Number(editForm.costo_tercero ?? 0) : 0;
        const isEditingInv = Boolean(editingDetalleMain.id_inventario || editingDetalleMain.inventario);
        const cantidadFinal = isEditingInv ? Number(editingDetalleMain.cantidad || 1) : Math.max(0.01, parseFloat(String(editForm.cantidad)) || 1);
        const total = Math.round(Number(cantidadFinal) * Number(editForm.precio_unitario || 0));
        const tiempoNum = Number(editForm.tiempo_estimado || 0);
        const precioHoraNum = Number(editForm.precio_hora || 0);
        const invTarget = (editForm.id_inventario ? inventarios.find(i => Number(i.id) === Number(editForm.id_inventario)) : undefined) || editingDetalleMain.inventario;
        const costoInvCalc = invTarget?.precio_compra ? Number((Number(invTarget.precio_compra) * Number(cantidadFinal || 1)).toFixed(2)) : 0;
        const totalCostoCalc = esExternoOObra ? costoTerceroVal : (invTarget ? costoInvCalc : Number((tiempoNum * precioHoraNum).toFixed(2)));

        if (!activeId && onUpdateLocal && editingDetalleMainIndex !== null) {
            onUpdateLocal(editingDetalleMainIndex, {
                idprecio_taller: editForm.idprecio_taller || undefined,
                idprecio_seguro: editForm.idprecio_seguro || undefined,
                id_inventario: editForm.id_inventario ? Number(editForm.id_inventario) : undefined,
                idpersonal_mecanico: editForm.idpersonal_mecanico || undefined,
                personal_mecanico: editForm.idpersonal_mecanico ? personalList.find(p => String(p.id) === String(editForm.idpersonal_mecanico)) : undefined,
                estado_trabajo: editForm.estado_trabajo,
                tiempo_estimado: editForm.tiempo_estimado ? String(editForm.tiempo_estimado) : undefined,
                precio_hora: precioHoraNum,
                costo_tercero: costoTerceroVal,
                total_costo: totalCostoCalc,
                detalle: editForm.detalle || undefined,
                cantidad: cantidadFinal,
                precio_unitario: editForm.precio_unitario,
                total,
                nivel: editForm.nivel || undefined,
                observaciones: editForm.observaciones || undefined,
                precio_taller: editForm.idprecio_taller ? preciosTaller.find(p => String(p.id) === String(editForm.idprecio_taller)) : undefined,
                precio_seguro: editForm.idprecio_seguro ? preciosSeguros.find(p => String(p.id) === String(editForm.idprecio_seguro)) : undefined,
                inventario: editForm.id_inventario ? inventarios.find(i => Number(i.id) === Number(editForm.id_inventario)) : undefined
            });
            handleCloseEditMain();
            return;
        }

        try {
            await updateDetalleOrdenTrabajo(Number(editingDetalleMain.id), {
                idprecio_taller: editForm.idprecio_taller || undefined,
                idprecio_seguro: editForm.idprecio_seguro || undefined,
                id_inventario: editForm.id_inventario ? Number(editForm.id_inventario) : undefined,
                idpersonal_mecanico: editForm.idpersonal_mecanico || undefined,
                estado_trabajo: editForm.estado_trabajo,
                tiempo_estimado: editForm.tiempo_estimado ? String(editForm.tiempo_estimado) : undefined,
                precio_hora: precioHoraNum,
                costo_tercero: costoTerceroVal,
                total_costo: totalCostoCalc,
                detalle: editForm.detalle || undefined,
                cantidad: cantidadFinal,
                precio_unitario: editForm.precio_unitario,
                total,
                nivel: editForm.nivel || undefined,
                observaciones: editForm.observaciones || undefined,
                idusuario: user?.id ? Number(user.id) : undefined,
                origen: 'ot',
                usuario_nombre: user?.name
            });
            handleCloseEditMain();
            loadData();
            Swal.fire({
                icon: 'success',
                title: 'Actualizado',
                text: 'Detalle actualizado correctamente',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (error) {
            console.error('Error updating detail:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al actualizar detalle'
            });
        }
    };



    const handleDelete = async (detalle: DetalleOrdenTrabajo, localIndex?: number) => {
        if (isTrabajoLiquidadoPlanilla(detalle)) {
            Swal.fire({
                icon: 'warning',
                title: 'Trabajo Protegido',
                html: `Este trabajo ya fue <b>liquidado y pagado en planilla</b> al mecánico.<br/><br/>No se puede eliminar de la orden para preservar la consistencia de los pagos ya realizados.`,
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Entendido'
            });
            return;
        }

        const detalleId = Number(detalle.id);
        const esRepuesto = Boolean(detalle.inventario || detalle.id_inventario);
        const invFound = detalle.inventario || (detalle.id_inventario ? inventarios.find(i => Number(i.id) === Number(detalle.id_inventario)) : undefined);
        const repuestoNombre = `${invFound?.codigo ? `[${invFound.codigo}] ` : ''}${invFound?.descripcion || detalle.detalle || 'este repuesto'}`;
        const cantRepuesto = Number(detalle.cantidad || 1);

        let result;
        if (esRepuesto) {
            result = await Swal.fire({
                title: '¿Retirar repuesto de la Orden?',
                html: `
                    <div class="text-left text-sm space-y-3">
                        <div class="p-3 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded text-amber-900 dark:text-amber-200">
                            <p class="font-bold flex items-center gap-1.5 text-sm">
                                ⚠️ Atención: Repuesto de Almacén / Inventario
                            </p>
                            <p class="text-xs mt-1 text-amber-800 dark:text-amber-300">
                                Este ítem corresponde a un repuesto despachado desde el almacén.
                            </p>
                        </div>
                        <div class="bg-gray-50 dark:bg-gray-800 p-2.5 rounded border border-gray-200 dark:border-gray-700">
                            <p class="text-xs text-gray-500 dark:text-gray-400">Repuesto:</p>
                            <p class="font-bold text-gray-900 dark:text-white">${repuestoNombre}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Cantidad a devolver a almacén: <strong class="text-purple-600 dark:text-purple-400 font-mono">${cantRepuesto} uds.</strong>
                            </p>
                        </div>
                        <div class="text-xs text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded border border-amber-200 dark:border-amber-800 leading-relaxed">
                            📦 <strong>Control de Almacén:</strong> El ítem saldrá de la orden pero <strong>NO volverá al stock hasta que Almacén confirme la recepción física</strong> en <em>Retorno a Almacén</em>. Por favor devuelva la pieza al encargado.
                        </div>
                    </div>
                `,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, retirar y enviar a Retorno a Almacén',
                cancelButtonText: 'Cancelar',
                focusCancel: true
            });
        } else {
            result = await Swal.fire({
                title: '¿Eliminar trabajo?',
                text: 'Esta acción no se puede deshacer',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            });
        }

        if (result.isConfirmed) {
            if (!activeId && onRemoveLocal && localIndex !== undefined) {
                onRemoveLocal(localIndex);
                Swal.fire({
                    icon: 'success',
                    title: '¡Eliminado!',
                    text: esRepuesto ? `Repuesto retirado (${cantRepuesto} uds.)` : 'Trabajo eliminado exitosamente',
                    showConfirmButton: false,
                    timer: 1500
                });
                return;
            }

            try {
                await deleteDetalleOrdenTrabajo(detalleId, {
                    origen: 'ot',
                    idusuario: user?.id ? Number(user.id) : undefined,
                    usuarioNombre: user?.name
                });
                await Swal.fire({
                    icon: 'success',
                    title: esRepuesto ? 'Enviado a Retorno a Almacén' : '¡Eliminado!',
                    html: esRepuesto
                        ? `El repuesto fue retirado de la orden. Las <b>${cantRepuesto} unidades</b> quedaron pendientes de visto bueno físico en Almacén para reingresar al stock.`
                        : 'Trabajo eliminado exitosamente',
                    showConfirmButton: false,
                    timer: 2500
                });
                loadData();
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo eliminar'
                });
            }
        }
    };

    const handleToggleEstadoTrabajo = async (detalle: DetalleOrdenTrabajo, index: number) => {
        if (isTrabajoLiquidadoPlanilla(detalle)) {
            Swal.fire({
                icon: 'warning',
                title: 'Trabajo Protegido',
                text: 'Este trabajo ya fue liquidado y pagado en planilla al mecánico. No se puede descartar ni rechazar.',
                confirmButtonColor: '#3085d6',
            });
            return;
        }

        const isCurrentlyDescartado = detalle.estado_trabajo === 'descartado';
        const newEstado = isCurrentlyDescartado ? 'confirmado' : 'descartado';

        if (!activeId && onUpdateLocal) {
            onUpdateLocal(index, { estado_trabajo: newEstado });
            setDetalles(prev => prev.map((d, i) => i === index ? { ...d, estado_trabajo: newEstado } : d));
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1600,
            });
            Toast.fire({
                icon: newEstado === 'confirmado' ? 'success' : 'info',
                title: newEstado === 'confirmado' ? 'Trabajo aprobado' : 'Trabajo rechazado (se mantendrá en el historial)'
            });
            return;
        }

        if (activeId && detalle.id) {
            try {
                await updateDetalleOrdenTrabajo(detalle.id, {
                    estado_trabajo: newEstado,
                    origen: 'ot',
                    idusuario: user?.id ? Number(user.id) : undefined,
                    usuario_nombre: user?.name
                });

                const updatedDetalles = detalles.map((d, i) => i === index ? { ...d, estado_trabajo: newEstado } : d);
                const newSubTotal = Math.round(
                    updatedDetalles
                        .filter(d => d.estado_trabajo !== 'descartado')
                        .reduce((sum, d) => sum + Math.round(Number(d.total || (Number(d.cantidad || 0) * Number(d.precio_unitario || 0)))), 0)
                );

                const currentDescuento = Number(orden?.descuento || 0);
                const newTotal = Math.round(Math.max(0, newSubTotal - currentDescuento));

                try {
                    await updateOrdenTrabajo(Number(activeId), {
                        sub_total: newSubTotal,
                        total: newTotal
                    });
                } catch (updateErr) {
                    console.warn('Could not update order totals directly:', updateErr);
                }

                await loadData();

                if (onTotalChange) {
                    onTotalChange(newSubTotal);
                }

                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 1600,
                });
                Toast.fire({
                    icon: newEstado === 'confirmado' ? 'success' : 'info',
                    title: newEstado === 'confirmado' ? 'Trabajo aprobado' : 'Trabajo rechazado (se mantiene en historial)'
                });
            } catch (error) {
                console.error('Error al cambiar estado del trabajo:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo cambiar el estado del trabajo'
                });
            }
        }
    };

    const getEstadoBadgeClass = (estado?: string, cancelado?: boolean) => {
        const est = (estado || '').toLowerCase();
        if (est === 'cerrada' || est === 'orden_cerrada' || est === 'orden cerrada' || (Boolean(cancelado) && (est === 'terminado' || est === 'finalizado'))) {
            return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700";
        }
        if (est === 'entregado' || est === 'entregado_con_saldo' || est === 'entregado con saldo' || est === 'entregado_por_pagar' || est === 'entregado por pagar') {
            return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700";
        }
        switch (est) {
            case "activo":
            case "orden creada":
                return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700";
            case "en_proceso":
            case "en proceso":
                return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700";
            case "terminado":
            case "finalizado":
                return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700";
            case "inactivo":
            case "anulado":
            case "anulada":
                return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-300 dark:border-red-700";
            case "pendiente":
            default:
                return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700";
        }
    };

    const handleFinalizarOrden = async () => {
        if (!activeId) return;
        const now = new Date();
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        const result = await Swal.fire({
            title: '¿Dar por Terminada en Taller esta Orden?',
            text: 'La orden cambiará al estado "Terminado en Taller" y estará lista para su entrega al cliente.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, Terminar en Taller',
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
                            id="swal-fecha-fin-detalles"
                            class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                            style="width: 100%; box-sizing: border-box; margin: 0; font-size: 14px; height: 42px;"
                            value="${localIso}"
                        />
                    </div>
                </div>
            `,
            preConfirm: () => {
                const input = document.getElementById('swal-fecha-fin-detalles') as HTMLInputElement;
                return input ? input.value : localIso;
            }
        });

        if (result.isConfirmed) {
            const fechaFin = result.value ? new Date(result.value).toISOString() : new Date().toISOString();
            try {
                const isPaidInFull = Boolean(orden?.cancelado);
                const targetStatus = isPaidInFull ? 'cerrada' : 'terminado';
                await updateOrdenTrabajo(Number(activeId), {
                    estado: targetStatus,
                    fecha_fin: fechaFin
                });
                setOrden(prev => prev ? { ...prev, estado: targetStatus, fecha_fin: fechaFin } : prev);
                await Swal.fire({
                    icon: 'success',
                    title: targetStatus === 'cerrada' ? '¡Orden Cerrada!' : '¡Terminado en Taller!',
                    text: targetStatus === 'cerrada'
                        ? 'La orden ha sido marcada como cerrada exitosamente (totalmente cancelada).'
                        : 'La orden ha sido marcada como "Terminado en Taller" exitosamente.',
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

    const handleEntregarConSaldo = async () => {
        if (!activeId || !orden) return;
        const saldoPendiente = Number(orden.saldo !== undefined ? orden.saldo : (Number(orden.total || 0) - Number(orden.total_pagado || 0)));
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const defaultDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

        Swal.fire({
            title: 'Entregar Vehículo por Pagar',
            html: `
                <div class="text-left space-y-3 p-1">
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        El vehículo saldrá del taller antes de liquidar el saldo pendiente.
                    </p>
                    <div class="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs space-y-1.5">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Orden de Trabajo:</span>
                            <span class="font-bold text-gray-900 dark:text-white">OT #${orden.id}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Vehículo:</span>
                            <span class="font-bold text-indigo-700 dark:text-indigo-300">${orden.vehiculo_placa || orden.placa || 'S/P'} (${orden.vehiculo_modelo || orden.modelo || ''})</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Cliente:</span>
                            <span class="font-medium text-gray-900 dark:text-white">${orden.cliente_nombre || orden.cliente || 'N/A'}</span>
                        </div>
                        <div class="flex justify-between pt-1 border-t border-indigo-200 dark:border-indigo-800">
                            <span class="font-semibold text-gray-700 dark:text-gray-300">Saldo Pendiente:</span>
                            <span class="font-bold text-red-600 dark:text-red-400 text-sm">Bs ${saldoPendiente.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="mt-3">
                        <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Fecha y Hora de Entrega:
                        </label>
                        <input
                            type="datetime-local"
                            id="swal-detalles-fecha-entrega"
                            class="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                            value="${defaultDateTime}"
                        />
                    </div>
                    <div class="flex justify-end gap-2 mt-4">
                        <button id="swal-detalles-cancel" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                            Cancelar
                        </button>
                        <button id="swal-detalles-confirm" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-md transition-all">
                            Confirmar Entrega
                        </button>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: false,
            focusConfirm: false,
            didOpen: () => {
                const confirmBtn = document.getElementById('swal-detalles-confirm');
                const cancelBtn = document.getElementById('swal-detalles-cancel');
                const dateInput = document.getElementById('swal-detalles-fecha-entrega') as HTMLInputElement;

                if (confirmBtn && dateInput) {
                    confirmBtn.addEventListener('click', async () => {
                        const fechaVal = dateInput.value;
                        Swal.close();
                        try {
                            const updateData: any = {
                                estado: 'entregado_por_pagar',
                                fecha_entrega: fechaVal ? new Date(fechaVal) : new Date(),
                                idusuario: "1"
                            };

                            await updateOrdenTrabajo(Number(activeId), updateData);
                            setOrden(prev => prev ? { ...prev, ...updateData } : prev);

                            await Swal.fire({
                                icon: 'success',
                                title: '¡Vehículo Entregado!',
                                text: 'La orden ha pasado al estado: Entregado por Pagar',
                                timer: 1600,
                                showConfirmButton: false
                            });
                        } catch (error) {
                            console.error(error);
                            Swal.fire('Error', 'No se pudo actualizar el estado de entrega', 'error');
                        }
                    });
                }
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => Swal.close());
                }
            }
        });
    };

    const handleReabrirOrden = async () => {
        if (!activeId) return;
        const result = await Swal.fire({
            title: 'Abrir / Reabrir Orden de Trabajo',
            html: `
                <div class="flex flex-col gap-3 text-left p-1">
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        La orden volverá al estado <strong>En Proceso</strong> para permitir modificaciones y seguimiento.
                    </p>
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        Ingrese el código de autorización de 4 dígitos:
                    </p>
                    <div class="flex justify-center my-2">
                        <input
                            type="tel"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            id="swal-input-auth-code-detalles"
                            maxlength="4"
                            placeholder="••••"
                            name="auth_pin_code_detalles_field"
                            autocomplete="one-time-code"
                            data-lpignore="true"
                            data-form-type="other"
                            class="w-40 text-center text-2xl font-mono tracking-[0.4em] py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            style="-webkit-text-security: disc; text-security: disc;"
                        />
                    </div>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Abrir Orden',
            cancelButtonText: 'Cancelar',
            focusConfirm: false,
            didOpen: () => {
                const input = document.getElementById('swal-input-auth-code-detalles') as HTMLInputElement;
                if (input) {
                    input.focus();
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') Swal.clickConfirm();
                    });
                }
            },
            preConfirm: () => {
                const input = document.getElementById('swal-input-auth-code-detalles') as HTMLInputElement;
                const val = input ? input.value.trim() : '';
                if (!val) {
                    Swal.showValidationMessage('Por favor ingrese el código de 4 dígitos');
                    return false;
                }
                if (val !== '1234') {
                    Swal.showValidationMessage('Código incorrecto. Intente nuevamente.');
                    return false;
                }
                return val;
            }
        });

        if (result.isConfirmed) {
            try {
                await updateOrdenTrabajo(Number(activeId), {
                    estado: 'en_proceso'
                });
                setOrden(prev => prev ? { ...prev, estado: 'en_proceso' } : prev);
                await Swal.fire({
                    icon: 'success',
                    title: '¡Orden Abierta!',
                    text: 'La orden ahora está en estado "En Proceso" y lista para modificaciones.',
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

    const handleFacturarModal = async () => {
        if (!activeId || !orden) return;
        const isAlreadyFacturado = Boolean(orden.facturado);
        const isInitiallyChecked = true;
        const currentNro = orden.nro_factura || '';
        const currentFecha = getLocalDateString(orden.fecha_facturado);

        const result = await Swal.fire({
            title: isAlreadyFacturado ? 'Actualizar Facturación de la Orden' : 'Registrar Facturación de la Orden',
            html: `
                <div class="text-left space-y-3 p-1">
                    <p class="text-xs text-gray-500 mb-2">
                        Permite indicar si esta orden fue facturada al Seguro, Concesionaria o Cliente manteniendo el saldo pendiente de cobro hasta que se registre el pago.
                    </p>
                    <div class="flex items-center gap-2 p-2 bg-blue-50 dark:bg-gray-700/50 rounded-lg border border-blue-200 dark:border-gray-600 mb-3">
                        <input type="checkbox" id="swal-facturado-check" ${isInitiallyChecked ? 'checked' : ''} class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                        <label for="swal-facturado-check" class="text-sm font-bold text-gray-800 dark:text-gray-200 cursor-pointer">Marcar como Orden Facturada</label>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">N° de Factura *</label>
                        <input id="swal-nro-factura" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Ej: F-002934 / 849302" value="${currentNro}" />
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">Fecha de Facturación</label>
                        <input id="swal-fecha-factura" type="date" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" value="${currentFecha}" />
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar Facturación',
            cancelButtonText: 'Cancelar',
            focusConfirm: false,
            didOpen: () => {
                const check = document.getElementById('swal-facturado-check') as HTMLInputElement;
                const nroInput = document.getElementById('swal-nro-factura') as HTMLInputElement;
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
                const isChecked = (document.getElementById('swal-facturado-check') as HTMLInputElement)?.checked;
                const nroFactura = (document.getElementById('swal-nro-factura') as HTMLInputElement)?.value?.trim() || '';
                const fechaFactura = (document.getElementById('swal-fecha-factura') as HTMLInputElement)?.value || '';

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
                await updateOrdenTrabajo(Number(activeId), result.value as any);
                setOrden(prev => prev ? { ...prev, ...result.value } : prev);
                Swal.fire({
                    icon: 'success',
                    title: '¡Facturación Guardada!',
                    text: 'Los datos de facturación se han actualizado exitosamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (err) {
                console.error(err);
                Swal.fire('Error', 'No se pudo actualizar la facturación de la orden', 'error');
            }
        }
    };

    const calcularTotal = () => {
        return detalles
            .filter(d => d.estado_trabajo !== 'descartado')
            .reduce((sum, d) => sum + Number(d.total), 0);
    };

    if (loading) return <div>Cargando...</div>;

    if (!orden) return <div className="p-6 text-center text-red-500">Error al cargar la orden o datos no disponibles.</div>;

    return (
        <div className="container mx-auto p-6">
            {!isEmbedded && (
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors mb-2 cursor-pointer"
                        >
                            <ArrowLeft size={20} />
                            <span>Volver</span>
                        </button>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Detalles de Trabajo</h1>
                            {orden?.estado && (() => {
                                const est = (orden.estado || '').toLowerCase();
                                const isAnulada = est === 'inactivo' || est === 'anulado' || est === 'anulada';
                                const isCerrada = est === 'cerrada' || est === 'orden_cerrada' || est === 'orden cerrada' || (Boolean(orden.cancelado) && (est === 'terminado' || est === 'finalizado'));
                                const isEntregado = !isCerrada && (est === 'entregado' || est === 'entregado_con_saldo' || est === 'entregado con saldo' || est === 'entregado_por_pagar' || est === 'entregado por pagar');
                                const isTerminado = !isCerrada && !isEntregado && (est === 'terminado' || est === 'finalizado');
                                let label = orden.estado.replace('_', ' ');
                                if (isAnulada) label = 'Anulada';
                                else if (isCerrada) label = 'Orden Cerrada';
                                else if (isEntregado) label = 'Entregado por Pagar';
                                else if (isTerminado) label = 'Terminado en Taller';

                                return (
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getEstadoBadgeClass(orden.estado, orden.cancelado)}`}>
                                        {label}
                                    </span>
                                );
                            })()}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">
                            Orden: {orden?.cliente || orden?.cliente_nombre} - {orden?.placa || orden?.vehiculo_placa} ({tipoOrdenNombre})
                        </p>
                        
                        {/* Badges de Facturación y Cobranza */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {orden?.facturado ? (
                                <button
                                    type="button"
                                    onClick={handleFacturarModal}
                                    className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700 flex items-center gap-1.5 hover:bg-blue-200 transition-colors cursor-pointer shadow-xs"
                                    title="Clic para ver o modificar datos de facturación"
                                >
                                    <ReceiptText size={14} className="text-blue-600 dark:text-blue-400" />
                                    <span>Facturada: {orden.nro_factura ? `N° ${orden.nro_factura}` : 'Sí'}</span>
                                    {orden.fecha_facturado && (
                                        <span className="font-normal opacity-80">
                                            ({formatDate(orden.fecha_facturado)})
                                        </span>
                                    )}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleFacturarModal}
                                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 flex items-center gap-1.5 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors cursor-pointer shadow-xs"
                                    title="Clic para registrar factura de la orden"
                                >
                                    <ReceiptText size={14} className="text-gray-500" />
                                    <span>Sin Facturar (Clic para registrar)</span>
                                </button>
                            )}

                            {orden?.cancelado ? (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 shadow-xs">
                                    <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                                    <span>Totalmente Cancelado {orden.fecha_cancelado ? `(${formatDate(orden.fecha_cancelado)})` : ''}</span>
                                </span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1.5 shadow-xs">
                                    <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                                    <span>Saldo por Cobrar: {Number(orden?.saldo ?? orden?.total ?? 0).toFixed(2)} Bs</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {activeId && (() => {
                        const est = (orden?.estado || '').toLowerCase();
                        const isCerrada = est === 'cerrada' || est === 'orden_cerrada' || est === 'orden cerrada' || (Boolean(orden?.cancelado) && (est === 'terminado' || est === 'finalizado'));
                        const isEntregado = !isCerrada && (est === 'entregado' || est === 'entregado_con_saldo' || est === 'entregado con saldo');
                        const isTerminado = !isCerrada && !isEntregado && (est === 'terminado' || est === 'finalizado');

                        if (isCerrada) {
                            return (
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold text-sm border border-emerald-300 dark:border-emerald-700 shadow-xs">
                                        <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
                                        Orden Cerrada
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleReabrirOrden}
                                        className="px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                        title="Reabrir orden a estado Activo"
                                    >
                                        <RotateCcw size={14} />
                                        Reabrir
                                    </button>
                                </div>
                            );
                        }

                        if (isEntregado) {
                            return (
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 font-bold text-sm border border-indigo-300 dark:border-indigo-700 shadow-xs">
                                        <KeyRound size={18} className="text-indigo-600 dark:text-indigo-400" />
                                        Entregado por Pagar
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleReabrirOrden}
                                        className="px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                        title="Reabrir orden a estado Activo"
                                    >
                                        <RotateCcw size={14} />
                                        Reabrir
                                    </button>
                                </div>
                            );
                        }

                        if (isTerminado) {
                            return (
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 font-bold text-sm border border-purple-300 dark:border-purple-700 shadow-xs">
                                        <CheckCircle size={18} className="text-purple-600 dark:text-purple-400" />
                                        Terminado en Taller
                                    </span>
                                    {!orden?.cancelado && (
                                        <button
                                            type="button"
                                            onClick={handleEntregarConSaldo}
                                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                            title="Entregar vehículo al cliente por pagar"
                                        >
                                            <KeyRound size={14} />
                                            Entregado por Pagar
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleReabrirOrden}
                                        className="px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                        title="Reabrir orden a estado Activo"
                                    >
                                        <RotateCcw size={14} />
                                        Reabrir
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <button
                                type="button"
                                onClick={handleFinalizarOrden}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 text-sm flex items-center gap-2 cursor-pointer"
                                title="Dar esta orden como terminada en taller"
                            >
                                <CheckCircle size={18} />
                                Terminar en Taller
                            </button>
                        );
                    })()}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-100 dark:border-gray-700 mb-6">
                <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Trabajos a Realizar</h2>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 font-medium text-sm disabled:opacity-50 cursor-pointer"
                            title="Actualizar trabajos y repuestos cargados desde almacén"
                        >
                            <RotateCw size={18} className={refreshing ? 'animate-spin' : ''} />
                            <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
                        </button>
                        <button
                            onClick={handleToggleForm}
                            className={`${showForm ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'} text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium`}
                        >
                            {showForm ? <Trash2 size={20} /> : <Plus size={20} />} {showForm ? 'Cancelar' : 'Agregar Trabajo'}
                        </button>
                    </div>
                </div>

                {/* Formulario en línea (Collapsible) - MOVIDO AQUÍ */}
                {showForm && (
                    <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6 border border-gray-200 dark:border-gray-600 mb-6 animate-fade-in-down">
                        <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
                            <Plus size={20} className="text-blue-500" />
                            Agregar Nuevo Trabajo
                        </h2>
                        <form onSubmit={handleSubmit}>
                            {isSeguro ? (
                                <>
                                    {/* Primera fila: Seleccionar Trabajo o Repuesto */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Seleccionar Trabajo (Seguro)
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <FileText size={18} className="text-gray-400" />
                                                </div>
                                                <select
                                                    value={formData.idprecio_seguro}
                                                    onChange={(e) => setFormData({ ...formData, idprecio_seguro: e.target.value, idprecio_taller: '', id_inventario: '' })}
                                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                                >
                                                    <option value="">Seleccione trabajo...</option>
                                                    {preciosSegurosFiltrados.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.detalle}
                                                        </option>
                                                    ))}
                                                    {preciosSegurosFiltrados.length === 0 && (
                                                        <option value="" disabled>No hay aranceles para este seguro</option>
                                                    )}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                <Package size={15} className="text-emerald-600" />
                                                O Repuesto / Pieza (Inventario)
                                            </label>
                                            <SearchableSelect
                                                value={formData.id_inventario}
                                                onChange={(val) => handleSelectInventario(String(val || ''))}
                                                placeholder="Seleccione repuesto..."
                                                searchPlaceholder="Buscar repuesto por código o descripción..."
                                                options={inventarios.map(inv => {
                                                    const pCompra = Number(inv.precio_compra || inv.costo || 0);
                                                    return {
                                                        value: String(inv.id),
                                                        label: `${inv.codigo ? `[${inv.codigo}] ` : ''}${inv.descripcion}`,
                                                        sublabel: `Stock: ${inv.cantidad_existente} | Costo: Bs. ${pCompra.toFixed(2)}`
                                                    };
                                                })}
                                                icon={<Package size={16} className="text-emerald-600" />}
                                            />
                                        </div>

                                        <div>
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                <User size={15} className="text-blue-600" />
                                                Asignar Mecánico
                                            </label>
                                            <select
                                                value={formData.idpersonal_mecanico}
                                                onChange={(e) => handleMecanicoFormChange(e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                            >
                                                <option value="">Sin asignar...</option>
                                                {personalList.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.nombre} {p.paterno} {p.materno} {Number(p.precio_hora || 0) > 0 ? `(Bs ${Number(p.precio_hora).toFixed(2)}/h)` : (p.area ? `(${p.area.area})` : '')}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Costo de Compra y Calculadora de Ganancia para Repuestos (Seguro) */}
                                    {Boolean(formData.id_inventario && selectedInvItem) && (
                                        <div className="mb-4 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300 dark:border-amber-700 rounded-xl shadow-xs animate-fade-in">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="p-2 bg-amber-500 text-white rounded-lg shadow-xs shrink-0">
                                                        <Calculator size={20} />
                                                    </span>
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                                                                P. Compra Unitario (Costo):
                                                            </span>
                                                            <span className="text-sm font-bold text-amber-900 dark:text-amber-100 bg-white dark:bg-gray-800 px-2.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-700">
                                                                Bs. {costoCompraForm.toFixed(2)}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                | Stock disponible: <strong className="text-gray-700 dark:text-gray-300">{selectedInvItem?.cantidad_existente}</strong> {selectedInvItem?.unidad_medida?.medida || 'unidades'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                                                            Fórmula: <code className="bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded font-mono text-[11px]">P. Venta = Costo + (Costo × % Ganancia)</code>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 mr-1">
                                                        Calcular % Ganancia:
                                                    </span>
                                                    {[20, 25, 30, 40, 50].map((pct) => (
                                                        <button
                                                            key={pct}
                                                            type="button"
                                                            onClick={() => handleApplyProfitMargin(pct)}
                                                            className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-gray-800 text-amber-800 dark:text-amber-300 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 border border-amber-300 dark:border-amber-700 rounded-lg shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                                            title={`Calcular precio de venta con +${pct}% sobre costo`}
                                                        >
                                                            +{pct}%
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Segunda fila: Resto de campos */}
                                    <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-end ${Boolean(formData.id_inventario && costoCompraForm > 0) ? 'mb-6' : 'mb-4'}`}>
                                        {/* Detalle */}
                                        <div className="md:col-span-4">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Detalle *</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <FileText size={18} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={formData.detalle}
                                                    onChange={(e) => setFormData({ ...formData, detalle: e.target.value })}
                                                    required
                                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                                    placeholder="Nombre del trabajo o repuesto..."
                                                />
                                            </div>
                                        </div>

                                        {/* Nivel */}
                                        <div className="md:col-span-2">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Nivel</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Layers size={18} className="text-gray-400" />
                                                </div>
                                                <select
                                                    value={formData.nivel}
                                                    onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                                >
                                                    <option value="">Nivel...</option>
                                                    <option value="nivel1">Nivel 1</option>
                                                    <option value="nivel2">Nivel 2</option>
                                                    <option value="nivel3">Nivel 3</option>
                                                    <option value="pintado">Pintado</option>
                                                    <option value="instalacion">Instalación</option>
                                                    <option value="otro">Otro</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Cantidad */}
                                        <div className="md:col-span-1">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Cant.</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Hash size={18} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={formData.cantidad ?? ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(',', '.');
                                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                            setFormData(prev => ({ ...prev, cantidad: val }));
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        const raw = String(formData.cantidad).trim();
                                                        if (raw === '' || raw === '.') {
                                                            setFormData(prev => ({ ...prev, cantidad: 1 }));
                                                        } else {
                                                            const num = parseFloat(raw);
                                                            setFormData(prev => ({ ...prev, cantidad: isNaN(num) || num <= 0 ? 1 : num }));
                                                        }
                                                    }}
                                                    required
                                                    className="w-full pl-8 pr-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Precio Unitario */}
                                        <div className="md:col-span-2">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Precio Unitario</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <DollarSign size={18} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="number"
                                                    value={formData.precio_unitario}
                                                    onChange={(e) => setFormData({ ...formData, precio_unitario: Number(e.target.value) })}
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                    className="w-full pl-8 pr-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                                />
                                                {Boolean(formData.id_inventario && costoCompraForm > 0) && (
                                                    <div className="absolute top-full left-0 mt-1 whitespace-nowrap text-[11px] leading-tight pointer-events-none">
                                                        <span className={`font-semibold ${gananciaUnitForm >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                            Utilidad: {gananciaUnitForm >= 0 ? '+' : ''}Bs. {gananciaUnitForm.toFixed(2)} ({gananciaPctForm}%)
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sub Total */}
                                        <div className="md:col-span-2">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Sub Total</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <DollarSign size={18} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={Math.round((parseFloat(String(formData.cantidad)) || 0) * (Number(formData.precio_unitario) || 0)).toFixed(2)}
                                                    className="w-full pl-8 pr-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold cursor-not-allowed text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Botón Guardar */}
                                        <div className="md:col-span-1 flex items-end justify-end">
                                            <button
                                                type="submit"
                                                className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center h-[38px]"
                                                title="Guardar"
                                            >
                                                <Save size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {!formData.id_inventario && (
                                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex flex-wrap items-center gap-6">
                                            <div className="w-48">
                                                <label className="block mb-1 text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                    <Clock size={14} />
                                                    Tiempo Estimado (Hrs)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={formData.tiempo_estimado}
                                                    onChange={(e) => {
                                                        const t = e.target.value;
                                                        setFormData({
                                                            ...formData,
                                                            tiempo_estimado: t,
                                                            total_costo: Number((Number(t || 0) * Number(formData.precio_hora || 0)).toFixed(2))
                                                        });
                                                    }}
                                                    placeholder="Ej: 2"
                                                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
                                                />
                                            </div>
                                            {Number(formData.precio_hora || 0) > 0 && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 pt-3">
                                                    Tarifa Mecánico: <span className="font-semibold text-gray-800 dark:text-gray-200">Bs {Number(formData.precio_hora).toFixed(2)}/h</span>
                                                    {Number(formData.tiempo_estimado || 0) > 0 && (
                                                        <span> • Pago calculado: <span className="font-semibold text-amber-600 dark:text-amber-400">Bs {(Number(formData.tiempo_estimado) * Number(formData.precio_hora)).toFixed(2)}</span></span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Layout para Particular */
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                                        {/* Seleccionar Trabajo */}
                                        <div className="md:col-span-4">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Seleccionar Trabajo (Arancel Taller)
                                            </label>
                                            <SearchableSelect
                                                value={formData.idprecio_taller}
                                                onChange={(val) => handleSelectPrecioTaller(String(val))}
                                                placeholder="Seleccione trabajo..."
                                                searchPlaceholder="Buscar trabajo por nombre o precio..."
                                                options={preciosTaller.map(p => ({
                                                    value: String(p.id),
                                                    label: `${p.detalle} (Bs ${Number(p.precio).toFixed(2)})`,
                                                    sublabel: `Bs ${Number(p.precio).toFixed(2)}`
                                                }))}
                                                icon={<FileText size={18} className="text-gray-400" />}
                                            />
                                        </div>

                                        {/* Seleccionar Repuesto de Inventario */}
                                        <div className="md:col-span-4">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                                <Package size={15} className="text-emerald-600" />
                                                O Repuesto / Pieza (Inventario)
                                            </label>
                                            <SearchableSelect
                                                value={formData.id_inventario}
                                                onChange={(val) => handleSelectInventario(String(val || ''))}
                                                placeholder="Seleccione repuesto..."
                                                searchPlaceholder="Buscar repuesto por código o descripción..."
                                                options={inventarios.map(inv => {
                                                    const pCompra = Number(inv.precio_compra || inv.costo || 0);
                                                    return {
                                                        value: String(inv.id),
                                                        label: `${inv.codigo ? `[${inv.codigo}] ` : ''}${inv.descripcion}`,
                                                        sublabel: `Stock: ${inv.cantidad_existente} | Costo: Bs. ${pCompra.toFixed(2)}`
                                                    };
                                                })}
                                                icon={<Package size={16} className="text-emerald-600" />}
                                            />
                                        </div>

                                        {/* Asignar Mecánico o Chapista */}
                                        {(() => {
                                            const selectedPt = preciosTaller.find(p => String(p.id) === String(formData.idprecio_taller));
                                            const esChaperia = isCategoriaChaperia(selectedPt);
                                            const esTercero = isCategoriaTercero(selectedPt);
                                            const opcionesPersonal = getPersonalOpciones(esChaperia);

                                            if (esTercero) return null;

                                            return (
                                                <div className="md:col-span-4">
                                                    <label className={`block mb-1 text-sm font-medium flex items-center gap-1 ${
                                                        esChaperia ? 'text-indigo-700 dark:text-indigo-300 font-semibold' : 'text-gray-700 dark:text-gray-300'
                                                    }`}>
                                                        <User size={15} className={esChaperia ? 'text-indigo-600' : 'text-blue-600'} />
                                                        {esChaperia ? 'Asignar Chapista (Contratista) *' : 'Asignar Mecánico'}
                                                    </label>
                                                    <select
                                                        value={formData.idpersonal_mecanico}
                                                        onChange={(e) => handleMecanicoFormChange(e.target.value)}
                                                        className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                                                            esChaperia
                                                                ? 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100 font-medium'
                                                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                                                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                                    >
                                                        <option value="">{esChaperia ? '-- Seleccione Chapista Contratista --' : 'Sin asignar...'}</option>
                                                        {opcionesPersonal.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.nombre} {p.paterno} {p.materno} {p.tipo ? `[${p.tipo}]` : ''} {p.area ? `(${p.area.area})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {/* Costo de Compra y Calculadora de Ganancia para Repuestos (Particular) */}
                                    {Boolean(formData.id_inventario && selectedInvItem) && (
                                        <div className="mb-4 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border border-amber-300 dark:border-amber-700 rounded-xl shadow-xs animate-fade-in">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="p-2 bg-amber-500 text-white rounded-lg shadow-xs shrink-0">
                                                        <Calculator size={20} />
                                                    </span>
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                                                                P. Compra Unitario (Costo):
                                                            </span>
                                                            <span className="text-sm font-bold text-amber-900 dark:text-amber-100 bg-white dark:bg-gray-800 px-2.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-700">
                                                                Bs. {costoCompraForm.toFixed(2)}
                                                            </span>
                                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                | Stock disponible: <strong className="text-gray-700 dark:text-gray-300">{selectedInvItem?.cantidad_existente}</strong> {selectedInvItem?.unidad_medida?.medida || 'unidades'}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                                                            Fórmula: <code className="bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded font-mono text-[11px]">P. Venta = Costo + (Costo × % Ganancia)</code>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 mr-1">
                                                        Calcular % Ganancia:
                                                    </span>
                                                    {[20, 25, 30, 40, 50].map((pct) => (
                                                        <button
                                                            key={pct}
                                                            type="button"
                                                            onClick={() => handleApplyProfitMargin(pct)}
                                                            className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-gray-800 text-amber-800 dark:text-amber-300 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 border border-amber-300 dark:border-amber-700 rounded-lg shadow-xs transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                                            title={`Calcular precio de venta con +${pct}% sobre costo`}
                                                        >
                                                            +{pct}%
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {isCategoriaTercero(preciosTaller.find(p => String(p.id) === String(formData.idprecio_taller))) && (
                                        <div className="mb-4 p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border-2 border-purple-300 dark:border-purple-700 rounded-xl shadow-xs">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="p-2 bg-purple-600 text-white rounded-lg shadow-xs shrink-0">
                                                        <ExternalLink size={20} />
                                                    </span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200">
                                                                Trabajo de Terceros
                                                            </span>
                                                            <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                                                                Costo de Trabajo Externo
                                                            </h4>
                                                        </div>
                                                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                                                            Registre el costo pagado al especialista o taller externo (alineado, tornería, etc.) para el análisis de utilidad neta.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="w-full sm:w-64 shrink-0">
                                                    <label className="block mb-1 text-xs font-bold text-purple-900 dark:text-purple-200">
                                                        Costo Pagado al Tercero (Bs) *
                                                    </label>
                                                    <div className="relative">
                                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400" />
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={formData.costo_tercero}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    costo_tercero: val,
                                                                    total_costo: val
                                                                }));
                                                            }}
                                                            placeholder="0.00"
                                                            className="w-full pl-9 pr-3 py-1.5 rounded-lg border-2 border-purple-400 dark:border-purple-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Banner de Chapería - Obra Vendida */}
                                    {isCategoriaChaperia(preciosTaller.find(p => String(p.id) === String(formData.idprecio_taller))) && (
                                        <div className="mb-4 p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border-2 border-indigo-400 dark:border-indigo-700 rounded-xl shadow-xs">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs shrink-0">
                                                        <Wrench size={20} />
                                                    </span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200">
                                                                Chapería • Obra Vendida
                                                            </span>
                                                            <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                                                                Pago Acordado al Chapista (Contratista)
                                                            </h4>
                                                        </div>
                                                        <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                                                            Si este chapista realiza varios ítems bajo un pago general por <strong>obra vendida</strong>, registre el monto pactado aquí y en los siguientes ítems deje el costo en 0.00 Bs.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="w-full sm:w-64 shrink-0">
                                                    <label className="block mb-1 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                                                        Costo Chapista / Obra Vendida (Bs)
                                                    </label>
                                                    <div className="relative">
                                                        <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400" />
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={formData.costo_tercero}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value) || 0;
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    costo_tercero: val,
                                                                    total_costo: val
                                                                }));
                                                            }}
                                                            placeholder="0.00"
                                                            className="w-full pl-9 pr-3 py-1.5 rounded-lg border-2 border-indigo-400 dark:border-indigo-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 items-end ${Boolean(formData.id_inventario && costoCompraForm > 0) ? 'mb-6' : 'mb-4'}`}>
                                        {/* Detalle */}
                                        <div className="md:col-span-5">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Detalle *</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <FileText size={18} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={formData.detalle}
                                                    onChange={(e) => setFormData({ ...formData, detalle: e.target.value })}
                                                    required
                                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                                    placeholder="Nombre del trabajo..."
                                                />
                                            </div>
                                        </div>

                                        {/* Cantidad */}
                                        <div className="md:col-span-2">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Cant.</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Hash size={18} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={formData.cantidad ?? ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(',', '.');
                                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                            setFormData(prev => ({ ...prev, cantidad: val }));
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        const raw = String(formData.cantidad).trim();
                                                        if (raw === '' || raw === '.') {
                                                            setFormData(prev => ({ ...prev, cantidad: 1 }));
                                                        } else {
                                                            const num = parseFloat(raw);
                                                            setFormData(prev => ({ ...prev, cantidad: isNaN(num) || num <= 0 ? 1 : num }));
                                                        }
                                                    }}
                                                    required
                                                    className="w-full pl-9 pr-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Precio Unitario */}
                                        <div className="md:col-span-2">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Precio Unitario</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <DollarSign size={18} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="number"
                                                    value={formData.precio_unitario}
                                                    onChange={(e) => setFormData({ ...formData, precio_unitario: Number(e.target.value) })}
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                    className="w-full pl-9 pr-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                                />
                                                {Boolean(formData.id_inventario && costoCompraForm > 0) && (
                                                    <div className="absolute top-full left-0 mt-1 whitespace-nowrap text-[11px] leading-tight pointer-events-none">
                                                        <span className={`font-semibold ${gananciaUnitForm >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                                            Utilidad: {gananciaUnitForm >= 0 ? '+' : ''}Bs. {gananciaUnitForm.toFixed(2)} ({gananciaPctForm}%)
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sub Total */}
                                        <div className="md:col-span-2">
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Sub Total</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <DollarSign size={18} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={Math.round((parseFloat(String(formData.cantidad)) || 0) * (Number(formData.precio_unitario) || 0)).toFixed(2)}
                                                    className="w-full pl-9 pr-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold cursor-not-allowed text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Botón Guardar */}
                                        <div className="md:col-span-1 flex items-end justify-end">
                                            <button
                                                type="submit"
                                                className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center h-[38px]"
                                                title="Guardar"
                                            >
                                                <Save size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {!formData.id_inventario && !isCategoriaTercero(preciosTaller.find(p => String(p.id) === String(formData.idprecio_taller))) && !isCategoriaChaperia(preciosTaller.find(p => String(p.id) === String(formData.idprecio_taller))) && (
                                        <div className="pt-3 border-t border-gray-200 dark:border-gray-600 flex flex-wrap items-center gap-6">
                                            <div className="w-48">
                                                <label className="block mb-1 text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                    <Clock size={14} />
                                                    Tiempo Estimado (Hrs)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={formData.tiempo_estimado}
                                                    onChange={(e) => {
                                                        const t = e.target.value;
                                                        setFormData({
                                                            ...formData,
                                                            tiempo_estimado: t,
                                                            total_costo: Number((Number(t || 0) * Number(formData.precio_hora || 0)).toFixed(2))
                                                        });
                                                    }}
                                                    placeholder="Ej: 2"
                                                    className="w-full px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-semibold"
                                                />
                                            </div>
                                            {Number(formData.precio_hora || 0) > 0 && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400 pt-3">
                                                    Tarifa Mecánico: <span className="font-semibold text-gray-800 dark:text-gray-200">Bs {Number(formData.precio_hora).toFixed(2)}/h</span>
                                                    {Number(formData.tiempo_estimado || 0) > 0 && (
                                                        <span> • Pago calculado: <span className="font-semibold text-amber-600 dark:text-amber-400">Bs {(Number(formData.tiempo_estimado) * Number(formData.precio_hora)).toFixed(2)}</span></span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </form>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categoría</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Detalle</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cant.</th>
                                {isSeguro && (
                                    <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nivel</th>
                                )}
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">P. Unit</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sub Total</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mecánico</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Estado</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {(() => {
                                const renderedGroupHeaders = new Set<string>();

                                return detalles.flatMap((detalle, index) => {
                                    const isDescartado = detalle.estado_trabajo === 'descartado';
                                    const esRepuesto = Boolean(detalle.inventario || detalle.id_inventario);
                                    const ptObj = detalle.precio_taller || preciosTaller.find(p => String(p.id) === String((detalle as any).idprecio_taller));
                                    const ptId = ptObj?.id || (detalle as any).idprecio_taller;
                                    const groupSiblings = (!esRepuesto && ptId)
                                        ? detalles.filter(d => !d.id_inventario && !d.inventario && String(d.precio_taller?.id || (d as any).idprecio_taller) === String(ptId))
                                        : [];
                                    const isGroupItem = Boolean(
                                        !esRepuesto &&
                                        ptId &&
                                        (normalizeItems(ptObj?.items).length > 0 || groupSiblings.length > 1)
                                    );

                                    const tiempoGlobalGrupo = Number(
                                        detalle.tiempo_estimado !== undefined && detalle.tiempo_estimado !== null && String(detalle.tiempo_estimado) !== ''
                                            ? detalle.tiempo_estimado
                                            : (ptObj?.tiempo_estimado || 0)
                                    );
                                    const precioHoraGrupo = Number(
                                        detalle.precio_hora !== undefined && detalle.precio_hora !== null && Number(detalle.precio_hora) > 0
                                            ? detalle.precio_hora
                                            : (ptObj?.precio_hora || 0)
                                    );
                                    const costoGlobalGrupo = Number(
                                        (tiempoGlobalGrupo * precioHoraGrupo).toFixed(2)
                                    );

                                    const tiempoEstIndividual = (detalle.tiempo_estimado !== undefined && detalle.tiempo_estimado !== null && String(detalle.tiempo_estimado) !== '')
                                        ? detalle.tiempo_estimado
                                        : (ptObj?.tiempo_estimado || '');
                                    const precioHoraIndividual = Number(
                                        detalle.precio_hora !== undefined && detalle.precio_hora !== null && Number(detalle.precio_hora) > 0
                                            ? detalle.precio_hora
                                            : (ptObj?.precio_hora || 0)
                                    );
                                    const costoIndividual = Number(
                                        (Number(tiempoEstIndividual || 0) * precioHoraIndividual).toFixed(2)
                                    );

                                    const selectedMecanicoId = detalle.personal_mecanico?.id || detalle.idpersonal_mecanico || '';
                                    const rowsToRender: React.ReactNode[] = [];

                                    if (isGroupItem && ptId && !renderedGroupHeaders.has(String(ptId))) {
                                        renderedGroupHeaders.add(String(ptId));
                                        const activeGroupSiblings = groupSiblings.filter(g => g.estado_trabajo !== 'descartado');
                                        const totalGrupoCliente = activeGroupSiblings.reduce((acc, g) => acc + Number(g.total || 0), 0);
                                        const groupMecanicoId =
                                            groupSiblings.find(g => g.personal_mecanico?.id || g.idpersonal_mecanico)?.personal_mecanico?.id ||
                                            groupSiblings.find(g => g.idpersonal_mecanico)?.idpersonal_mecanico ||
                                            '';

                                        rowsToRender.push(
                                            <tr
                                                key={`group-header-${ptId}`}
                                                className="bg-indigo-50/90 dark:bg-indigo-950/40 border-y border-indigo-200 dark:border-indigo-800"
                                            >
                                                <td colSpan={isSeguro ? 10 : 9} className="px-4 py-2.5">
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
                                                                <Layers size={13} />
                                                                Grupo de Trabajo
                                                            </span>
                                                            <span className="font-bold text-sm text-indigo-950 dark:text-indigo-200">
                                                                {ptObj?.detalle || 'Mantenimiento / Grupo'}
                                                            </span>
                                                            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                                                                {groupSiblings.length} sub-trabajos
                                                            </span>
                                                            <div className="inline-flex flex-wrap items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-semibold border border-amber-300 dark:border-amber-700">
                                                                <Clock size={12} />
                                                                <span>T. Global:</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    min="0"
                                                                    value={tiempoGlobalGrupo}
                                                                    onChange={(e) => handleChangeRateLocalOrState(detalle, index, 'tiempo_estimado', e.target.value)}
                                                                    onBlur={(e) => handleSaveRateBackend(detalle, 'tiempo_estimado', e.target.value)}
                                                                    className="w-14 px-1.5 py-0.5 rounded border border-amber-400 dark:border-amber-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold text-center"
                                                                    title="Tiempo estimado global (Hrs)"
                                                                />
                                                                <span>hrs</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <div className="flex items-center gap-1.5 text-xs">
                                                                <span className="font-semibold text-indigo-800 dark:text-indigo-300">Mecánico del Grupo:</span>
                                                                <select
                                                                    value={groupMecanicoId}
                                                                    onChange={(e) => handleAssignMecanico(detalle, index, e.target.value)}
                                                                    className="px-2 py-1 rounded border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                >
                                                                    <option value="">-- Asignar a todo el grupo --</option>
                                                                    {personalList.map(p => (
                                                                        <option key={p.id} value={p.id}>
                                                                            {p.nombre} {p.paterno} {Number(p.precio_hora || 0) > 0 ? `(Bs ${Number(p.precio_hora).toFixed(2)}/h)` : ''}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700 font-mono">
                                                                Total Grupo: Bs. {totalGrupoCliente.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    const invObj = detalle.inventario || inventarios.find(i => Number(i.id) === Number(detalle.id_inventario));

                                    rowsToRender.push(
                                        <tr
                                            key={detalle.id}
                                            className={`transition-colors ${
                                                isDescartado
                                                    ? 'bg-red-50/50 dark:bg-red-900/20 opacity-70'
                                                    : isGroupItem
                                                    ? 'bg-indigo-50/20 dark:bg-indigo-950/10 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 border-l-4 border-l-indigo-500'
                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                            }`}
                                        >
                                            <td className="p-3 text-gray-500 dark:text-gray-400 font-mono text-sm">{index + 1}</td>
                                            <td className="p-3 text-gray-700 dark:text-gray-200 text-sm">
                                                {esRepuesto ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                                                        <Package size={12} /> Repuesto
                                                    </span>
                                                ) : isGroupItem ? (
                                                    <div className="flex flex-col items-start gap-0.5">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                                                            <Layers size={11} /> Sub-ítem Grupo
                                                        </span>
                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[130px]">
                                                            {ptObj?.detalle}
                                                        </span>
                                                    </div>
                                                ) : isCategoriaChaperia(ptObj, detalle) ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                                                        <Wrench size={11} /> Chapería
                                                    </span>
                                                ) : isCategoriaTercero(ptObj, detalle) ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                                                        <ExternalLink size={11} /> Terceros
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                                                        {ptObj?.categoria?.categoria_servicio || detalle.precio_seguro?.categoria?.categoria_servicio || 'Servicio'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`p-3 text-gray-700 dark:text-gray-200 ${isDescartado ? 'line-through text-gray-400' : ''}`}>
                                                <div className="font-medium flex items-center gap-1.5">
                                                    {isGroupItem && (
                                                        <span className="text-indigo-500 font-bold">↳</span>
                                                    )}
                                                    <span>
                                                        {esRepuesto && invObj?.codigo ? `[${invObj.codigo}] ` : ''}
                                                        {detalle.detalle || ptObj?.detalle || detalle.precio_seguro?.detalle || invObj?.descripcion || 'N/A'}
                                                    </span>
                                                </div>
                                                {esRepuesto && invObj && Number(invObj.precio_compra) > 0 && (
                                                    <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono mt-0.5 flex items-center gap-1">
                                                        <span className="font-semibold">Costo compra almacén:</span>
                                                        <span>Bs. {Number(invObj.precio_compra).toFixed(2)} / u.</span>
                                                        <span className="text-gray-400 font-sans text-[10px]">(Ref. solo lectura)</span>
                                                    </div>
                                                )}
                                                {esRepuesto && Number(detalle.precio_unitario || 0) === 0 && (
                                                    <div className="mt-1">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700 animate-pulse">
                                                            <AlertCircle size={10} /> Pendiente fijar precio al cliente
                                                        </span>
                                                    </div>
                                                )}
                                                {isCategoriaTercero(ptObj, detalle) && (Number(detalle.costo_tercero || detalle.total_costo || 0) > 0) && (
                                                    <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono mt-0.5 flex items-center gap-1">
                                                        <span>Costo pagado al tercero: Bs. {Number(detalle.costo_tercero || detalle.total_costo).toFixed(2)}</span>
                                                    </div>
                                                )}
                                                {isCategoriaChaperia(ptObj, detalle) && (
                                                    <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 flex items-center gap-1">
                                                        <span>
                                                            {Number(detalle.costo_tercero || detalle.total_costo || 0) > 0
                                                                ? `Obra Vendida Chapista: Bs. ${Number(detalle.costo_tercero || detalle.total_costo).toFixed(2)}`
                                                                : '(Costo incluido en obra vendida)'}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className={`p-3 text-gray-700 dark:text-gray-200 ${isDescartado ? 'line-through text-gray-400' : ''}`}>{detalle.cantidad}</td>
                                            {isSeguro && (
                                                <td className="p-3 text-gray-700 dark:text-gray-200">{detalle.nivel || '-'}</td>
                                            )}
                                            <td className={`p-3 text-gray-700 dark:text-gray-200 ${isDescartado ? 'line-through text-gray-400' : ''}`}>
                                                {Number(detalle.precio_unitario || 0) === 0 && esRepuesto ? (
                                                    <span className="font-bold text-amber-600 dark:text-amber-400">0.00 (Sin fijar)</span>
                                                ) : (
                                                    Number(detalle.precio_unitario).toFixed(2)
                                                )}
                                            </td>
                                            <td className={`p-3 font-bold ${isDescartado ? 'line-through text-red-400 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {Math.round(Number(detalle.total || (Number(detalle.cantidad || 0) * Number(detalle.precio_unitario || 0)))).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-sm">
                                                {!esRepuesto ? (
                                                    isCategoriaTercero(ptObj, detalle) ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-300">
                                                                <ExternalLink size={12} /> Trabajo Externo
                                                            </span>
                                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                                                                Costo: Bs {Number(detalle.costo_tercero || detalle.total_costo || 0).toFixed(2)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <select
                                                                value={selectedMecanicoId}
                                                                onChange={(e) => handleAssignMecanico(detalle, index, e.target.value)}
                                                                disabled={isDescartado || isTrabajoLiquidadoPlanilla(detalle)}
                                                                className={`w-full max-w-[200px] px-2 py-1 rounded border text-xs mb-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                                                                    isTrabajoLiquidadoPlanilla(detalle)
                                                                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 cursor-not-allowed'
                                                                        : isCategoriaChaperia(ptObj, detalle)
                                                                        ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200'
                                                                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                                                                } disabled:opacity-75 disabled:cursor-not-allowed`}
                                                            >
                                                                <option value="">{isCategoriaChaperia(ptObj, detalle) ? '-- Asignar Chapista --' : '-- Asignar Mecánico --'}</option>
                                                                {getPersonalOpciones(isCategoriaChaperia(ptObj, detalle)).map(p => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.nombre} {p.paterno} {isCategoriaChaperia(ptObj, detalle) ? `[${p.tipo || 'Contratista'}]` : (Number(p.precio_hora || 0) > 0 ? `(Bs ${Number(p.precio_hora).toFixed(2)}/h)` : '')}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {isCategoriaChaperia(ptObj, detalle) && (
                                                                <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-mono font-medium">
                                                                    {Number(detalle.costo_tercero || 0) > 0
                                                                        ? `Obra: Bs ${Number(detalle.costo_tercero).toFixed(2)}`
                                                                        : '(Incluido en obra vendida)'}
                                                                </div>
                                                            )}
                                                            {isTrabajoLiquidadoPlanilla(detalle) && (
                                                                <div className="mt-1">
                                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700 shadow-xs" title="Liquidado y pagado en planilla al mecánico">
                                                                        <Lock size={10} /> Pagado en Planilla
                                                                    </span>
                                                                </div>
                                                            )}
                                                            {isGroupItem ? (
                                                                <div className="flex flex-wrap gap-1 text-[10px] mt-1">
                                                                    <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-medium">
                                                                        <Clock size={10} /> Grupo ({tiempoGlobalGrupo}h)
                                                                    </span>
                                                                </div>
                                                            ) : Number(tiempoEstIndividual || 0) > 0 && (
                                                                <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                                                    <Clock size={11} className="text-amber-600 dark:text-amber-400" />
                                                                    <span>{Number(tiempoEstIndividual).toFixed(1)} hrs</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">No aplica (Repuesto)</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    disabled={isTrabajoLiquidadoPlanilla(detalle)}
                                                    onClick={() => handleToggleEstadoTrabajo(detalle, index)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-xs ${
                                                        isTrabajoLiquidadoPlanilla(detalle)
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 opacity-90 cursor-not-allowed'
                                                            : isDescartado
                                                            ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 hover:bg-rose-200 transform hover:scale-105 cursor-pointer'
                                                            : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 transform hover:scale-105 cursor-pointer'
                                                    }`}
                                                    title={isTrabajoLiquidadoPlanilla(detalle) ? "Trabajo liquidado en planilla - Protegido contra descarte" : isDescartado ? "Trabajo rechazado por el cliente. Clic para APROBAR." : "Trabajo aprobado. Clic para RECHAZAR (el cliente no lo desea)."}
                                                >
                                                    {isDescartado ? (
                                                        <>
                                                            <XCircle size={14} className="text-rose-600 dark:text-rose-400" />
                                                            <span>Rechazado</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle size={14} className="text-emerald-600 dark:text-emerald-400" />
                                                            <span>Aprobado</span>
                                                        </>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="p-3 flex gap-2 justify-end items-center">
                                                {activeId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditDetails(detalle)}
                                                        className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                        title="Ver/Editar Imágenes"
                                                    >
                                                        {(detalle.imagenes && detalle.imagenes.length > 0) ? (
                                                            <div className="flex items-center gap-1">
                                                                <ImageIcon size={16} />
                                                                <span className="bg-blue-500 text-white text-[10px] px-1.5 rounded-full">{detalle.imagenes.length}</span>
                                                            </div>
                                                        ) : (
                                                            <Upload size={16} />
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditMain(detalle, index)}
                                                    className="p-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                    title="Editar"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                {isTrabajoLiquidadoPlanilla(detalle) ? (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded-lg cursor-not-allowed shadow-none"
                                                        title="Trabajo protegido: Ya fue liquidado y pagado en planilla al mecánico"
                                                    >
                                                        <Lock size={16} />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(detalle, index)}
                                                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );

                                    return rowsToRender;
                                });
                            })()}
                            {detalles.length === 0 && (
                                <tr>
                                    <td colSpan={isSeguro ? 10 : 9} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        No hay trabajos agregados. Haga clic en "Agregar Trabajo" para comenzar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Sección de Información Adicional */}
                {!isEmbedded && (
                    <div className="mt-6 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-md font-bold text-gray-800 dark:text-white">Información Adicional</h3>
                            <button
                                onClick={handleUpdateOrden}
                                disabled={savingOrden}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={18} />
                                {savingOrden ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Plazo de Entrega (días)</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar size={16} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        value={ordenForm.plazo_entrega}
                                        onChange={(e) => setOrdenForm({ ...ordenForm, plazo_entrega: parseInt(e.target.value) || 0 })}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Moneda</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <DollarSign size={16} className="text-gray-400" />
                                    </div>
                                    <select
                                        value={ordenForm.moneda}
                                        onChange={(e) => setOrdenForm({ ...ordenForm, moneda: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                    >
                                        <option value="bolivianos">Bolivianos</option>
                                        <option value="dolares">Dólares</option>
                                    </select>
                                </div>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Observaciones</label>
                                <div className="relative">
                                    <div className="absolute top-3 left-3 flex items-start pointer-events-none">
                                        <FileText size={16} className="text-gray-400" />
                                    </div>
                                    <textarea
                                        value={ordenForm.observaciones}
                                        onChange={(e) => setOrdenForm({ ...ordenForm, observaciones: e.target.value })}
                                        rows={3}
                                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                        placeholder="Ingrese observaciones..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>


            {/* Modal de Edición de Detalles */}
            {editingDetalle && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg">
                        <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <ImageIcon size={24} className="text-blue-500" />
                                Subir imágenes
                            </h3>
                        </div>

                        <div className="mb-4 flex items-center gap-2">
                            <p className="font-semibold text-gray-700 dark:text-gray-300">Trabajo:</p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                {editingDetalle.detalle || editingDetalle.precio_taller?.detalle || editingDetalle.precio_seguro?.detalle}
                            </p>
                        </div>



                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Imágenes y Archivos</label>
                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleDetailFileUpload}
                                    className="hidden"
                                    id="modal-file-upload"
                                    disabled={uploading}
                                />
                                <label htmlFor="modal-file-upload" className="cursor-pointer flex items-center justify-center gap-2 py-2">
                                    <Upload size={20} className="text-gray-400" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {uploading ? 'Subiendo...' : 'Haz clic para subir imágenes'}
                                    </span>
                                </label>
                            </div>

                            {detailForm.imagenes.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mt-4">
                                    {detailForm.imagenes.map((img, idx) => (
                                        <div key={idx} className="relative group aspect-square">
                                            <img
                                                src={`${API_BASE_URL}/files/${img}`}
                                                alt="Detalle"
                                                onClick={() => setPreviewImage(`${API_BASE_URL}/files/${img}`)}
                                                className="w-full h-full object-cover rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                                            />
                                            <button
                                                onClick={() => removeDetailImage(idx)}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                            <button
                                onClick={handleCloseModal}
                                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveDetails}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-colors font-medium flex items-center gap-2"
                            >
                                <Check size={18} /> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición de Detalle Principal */}
            {editingDetalleMain && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                Editar Detalle de Trabajo
                            </h3>
                        </div>

                        {isTrabajoLiquidadoPlanilla(editingDetalleMain) && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2 mb-4">
                                <Lock size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <div>
                                    <strong className="font-bold">Trabajo Liquidado en Planilla:</strong> Este ítem ya fue pagado al mecánico en su planilla de sueldos. El mecánico asignado, las horas estimadas y los costos de mano de obra están protegidos para asegurar la consistencia contable.
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Selector de Precio */}
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {!isSeguro ? 'Precio Taller' : 'Precio Seguro'}
                                    </label>
                                    <div>
                                        {!isSeguro ? (
                                            <SearchableSelect
                                                value={editForm.idprecio_taller}
                                                onChange={(val) => {
                                                    const precio = preciosTaller.find(p => String(p.id) === String(val));
                                                    const esTercero = isCategoriaTercero(precio);
                                                    const esChaperia = isCategoriaChaperia(precio);
                                                    const esExternoOObra = esTercero || esChaperia;
                                                    const costoTerceroVal = esExternoOObra ? (precio?.total_costo ? Number(precio.total_costo) : 0) : 0;
                                                    setEditForm({
                                                        ...editForm,
                                                        idprecio_taller: String(val || ''),
                                                        idprecio_seguro: '',
                                                        id_inventario: '',
                                                        detalle: precio ? precio.detalle : editForm.detalle,
                                                        precio_unitario: precio ? Number(precio.precio) : editForm.precio_unitario,
                                                        tiempo_estimado: esExternoOObra ? '' : (precio?.tiempo_estimado || editForm.tiempo_estimado),
                                                        precio_hora: esExternoOObra ? 0 : (precio?.precio_hora ? Number(precio.precio_hora) : editForm.precio_hora),
                                                        costo_tercero: costoTerceroVal,
                                                        total_costo: esExternoOObra ? costoTerceroVal : (precio?.total_costo ? Number(precio.total_costo) : editForm.total_costo)
                                                    });
                                                }}
                                                placeholder="Seleccione trabajo..."
                                                searchPlaceholder="Buscar trabajo por nombre o precio..."
                                                options={preciosTaller.map(p => ({
                                                    value: String(p.id),
                                                    label: `${p.detalle} (Bs ${Number(p.precio).toFixed(2)})`,
                                                    sublabel: `Bs ${Number(p.precio).toFixed(2)}`
                                                }))}
                                                icon={<FileText size={18} className="text-gray-400" />}
                                            />
                                        ) : (
                                            <div className="relative">
                                                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                                <select
                                                    value={editForm.idprecio_seguro}
                                                    onChange={(e) => setEditForm({ ...editForm, idprecio_seguro: e.target.value, idprecio_taller: '', id_inventario: '' })}
                                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                                >
                                                    <option value="">Seleccione...</option>
                                                    {preciosSegurosFiltrados.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.detalle}
                                                        </option>
                                                    ))}
                                                    {preciosSegurosFiltrados.length === 0 && (
                                                        <option value="" disabled>No hay aranceles para este seguro</option>
                                                    )}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Selector de Repuesto Inventario */}
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                        <Package size={15} className="text-emerald-600" />
                                        Repuesto / Pieza (Inventario)
                                    </label>
                                    <SearchableSelect
                                        value={editForm.id_inventario}
                                        onChange={(val) => {
                                            const inv = inventarios.find(i => String(i.id) === String(val));
                                            const pv = inv ? Number(inv.precio_venta && Number(inv.precio_venta) > 0 ? inv.precio_venta : inv.costo || 0) : editForm.precio_unitario;
                                            setEditForm({
                                                ...editForm,
                                                id_inventario: String(val || ''),
                                                idprecio_taller: '',
                                                idprecio_seguro: '',
                                                detalle: inv ? inv.descripcion : editForm.detalle,
                                                precio_unitario: pv
                                            });
                                        }}
                                        placeholder="Sin repuesto de inventario..."
                                        searchPlaceholder="Buscar repuesto por código o descripción..."
                                        options={inventarios.map(inv => {
                                            const pCompra = Number(inv.precio_compra || inv.costo || 0);
                                            return {
                                                value: String(inv.id),
                                                label: `${inv.codigo ? `[${inv.codigo}] ` : ''}${inv.descripcion}`,
                                                sublabel: `Stock: ${inv.cantidad_existente} | Costo: Bs. ${pCompra.toFixed(2)}`
                                            };
                                        })}
                                        icon={<Package size={16} className="text-emerald-600" />}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Detalle / Descripción</label>
                                    <input
                                        type="text"
                                        value={editForm.detalle}
                                        onChange={(e) => setEditForm({ ...editForm, detalle: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <span>Estado Cliente</span>
                                        {isTrabajoLiquidadoPlanilla(editingDetalleMain) && (
                                            <Lock size={13} className="text-blue-600 dark:text-blue-400" />
                                        )}
                                    </label>
                                    <select
                                        disabled={isTrabajoLiquidadoPlanilla(editingDetalleMain)}
                                        value={editForm.estado_trabajo}
                                        onChange={(e) => setEditForm({ ...editForm, estado_trabajo: e.target.value as any })}
                                        className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                                            isTrabajoLiquidadoPlanilla(editingDetalleMain)
                                                ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                    >
                                        <option value="confirmado">Confirmado por el Cliente</option>
                                        <option value="descartado" disabled={isTrabajoLiquidadoPlanilla(editingDetalleMain)}>Descartado por el Cliente</option>
                                    </select>
                                </div>
                            </div>

                            {Boolean(editForm.id_inventario || editingDetalleMain.id_inventario || editingDetalleMain.inventario) && (() => {
                                const invSelected = inventarios.find(i => String(i.id) === String(editForm.id_inventario || editingDetalleMain.id_inventario)) || editingDetalleMain.inventario;
                                const precioCompra = invSelected?.precio_compra !== undefined ? Number(invSelected.precio_compra) : 0;
                                const precioVentaInv = invSelected?.precio_venta !== undefined ? Number(invSelected.precio_venta) : 0;

                                return (
                                    <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border-2 border-purple-300 dark:border-purple-700 rounded-xl shadow-xs">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="p-2 bg-purple-600 text-white rounded-lg shadow-xs shrink-0">
                                                    <Package size={18} />
                                                </span>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200">
                                                            Repuesto de Almacén
                                                        </span>
                                                        <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                                                            Costo de Compra
                                                        </h4>
                                                    </div>
                                                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                                                        Precio de compra de referencia para que el asesor defina cuánto cobrar al cliente.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800">
                                                <div>
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-medium">P. Compra Unit.</span>
                                                    <span className="text-sm font-extrabold font-mono text-purple-700 dark:text-purple-300">
                                                        Bs. {precioCompra.toFixed(2)}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => openPriceCalculator(
                                                        precioCompra,
                                                        invSelected?.descripcion || editForm.detalle || 'Repuesto',
                                                        Number(editForm.precio_unitario || 0),
                                                        precioVentaInv
                                                    )}
                                                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                                    title="Abrir calculadora de precio de venta"
                                                >
                                                    <Calculator size={15} />
                                                    <span>Calcular</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {isCategoriaTercero(preciosTaller.find(p => String(p.id) === String(editForm.idprecio_taller)), editingDetalleMain) ? (
                                <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border-2 border-purple-300 dark:border-purple-700 rounded-xl shadow-xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="p-2 bg-purple-600 text-white rounded-lg shadow-xs shrink-0">
                                                <ExternalLink size={18} />
                                            </span>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200">
                                                        Trabajo de Terceros
                                                    </span>
                                                    <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                                                        Costo Externo
                                                    </h4>
                                                </div>
                                                <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                                                    Costo pagado al especialista o taller externo (alineado, torno, etc.) para cálculo de utilidad neta.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="w-full sm:w-60 shrink-0">
                                            <label className="block mb-1 text-xs font-bold text-purple-900 dark:text-purple-200">
                                                Costo Pagado al Tercero (Bs) *
                                            </label>
                                            <div className="relative">
                                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400" />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={editForm.costo_tercero}
                                                    onChange={(e) => {
                                                        const raw = e.target.value;
                                                        const val = raw === '' ? 0 : parseFloat(raw);
                                                        const numVal = isNaN(val) ? 0 : val;
                                                        setEditForm(prev => ({
                                                            ...prev,
                                                            costo_tercero: numVal,
                                                            total_costo: numVal
                                                        }));
                                                    }}
                                                    className="w-full pl-9 pr-3 py-1.5 rounded-lg border-2 border-purple-400 dark:border-purple-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : isCategoriaChaperia(preciosTaller.find(p => String(p.id) === String(editForm.idprecio_taller)), editingDetalleMain) ? (
                                <div className="space-y-4">
                                    <div className="p-3.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border-2 border-indigo-400 dark:border-indigo-700 rounded-xl shadow-xs">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5">
                                                <span className="p-2 bg-indigo-600 text-white rounded-lg shadow-xs shrink-0">
                                                    <Wrench size={18} />
                                                </span>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200">
                                                            Chapería • Obra Vendida
                                                        </span>
                                                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                                                            Pago Acordado al Chapista (Contratista)
                                                        </h4>
                                                    </div>
                                                    <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                                                        Si este chapista realiza varios ítems bajo un pago general por <strong>obra vendida</strong>, registre el monto pactado aquí y en los siguientes ítems deje el costo en 0.00 Bs.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="w-full sm:w-60 shrink-0">
                                                <label className="block mb-1 text-xs font-bold text-indigo-900 dark:text-indigo-200">
                                                    Costo Chapista / Obra Vendida (Bs)
                                                </label>
                                                <div className="relative">
                                                    <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400" />
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={editForm.costo_tercero}
                                                        onChange={(e) => {
                                                            const raw = e.target.value;
                                                            const val = raw === '' ? 0 : parseFloat(raw);
                                                            const numVal = isNaN(val) ? 0 : val;
                                                            setEditForm(prev => ({
                                                                ...prev,
                                                                costo_tercero: numVal,
                                                                total_costo: numVal
                                                            }));
                                                        }}
                                                        className="w-full pl-9 pr-3 py-1.5 rounded-lg border-2 border-indigo-400 dark:border-indigo-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="flex items-center gap-1 mb-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                                                <User size={14} className="text-indigo-600" />
                                                <span>Chapista Asignado (Contratista) *</span>
                                            </label>
                                            <select
                                                disabled={isTrabajoLiquidadoPlanilla(editingDetalleMain)}
                                                value={editForm.idpersonal_mecanico}
                                                onChange={(e) => setEditForm({ ...editForm, idpersonal_mecanico: e.target.value })}
                                                className="w-full px-3 py-2 rounded-lg border border-indigo-300 dark:border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="">-- Seleccione Chapista Contratista --</option>
                                                {getPersonalOpciones(true).map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.nombre} {p.paterno} {p.materno} {p.tipo ? `[${p.tipo}]` : ''} {p.area ? `(${p.area.area})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                Estado del Trabajo
                                            </label>
                                            <select
                                                disabled={isTrabajoLiquidadoPlanilla(editingDetalleMain)}
                                                value={editForm.estado_trabajo}
                                                onChange={(e) => setEditForm({ ...editForm, estado_trabajo: e.target.value as any })}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="confirmado">Confirmado por el Cliente</option>
                                                <option value="descartado" disabled={isTrabajoLiquidadoPlanilla(editingDetalleMain)}>Descartado por el Cliente</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div>
                                        <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <span>Mecánico Asignado</span>
                                            {isTrabajoLiquidadoPlanilla(editingDetalleMain) && (
                                                <Lock size={13} className="text-blue-600 dark:text-blue-400" />
                                            )}
                                        </label>
                                        <select
                                            disabled={isTrabajoLiquidadoPlanilla(editingDetalleMain)}
                                            value={editForm.idpersonal_mecanico}
                                            onChange={(e) => setEditForm({ ...editForm, idpersonal_mecanico: e.target.value })}
                                            className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                                                isTrabajoLiquidadoPlanilla(editingDetalleMain)
                                                    ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                            }`}
                                        >
                                            <option value="">Sin asignar...</option>
                                            {personalList.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombre} {p.paterno} {p.materno}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <span>T. Estimado (Hrs)</span>
                                            {isTrabajoLiquidadoPlanilla(editingDetalleMain) && (
                                                <Lock size={13} className="text-blue-600 dark:text-blue-400" />
                                            )}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            disabled={isTrabajoLiquidadoPlanilla(editingDetalleMain)}
                                            readOnly={isTrabajoLiquidadoPlanilla(editingDetalleMain)}
                                            value={editForm.tiempo_estimado}
                                            onChange={(e) => {
                                                if (isTrabajoLiquidadoPlanilla(editingDetalleMain)) return;
                                                const t = e.target.value;
                                                setEditForm({
                                                    ...editForm,
                                                    tiempo_estimado: t,
                                                    total_costo: Number((Number(t || 0) * Number(editForm.precio_hora || 0)).toFixed(2))
                                                });
                                            }}
                                            placeholder="Ej: 2"
                                            className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                                                isTrabajoLiquidadoPlanilla(editingDetalleMain)
                                                    ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1 mb-1 text-sm font-medium text-amber-700 dark:text-amber-400">
                                            <span>Precio Hora (Bs)</span>
                                            {isTrabajoLiquidadoPlanilla(editingDetalleMain) && (
                                                <Lock size={13} className="text-blue-600 dark:text-blue-400" />
                                            )}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            disabled={isTrabajoLiquidadoPlanilla(editingDetalleMain)}
                                            readOnly={isTrabajoLiquidadoPlanilla(editingDetalleMain)}
                                            value={editForm.precio_hora}
                                            onChange={(e) => {
                                                if (isTrabajoLiquidadoPlanilla(editingDetalleMain)) return;
                                                const ph = parseFloat(e.target.value) || 0;
                                                setEditForm({
                                                    ...editForm,
                                                    precio_hora: ph,
                                                    total_costo: Number((Number(editForm.tiempo_estimado || 0) * ph).toFixed(2))
                                                });
                                            }}
                                            placeholder="0.00"
                                            className={`w-full px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                                                isTrabajoLiquidadoPlanilla(editingDetalleMain)
                                                    ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                                                    : 'border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Pago Mecánico (Bs)</label>
                                        <input
                                            type="text"
                                            readOnly
                                            value={(Number(editForm.tiempo_estimado || 0) * Number(editForm.precio_hora || 0)).toFixed(2)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 font-bold cursor-not-allowed text-sm"
                                        />
                                    </div>
                                </div>
                            )}

                            {(() => {
                                const isCantidadBloqueada = Boolean(
                                    editForm.id_inventario || editingDetalleMain.id_inventario || editingDetalleMain.inventario
                                );
                                return (
                                    <div className="grid grid-cols-3 gap-4">
                                        {/* Cantidad */}
                                        <div>
                                            <label className="flex items-center gap-1.5 mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                <span>Cantidad</span>
                                                {isCantidadBloqueada && (
                                                    <Lock size={13} className="text-purple-600 dark:text-purple-400" />
                                                )}
                                            </label>
                                            <div className="relative">
                                                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    readOnly={isCantidadBloqueada}
                                                    disabled={isCantidadBloqueada}
                                                    value={editForm.cantidad ?? ''}
                                                    onChange={(e) => {
                                                        if (isCantidadBloqueada) return;
                                                        const val = e.target.value.replace(',', '.');
                                                        if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                            setEditForm(prev => ({ ...prev, cantidad: val }));
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        if (isCantidadBloqueada) return;
                                                        const raw = String(editForm.cantidad).trim();
                                                        if (raw === '' || raw === '.') {
                                                            setEditForm(prev => ({ ...prev, cantidad: 1 }));
                                                        } else {
                                                            const num = parseFloat(raw);
                                                            setEditForm(prev => ({ ...prev, cantidad: isNaN(num) || num <= 0 ? 1 : num }));
                                                        }
                                                    }}
                                                    title={isCantidadBloqueada ? "Cantidad asignada por Almacén (bloqueada)" : undefined}
                                                    className={`w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm transition-colors ${
                                                        isCantidadBloqueada
                                                            ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold cursor-not-allowed"
                                                            : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    }`}
                                                />
                                            </div>
                                            {isCantidadBloqueada && (
                                                <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-1">
                                                    Asignada por Almacén (bloqueada)
                                                </p>
                                            )}
                                        </div>

                                        {/* Precio Unitario */}
                                        <div>
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Precio Unitario</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editForm.precio_unitario}
                                                    onChange={(e) => setEditForm({ ...editForm, precio_unitario: parseFloat(e.target.value) || 0 })}
                                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Sub Total */}
                                        <div>
                                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Sub Total</label>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                                <input
                                                    type="text"
                                                    readOnly
                                                    value={Math.round((parseFloat(String(editForm.cantidad)) || 0) * (Number(editForm.precio_unitario) || 0)).toFixed(2)}
                                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold cursor-not-allowed text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Nivel (solo para Seguros) */}
                            {isSeguro && (
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Nivel</label>
                                    <div className="relative">
                                        <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                        <select
                                            value={editForm.nivel}
                                            onChange={(e) => setEditForm({ ...editForm, nivel: e.target.value })}
                                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                                        >
                                            <option value="">Seleccione nivel...</option>
                                            <option value="nivel1">Nivel 1</option>
                                            <option value="nivel2">Nivel 2</option>
                                            <option value="nivel3">Nivel 3</option>
                                            <option value="pintado">Pintado</option>
                                            <option value="instalacion">Instalación</option>
                                            <option value="otro">Otro (precio libre)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Total */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Total: <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                                        {orden?.moneda === 'bolivianos' ? 'Bs' : '$'} {Math.round((parseFloat(String(editForm.cantidad)) || 0) * (Number(editForm.precio_unitario) || 0)).toFixed(2)}
                                    </span>
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700 mt-4">
                            <button
                                onClick={handleCloseEditMain}
                                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-sm transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEditMain}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-colors font-medium flex items-center gap-2"
                            >
                                <Check size={18} /> Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Calculadora de Precio de Venta */}
            {showPriceCalcModal && editingDetalleMain && (() => {
                const cantidadLinea = Number(editForm.cantidad || 1);
                const utilidadUnit = Number((calcPrecioVenta - calcPrecioCompra).toFixed(2));
                const totalLinea = Number((calcPrecioVenta * cantidadLinea).toFixed(2));
                const monedaSymbol = orden?.moneda === 'bolivianos' ? 'Bs.' : '$';

                return (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60]"
                        onClick={() => setShowPriceCalcModal(false)}
                    >
                        <div
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                <div className="flex items-center gap-2.5">
                                    <Calculator size={20} />
                                    <h3 className="text-base font-bold">Calculadora de Precio de Venta</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPriceCalcModal(false)}
                                    className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-300 block">
                                        Repuesto / Material
                                    </span>
                                    <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5">
                                        {calcItemNombre}
                                    </p>
                                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-200/70 dark:border-purple-800/70 text-xs">
                                        <span className="text-gray-600 dark:text-gray-300">P. Compra Unitario (Almacén):</span>
                                        <span className="font-extrabold font-mono text-purple-700 dark:text-purple-300 text-sm">
                                            Bs. {calcPrecioCompra.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Botones rápidos de % ganancia */}
                                <div>
                                    <span className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">
                                        Fórmula % Ganancia rápida:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[20, 25, 30, 40, 50, 100].map((pct) => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => {
                                                    setCalcPorcentaje(pct);
                                                    setCalcPrecioVenta(Number((calcPrecioCompra * (1 + pct / 100)).toFixed(2)));
                                                }}
                                                className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer ${
                                                    Math.abs(calcPorcentaje - pct) < 0.01
                                                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700 hover:bg-amber-100'
                                                }`}
                                            >
                                                +{pct}%
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                                            % Ganancia
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={calcPorcentaje}
                                                onChange={(e) => {
                                                    const pct = parseFloat(e.target.value);
                                                    const safePct = isNaN(pct) ? 0 : pct;
                                                    setCalcPorcentaje(safePct);
                                                    if (calcPrecioCompra > 0) {
                                                        setCalcPrecioVenta(Number((calcPrecioCompra * (1 + safePct / 100)).toFixed(2)));
                                                    }
                                                }}
                                                className="w-full pr-7 pl-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-600 dark:text-amber-400">
                                                %
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                                            P. Venta Unitario ({monedaSymbol})
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={calcPrecioVenta}
                                            onChange={(e) => {
                                                const pv = parseFloat(e.target.value);
                                                const safePv = isNaN(pv) ? 0 : pv;
                                                setCalcPrecioVenta(safePv);
                                                if (calcPrecioCompra > 0) {
                                                    setCalcPorcentaje(Number((((safePv - calcPrecioCompra) / calcPrecioCompra) * 100).toFixed(2)));
                                                }
                                            }}
                                            className="w-full px-3 py-2 rounded-lg border border-emerald-400 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg p-3 space-y-1.5 text-xs border border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 dark:text-gray-300">Utilidad Unitaria:</span>
                                        <span className={`font-bold font-mono ${utilidadUnit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                            {utilidadUnit >= 0 ? '+' : ''}Bs. {utilidadUnit.toFixed(2)} ({calcPorcentaje}%)
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 dark:border-gray-600">
                                        <span className="text-gray-700 dark:text-gray-200 font-semibold">
                                            Sub Total ({cantidadLinea} uds.):
                                        </span>
                                        <span className="font-extrabold font-mono text-sm text-blue-600 dark:text-blue-400">
                                            {monedaSymbol} {totalLinea.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2.5 px-5 py-3.5 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowPriceCalcModal(false)}
                                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditForm(prev => ({ ...prev, precio_unitario: calcPrecioVenta }));
                                        setShowPriceCalcModal(false);
                                    }}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Check size={15} />
                                    <span>Aplicar Precio</span>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal de Vista Previa de Imagen */}
            {previewImage && (
                <div
                    className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-10 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <img
                            src={previewImage}
                            alt="Vista previa"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}

        </div>
    );
};

export default OrdenTrabajoDetalles;
