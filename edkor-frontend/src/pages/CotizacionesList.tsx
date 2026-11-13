import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, FileText, MessageCircle, Pencil, Trash2, Plus, CheckCircle, X } from 'lucide-react';
import type { Cotizacion } from '../types/cotizacion';
import { getCotizaciones, getCotizacion, deleteCotizacion } from '../services/cotizacionesService';
import { getTiposOrdenEnHojasRecepcion } from '../services/tipoOrdenService';
import type { TipoOrden } from '../types/tipoOrden';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { useRef } from 'react';
import Pagination from '../components/Pagination';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import CotizacionPrintView from '../components/CotizacionPrintView';
import { CotizacionesListPrintView } from '../components/CotizacionesListPrintView';
import { API_BASE_URL } from '../config';

const formatPhoneDisplay = (phone?: string | null): string => {
    if (!phone) return "-";
    const clean = phone.trim();
    if (clean.startsWith("(")) return clean;
    const KNOWN_CODES = [
        "+591", "+595", "+598", "+54", "+55", "+56", "+57", "+51", "+58", "+52", "+34", "+1"
    ];
    for (const code of KNOWN_CODES) {
        if (clean.startsWith(code)) {
            const rest = clean.slice(code.length).trim();
            return `(${code}) ${rest}`;
        }
    }
    if (/^\d{8}$/.test(clean)) return `(+591) ${clean}`;
    return clean;
};

