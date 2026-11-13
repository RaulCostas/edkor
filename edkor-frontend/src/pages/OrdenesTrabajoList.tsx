import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, ClipboardList, Timer, Eye, CheckCircle, MessageCircle, Pencil, Trash2, RotateCcw, Plus, Calendar, Unlock, ReceiptText, TrendingUp, KeyRound } from 'lucide-react';
import type { OrdenTrabajo } from '../types/ordenTrabajo';
import { getOrdenesTrabajo, deleteOrdenTrabajo, reactivateOrdenTrabajo, getOrdenTrabajo, updateOrdenTrabajo } from '../services/ordenTrabajoService';
import { getTiposOrdenEnHojasRecepcion } from '../services/tipoOrdenService';
import type { TipoOrden } from '../types/tipoOrden';
import { getDetallesByOrden } from '../services/detalleOrdenTrabajoService';
import OrdenTrabajoPrintView from '../components/OrdenTrabajoPrintView';
import { OrdenesTrabajoListPrintView } from '../components/OrdenesTrabajoListPrintView';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import Pagination from '../components/Pagination';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import ViewOrdenModal from '../components/ViewOrdenModal';
import UtilidadOrdenModal from '../components/UtilidadOrdenModal';
import type { DetalleOrdenTrabajo } from '../types/detalleOrdenTrabajo';
import { formatDate } from '../utils/dateUtils';
import { API_BASE_URL } from '../config';

