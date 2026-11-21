import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Image as ImageIcon, X } from 'lucide-react';
import api from '../services/api';
import { API_BASE_URL } from '../config';
interface Egreso {
    id: number;
    fecha: string;
    detalle: string;
    monto: number;
    moneda: string;
    imagen?: string;
    formaPago?: { id: number; forma_pago: string };
}
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from './ManualModal';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { getLocalDateString } from '../utils/dateUtils';

interface PaginatedResponse {
    data: Egreso[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    totals?: Record<string, { bolivianos: number; dolares: number }>;
}

const EgresoList: React.FC = () => {
    const [egresos, setEgresos] = useState<Egreso[]>([]);

    // Date & Calendar State
    const [calendarValue, setCalendarValue] = useState<any>(new Date());
    const [startDate, setStartDate] = useState(getLocalDateString()); // Default to today
    const [endDate, setEndDate] = useState(getLocalDateString());   // Default to today

    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 10;
    const [totals, setTotals] = useState<Record<string, { bolivianos: number; dolares: number }>>({});
    const [showManual, setShowManual] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    const manualSections: ManualSection[] = [
        {
            title: 'Navegación por Calendario',
            content: 'Utilice el calendario a la izquierda para ver los egresos de una fecha específica. Al seleccionar un día, la lista se filtra automáticamente.'
        },
        {
            title: 'Gestión de Egresos',
            content: 'Registro de gastos operativos (limpieza, insumos diarios, refacciones, etc) tanto del Consultorio como de Casa.'
        },
        {
            title: 'Registrar Egreso',
            content: 'Botón azul "+ Nuevo Egreso". Seleccione si es un gasto de "Consultorio" o "Casa" para los reportes diferenciados.'
        },
        {
            title: 'Filtros y Búsqueda',
            content: 'Puede buscar por descripción del gasto. El rango de fechas se actualiza automáticamente al usar el calendario, pero también puede modificarse manualmente.'
        },
        {
            title: 'Reportes y Totales',
            content: 'Al final de la lista, el sistema muestra automáticamente los totales sumados por forma de pago (Efectivo, Transferencia, etc) según los filtros aplicados.'
        }
    ];

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchEgresos();
    }, [currentPage, debouncedSearchTerm, startDate, endDate]);

    const fetchEgresos = async () => {
        try {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: limit.toString(),
            });

            if (startDate && endDate) {
                params.append('startDate', startDate);
                params.append('endDate', endDate);
            }

            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }

            const response = await api.get<PaginatedResponse>(`/egresos?${params}`);
            setEgresos(response.data.data);
            setTotalPages(response.data.totalPages);
            setTotal(response.data.total);
            if (response.data.totals) {
                setTotals(response.data.totals);
            }
        } catch (error) {
            console.error('Error fetching egresos:', error);
            alert('Error al cargar los egresos');
        }
    };

    // ... (handlers remain same)



    const handleCalendarChange = (value: any) => {
        setCalendarValue(value);
        if (value instanceof Date) {
            const year = value.getFullYear();
            const month = String(value.getMonth() + 1).padStart(2, '0');
            const day = String(value.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            // Set both start and end to the selected date for single-day view
            setStartDate(formattedDate);
            setEndDate(formattedDate);
            setCurrentPage(1); // Reset to first page
        }
    };

    const handleClearSearch = () => {
        const today = new Date();
        setCalendarValue(today);
        const todayStr = getLocalDateString();
        setStartDate(todayStr);
        setEndDate(todayStr);
        setSearchTerm('');
        setCurrentPage(1);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar este egreso?')) {
            try {
                await api.delete(`/egresos/${id}`);
                alert('Egreso eliminado exitosamente');
                fetchEgresos();
            } catch (error) {
                console.error('Error deleting egreso:', error);
                alert('Error al eliminar el egreso');
            }
        }
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    // ... (export functions remain same)

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString();
    };

    const exportToExcel = () => {
        try {
            const excelData = egresos.map(egreso => ({
                'ID': egreso.id,
                'Fecha': formatDate(egreso.fecha),
                'Detalle': egreso.detalle,
                'Monto': egreso.monto,
                'Moneda': egreso.moneda,
                'Forma de Pago': egreso.formaPago?.forma_pago || ''
            }));

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Egresos');
            XLSX.writeFile(wb, `egresos_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Error al exportar a Excel');
        }
    };

    const exportToPDF = () => {
        try {
            const doc = new jsPDF();
            doc.text('Reporte de Egresos', 14, 22);
            doc.setFontSize(10);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 30);
            if (startDate && endDate) {
                doc.text(`Rango: ${startDate} al ${endDate}`, 14, 36);
            }

            const tableData = egresos.map(egreso => [
                egreso.id,
                formatDate(egreso.fecha),
                egreso.detalle,
                egreso.monto,
                egreso.moneda,
                egreso.formaPago?.forma_pago || ''
            ]);

            autoTable(doc, {
                head: [['ID', 'Fecha', 'Detalle', 'Monto', 'Moneda', 'Forma Pago']],
                body: tableData,
                startY: 40,
            });

            doc.save(`egresos_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Error exporting to PDF:', error);
            alert('Error al exportar a PDF');
        }
    };

    const handlePrint = async () => {
        try {
            // Fetch ALL records for printing with current filters
            const params = new URLSearchParams({
                page: '1',
                limit: '9999'
            });
            if (startDate && endDate) {
                params.append('startDate', startDate);
                params.append('endDate', endDate);
            }
            if (debouncedSearchTerm) {
                params.append('search', debouncedSearchTerm);
            }

            const response = await api.get<PaginatedResponse>(`/egresos?${params}`);
            const allEgresos = response.data.data || [];
            const totals = response.data.totals || {};

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) {
                document.body.removeChild(iframe);
                return;
            }

            const printDate = new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Reporte de Egresos</title>
                    <style>
                        @page {
                            size: A4;
                            margin: 2cm 1.5cm 3cm 1.5cm;
                        }
                        
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            padding-bottom: 60px;
                            color: #333;
                        }
                        
                        .header {
                            display: flex;
                            align-items: center;
                            margin-bottom: 20px;
                            padding-bottom: 15px;
                            border-bottom: 2px solid #3498db;
                        }
                        
                        .header img {
                            height: 60px;
                            margin-right: 20px;
                        }
                        
                        h1 {
                            color: #2c3e50;
                            margin: 0;
                            font-size: 24px;
                        }
                        
                        .filter-info {
                            margin-bottom: 15px;
                            font-size: 11px;
                            color: #666;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            font-size: 10px;
                        }
                        
                        th {
                            background-color: #3498db;
                            color: white;
                            padding: 8px 6px;
                            text-align: left;
                            font-weight: bold;
                            border: 1px solid #2980b9;
                        }
                        
                        td {
                            padding: 6px;
                            border: 1px solid #ddd;
                        }
                        
                        tr:nth-child(even) {
                            background-color: #f8f9fa;
                        }

                        /* Totals Section Styles */
                        .totals-container {
                            margin-top: 30px;
                            page-break-inside: avoid;
                        }

                        .totals-title {
                            font-size: 14px;
                            font-weight: bold;
                            color: #2c3e50;
                            margin-bottom: 10px;
                            border-bottom: 1px solid #eee;
                            padding-bottom: 5px;
                        }

                        .totals-grid {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 15px;
                        }

                        .total-card {
                            border: 1px solid #ddd;
                            border-radius: 4px;
                            padding: 10px;
                            min-width: 120px;
                            background-color: #f9f9f9;
                        }

                        .total-header {
                            font-weight: bold;
                            font-size: 11px;
                            color: #555;
                            margin-bottom: 5px;
                            text-transform: capitalize;
                            border-bottom: 1px solid #eee;
                            padding-bottom: 3px;
                        }

                        .total-row {
                            display: flex;
                            justify-content: space-between;
                            font-size: 11px;
                            margin-bottom: 2px;
                        }
                        
                        .footer {
                            position: fixed;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            padding: 10px 1.5cm;
                            background: white;
                        }
                        
                        .footer-line {
                            border-top: 1px solid #333;
                            margin-bottom: 10px;
                        }
                        
                        .footer-content {
                            display: flex;
                            justify-content: flex-end;
                            font-size: 9px;
                            color: #666;
                        }
                        
                        .footer-info {
                            text-align: right;
                        }
                        
                        @media print {
                            th {
                                background-color: #3498db !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            
                            tr:nth-child(even) {
                                background-color: #f8f9fa !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            
                            .footer {
                                position: fixed;
                                bottom: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <!-- <img src="/logo-curare.png" alt="Curare Centro Dental"> -->
                        <h1>Reporte de Egresos</h1>
                    </div>
                    
                    ${startDate && endDate ? `<div class="filter-info">Rango: ${startDate} al ${endDate}</div>` : ''}
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Detalle</th>
                                <th>Monto</th>
                                <th>Moneda</th>
                                <th>Forma Pago</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allEgresos.map((egreso: Egreso) => `
                                <tr>
                                    <td>${formatDate(egreso.fecha)}</td>
                                    <td>${egreso.detalle}</td>
                                    <td>${egreso.monto}</td>
                                    <td>${egreso.moneda}</td>
                                    <td>${egreso.formaPago?.forma_pago || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totals-container">
                        <div class="totals-title">Totales por Forma de Pago</div>
                        <div class="totals-grid">
                            ${Object.entries(totals)
                                .filter(([_, value]) => value.bolivianos > 0 || value.dolares > 0)
                                .map(([key, value]) => `
                                <div class="total-card">
                                    <div class="total-header">
                                        ${key === 'Efectivo' ? '💵 ' :
                    key === 'Depósito' ? '🏦 ' :
                        key === 'Transferencia' ? '🏦 ' :
                            key === 'QR' ? '📱 ' : '💰 '} ${key}
                                    </div>
                                    <div class="total-row">
                                        <span>Bs:</span> <span>${value.bolivianos.toFixed(2)}</span>
                                    </div>
                                    <div class="total-row">
                                        <span>$us:</span> <span>${value.dolares.toFixed(2)}</span>
                                    </div>
                                </div>
                            `).join('')}
                            ${Object.entries(totals).filter(([_, value]) => value.bolivianos > 0 || value.dolares > 0).length === 0 ? '<div style="color: #666; font-style: italic;">No hay totales para mostrar.</div>' : ''}
                        </div>
                    </div>

                    <div class="footer">
                        <div class="footer-line"></div>
                        <div class="footer-content">
                            <div class="footer-info">
                                <div>Fecha de impresión: ${printDate}</div>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            doc.open();
            doc.write(printContent);
            doc.close();

            // Wait for images to load (like logo) before printing
            const logo = doc.querySelector('img');

            const doPrint = () => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Print error:', e);
                } finally {
                    // Remove iframe after sufficient time
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 2000);
                }
            };

            if (logo) {
                /* if (logo.complete) {
                    doPrint();
                } else {
                    logo.onload = doPrint;
                    logo.onerror = doPrint;
                } */
                doPrint();
            } else {
                doPrint();
            }
        } catch (error) {
            console.error('Error al imprimir:', error);
            alert('Error al generar el documento de impresión');
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 p-4">
            {/* Sidebar Calendar */}
            <div className="w-full md:w-[350px] flex-shrink-0 flex flex-col gap-5">
                <div className="bg-white dark:bg-gray-800 p-2.5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 calendar-wrapper">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-white mb-4 text-center py-2">Seleccionar Fecha</h3>
                    <Calendar
                        onChange={handleCalendarChange}
                        value={calendarValue}
                        locale="es-ES"
                        className="dark:bg-gray-800 dark:text-white dark:border-gray-700 w-full"
                        tileClassName={({ date, view }) => {
                            // Check if date matches currently selected start date
                            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                            if (view === 'month' && dateStr === startDate) {
                                return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full font-bold';
                            }
                            return 'hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full';
                        }}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-full overflow-hidden">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-center mb-6 no-print gap-4">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex flex-col">
                        <span>Lista de Egresos</span>
                        {startDate && startDate === endDate ? (
                            <span className="text-sm font-normal text-blue-600 dark:text-blue-400 mt-1">
                                Del {new Date(startDate + 'T00:00:00').toLocaleDateString()}
                            </span>
                        ) : (
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 mt-1">
                                {startDate ? `Desde: ${new Date(startDate + 'T00:00:00').toLocaleDateString()}` : 'Todos'}
                                {endDate ? ` - Hasta: ${new Date(endDate + 'T00:00:00').toLocaleDateString()}` : ''}
                            </span>
                        )}
                    </h2>
                    <div className="flex flex-wrap gap-2 justify-center lg:justify-end">
                        <button
                            onClick={() => setShowManual(true)}
                            className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            title="Ayuda / Manual"
                        >
                            ?
                        </button>
                        <button
                            onClick={exportToExcel}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg> Excel
                        </button>
                        <button
                            onClick={exportToPDF}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg> PDF
                        </button>
                        <button
                            onClick={handlePrint}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 text-sm shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg> Imprimir
                        </button>
                        <Link
                            to="/egresos/create"
                            className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium"
                        >
                            <Plus className="h-5 w-5" />
                            Nuevo Egreso
                        </Link>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-grow min-w-[200px]">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar por Detalle:</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Escribe para buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                            </div>
                        </div>
                        {/* Manual Date Override Inputs */}
                        <div className="w-full md:w-auto">
                            <div className="flex gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Desde:</label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white bg-white dark:bg-gray-700 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hasta:</label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white bg-white dark:bg-gray-700 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {(startDate || endDate || searchTerm) && (
                            <button
                                type="button"
                                onClick={handleClearSearch}
                                className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg h-[38px] text-sm shadow-md transition-all transform hover:-translate-y-0.5"
                            >
                                Hoy
                            </button>
                        )}
                    </div>
                </div>

                <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
                    Mostrando {total === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, total)} de {total} registros
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Detalle</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Moneda</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {egresos.length > 0 ? (
                                egresos.map((egreso, index) => (
                                    <tr key={egreso.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{(currentPage - 1) * limit + index + 1}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{formatDate(egreso.fecha)}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{egreso.detalle}</td>
                                        <td className="p-3 font-bold text-gray-800 dark:text-gray-200">{egreso.monto}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">{egreso.moneda}</td>
                                        <td className="p-3 text-gray-700 dark:text-gray-300">
                                            {egreso.formaPago?.forma_pago || 'N/A'}
                                        </td>
                                        <td className="p-3 flex items-center gap-2">
                                            {egreso.imagen && (
                                                <button
                                                    onClick={() => setPreviewImage(`${API_BASE_URL}/files/${egreso.imagen}`)}
                                                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                    title="Ver Comprobante / Factura"
                                                >
                                                    <ImageIcon size={16} />
                                                </button>
                                            )}
                                            <Link
                                                to={`/egresos/edit/${egreso.id}`}
                                                className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Editar"
                                            >
                                                <Pencil size={16} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(egreso.id)}
                                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        No hay egresos registrados para esta fecha o criterios de búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="mt-5 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <h3 className="mb-2 text-base font-semibold text-gray-800 dark:text-gray-200">Totales por Forma de Pago (Según filtros)</h3>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                        {Object.entries(totals)
                            .filter(([_, value]) => value.bolivianos > 0 || value.dolares > 0)
                            .map(([key, value]) => (
                            <div key={key} className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-100 dark:border-gray-600 shadow-sm">
                                <div className="font-bold mb-2 text-gray-600 dark:text-gray-300 capitalize flex items-center gap-2">
                                    <span>
                                        {key === 'Efectivo' ? '💵 ' :
                                            key === 'Depósito' ? '🏦 ' :
                                                key === 'Transferencia' ? '🏦 ' :
                                                    key === 'QR' ? '📱 ' :
                                                        key === 'Debito' ? '💳 ' : '💰 '}
                                    </span>
                                    {key}
                                </div>
                                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                                    <span>Bs:</span> <span>{value.bolivianos.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                                    <span>$us:</span> <span>{value.dolares.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                        {Object.entries(totals).filter(([_, value]) => value.bolivianos > 0 || value.dolares > 0).length === 0 && (
                            <div className="text-gray-500 dark:text-gray-400 italic">No hay totales para mostrar.</div>
                        )}
                    </div>
                </div>

                {/* Pagination Controls */}
                {
                    totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={handlePageChange}
                        />
                    )
                }
                {/* Manual Modal */}
                <ManualModal
                    isOpen={showManual}
                    onClose={() => setShowManual(false)}
                    title="Manual de Usuario - Egresos"
                    sections={manualSections}
                />

                {/* Modal de Vista Previa de Comprobante / Factura */}
                {previewImage && (
                    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in" onClick={() => setPreviewImage(null)}>
                        <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-2xl p-4 border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center pb-3 mb-2 border-b border-gray-200 dark:border-gray-700">
                                <h3 className="font-bold text-gray-800 dark:text-white text-base flex items-center gap-2">
                                    <ImageIcon className="text-emerald-500" size={18} />
                                    Comprobante de Egreso
                                </h3>
                                <button
                                    onClick={() => setPreviewImage(null)}
                                    className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-300 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-2 flex items-center justify-center max-h-[72vh] overflow-auto">
                                <img src={previewImage} alt="Comprobante" className="max-w-full max-h-[68vh] object-contain rounded-lg shadow border border-gray-100 dark:border-gray-700" />
                            </div>
                            <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-700">
                                <a
                                    href={previewImage}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                                >
                                    Abrir en pantalla completa
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div >

            <style>{`
                /* Base Calendar Styles */
                .calendar-wrapper .react-calendar { 
                    border: none; 
                    font-family: inherit;
                    width: 100%;
                    background-color: transparent;
                }
                
                /* Navigation (Month/Year) */
                .calendar-wrapper .react-calendar__navigation button {
                    min-width: 44px;
                    background: none;
                    color: #374151; /* gray-700 */
                }
                
                .calendar-wrapper .react-calendar__navigation__label {
                    font-weight: bold;
                    font-size: 1rem;
                }
                
                .calendar-wrapper .react-calendar__navigation button:enabled:hover,
                .calendar-wrapper .react-calendar__navigation button:enabled:focus {
                    background-color: #f3f4f6;
                }
                
                /* Weekday headers (Lu, Ma, Mi...) */
                .calendar-wrapper .react-calendar__month-view__weekdays {
                    text-align: center;
                    text-transform: uppercase;
                    font-weight: bold;
                    font-size: 0.75em;
                    color: #6b7280; /* gray-500 */
                    margin-bottom: 0.5rem;
                }
                
                .calendar-wrapper .react-calendar__month-view__weekdays__weekday {
                     text-decoration: none; 
                }

                /* Day Tiles */
                .calendar-wrapper .react-calendar__tile {
                    color: #374151; /* gray-700 - Explicitly set dark color for days */
                    font-weight: 500;
                    padding: 0.75em 0.5em;
                }

                .calendar-wrapper .react-calendar__month-view__days__day--neighboringMonth {
                    color: #9ca3af !important; /* gray-400 */
                }

                .calendar-wrapper .react-calendar__month-view__days__day--weekend {
                    color: #ef4444; /* red-500 */
                }

                /* Dark Mode Overrides */
                .dark .calendar-wrapper .react-calendar {
                    color: white;
                }
                
                .dark .calendar-wrapper .react-calendar__navigation button {
                    color: #f3f4f6; /* gray-100 */
                }

                .dark .calendar-wrapper .react-calendar__navigation button:enabled:hover,
                .dark .calendar-wrapper .react-calendar__navigation button:enabled:focus {
                    background-color: #374151;
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__weekdays {
                    color: #9ca3af; /* gray-400 */
                }
                
                .dark .calendar-wrapper .react-calendar__tile {
                    color: #e5e7eb; /* gray-200 */
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__days__day--weekend {
                    color: #f87171; /* red-400 */
                }
                
                .dark .calendar-wrapper .react-calendar__month-view__days__day--neighboringMonth {
                    color: #4b5563 !important; /* gray-600 */
                }

                .dark .calendar-wrapper .react-calendar__tile:enabled:hover,
                .dark .calendar-wrapper .react-calendar__tile:enabled:focus {
                    background-color: #374151;
                }
                
                /* Active/Selected State Overrides (Specific) */
                .calendar-wrapper .react-calendar__tile.bg-blue-100 {
                    color: #1e40af !important; /* blue-800 */
                    background-color: #dbeafe !important;
                }
                .dark .calendar-wrapper .react-calendar__tile.dark\\:bg-blue-900 {
                    background-color: #1e3a8a !important; /* blue-900 */
                    color: #bfdbfe !important; /* blue-200 */
                }
            `}</style>
        </div>
    );
};

export default EgresoList;
