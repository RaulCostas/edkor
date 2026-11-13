import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Pencil, Trash2, RotateCcw, Printer } from 'lucide-react';

import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import PagosGastosFijosForm from './PagosGastosFijosForm';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import GastosFijosModal from '../components/GastosFijosModal';
import Swal from 'sweetalert2';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';

interface GastoFijo {
    id?: number;
    gasto_fijo: string;
    monto: number;
    moneda: string;
    dia: number;
    mes?: string;
    anual: boolean;
    estado?: string;
}

interface PagoGastoFijo {
    id?: number;
    idgasto_fijo: number;
    fecha: string;
    monto: number;
    moneda: string;
    idforma_pago: number;
    observaciones?: string;
    gastoFijo?: GastoFijo;
    formaPago?: { id: number; forma_pago: string };
}

const GastosFijosList: React.FC = () => {
    const [gastos, setGastos] = useState<GastoFijo[]>([]);
    const [pagos, setPagos] = useState<PagoGastoFijo[]>([]);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [selectedGasto, setSelectedGasto] = useState<GastoFijo | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<PagoGastoFijo | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [paymentsSearchTerm, setPaymentsSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'gastos' | 'pagos'>('gastos');
    const [showManual, setShowManual] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [gastoToEdit, setGastoToEdit] = useState<GastoFijo | null>(null);

    // Print Modal State
    // Print/Export Modal State
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printPeriodo, setPrintPeriodo] = useState<string>('todos');
    const [modalMode, setModalMode] = useState<'print' | 'excel' | 'pdf'>('print');
    const [showPagosPrintModal, setShowPagosPrintModal] = useState(false);
    const [printPagoGastoFilter, setPrintPagoGastoFilter] = useState<string>('todos');
    const [pagosModalMode, setPagosModalMode] = useState<'print' | 'excel' | 'pdf'>('print');

    const manualSections: ManualSection[] = [
        {
            title: 'Gastos Fijos',
            content: 'Gestión de gastos recurrentes (Alquiler, Internet, Sueldos, etc). Se pueden configurar como Mensuales o Anuales.'
        },
        {
            title: 'Historial de Pagos',
            content: 'En la pestaña "Historial de Pagos" puede ver todos los pagos realizados a estos gastos fijos con sus respectivos recibos.'
        },
        {
            title: 'Registrar Pago',
            content: 'Para pagar un gasto, use el botón "Pagar" (icono de billete/tarjeta) en la lista de Gastos Fijos. Esto abrirá el formulario de pago.'
        },
        {
            title: 'Dar de Baja y Reactivar',
            content: 'Para gastos activos, el botón rojo (papelera) cambia el estado a "Inactivo". Para gastos inactivos, aparece un botón verde (check) que permite reactivarlos a estado "Activo".'
        },
        {
            title: 'Recibos',
            content: 'En el historial de pagos puede imprimir un recibo detallado para constancia.'
        }
    ];

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [currentPagosPage, setCurrentPagosPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchGastos();
        fetchPagos();
    }, []);

    const fetchGastos = async () => {
        try {
            const response = await api.get('/gastos-fijos');
            console.log('Gastos Fijos fetched:', response.data);
            setGastos(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching gastos fijos:', error);
            setGastos([]);
        }
    };

    const fetchPagos = async () => {
        try {
            const response = await api.get('/pagos-gastos-fijos');
            console.log('Pagos fetched:', response.data);
            setPagos(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Error fetching pagos gastos fijos:', error);
            setPagos([]);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Dar de baja gasto fijo?',
            text: 'El gasto pasará a estado Inactivo sin eliminar el registro de la base de datos.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/gastos-fijos/${id}`, { estado: 'inactivo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Gasto dado de baja!',
                    text: 'El estado del gasto ha sido cambiado a Inactivo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchGastos();
            } catch (error) {
                console.error('Error al dar de baja gasto:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo dar de baja el gasto'
                });
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar gasto fijo?',
            text: 'El gasto volverá a estado Activo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/gastos-fijos/${id}`, { estado: 'activo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Gasto reactivado!',
                    text: 'El estado del gasto ha sido cambiado a Activo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchGastos();
            } catch (error) {
                console.error('Error al reactivar gasto:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar el gasto'
                });
            }
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page
    };

    const handlePaymentsSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPaymentsSearchTerm(e.target.value);
        setCurrentPagosPage(1); // Reset to first page
    };

    const filteredGastos = gastos.filter(gasto => {
        if (!gasto) return false;
        const gastoName = gasto.gasto_fijo?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        return gastoName.includes(search);
    }).sort((a, b) => a.dia - b.dia);
    const totalsByCurrency = filteredGastos.reduce((acc, g) => {
        const currency = g.moneda || 'Bs';
        const monto = Number(g.monto) || 0;

        if (!acc[currency]) {
            acc[currency] = { total: 0 };
        }

        acc[currency].total += monto;

        return acc;
    }, {} as Record<string, { total: number }>);

    // Pagination Logic Gastos
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentGastos = filteredGastos.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredGastos.length / itemsPerPage);
    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const filteredPagos = pagos.filter(pago => {
        const gastoName = pago.gastoFijo?.gasto_fijo?.toLowerCase() || '';
        const fecha = pago.fecha?.toLowerCase() || '';
        const obs = pago.observaciones?.toLowerCase() || '';
        const search = paymentsSearchTerm.toLowerCase();
        return gastoName.includes(search) || fecha.includes(search) || obs.includes(search);
    });

    // Pagination Logic Pagos
    const indexOfLastPago = currentPagosPage * itemsPerPage;
    const indexOfFirstPago = indexOfLastPago - itemsPerPage;
    const currentPagos = filteredPagos.slice(indexOfFirstPago, indexOfLastPago);
    const totalPagosPages = Math.ceil(filteredPagos.length / itemsPerPage);
    const paginatePagos = (pageNumber: number) => setCurrentPagosPage(pageNumber);

    // --- Exports for Gastos Fijos ---
    const exportGastosToExcel = (data: GastoFijo[]) => {
        try {
            const excelData = data.map(gasto => ({
                'Día': gasto.dia,
                'Tipo': gasto.anual ? `Anual (${gasto.mes || '-'})` : 'Mensual',
                'Gasto Fijo': gasto.gasto_fijo,
                'Monto': Number(gasto.monto),
                'Moneda': gasto.moneda,
                'Estado': gasto.estado || 'activo'
            }));
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Gastos Fijos');
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `gastos_fijos_${date}.xlsx`);
        } catch (error) {
            console.error('Error exporting Gastos to Excel:', error);
            alert('Error al exportar Gastos a Excel');
        }
    };



    const exportGastosToPDF = async (data: GastoFijo[]) => {
        const filtrosTexto = [];
        if (printPeriodo !== 'todos') filtrosTexto.push(`Periodo: ${printPeriodo.toUpperCase()}`);
        if (searchTerm) filtrosTexto.push(`Búsqueda: "${searchTerm}"`);

        await exportStandardPDF({
            title: 'Reporte de Gastos Fijos',
            subtitle: 'EDKOR MOTORS - Presupuesto y Gastos Recurrentes del Taller',
            orientation: 'portrait',
            filtersText: filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : undefined,
            totalRecords: data.length,
            totalRecordsLabel: 'Gastos Registrados',
            filename: `Gastos_Fijos_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'Día Pago', 'Tipo / Período', 'Gasto Fijo', 'Monto', 'Moneda', 'Estado']],
                body: data.map((gasto, idx) => [
                    idx + 1,
                    gasto.dia ? String(gasto.dia) : '-',
                    gasto.anual ? `Anual (${gasto.mes || '-'})` : 'Mensual',
                    gasto.gasto_fijo || '',
                    Number(gasto.monto || 0).toFixed(2),
                    gasto.moneda || 'Bs',
                    (gasto.estado || 'ACTIVO').toUpperCase()
                ]),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { halign: 'center', cellWidth: 20 },
                    2: { halign: 'center', cellWidth: 32 },
                    3: { cellWidth: 'auto', fontStyle: 'bold' },
                    4: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
                    5: { halign: 'center', cellWidth: 22 },
                    6: { halign: 'center', cellWidth: 20, fontSize: 6.5, fontStyle: 'bold' }
                }
            }
        });
    };

    // --- Exports for Pagos ---
    const exportPagosToExcel = () => {
        try {
            const excelData = filteredPagos.map(pago => ({
                'Fecha': pago.fecha,
                'Gasto Fijo': pago.gastoFijo?.gasto_fijo || 'N/A',
                'Monto': pago.monto,
                'Moneda': pago.moneda,
                'Forma Pago': pago.formaPago?.forma_pago || 'N/A',
                'Observaciones': pago.observaciones
            }));
            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Pagos Realizados');
            const date = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `historial_pagos_${date}.xlsx`);
        } catch (error) {
            console.error('Error exporting Pagos to Excel:', error);
            alert('Error al exportar Pagos a Excel');
        }
    };

    const generatePagosPDF = async (data: PagoGastoFijo[], action: 'save' | 'print' = 'save') => {
        const filtrosTexto = [];
        if (printPagoGastoFilter !== 'todos') filtrosTexto.push(`Gasto Fijo: ${printPagoGastoFilter.toUpperCase()}`);
        if (paymentsSearchTerm) filtrosTexto.push(`Búsqueda: "${paymentsSearchTerm}"`);

        await exportStandardPDF({
            title: 'Historial de Pagos de Gastos Fijos',
            subtitle: 'EDKOR MOTORS - Registro de Pagos Realizados a Gastos Recurrentes',
            orientation: 'portrait',
            filtersText: filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : undefined,
            totalRecords: data.length,
            totalRecordsLabel: 'Pagos Registrados',
            filename: `Historial_Pagos_Gastos_Fijos_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'Fecha', 'Gasto Fijo', 'Monto', 'Moneda', 'Forma Pago', 'Observaciones']],
                body: data.map((pago, idx) => [
                    idx + 1,
                    formatDate(pago.fecha),
                    pago.gastoFijo?.gasto_fijo || 'N/A',
                    Number(pago.monto || 0).toFixed(2),
                    pago.moneda === 'Bolivianos' ? 'Bs' : (pago.moneda || 'Bs'),
                    pago.formaPago?.forma_pago || '-',
                    pago.observaciones || '-'
                ]),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { halign: 'center', cellWidth: 22 },
                    2: { cellWidth: 45, fontStyle: 'bold' },
                    3: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
                    4: { halign: 'center', cellWidth: 18 },
                    5: { halign: 'center', cellWidth: 28 },
                    6: { cellWidth: 'auto' }
                }
            }
        });
    };

    const handlePrintRecibo = (pago: PagoGastoFijo) => {
        try {
            const doc = new jsPDF();

            const drawReceipt = (startY: number, title: string) => {
                // Border for the receipt
                doc.setDrawColor(200);
                doc.rect(10, startY, 190, 135);

                // Header without background
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(22);
                doc.setFont('helvetica', 'bold');
                doc.text('RECIBO DE PAGO', 105, startY + 15, { align: 'center' });

                doc.setFontSize(14);
                doc.setTextColor(100);
                doc.text(title, 190, startY + 15, { align: 'right' }); // ORIGINAL / COPIA

                // Info Container
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');

                const contentStartY = startY + 40;
                const lineHeight = 10;

                // Data
                doc.setFont('helvetica', 'bold');
                doc.text('Fecha de Pago:', 20, contentStartY);
                doc.setFont('helvetica', 'normal');
                doc.text(new Date(pago.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 70, contentStartY);

                doc.setFont('helvetica', 'bold');
                doc.text('Concepto:', 20, contentStartY + lineHeight);
                doc.setFont('helvetica', 'normal');
                doc.text(pago.gastoFijo?.gasto_fijo || 'N/A', 70, contentStartY + lineHeight);

                doc.setFont('helvetica', 'bold');
                doc.text('Monto:', 20, contentStartY + lineHeight * 2);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(14);
                doc.text(`${pago.monto} ${pago.moneda}`, 70, contentStartY + lineHeight * 2);
                doc.setFontSize(12);

                doc.setFont('helvetica', 'bold');
                doc.text('Forma de Pago:', 20, contentStartY + lineHeight * 3);
                doc.setFont('helvetica', 'normal');
                doc.text(pago.formaPago?.forma_pago || 'N/A', 70, contentStartY + lineHeight * 3);

                if (pago.observaciones) {
                    doc.setFont('helvetica', 'bold');
                    doc.text('Observaciones:', 20, contentStartY + lineHeight * 4);
                    doc.setFont('helvetica', 'normal');
                    const splitObs = doc.splitTextToSize(pago.observaciones, 110);
                    doc.text(splitObs, 70, contentStartY + lineHeight * 4);
                }

                // Footer / Signature Area
                doc.setDrawColor(150);
                const sigY = startY + 115;
                doc.line(25, sigY, 85, sigY);
                doc.line(125, sigY, 185, sigY);

                doc.setFontSize(10);
                doc.text('Firma Responsable', 55, sigY + 5, { align: 'center' });
                doc.text('Firma Receptor', 155, sigY + 5, { align: 'center' });
            };

            // Draw Original (Top half)
            drawReceipt(10, 'ORIGINAL');

            // Cutting line
            doc.setDrawColor(200);
            (doc as any).setLineDash([5, 5], 0);
            doc.line(0, 148, 210, 148);
            (doc as any).setLineDash([], 0); // Reset dash

            // Draw Copy (Bottom half)
            drawReceipt(158, 'COPIA');

            // Footer text
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('Comprobante generado automáticamente por el sistema CURARE', 105, 290, { align: 'center' });

            // Auto print and open
            // Silent print using iframe
            const blobUrl = doc.output('bloburl');
            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            iframe.src = blobUrl as unknown as string;
            document.body.appendChild(iframe);

            iframe.onload = () => {
                try {
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Print error:', e);
                }
                // Cleanup after a delay
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                        URL.revokeObjectURL((blobUrl as unknown) as string);
                    }
                }, 5000);
            };
        } catch (error) {
            console.error('Error creating receipt:', error);
            alert('Error al generar el recibo');
        }
    };

    const handleOpenPrintModal = (mode: 'print' | 'excel' | 'pdf' = 'print') => {
        setModalMode(mode);
        setShowPrintModal(true);
        setPrintPeriodo('todos');
    };

    const handleConfirmPrint = async () => {
        try {
            // Filter data based on modal selection
            let dataToPrint = [...filteredGastos];

            if (printPeriodo !== 'todos') {
                const isAnual = printPeriodo === 'anual';
                dataToPrint = dataToPrint.filter(g =>
                    isAnual ? g.anual : !g.anual
                );
            }

            if (dataToPrint.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sin datos',
                    text: 'No hay gastos para exportar/imprimir con los filtros seleccionados',
                    confirmButtonColor: '#3498db'
                });
                return;
            }

            if (modalMode === 'excel') {
                exportGastosToExcel(dataToPrint);
                setShowPrintModal(false);
                return;
            }

            if (modalMode === 'pdf') {
                await exportGastosToPDF(dataToPrint);
                setShowPrintModal(false);
                return;
            }

            // Print Logic
            const printDate = new Date().toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Calculate totals for the report
            const totals = dataToPrint.reduce((acc, g) => {
                const currency = g.moneda || 'Bs';
                if (!acc[currency]) acc[currency] = 0;
                acc[currency] += Number(g.monto);
                return acc;
            }, {} as Record<string, number>);

            // Build filter description
            const filtrosTexto = [];
            if (printPeriodo !== 'todos') filtrosTexto.push(`Periodo: ${printPeriodo.charAt(0).toUpperCase() + printPeriodo.slice(1)}`);
            const subtitle = filtrosTexto.length > 0 ? filtrosTexto.join(' | ') : 'Reporte General';

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Reporte de Gastos Fijos</title>
                    <style>
                        @page { size: A4; margin: 2cm; }
                        body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; }
                        .header { display: flex; align-items: center; border-bottom: 2px solid #3498db; padding-bottom: 15px; margin-bottom: 20px; }
                        .header img { height: 60px; margin-right: 20px; }
                        h1 { color: #2c3e50; margin: 0; font-size: 24px; }
                        .subtitle { font-size: 14px; color: #7f8c8d; margin-top: 5px; }
                        .filters { background: #f8f9fa; padding: 10px; border-left: 4px solid #3498db; margin-bottom: 20px; font-weight: bold; color: #2c3e50; font-size: 14px; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
                        th { background-color: #3498db; color: white; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #2980b9; }
                        td { padding: 8px; border: 1px solid #ddd; }
                        tr:nth-child(even) { background-color: #f2f6f8; }
                        .totals { display: flex; gap: 20px; justify-content: flex-end; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 20px; }
                        .total-card { background: #f8f9fa; padding: 10px 20px; border-radius: 8px; border: 1px solid #ddd; text-align: center; }
                        .total-amount { font-size: 18px; font-weight: bold; color: #2c3e50; display: block; }
                        .total-label { font-size: 12px; color: #7f8c8d; uppercase; letter-spacing: 1px; }
                        .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px 0; border-top: 1px solid #333; font-size: 10px; text-align: right; color: #666; }
                        
                        @media print {
                            th {
                                background-color: #3498db !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            tr:nth-child(even) {
                                background-color: #f2f6f8 !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .filters {
                                background-color: #f8f9fa !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            .total-card {
                                background-color: #f8f9fa !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <!-- <img src="/logo-curare.png" alt="Curare Centro Dental"> -->
                        <div>
                            <h1>Lista de Gastos Fijos</h1>
                        </div>
                    </div>

                    ${subtitle ? `<div class="filters">${subtitle}</div>` : ''}

                    <table>
                        <thead>
                            <tr>
                                <th>Día</th>
                                <th>Periodo</th>
                                <th>Concepto</th>
                                <th style="text-align: right;">Monto</th>
                                <th>Moneda</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dataToPrint.map(g => `
                                <tr>
                                    <td>${g.dia || '-'}</td>
                                    <td>${g.anual ? `Anual (${g.mes || '-'})` : 'Mensual'}</td>
                                    <td>${g.gasto_fijo}</td>
                                    <td style="text-align: right; font-weight: bold;">${Number(g.monto).toFixed(2)}</td>
                                    <td>${g.moneda}</td>
                                    <td>${g.estado || 'Activo'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totals">
                        ${Object.entries(totals).map(([curr, amount]) => `
                            <div class="total-card">
                                <span class="total-label">Total ${curr}</span>
                                <span class="total-amount">${amount.toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>

                    <div class="footer">
                        Fecha de impresión: ${printDate}
                    </div>
                </body>
                </html>
            `;

            // Use hidden iframe for printing
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

            doc.open();
            doc.write(printContent);
            doc.close();

            iframe.contentWindow?.focus();
            setTimeout(() => {
                iframe.contentWindow?.print();
                setTimeout(() => document.body.removeChild(iframe), 1000);
            }, 500);

            setShowPrintModal(false);
        } catch (error) {
            console.error('Error al imprimir:', error);
            Swal.fire('Error', 'No se pudo generar el documento', 'error');
        }
    };

    const handleOpenPagosPrintModal = (mode: 'print' | 'excel' | 'pdf' = 'print') => {
        setPagosModalMode(mode);
        setPrintPagoGastoFilter('todos');
        setShowPagosPrintModal(true);
    };

    const handleConfirmPagosPrint = async () => {
        let dataToPrint = [...filteredPagos];
        if (printPagoGastoFilter !== 'todos') {
            dataToPrint = dataToPrint.filter(p => p.gastoFijo?.gasto_fijo === printPagoGastoFilter);
        }

        if (dataToPrint.length === 0) {
            Swal.fire({
                icon: 'info',
                title: 'Sin datos',
                text: 'No hay pagos con los filtros seleccionados',
                confirmButtonColor: '#3498db'
            });
            return;
        }

        if (pagosModalMode === 'excel') {
            exportPagosToExcel();
            setShowPagosPrintModal(false);
            return;
        }

        const action = pagosModalMode === 'pdf' ? 'save' : 'print';
        await generatePagosPDF(dataToPrint, action);
        setShowPagosPrintModal(false);
    };

    const handlePagar = (gasto: GastoFijo) => {
        setSelectedGasto(gasto);
        setSelectedPayment(null);
        setShowPaymentForm(true);
    };

    const handleEditPayment = (pago: PagoGastoFijo) => {
        if (pago.gastoFijo) {
            setSelectedGasto(pago.gastoFijo);
            setSelectedPayment(pago);
            setShowPaymentForm(true);
        }
    };

    const handleDeletePayment = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar este pago?')) {
            try {
                await api.delete(`/pagos-gastos-fijos/${id}`);
                fetchPagos();
            } catch (error) {
                console.error('Error deleting payment:', error);
            }
        }
    };

    const tabStyle = (tab: 'gastos' | 'pagos') => {
        const isActive = activeTab === tab;
        return {
            cursor: 'pointer',
            borderBottom: isActive ? '3px solid #3498db' : '3px solid transparent',

            fontWeight: isActive ? 'bold' : 'normal' as 'bold' | 'normal',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            padding: '10px 20px',
        };
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
            {/* Header Unified */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 no-print">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <DollarSign className="text-red-600" size={32} />
                            Gastos Fijos
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión de gastos recurrentes (Alquiler, Internet, Sueldos, etc)</p>
                    </div>
                </div>
            </div>

            {/* Header and Tabs */}
            {/* New Tabs Navigation matching HistoriaClinica */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5 bg-white dark:bg-gray-800 rounded-t-lg p-2.5 no-print">
                <div
                    onClick={() => setActiveTab('gastos')}
                    style={tabStyle('gastos')}
                    className={`${activeTab === 'gastos' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'} px-4 py-2 flex items-center gap-2 transition-colors`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="23"></line>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    GASTOS FIJOS
                </div>
                <div
                    onClick={() => setActiveTab('pagos')}
                    style={tabStyle('pagos')}
                    className={`${activeTab === 'pagos' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'} px-4 py-2 flex items-center gap-2 transition-colors`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    HISTORIAL DE PAGOS
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'gastos' && (
                <>
                    <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                        <div className="flex items-center gap-2 flex-grow max-w-md">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    placeholder="Buscar por gasto..."
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                            </div>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors border border-red-200 shadow-sm"
                                    title="Limpiar búsqueda"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Actions Toolbar */}
                        <StandardExportToolbar
                            onExportExcel={() => exportGastosToExcel(filteredGastos)}
                            onExportPDF={() => exportGastosToPDF(filteredGastos)}
                            onPrint={() => window.print()}
                            onHelp={() => setShowManual(true)}
                            helpTitle="Ayuda / Manual"
                        >
                            <button
                                onClick={() => {
                                    setGastoToEdit(null);
                                    setShowCreateModal(true);
                                }}
                                className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium"
                            >
                                <Plus className="h-5 w-5" />
                                Nuevo Gasto
                            </button>
                        </StandardExportToolbar>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium no-print">
                        Mostrando {filteredGastos.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredGastos.length)} de {filteredGastos.length} registros
                    </div>

                    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 print-container">
                        <div className="hidden print:block mb-4">
                            <StandardPrintHeader
                                title="Reporte de Gastos Fijos"
                                subtitle="EDKOR MOTORS - Presupuesto y Gastos Recurrentes del Taller"
                                orientation="portrait"
                                filtersText={searchTerm ? `Búsqueda: "${searchTerm}"` : undefined}
                                totalRecords={filteredGastos.length}
                                totalRecordsLabel="Total Gastos"
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Día</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Anual/Mes</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gasto Fijo</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Moneda</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {currentGastos.map((gasto, index) => (
                                        <tr key={gasto.id} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150`}>
                                            <td className="px-6 py-4 text-gray-400 dark:text-gray-500 font-medium">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{gasto.dia}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                                {gasto.anual ? (
                                                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                                        Anual ({gasto.mes})
                                                    </span>
                                                ) : (
                                                    <span className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                                        Mensual
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">{gasto.gasto_fijo}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{gasto.monto}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{gasto.moneda}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${(gasto.estado === 'activo' || !gasto.estado)
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                                    : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                                    }`}>
                                                    {gasto.estado || 'activo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                        onClick={() => handlePagar(gasto)}
                                                        title="Registrar Pago"
                                                    >
                                                        <DollarSign size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setGastoToEdit(gasto);
                                                            setShowCreateModal(true);
                                                        }}
                                                        className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                        title="Editar"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    {(gasto.estado === 'activo' || !gasto.estado) ? (
                                                        <button
                                                            onClick={() => gasto.id && handleDelete(gasto.id)}
                                                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                            title="Dar de baja"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => gasto.id && handleReactivate(gasto.id)}
                                                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                            title="Reactivar"
                                                        >
                                                            <RotateCcw size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredGastos.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-6 text-center text-gray-400 dark:text-gray-500">
                                                No se encontraron gastos fijos.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="hidden print:block p-4 mt-6">
                            <StandardPrintFooter />
                        </div>
                    </div>


                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="no-print">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={paginate}
                            />
                        </div>
                    )}

                    {/* Totals Summary Section (Moved below pagination) */}
                    {Object.keys(totalsByCurrency).length > 0 && (
                        <div className="mt-6 flex flex-col gap-4 no-print border-t border-gray-200 dark:border-gray-700 pt-4">
                            {Object.entries(totalsByCurrency).map(([currency, data]) => (
                                <div key={currency} className="flex justify-end">
                                    <div className="bg-[#1e293b] dark:bg-slate-700 p-4 rounded-xl shadow-md flex flex-col items-center justify-center min-w-[200px] transform hover:scale-105 transition-all duration-300">
                                        <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Gran Total {currency}</span>
                                        <span className="text-xl font-bold text-white tracking-tight">{data.total.toFixed(2)} {currency}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Pagos Tab Content */}
            {activeTab === 'pagos' && (
                <>
                    <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                        <div className="flex items-center gap-2 flex-grow max-w-md">
                            <div className="relative w-full">
                                <input
                                    type="text"
                                    placeholder="Buscar por gasto, fecha, observación..."
                                    value={paymentsSearchTerm}
                                    onChange={handlePaymentsSearch}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                                />
                                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                            </div>
                            {paymentsSearchTerm && (
                                <button
                                    onClick={() => setPaymentsSearchTerm('')}
                                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors border border-red-200 shadow-sm"
                                    title="Limpiar búsqueda"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* Actions Toolbar */}
                        <StandardExportToolbar
                            onExportExcel={() => exportPagosToExcel()}
                            onExportPDF={() => generatePagosPDF(filteredPagos, 'save')}
                            onPrint={() => window.print()}
                            onHelp={() => setShowManual(true)}
                            helpTitle="Ayuda / Manual"
                        />
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium no-print">
                        Mostrando {filteredPagos.length === 0 ? 0 : (currentPagosPage - 1) * itemsPerPage + 1} - {Math.min(currentPagosPage * itemsPerPage, filteredPagos.length)} de {filteredPagos.length} registros
                    </div>

                    <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 print-container">
                        <div className="hidden print:block mb-4">
                            <StandardPrintHeader
                                title="Historial de Pagos de Gastos Fijos"
                                subtitle="EDKOR MOTORS - Registro de Pagos Realizados a Gastos Recurrentes"
                                orientation="portrait"
                                filtersText={paymentsSearchTerm ? `Búsqueda: "${paymentsSearchTerm}"` : undefined}
                                totalRecords={filteredPagos.length}
                                totalRecordsLabel="Total Pagos"
                            />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Gasto Fijo</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Monto</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Moneda</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Forma Pago</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Observaciones</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {currentPagos.map((pago, index) => (
                                        <tr key={pago.id} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150`}>
                                            <td className="px-6 py-4 text-gray-400 dark:text-gray-500 font-medium">{(currentPagosPage - 1) * itemsPerPage + index + 1}</td>
                                            <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-medium">{formatDate(pago.fecha)}</td>
                                            <td className="px-6 py-4 font-medium text-gray-700 dark:text-gray-300">
                                                {pago.gastoFijo?.gasto_fijo || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{pago.monto}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{pago.moneda}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{pago.formaPago?.forma_pago || 'N/A'}</td>
                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm max-w-xs truncate">{pago.observaciones}</td>
                                            <td className="px-6 py-4 text-center no-print">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handlePrintRecibo(pago)}
                                                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                        title="Imprimir Recibo"
                                                    >
                                                        <Printer size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditPayment(pago)}
                                                        className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                        title="Editar"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => pago.id && handleDeletePayment(pago.id)}
                                                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPagos.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="p-6 text-center text-gray-400 dark:text-gray-500">
                                                No se encontraron pagos registrados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="hidden print:block p-4 mt-6">
                            <StandardPrintFooter />
                        </div>
                    </div>

                    {/* Pagination Controls for Pagos */}
                    {totalPagosPages > 1 && (
                        <div className="no-print">
                            <Pagination
                                currentPage={currentPagosPage}
                                totalPages={totalPagosPages}
                                onPageChange={paginatePagos}
                            />
                        </div>
                    )}
                </>
            )}

            {showPaymentForm && selectedGasto && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 no-print">
                    <PagosGastosFijosForm
                        gastoFijo={selectedGasto}
                        existingPayment={selectedPayment}
                        onClose={() => setShowPaymentForm(false)}
                        onSave={() => {
                            fetchGastos();
                            fetchPagos();
                        }}
                    />
                </div>
            )}
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Gastos Fijos"
                sections={manualSections}
            />
            {/* Print Selection Modal */}
            {showPrintModal && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowPrintModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${modalMode === 'excel' ? 'bg-green-100 text-green-600' : modalMode === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {modalMode === 'excel' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                        {modalMode === 'pdf' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                        {modalMode === 'print' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>}
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                            {modalMode === 'excel' ? 'Exportar a Excel' : modalMode === 'pdf' ? 'Exportar a PDF' : 'Imprimir'}
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                Seleccione los filtros para generar el reporte:
                                            </p>

                                            {/* Periodo Filter */}
                                            <div className="mb-4">
                                                <label htmlFor="periodo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Periodo / Tipo
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                    </div>
                                                    <select
                                                        id="periodo"
                                                        value={printPeriodo}
                                                        onChange={(e) => setPrintPeriodo(e.target.value)}
                                                        className="block w-full pl-10 pr-10 py-2.5 text-base border-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow shadow-sm"
                                                    >
                                                        <option value="todos">Todos los periodos</option>
                                                        <option value="mensual">Mensual</option>
                                                        <option value="anual">Anual</option>
                                                    </select>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${modalMode === 'excel' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                                        modalMode === 'pdf' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                                            'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                        }`}
                                    onClick={handleConfirmPrint}
                                >
                                    {modalMode === 'excel' ? 'Exportar Excel' : modalMode === 'pdf' ? 'Exportar PDF' : 'Imprimir'}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowPrintModal(false)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Pagos Print Modal */}
            {showPagosPrintModal && (
                <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowPagosPrintModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${pagosModalMode === 'excel' ? 'bg-green-100 text-green-600' : pagosModalMode === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {pagosModalMode === 'excel' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                                        {pagosModalMode === 'pdf' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                        {pagosModalMode === 'print' && <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>}
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                            {pagosModalMode === 'excel' ? 'Exportar a Excel' : pagosModalMode === 'pdf' ? 'Exportar a PDF' : 'Imprimir'} Historial de Pagos
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                                Seleccione los filtros para su reporte:
                                            </p>
                                            <div className="grid gap-4">
                                                <label htmlFor="pagoGasto" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Filtrar por Gasto Fijo
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                                        </svg>
                                                    </div>
                                                    <select
                                                        id="pagoGasto"
                                                        value={printPagoGastoFilter}
                                                        onChange={(e) => setPrintPagoGastoFilter(e.target.value)}
                                                        className="block w-full pl-10 pr-10 py-2.5 text-base border-2 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white transition-shadow shadow-sm"
                                                    >
                                                        <option value="todos">Todos los gastos</option>
                                                        {gastos.filter(g => (g.estado === 'activo' || !g.estado)).map(g => (
                                                            <option key={g.id} value={g.gasto_fijo}>{g.gasto_fijo}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${pagosModalMode === 'excel' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                                        pagosModalMode === 'pdf' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                                            'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                        }`}
                                    onClick={handleConfirmPagosPrint}
                                >
                                    {pagosModalMode === 'excel' ? 'Exportar Excel' : pagosModalMode === 'pdf' ? 'Exportar PDF' : 'Imprimir'}
                                </button>
                                <button
                                    type="button"
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    onClick={() => setShowPagosPrintModal(false)}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <GastosFijosModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    fetchGastos();
                    setShowCreateModal(false);
                }}
                gastoToEdit={gastoToEdit}
            />
        </div>
    );
};

export default GastosFijosList;