const OrdenesTrabajoList = () => {
    const navigate = useNavigate();
    const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
    const [filteredOrdenes, setFilteredOrdenes] = useState<OrdenTrabajo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTipoOrden, setSelectedTipoOrden] = useState<string>('');
    const [tiposOrden, setTiposOrden] = useState<TipoOrden[]>([]);

    const [showManual, setShowManual] = useState(false);
    const [selectedOrden, setSelectedOrden] = useState<OrdenTrabajo | null>(null);
    const [ordenDetalles, setOrdenDetalles] = useState<DetalleOrdenTrabajo[]>([]);
    const [showViewModal, setShowViewModal] = useState(false);
    const [utilidadOrdenId, setUtilidadOrdenId] = useState<number | null>(null);
    const [printOrdenData, setPrintOrdenData] = useState<{ orden: OrdenTrabajo; detalles: DetalleOrdenTrabajo[] } | null>(null);
    const [isPrintingList, setIsPrintingList] = useState(false);
    const [whatsappOrdenData, setWhatsappOrdenData] = useState<{ orden: OrdenTrabajo; detalles: DetalleOrdenTrabajo[] } | null>(null);
    const whatsappPrintRef = useRef<HTMLDivElement>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchOrdenes();
    }, []);

    useEffect(() => {
        const lowerSearch = searchTerm.toLowerCase();
        const filtered = ordenes.filter(o => {
            const matchesSearch =
                (o.cliente_nombre || o.cliente)?.toLowerCase().includes(lowerSearch) ||
                (o.vehiculo_placa || o.placa)?.toLowerCase().includes(lowerSearch) ||
                (o.marca_auto?.marca || '')?.toLowerCase().includes(lowerSearch) ||
                (o.nro_factura || '')?.toLowerCase().includes(lowerSearch) ||
                String(o.hoja_recepcion?.nro || (o as any).nro_hoja || o.id_hoja_recepcion || o.id).includes(lowerSearch);

            if (!matchesSearch) return false;

            if (selectedTipoOrden) {
                const tipoObj = o.hoja_recepcion?.tipo_orden;
                const tipoId = String(tipoObj?.id || (o.hoja_recepcion as any)?.tipo_orden_id || (o as any).id_tipo_orden || '');
                const tipoNombre = (tipoObj?.tipo_orden || (o.hoja_recepcion as any)?.tipo_orden || (o as any).tipo_orden || 'Particular').toLowerCase();
                const matched = tiposOrden.find(t => String(t.id) === selectedTipoOrden);
                const targetNombre = (matched?.tipo_orden || '').toLowerCase();

                const matchesTipo = tipoId === selectedTipoOrden || (targetNombre && tipoNombre === targetNombre);
                if (!matchesTipo) return false;
            }

            return true;
        });
        setFilteredOrdenes(filtered);
        setCurrentPage(1);
    }, [searchTerm, selectedTipoOrden, ordenes, tiposOrden]);

    const formatPhoneDisplay = (phone?: string): string => {
        if (!phone) return "-";
        const clean = phone.trim();
        if (clean.startsWith("(")) return clean;
        const KNOWN_CODES = [
            "+591", "+595", "+598", "+54", "+55", "+56", "+57", "+51", "+58", "+52", "+34", "+1"
        ];
        for (const code of KNOWN_CODES) {
            if (clean.startsWith(code)) {
                return `(${code}) ${clean.slice(code.length).trim()}`;
            }
        }
        if (/^\d{8}$/.test(clean)) {
            return `(+591) ${clean}`;
        }
        return clean;
    };

    const formatFechaTerminado = (dateStr?: string | Date) => {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "";
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getEstadoBadgeClass = (estado: string, cancelado?: boolean) => {
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
                return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800";
            case "en_proceso":
            case "en proceso":
                return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800";
            case "terminado":
            case "finalizado":
                return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800";
            case "inactivo":
            case "anulado":
            case "anulada":
                return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800";
            case "pendiente":
            default:
                return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800";
        }
    };

    const fetchOrdenes = async () => {
        try {
            setLoading(true);
            const [data, tiposEnHojas] = await Promise.all([
                getOrdenesTrabajo(),
                getTiposOrdenEnHojasRecepcion().catch(() => []),
            ]);
            setOrdenes(data);

            // Consolidar solo los tipos de orden registrados en las órdenes/hojas de recepción
            const tiposMap = new Map<string, { id: string; tipo_orden: string }>();

            tiposEnHojas.forEach((t) => {
                if (t && t.tipo_orden) {
                    tiposMap.set(t.tipo_orden.trim().toLowerCase(), {
                        id: String(t.id),
                        tipo_orden: t.tipo_orden.trim(),
                    });
                }
            });

            data.forEach((o) => {
                const nombre =
                    o.hoja_recepcion?.tipo_orden?.tipo_orden ||
                    (o.hoja_recepcion as any)?.tipo_orden ||
                    (o as any).tipo_orden;
                const id =
                    o.hoja_recepcion?.tipo_orden?.id ||
                    (o.hoja_recepcion as any)?.tipo_orden_id ||
                    (o as any).id_tipo_orden;
                if (nombre && typeof nombre === 'string' && nombre.trim()) {
                    const key = nombre.trim().toLowerCase();
                    if (!tiposMap.has(key)) {
                        tiposMap.set(key, {
                            id: String(id || nombre),
                            tipo_orden: nombre.trim(),
                        });
                    }
                }
            });

            const tiposRegistrados = Array.from(tiposMap.values()).sort((a, b) =>
                a.tipo_orden.localeCompare(b.tipo_orden)
            );
            setTiposOrden(tiposRegistrados as TipoOrden[]);
            setFilteredOrdenes(data);
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar las órdenes de trabajo'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: number, type: 'start' | 'end') => {
        const currentOrden = ordenes.find(o => o.id === id);
        const title = type === 'start' ? 'Iniciar Trabajo' : 'Terminar Trabajo en Taller';
        const label = type === 'start' ? 'Fecha de Inicio' : 'Fecha de Finalización en Taller';

        // Define colors and icons
        const btnColor = type === 'start' ? 'bg-green-600 hover:bg-green-700' : 'bg-emerald-600 hover:bg-emerald-700';
        const btnText = type === 'start' ? 'Iniciar' : 'Terminar en Taller';
        const btnIcon = type === 'start'
            ? '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

        const now = new Date();
        const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

        await Swal.fire({
            title: title,
            html: `
                <div class="flex flex-col gap-4 w-full p-1.5" style="box-sizing: border-box;">
                    <div class="flex flex-col gap-2 text-left w-full">
                        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">${label}</label>
                        <div class="relative flex items-center w-full">
                            <span class="absolute left-3 text-gray-400 pointer-events-none flex items-center">
                               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            </span>
                            <input
                                type="datetime-local"
                                id="swal-date"
                                class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                style="width: 100%; box-sizing: border-box; margin: 0; font-size: 14px; height: 42px;"
                                value="${localIso}"
                            />
                        </div>
                    </div>
                    <div class="flex justify-end gap-2 mt-2">
                        <button id="swal-cancel-btn" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 font-medium flex items-center gap-2">
                            Cancelar
                        </button>
                        <button id="swal-confirm-btn" class="px-4 py-2 ${btnColor} text-white rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 font-medium flex items-center gap-2">
                            ${btnIcon}
                            ${btnText}
                        </button>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: false,
            focusConfirm: false,
            didOpen: () => {
                const confirmBtn = document.getElementById('swal-confirm-btn');
                const cancelBtn = document.getElementById('swal-cancel-btn');
                const dateInput = document.getElementById('swal-date') as HTMLInputElement;

                if (confirmBtn && dateInput) {
                    confirmBtn.addEventListener('click', async () => {
                        const date = dateInput.value;
                        if (date) {
                            Swal.close();
                            const isPaidInFull = Boolean(currentOrden?.cancelado);
                            const newStatus = type === 'start' ? 'en_proceso' : (isPaidInFull ? 'cerrada' : 'terminado');
                            try {
                                const updateData: any = { estado: newStatus, idusuario: "1" };

                                await updateOrdenTrabajo(id, updateData);

                                // Update local state
                                setOrdenes(current => current.map(o => o.id === id ? { ...o, ...updateData } : o));
                                setFilteredOrdenes(current => current.map(o => o.id === id ? { ...o, ...updateData } : o));

                                const statusDisplay = newStatus === 'cerrada'
                                    ? 'Orden Cerrada'
                                    : (newStatus === 'terminado' ? 'Terminado en Taller' : 'En Proceso');

                                await Swal.fire({
                                    icon: 'success',
                                    title: '¡Actualizado!',
                                    text: `La orden ha pasado a estado: ${statusDisplay}`,
                                    timer: 1500,
                                    showConfirmButton: false
                                });
                            } catch (error) {
                                console.error(error);
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: 'No se pudo actualizar el estado de la orden'
                                });
                            }
                        }
                    });
                }

                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        Swal.close();
                    });
                }
            }
        });
    };

    const handleEntregarConSaldo = async (item: OrdenTrabajo) => {
        const saldoPendiente = Number(item.saldo !== undefined ? item.saldo : (Number(item.total || 0) - Number(item.total_pagado || 0)));
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
                        El vehículo será entregado al cliente y saldrá del taller antes de liquidar el saldo pendiente.
                    </p>
                    <div class="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs space-y-1.5">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Orden de Trabajo:</span>
                            <span class="font-bold text-gray-900 dark:text-white">OT #${item.id}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Vehículo:</span>
                            <span class="font-bold text-indigo-700 dark:text-indigo-300">${item.vehiculo_placa || 'S/P'} (${item.vehiculo_modelo || ''})</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Cliente:</span>
                            <span class="font-medium text-gray-900 dark:text-white">${item.cliente_nombre || 'N/A'}</span>
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
                            id="swal-fecha-entrega"
                            class="w-full px-3 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500"
                            value="${defaultDateTime}"
                        />
                    </div>
                    <div class="flex justify-end gap-2 mt-4">
                        <button id="swal-entrega-cancel" class="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                            Cancelar
                        </button>
                        <button id="swal-entrega-confirm" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-md transition-all">
                            Confirmar Entrega
                        </button>
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: false,
            focusConfirm: false,
            didOpen: () => {
                const confirmBtn = document.getElementById('swal-entrega-confirm');
                const cancelBtn = document.getElementById('swal-entrega-cancel');
                const dateInput = document.getElementById('swal-fecha-entrega') as HTMLInputElement;

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

                            await updateOrdenTrabajo(item.id, updateData);

                            setOrdenes(current => current.map(o => o.id === item.id ? { ...o, ...updateData } : o));
                            setFilteredOrdenes(current => current.map(o => o.id === item.id ? { ...o, ...updateData } : o));

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



    const handleDelete = async (id: number) => {
        const { value: motivo, isConfirmed } = await Swal.fire({
            title: '¿Anular Orden de Trabajo?',
            text: 'Por favor, ingrese el motivo de la anulación:',
            input: 'textarea',
            inputPlaceholder: 'Ej: Cliente canceló el servicio, cambio de presupuesto, etc.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, anular orden',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'Debe ingresar un motivo para anular la orden';
                }
                return null;
            }
        });

        if (isConfirmed && motivo) {
            try {
                await deleteOrdenTrabajo(id, motivo.trim());
                setOrdenes(current => current.map(o => o.id === id ? { ...o, estado: 'anulada', motivo_anulacion: motivo.trim() } : o));
                setFilteredOrdenes(current => current.map(o => o.id === id ? { ...o, estado: 'anulada', motivo_anulacion: motivo.trim() } : o));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Orden Anulada!',
                    text: 'La orden ha sido anulada exitosamente.',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                console.error(error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo anular la orden'
                });
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar orden?',
            text: 'La orden volverá a estar en proceso.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await reactivateOrdenTrabajo(id);
                setOrdenes(current => current.map(o => o.id === id ? { ...o, estado: 'en_proceso', motivo_anulacion: undefined } : o));
                setFilteredOrdenes(current => current.map(o => o.id === id ? { ...o, estado: 'en_proceso', motivo_anulacion: undefined } : o));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Reactivada!',
                    text: 'Orden reactivada exitosamente.',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                console.error(error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar la orden'
                });
            }
        }
    };

    const handleAbrirOrden = async (id: number) => {
        const previousSearchTerm = searchTerm;
        const { value: code } = await Swal.fire({
            title: 'Abrir Orden de Trabajo',
            html: `
                <div class="flex flex-col gap-3 text-left p-1">
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        Esta orden se encuentra en estado <strong>Terminado en Taller</strong> u <strong>Orden Cerrada</strong>.
                    </p>
                    <p class="text-sm text-gray-600 dark:text-gray-300">
                        Para abrir la orden y habilitar los botones de <strong>Edición</strong> y <strong>Eliminación / Anulación</strong>, ingrese el código de autorización de 4 dígitos:
                    </p>
                    <div class="flex justify-center my-2">
                        <input
                            type="tel"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            id="swal-input-auth-code"
                            maxlength="4"
                            placeholder="••••"
                            name="auth_pin_code_field"
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
                const input = document.getElementById('swal-input-auth-code') as HTMLInputElement;
                if (input) {
                    input.focus();
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            Swal.clickConfirm();
                        }
                    });
                }
            },
            preConfirm: () => {
                const input = document.getElementById('swal-input-auth-code') as HTMLInputElement;
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
            },
            didClose: () => {
                // Ensure browser password managers don't pollute the search field
                setSearchTerm(previousSearchTerm);
            }
        });

        // Extra guard: restore previous search in case browser autofill injected credentials
        setSearchTerm(previousSearchTerm);

        if (code) {
            try {
                await updateOrdenTrabajo(id, { estado: 'en_proceso' });
                setOrdenes(current => current.map(o => o.id === id ? { ...o, estado: 'en_proceso' } : o));
                setFilteredOrdenes(current => current.map(o => o.id === id ? { ...o, estado: 'en_proceso' } : o));

                await Swal.fire({
                    icon: 'success',
                    title: '¡Orden Abierta!',
                    text: 'La orden ha sido abierta correctamente. Los botones de editar y eliminar han sido habilitados.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Error al abrir la orden:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo abrir la orden de trabajo.'
                });
            }
        }
    };

    const handleViewOrder = async (id: number) => {
        try {
            const [ordenData, detallesData] = await Promise.all([
                getOrdenTrabajo(id),
                getDetallesByOrden(id)
            ]);
            setSelectedOrden(ordenData);
            setOrdenDetalles(detallesData);
            setPrintOrdenData({ orden: ordenData, detalles: detallesData });
            setShowViewModal(true);
        } catch (error) {
            console.error('Error loading order:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo cargar la orden'
            });
        }
    };

    const handleSendWhatsApp = async (id: number, phoneNumber: string) => {
        try {
            // Confirm phone number with user
            const result = await Swal.fire({
                title: 'Enviar por WhatsApp',
                html: `
                    <div class="text-left">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Número de teléfono del cliente:
                        </label>
                        <input 
                            type="text" 
                            id="swal-phone" 
                            class="swal2-input" 
                            value="${phoneNumber}" 
                            placeholder="Ej: 59170000000"
                        />
                        <p class="text-xs text-gray-500 mt-2">
                            El PDF de la orden de trabajo será enviado a este número.
                        </p>
                    </div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#25D366',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '<i class="fab fa-whatsapp"></i> Enviar',
                cancelButtonText: 'Cancelar',
                preConfirm: () => {
                    const phone = (document.getElementById('swal-phone') as HTMLInputElement).value;
                    if (!phone) {
                        Swal.showValidationMessage('Ingrese un número de teléfono');
                        return false;
                    }
                    return phone;
                }
            });

            if (!result.isConfirmed || !result.value) return;

            const confirmedPhone = result.value;

            // Show loading
            Swal.fire({
                title: 'Generando PDF...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                showConfirmButton: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Fetch order data
            const ordenData = await getOrdenTrabajo(id);
            const detallesData = await getDetallesByOrden(id);

            // Renderizar la vista de impresión fuera de pantalla para capturarla idéntica
            setWhatsappOrdenData({ orden: ordenData, detalles: detallesData });

            await new Promise<void>((resolve) => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, 450);
                });
            });

            const element = whatsappPrintRef.current;
            if (!element) {
                throw new Error("No se pudo renderizar la vista de impresión");
            }

            // Esperar a que carguen imágenes
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

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 6;
            const maxWidth = pageWidth - margin * 2;
            const maxHeight = pageHeight - margin * 2;

            const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
            const renderWidth = canvas.width * ratio;
            const renderHeight = canvas.height * ratio;
            const offsetX = (pageWidth - renderWidth) / 2;

            doc.addImage(imgData, "JPEG", offsetX, margin, renderWidth, renderHeight);

            // Convert PDF to blob
            const pdfBlob = doc.output('blob');

            // Send to backend
            Swal.update({
                title: 'Enviando por WhatsApp...',
                text: 'Por favor espere',
                showConfirmButton: false,
            });
            Swal.showLoading();

            const nroDoc = String(ordenData.hoja_recepcion?.nro || (ordenData as any).nro_hoja || ordenData.id_hoja_recepcion || ordenData.id).padStart(6, '0');
            const placaSlug = (ordenData.placa || ordenData.hoja_recepcion?.vehiculo_placa || "SIN_PLACA").replace(/[^a-zA-Z0-9_-]/g, "");

            const formData = new FormData();
            formData.append('file', pdfBlob, `Orden_Trabajo_${nroDoc}_${placaSlug}.pdf`);
            formData.append('phoneNumber', confirmedPhone);
            formData.append('caption', `Orden de Trabajo N° ${nroDoc} - ${ordenData.cliente || ordenData.hoja_recepcion?.cliente_nombre || ''}`);

            const response = await fetch(`${API_BASE_URL}/chatbot/send-document`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to send document');
            }

            await Swal.fire({
                icon: 'success',
                title: '¡Enviado!',
                text: 'El PDF ha sido enviado por WhatsApp exitosamente',
                timer: 2000,
                showConfirmButton: false
            });

        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo enviar el PDF por WhatsApp. Verifique que el bot esté conectado.'
            });
        } finally {
            setWhatsappOrdenData(null);
        }
    };


    const handlePrintOrder = async (id: number) => {
        try {
            const [ordenData, detallesData] = await Promise.all([
                getOrdenTrabajo(id),
                getDetallesByOrden(id)
            ]);
            setIsPrintingList(false);
            setPrintOrdenData({ orden: ordenData, detalles: detallesData });
            setTimeout(() => {
                window.print();
            }, 300);
        } catch (error) {
            console.error('Error printing order:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo preparar la impresión de la orden'
            });
        }
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredOrdenes.map(o => ({
            'N° Orden': String(o.hoja_recepcion?.nro || (o as any).nro_hoja || o.id_hoja_recepcion || o.id).padStart(6, '0'),
            'Tipo Orden': o.hoja_recepcion?.tipo_orden?.tipo_orden || (o.hoja_recepcion as any)?.tipo_orden || 'Particular',
            'Fecha': new Date(o.fecha_registro).toLocaleDateString(),
            'Placa': o.vehiculo_placa || o.placa,
            'Marca': o.marca_auto?.marca || '',
            'Modelo': o.vehiculo_modelo || o.modelo || '',
            'Color': o.vehiculo_color || o.color || '',
            'Cliente': o.cliente_nombre || o.cliente,
            'Teléfono': o.cliente_telefono || o.celular || '',
            'Total': o.total,
            'Estado': o.estado
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "OrdenesTrabajo");
        XLSX.writeFile(workbook, `OrdenesTrabajo_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const loadImageAsBase64 = (url: string): Promise<string | null> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0);
                        resolve(canvas.toDataURL('image/jpeg', 0.95));
                    } else {
                        resolve(null);
                    }
                } catch {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    const exportToPDF = async () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'letter'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 12;

        // Intentar cargar logo del taller
        const logoBase64 = await loadImageAsBase64('/logo.jpg');
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'JPEG', margin, 8, 30, 16);
            } catch {
                // Silently fallback if error adding image
            }
        }

        // Título y encabezado institucional
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text('REPORTE DE ÓRDENES DE TRABAJO', pageWidth / 2, 13, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105); // Slate-600
        doc.text('EDKOR MOTORS - CONTROL Y GESTIÓN DE TALLER', pageWidth / 2, 18, { align: 'center' });

        if (searchTerm || selectedTipoOrden) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            const matchedTipo = tiposOrden.find(t => String(t.id) === selectedTipoOrden);
            const tipoNombreLabel = matchedTipo ? matchedTipo.tipo_orden : selectedTipoOrden;
            const filtroTexto = `Filtros: ${selectedTipoOrden ? `Tipo: ${tipoNombreLabel}` : ''} ${searchTerm ? `| Búsqueda: "${searchTerm}"` : ''}`;
            doc.text(filtroTexto, pageWidth / 2, 22, { align: 'center' });
        }

        // Datos del reporte (a la derecha)
        const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaHoy = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(`Total Órdenes: ${filteredOrdenes.length}`, pageWidth - margin, 11, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Fecha: ${fechaHoy}`, pageWidth - margin, 15, { align: 'right' });
        doc.text(`Hora: ${horaHoy}`, pageWidth - margin, 19, { align: 'right' });

        // Línea divisoria
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.5);
        doc.line(margin, 25, pageWidth - margin, 25);

        // Calcular total acumulado
        const totalMonto = filteredOrdenes.reduce((acc, curr) => acc + Number(curr.total || 0), 0);

        // Tabla con formato tipo lista impresa
        autoTable(doc, {
            startY: 28,
            head: [['#', 'N° Orden', 'Tipo Orden', 'Fecha', 'Placa', 'Vehículo', 'Cliente', 'Teléfono', 'Estado', 'Total']],
            body: filteredOrdenes.map((o, index) => [
                index + 1,
                String(o.hoja_recepcion?.nro || (o as any).nro_hoja || o.id_hoja_recepcion || o.id).padStart(6, '0'),
                o.hoja_recepcion?.tipo_orden?.tipo_orden || (o.hoja_recepcion as any)?.tipo_orden || 'Particular',
                new Date(o.fecha_registro).toLocaleDateString('es-ES'),
                o.vehiculo_placa || o.placa || '-',
                `${o.marca_auto?.marca || ''} ${o.vehiculo_modelo || o.modelo || ''}`.trim() || '-',
                o.cliente_nombre || o.cliente || '-',
                o.cliente_telefono || o.celular || '-',
                (o.estado || '').toUpperCase(),
                `${o.moneda?.toLowerCase() === 'dolares' ? '$us' : 'Bs'} ${Number(o.total || 0).toFixed(2)}`
            ]),
            foot: [
                [
                    { content: `TOTAL ACUMULADO (${filteredOrdenes.length} ÓRDENES):`, colSpan: 9, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `Bs ${totalMonto.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] } }
                ]
            ],
            theme: 'grid',
            headStyles: {
                fillColor: [241, 245, 249], // Slate-100
                textColor: [30, 41, 59], // Slate-800
                fontStyle: 'bold',
                fontSize: 7.5,
                halign: 'left',
                lineColor: [203, 213, 225],
                lineWidth: 0.2
            },
            bodyStyles: {
                fontSize: 7,
                textColor: [15, 23, 42],
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [30, 41, 59],
                fontSize: 8,
                lineColor: [148, 163, 184],
                lineWidth: 0.3
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate-50
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
                2: { cellWidth: 26 },
                3: { halign: 'center', cellWidth: 20 },
                4: { halign: 'center', fontStyle: 'bold', cellWidth: 18 },
                5: { cellWidth: 38 },
                6: { cellWidth: 'auto' },
                7: { cellWidth: 24, fontSize: 6.5 },
                8: { halign: 'center', fontStyle: 'bold', cellWidth: 24, fontSize: 6.5 },
                9: { halign: 'right', fontStyle: 'bold', cellWidth: 26 }
            },
            margin: { left: margin, right: margin },
            didDrawPage: (data) => {
                // Pie de página
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                const pageNumber = `Página ${data.pageNumber}`;
                doc.text('Sistema de Gestión de Taller EDKOR MOTORS', margin, doc.internal.pageSize.getHeight() - 6);
                doc.text(pageNumber, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
            }
        });

        doc.save(`OrdenesTrabajo_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const printList = () => {
        setPrintOrdenData(null);
        setIsPrintingList(true);
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Órdenes de Trabajo',
            content: 'Consulte, filtre y gestione todas las órdenes de trabajo del taller en sus distintos estados (Pendiente, En Proceso, Terminado, Entregado, Cerrado, etc.).'
        },
        {
            title: 'Filtros y Búsqueda',
            content: 'Utilice el buscador general (por cliente, placa o marca) y el filtro desplegable por "Tipo de Orden" (Particular, Seguros, etc.). Ambos filtros aplican automáticamente en la pantalla y se respetan al exportar a Excel, PDF o Imprimir.'
        },
        {
            title: 'Nueva Orden de Trabajo',
            content: 'Haga clic en "+ Nueva Orden" para abrir el formulario de creación manual o derivar una orden directamente desde una Hoja de Recepción registrada.'
        },
        {
            title: 'Exportación e Impresión del Listado',
            content: 'Exporte la lista completa filtrada a Excel (.xlsx), genere un documento formal en PDF en orientación horizontal con el logo institucional o imprima directamente el reporte en papel.'
        },
        {
            title: 'Acciones por Orden',
            content: 'En cada fila puede Iniciar trabajo, Ver detalles, Ver reporte de Utilidad de la OT, Imprimir la orden de trabajo individual en formato oficial, enviar por WhatsApp al cliente y editar/desactivar la orden según su estado.'
        }
    ];

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredOrdenes.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredOrdenes.length / itemsPerPage);

    if (loading) return <div>Cargando...</div>;

    return (
        <>
        <div className="container mx-auto relative min-h-screen print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <ClipboardList className="text-blue-600" size={32} />
                        Órdenes de Trabajo
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona los trabajos y servicios del taller</p>
                </div>

                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={printList}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual de Orden de Trabajo"
                >
                    <button
                        onClick={() => navigate('/ordenes-trabajo/create')}
                        className="bg-[#3498db] hover:bg-[#2980b9] text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium text-xs sm:text-sm"
                    >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Nueva Orden
                    </button>
                </StandardExportToolbar>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3 no-print">
                <div className="relative w-full md:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        name="search_filter_ot_field"
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        placeholder="Buscar por cliente, placa o marca..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="w-full sm:w-auto">
                    <select
                        value={selectedTipoOrden}
                        onChange={(e) => setSelectedTipoOrden(e.target.value)}
                        className="w-full sm:w-56 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all text-sm cursor-pointer"
                    >
                        <option value="">Todos los Tipos de Orden</option>
                        {tiposOrden.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.tipo_orden}
                            </option>
                        ))}
                    </select>
                </div>

                {(searchTerm || selectedTipoOrden) && (
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedTipoOrden('');
                        }}
                        className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors border border-red-200 dark:border-red-800 flex items-center gap-1 cursor-pointer"
                        title="Limpiar filtros"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>Limpiar filtros</span>
                    </button>
                )}
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
                Mostrando {filteredOrdenes.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredOrdenes.length)} de {filteredOrdenes.length} registros
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">#</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">N° Orden</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tipo Orden</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fecha</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Placa</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehículo</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cliente</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right no-print">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {currentItems.map((item, index) => (
                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                                        {indexOfFirstItem + index + 1}
                                    </td>
                                    <td className="p-4 text-blue-600 dark:text-blue-400 font-bold text-sm">
                                        {String(item.hoja_recepcion?.nro || (item as any).nro_hoja || item.id_hoja_recepcion || item.id).padStart(6, '0')}
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                                        {(() => {
                                            const tipo = item.hoja_recepcion?.tipo_orden?.tipo_orden || (item.hoja_recepcion as any)?.tipo_orden || 'Particular';
                                            const isSeguro = String(tipo).toLowerCase().includes('seguro');
                                            return (
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                    isSeguro
                                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                                }`}>
                                                    {tipo}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">{new Date(item.fecha_registro).toLocaleDateString()}</td>
                                    <td className="p-4 text-gray-800 dark:text-gray-200 font-mono font-bold uppercase text-sm">{(item.vehiculo_placa || item.placa || 'S/P').toUpperCase()}</td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                {item.marca_auto?.marca || 'N/A'}
                                            </span>
                                            <span className="text-gray-400 text-xs">
                                                {item.vehiculo_modelo || item.modelo || ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200 font-medium text-sm">
                                        {item.cliente_nombre || item.cliente}
                                        <div className="text-xs text-gray-400 font-normal font-mono">
                                            {formatPhoneDisplay(item.cliente_telefono || item.celular)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200 font-semibold text-sm whitespace-nowrap">
                                        <div className="leading-tight">
                                            {item.moneda?.toLowerCase() === 'bolivianos' ? 'Bs' : '$us'} {Number(item.total).toFixed(2)}
                                        </div>
                                        <div className="mt-1 flex items-center">
                                            {item.facturado ? (
                                                <span
                                                    className="whitespace-nowrap inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800"
                                                    title={item.fecha_facturado ? `Fecha Factura: ${formatDate(item.fecha_facturado)}` : undefined}
                                                >
                                                    <ReceiptText size={10} className="shrink-0 text-blue-600 dark:text-blue-400" />
                                                    <span>Fact: {item.nro_factura || 'S/N'}</span>
                                                </span>
                                            ) : (
                                                <span className="whitespace-nowrap inline-flex items-center text-[9.5px] font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                                    Sin facturar
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div className="flex flex-col items-start gap-1">
                                            {(() => {
                                                const est = (item.estado || '').toLowerCase();
                                                const isAnulada = est === 'inactivo' || est === 'anulado' || est === 'anulada';
                                                const isCerrada = est === 'cerrada' || est === 'orden_cerrada' || est === 'orden cerrada' || (Boolean(item.cancelado) && (est === 'terminado' || est === 'finalizado'));
                                                const isEntregado = !isCerrada && (est === 'entregado' || est === 'entregado_con_saldo' || est === 'entregado con saldo' || est === 'entregado_por_pagar' || est === 'entregado por pagar');
                                                const isTerminado = !isCerrada && !isEntregado && (est === 'terminado' || est === 'finalizado');

                                                let estadoLabel = item.estado.replace('_', ' ');
                                                if (isAnulada) {
                                                    estadoLabel = 'Anulada';
                                                } else if (isCerrada) {
                                                    estadoLabel = 'Orden Cerrada';
                                                } else if (isEntregado) {
                                                    estadoLabel = 'Entregado por Pagar';
                                                } else if (isTerminado) {
                                                    estadoLabel = 'Terminado en Taller';
                                                }

                                                return (
                                                    <>
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getEstadoBadgeClass(item.estado, item.cancelado)}`}>
                                                            {estadoLabel}
                                                        </span>
                                                        {isEntregado && item.fecha_entrega && (
                                                            <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1" title="Fecha de Entrega al Cliente">
                                                                <KeyRound size={12} className="text-indigo-500" />
                                                                {new Date(item.fecha_entrega).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                        {isCerrada && (
                                                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1" title="Fecha de Pago Total / Cierre de Orden">
                                                                <CheckCircle size={12} className="text-emerald-500" />
                                                                {formatDate(item.fecha_cancelado || item.fecha_terminado || item.fecha_registro)}
                                                            </span>
                                                        )}
                                                        {isTerminado && (
                                                            <span className="text-[11px] font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1" title="Fecha de Término de Trabajos en Taller">
                                                                <Calendar size={12} className="text-purple-500" />
                                                                {formatDate(item.fecha_terminado || item.fecha_registro)}
                                                            </span>
                                                        )}
                                                        {isAnulada && item.motivo_anulacion && (
                                                            <span
                                                                className="text-[11px] text-red-500 dark:text-red-400 font-normal italic max-w-[140px] truncate"
                                                                title={`Motivo: ${item.motivo_anulacion}`}
                                                            >
                                                                Motivo: {item.motivo_anulacion}
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="p-4 flex gap-2 justify-end no-print">
                                        {item.estado === 'pendiente' && (
                                            <button
                                                onClick={() => handleStatusChange(item.id, 'start')}
                                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                                title="Iniciar Trabajo (Poner en Proceso)"
                                            >
                                                <Timer size={16} />
                                            </button>
                                        )}
                                        {item.estado === 'en_proceso' && (
                                            <button
                                                onClick={() => handleStatusChange(item.id, 'end')}
                                                className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                                title="Terminar Trabajo en Taller"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                        )}
                                        {(() => {
                                            const est = (item.estado || '').toLowerCase();
                                            const isTerm = est === 'terminado' || est === 'finalizado';
                                            if (isTerm && !item.cancelado) {
                                                return (
                                                    <button
                                                        onClick={() => handleEntregarConSaldo(item)}
                                                        className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                                        title="Entregar Vehículo al Cliente (por Pagar)"
                                                    >
                                                        <KeyRound size={16} />
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })()}
                                        <button
                                            onClick={() => handleViewOrder(item.id)}
                                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                            title="Ver Orden de Trabajo"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={() => setUtilidadOrdenId(item.id)}
                                            className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                            title="Ver Utilidad Neta del Trabajo"
                                        >
                                            <TrendingUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => handlePrintOrder(item.id)}
                                            className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                            title="Imprimir Detalle"
                                        >
                                            <Printer size={16} />
                                        </button>
                                        {(item.cliente_telefono || item.celular) && (
                                            <button
                                                onClick={() => handleSendWhatsApp(item.id, item.cliente_telefono || item.celular || '')}
                                                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Enviar por WhatsApp"
                                            >
                                                <MessageCircle size={16} />
                                            </button>
                                        )}
                                        {(() => {
                                            const est = (item.estado || '').toLowerCase();
                                            const isAnulada = est === 'inactivo' || est === 'anulado' || est === 'anulada';
                                            const isCerrada = est === 'cerrada' || est === 'orden_cerrada' || est === 'orden cerrada' || (Boolean(item.cancelado) && (est === 'terminado' || est === 'finalizado'));
                                            const isEntregado = !isCerrada && (est === 'entregado' || est === 'entregado_con_saldo' || est === 'entregado con saldo' || est === 'entregado_por_pagar' || est === 'entregado por pagar');
                                            const isTerminado = !isCerrada && !isEntregado && (est === 'terminado' || est === 'finalizado');
                                            const isBlockedEdit = isTerminado || isCerrada || isAnulada || isEntregado;

                                            return (
                                                <>
                                                    {(isTerminado || isCerrada || isEntregado) && (
                                                        <button
                                                            onClick={() => handleAbrirOrden(item.id)}
                                                            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                                            title="Abrir Orden (Código de autorización)"
                                                        >
                                                            <Unlock size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => !isBlockedEdit && navigate(`/ordenes-trabajo/edit/${item.id}`)}
                                                        disabled={isBlockedEdit}
                                                        className={`p-2 rounded-lg shadow-sm transition-all ${
                                                            isBlockedEdit
                                                                ? "bg-gray-200 dark:bg-gray-700/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                                                : "bg-amber-400 hover:bg-amber-500 text-white transform hover:-translate-y-0.5 cursor-pointer"
                                                        }`}
                                                        title={
                                                            isCerrada
                                                                ? "Orden cerrada: edición bloqueada"
                                                                : isEntregado
                                                                ? "Vehículo entregado por pagar: edición bloqueada"
                                                                : isTerminado
                                                                ? "Orden terminada en taller: edición bloqueada"
                                                                : isAnulada
                                                                ? "Orden anulada: edición bloqueada"
                                                                : "Editar / Confirmar Trabajos y Mecánicos"
                                                        }
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    {!isAnulada ? (
                                                        <button
                                                            onClick={() => !(isTerminado || isCerrada || isEntregado) && handleDelete(item.id)}
                                                            disabled={isTerminado || isCerrada || isEntregado}
                                                            className={`p-2 rounded-lg shadow-sm transition-all ${
                                                                isTerminado || isCerrada || isEntregado
                                                                    ? "bg-gray-200 dark:bg-gray-700/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                                                    : "bg-red-500 hover:bg-red-600 text-white transform hover:-translate-y-0.5 cursor-pointer"
                                                            }`}
                                                            title={
                                                                isCerrada
                                                                    ? "Orden cerrada: no se puede anular"
                                                                    : isEntregado
                                                                    ? "Vehículo entregado: no se puede anular"
                                                                    : isTerminado
                                                                    ? "Orden terminada en taller: no se puede anular"
                                                                    : "Anular Orden"
                                                            }
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleReactivate(item.id)}
                                                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                                            title="Reactivar Orden de Trabajo"
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </td>
                                </tr>
                            ))}
                            {filteredOrdenes.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="font-medium">
                                                {searchTerm ? 'No se encontraron resultados' : 'No hay órdenes de trabajo registradas'}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            {showViewModal && (
                <ViewOrdenModal
                    orden={selectedOrden}
                    detalles={ordenDetalles}
                    onClose={() => setShowViewModal(false)}
                />
            )}

            {utilidadOrdenId !== null && (
                <UtilidadOrdenModal
                    ordenId={utilidadOrdenId}
                    onClose={() => setUtilidadOrdenId(null)}
                />
            )}

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Órdenes de Trabajo"
                sections={manualSections}
            />
        </div>

        {/* Print View Orden de Trabajo Individual (mostrado al imprimir una orden) */}
        {!isPrintingList && printOrdenData && (
            <div className="hidden print:block w-full bg-white text-black">
                <OrdenTrabajoPrintView orden={printOrdenData.orden} detalles={printOrdenData.detalles} />
            </div>
        )}

        {/* Print View Lista de Órdenes de Trabajo (mostrado al hacer clic en Imprimir lista) */}
        {isPrintingList && (
            <div className="hidden print:block w-full bg-white text-black">
                <OrdenesTrabajoListPrintView
                    ordenes={filteredOrdenes}
                    searchTerm={searchTerm}
                    selectedTipoOrden={tiposOrden.find(t => String(t.id) === selectedTipoOrden)?.tipo_orden || selectedTipoOrden}
                />
            </div>
        )}

        {/* Offscreen Print Container para generar PDF idéntico al de impresión para WhatsApp */}
        {whatsappOrdenData && (
            <div
                style={{
                    position: "fixed",
                    left: "-99999px",
                    top: 0,
                    width: "850px",
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    zIndex: -1,
                }}
            >
                <div ref={whatsappPrintRef} className="bg-white text-black">
                    <OrdenTrabajoPrintView orden={whatsappOrdenData.orden} detalles={whatsappOrdenData.detalles} />
                </div>
            </div>
        )}
        </>
    );
};

export default OrdenesTrabajoList;