const CotizacionesList = () => {
    const navigate = useNavigate();
    const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
    const [filteredCotizaciones, setFilteredCotizaciones] = useState<Cotizacion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTipoOrden, setSelectedTipoOrden] = useState<string>('');
    const [tiposOrden, setTiposOrden] = useState<TipoOrden[]>([]);
    const [printCotizacionData, setPrintCotizacionData] = useState<Cotizacion | null>(null);
    const [isPrintingList, setIsPrintingList] = useState(false);
    const [whatsappCotizacionData, setWhatsappCotizacionData] = useState<Cotizacion | null>(null);
    const whatsappPrintRef = useRef<HTMLDivElement>(null);

    const [showManual, setShowManual] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchCotizaciones();
    }, []);

    useEffect(() => {
        const lowerSearch = searchTerm.toLowerCase();
        const filtered = cotizaciones.filter(c => {
            const cliente = c.cliente_nombre || c.cliente || '';
            const placa = c.vehiculo_placa || c.placa || '';
            const marca = c.marca_auto?.marca || c.vehiculo_marca || '';
            const modelo = c.vehiculo_modelo || c.modelo || '';
            const tipo = c.tipo_orden?.tipo_orden || c.hoja_recepcion?.tipo_orden?.tipo_orden || (c as any).tipo_orden || '';
            const nro = String(c.id);
            const matchesSearch = cliente.toLowerCase().includes(lowerSearch) ||
                placa.toLowerCase().includes(lowerSearch) ||
                marca.toLowerCase().includes(lowerSearch) ||
                modelo.toLowerCase().includes(lowerSearch) ||
                tipo.toLowerCase().includes(lowerSearch) ||
                nro.includes(lowerSearch);

            if (!matchesSearch) return false;

            if (selectedTipoOrden) {
                const tipoObj = c.tipo_orden || c.hoja_recepcion?.tipo_orden;
                const tipoId = String(tipoObj?.id || (c as any).id_tipo_orden || (c as any).tipo_orden_id || '');
                const tipoNombre = (tipoObj?.tipo_orden || (c as any).tipo_orden || 'Particular').toLowerCase();
                const matched = tiposOrden.find(t => String(t.id) === selectedTipoOrden);
                const targetNombre = (matched?.tipo_orden || '').toLowerCase();

                const matchesTipo = tipoId === selectedTipoOrden || (targetNombre && tipoNombre === targetNombre);
                if (!matchesTipo) return false;
            }

            return true;
        });
        setFilteredCotizaciones(filtered);
        setCurrentPage(1);
    }, [searchTerm, selectedTipoOrden, cotizaciones, tiposOrden]);

    const fetchCotizaciones = async () => {
        try {
            setLoading(true);
            const [data, tiposData] = await Promise.all([
                getCotizaciones(),
                getTiposOrdenEnHojasRecepcion().catch(() => [])
            ]);
            setCotizaciones(data);
            setFilteredCotizaciones(data);
            setTiposOrden(tiposData);
        } catch (error) {
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudieron cargar las cotizaciones'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Eliminar cotización?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await deleteCotizacion(id);
                setCotizaciones(cotizaciones.filter(c => c.id !== id));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Eliminado!',
                    text: 'Cotización eliminada exitosamente.',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo eliminar la cotización'
                });
            }
        }
    };

    const handlePrintCotizacion = async (id: number) => {
        try {
            const fullCotizacion = await getCotizacion(id);
            setIsPrintingList(false);
            setPrintCotizacionData(fullCotizacion);
            setTimeout(() => {
                window.print();
            }, 300);
        } catch (error) {
            console.error('Error al preparar impresión:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo preparar la impresión de la cotización'
            });
        }
    };

    const handleSendWhatsApp = async (cotizacion: Cotizacion) => {
        try {
            const telefono = cotizacion.cliente_telefono || cotizacion.celular;
            if (!telefono) {
                Swal.fire('Error', 'Esta cotización no tiene número de celular registrado', 'error');
                return;
            }

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
                            value="${telefono}" 
                            placeholder="Ej: 59170000000"
                        />
                        <p class="text-xs text-gray-500 mt-2">
                            El PDF de la cotización será enviado a este número.
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

            // Cargar datos completos si es necesario
            const fullCotizacion = await getCotizacion(cotizacion.id);

            // Renderizar la vista de impresión fuera de pantalla para capturarla idéntica
            setWhatsappCotizacionData(fullCotizacion);

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

            const nroDoc = String(cotizacion.id).padStart(6, '0');
            const placaSlug = (cotizacion.vehiculo_placa || cotizacion.placa || "SIN_PLACA").replace(/[^a-zA-Z0-9_-]/g, "");

            const formData = new FormData();
            formData.append('file', pdfBlob, `Cotizacion_${nroDoc}_${placaSlug}.pdf`);
            formData.append('phoneNumber', confirmedPhone);
            formData.append('caption', `Cotización N° ${nroDoc} - ${cotizacion.cliente_nombre || cotizacion.cliente || ''}`);

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
            setWhatsappCotizacionData(null);
        }
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

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredCotizaciones.map((c, index) => ({
            '#': index + 1,
            'N° Cotización': String(c.id).padStart(6, '0'),
            'Tipo Orden': c.tipo_orden?.tipo_orden || c.hoja_recepcion?.tipo_orden?.tipo_orden || (c as any).tipo_orden || 'Particular',
            'Fecha': new Date(c.fecha_registro).toLocaleDateString(),
            'Placa': (c.vehiculo_placa || c.placa || 'S/P').toUpperCase(),
            'Vehículo': `${c.marca_auto?.marca || c.vehiculo_marca || ''} ${c.vehiculo_modelo || c.modelo || ''}`.trim(),
            'Cliente': c.cliente_nombre || c.cliente || '',
            'Teléfono': c.cliente_telefono || (c as any).celular || '',
            'Total': c.total,
            'Moneda': c.moneda || 'Bolivianos',
            'Estado': c.estado
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cotizaciones");
        XLSX.writeFile(workbook, `Cotizaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'letter'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 12;

        const logoBase64 = await loadImageAsBase64('/logo.jpg');
        if (logoBase64) {
            try {
                doc.addImage(logoBase64, 'JPEG', margin, 8, 30, 16);
            } catch {
                // Silently fallback if error
            }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('REPORTE DE COTIZACIONES / PRESUPUESTOS', pageWidth / 2, 13, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
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

        const fechaHoy = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaHoy = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(`Total Cotizaciones: ${filteredCotizaciones.length}`, pageWidth - margin, 11, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Fecha: ${fechaHoy}`, pageWidth - margin, 15, { align: 'right' });
        doc.text(`Hora: ${horaHoy}`, pageWidth - margin, 19, { align: 'right' });

        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.5);
        doc.line(margin, 25, pageWidth - margin, 25);

        const totalMonto = filteredCotizaciones.reduce((acc, curr) => acc + Number(curr.total || 0), 0);

        autoTable(doc, {
            startY: 28,
            head: [['#', 'N° Cotiz.', 'Tipo Orden', 'Fecha', 'Placa', 'Vehículo', 'Cliente', 'Teléfono', 'Estado', 'Total']],
            body: filteredCotizaciones.map((c, index) => [
                index + 1,
                String(c.id).padStart(6, '0'),
                c.tipo_orden?.tipo_orden || c.hoja_recepcion?.tipo_orden?.tipo_orden || (c as any).tipo_orden || 'Particular',
                new Date(c.fecha_registro).toLocaleDateString('es-ES'),
                (c.vehiculo_placa || c.placa || 'S/P').toUpperCase(),
                `${c.marca_auto?.marca || c.vehiculo_marca || ''} ${c.vehiculo_modelo || c.modelo || ''}`.trim() || '-',
                c.cliente_nombre || c.cliente || '-',
                c.cliente_telefono || (c as any).celular || '-',
                (c.estado || 'REGISTRADO').toUpperCase(),
                `${c.moneda === 'Dolares' ? '$us' : 'Bs'} ${Number(c.total || 0).toFixed(2)}`
            ]),
            foot: [
                [
                    { content: `TOTAL ACUMULADO (${filteredCotizaciones.length} COTIZACIONES):`, colSpan: 9, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `Bs ${totalMonto.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] } }
                ]
            ],
            theme: 'grid',
            headStyles: {
                fillColor: [241, 245, 249],
                textColor: [30, 41, 59],
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
                fillColor: [248, 250, 252]
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
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                const pageNumber = `Página ${data.pageNumber}`;
                doc.text('Sistema de Gestión de Taller EDKOR MOTORS', margin, doc.internal.pageSize.getHeight() - 6);
                doc.text(pageNumber, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
            }
        });

        doc.save(`Cotizaciones_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const printList = () => {
        setPrintCotizacionData(null);
        setIsPrintingList(true);
        setTimeout(() => {
            window.print();
        }, 150);
    };

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Cotizaciones',
            content: 'Elabore, consulte y gestione presupuestos para clientes particulares o aseguradoras antes de emitir la orden de trabajo.'
        },
        {
            title: 'Filtros y Búsqueda',
            content: 'Utilice el buscador general (por cliente, placa, marca o modelo) y el filtro desplegable por "Tipo de Orden" (Particular, Seguros, etc.). Ambos filtros aplican en tiempo real y se respetan al exportar a Excel, PDF o Imprimir.'
        },
        {
            title: 'Nueva Cotización',
            content: 'Haga clic en "+ Nueva Cotización" para presupuestar mano de obra y repuestos requeridos para el vehículo.'
        },
        {
            title: 'Exportación e Impresión del Listado',
            content: 'Descargue el listado completo filtrado a Excel (.xlsx), genere un documento formal en PDF con membrete y logo de EDKOR MOTORS o imprima directamente el reporte en papel.'
        },
        {
            title: 'Acciones por Cotización',
            content: 'En cada cotización puede Generar la Orden de Trabajo directamente, Imprimir la cotización en formato oficial para entrega al cliente, enviarla por WhatsApp como PDF o Editar/Eliminar el registro.'
        }
    ];

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredCotizaciones.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredCotizaciones.length / itemsPerPage);

    if (loading) return <div>Cargando...</div>;

    return (
        <>
        <div className="container mx-auto relative min-h-screen print:hidden">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <FileText className="text-blue-600" size={32} />
                        Cotizaciones
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de presupuestos y estimaciones</p>
                </div>

                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={printList}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual de Cotizaciones"
                >
                    <button
                        onClick={() => navigate('/cotizaciones/create')}
                        className="bg-[#3498db] hover:bg-[#2980b9] text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium text-xs sm:text-sm"
                    >
                        <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Nueva Cotización
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
                        <X className="h-4 w-4" />
                        <span>Limpiar filtros</span>
                    </button>
                )}
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
                Mostrando {filteredCotizaciones.length === 0 ? 0 : indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredCotizaciones.length)} de {filteredCotizaciones.length} registros
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">#</th>
                                <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">N° Cotización</th>
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
                                        {String(item.id).padStart(6, '0')}
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                                        {(() => {
                                            const tipo = item.tipo_orden?.tipo_orden || item.hoja_recepcion?.tipo_orden?.tipo_orden || (item as any).tipo_orden || 'Particular';
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
                                    <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                                        {new Date(item.fecha_registro).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-gray-800 dark:text-gray-200 font-mono font-bold uppercase text-sm">
                                        {(item.vehiculo_placa || item.placa || 'S/P').toUpperCase()}
                                    </td>
                                    <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                {item.marca_auto?.marca || item.vehiculo_marca || 'N/A'}
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
                                    <td className="p-4 text-gray-700 dark:text-gray-200 font-semibold text-sm">
                                        {item.moneda?.toLowerCase() === 'dolares' ? '$us' : 'Bs'} {Number(item.total).toFixed(2)}
                                    </td>
                                    <td className="p-4 text-sm">
                                        {(() => {
                                            const est = (item.estado || '').toLowerCase().trim();
                                            const isJalada = est === 'aprobada' || est === 'en_orden' || est === 'orden_creada' || est === 'en orden trabajo';
                                            const isAnulada = est === 'anulada' || est === 'anulado' || est === 'inactivo';
                                            if (isJalada) {
                                                return (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700 inline-flex items-center gap-1">
                                                        <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />
                                                        Jalada a Orden
                                                    </span>
                                                );
                                            }
                                            if (isAnulada) {
                                                return (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                                                        Anulada
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span className="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 capitalize">
                                                    {item.estado || 'Activo'}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-4 no-print text-right">
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => handlePrintCotizacion(item.id)}
                                                className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Imprimir Cotización"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            {(item.cliente_telefono || item.celular) && (
                                                <button
                                                    onClick={() => handleSendWhatsApp(item)}
                                                    className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                    title="Enviar por WhatsApp"
                                                >
                                                    <MessageCircle size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => navigate(`/cotizaciones/edit/${item.id}`)}
                                                className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Editar"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {currentItems.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron cotizaciones
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>

            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Cotizaciones"
                sections={manualSections}
            />
        </div>

        {/* Vista de Impresión Individual de Cotización */}
        {!isPrintingList && printCotizacionData && (
            <div className="hidden print:block w-full bg-white text-black">
                <CotizacionPrintView cotizacion={printCotizacionData} />
            </div>
        )}

        {/* Vista de Impresión de Listado de Cotizaciones */}
        {isPrintingList && (
            <div className="hidden print:block w-full bg-white text-black">
                <CotizacionesListPrintView
                    cotizaciones={filteredCotizaciones}
                    searchTerm={searchTerm}
                    selectedTipoOrden={tiposOrden.find(t => String(t.id) === selectedTipoOrden)?.tipo_orden || selectedTipoOrden}
                />
            </div>
        )}

        {/* Offscreen Print Container para generar PDF idéntico al de impresión para WhatsApp */}
        {whatsappCotizacionData && (
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
                    <CotizacionPrintView cotizacion={whatsappCotizacionData} />
                </div>
            </div>
        )}
        </>
    );
};

export default CotizacionesList;
