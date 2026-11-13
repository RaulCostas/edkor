import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, User, Calendar, DollarSign, Clock, Search, CheckCircle, AlertCircle, FileCheck } from "lucide-react";
import { getPersonal } from "../services/personalService";
import { getTrabajosAsignadosFilter, type TrabajoAsignado } from "../services/trabajosAsignadosService";
import type { Personal } from "../types/personal";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { exportStandardPDF } from "../utils/pdfExportHelper";
import { StandardExportToolbar } from "../components/common/StandardExportToolbar";
import { StandardPrintHeader, StandardPrintFooter } from "../components/common/StandardPrintHeader";
import ManualModal, { type ManualSection } from "../components/ManualModal";

const PersonalProduccion = () => {
    const navigate = useNavigate();
    const [personalList, setPersonalList] = useState<Personal[]>([]);
    const [trabajos, setTrabajos] = useState<TrabajoAsignado[]>([]);
    const [loading, setLoading] = useState(false);
    const [showManual, setShowManual] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    const [selectedPersonalId, setSelectedPersonalId] = useState<number | "">("");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");


    const isMecanico = (p: Personal) => {
        const areaName = (p.area?.area || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        return areaName === "mecanico";
    };

    const getTiempoHoras = (t: TrabajoAsignado): number => {
        const val = t.detalle_orden_trabajo?.tiempo_estimado ?? t.tiempo_estimado;
        const num = Number(val);
        return (!isNaN(num) && num > 0) ? num : 0;
    };

    const filterTrabajos = (list: TrabajoAsignado[], validMecanicos: Personal[]) => {
        if (!Array.isArray(list)) return [];
        const mecanicoIds = new Set(validMecanicos.map(m => String(m.id)));
        return list.filter(t => {
            if (t.detalle_orden_trabajo?.estado_trabajo === "descartado") return false;

            // Solo mostrar trabajos de órdenes de trabajo con estado "terminado" o "cerrada"
            const otEstado = (t.detalle_orden_trabajo?.orden_trabajo?.estado || "").toLowerCase().trim();
            const isOrdenTerminada = otEstado === "terminado" || otEstado === "terminados" || otEstado === "finalizado" || otEstado === "cerrada" || otEstado === "orden_cerrada" || otEstado === "orden cerrada";
            if (!isOrdenTerminada) return false;

            // Solo personal con el área "Mecánico"
            if (t.personal) {
                const personalArea = (t.personal.area?.area || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
                if (personalArea && personalArea !== "mecanico") return false;
                if (mecanicoIds.size > 0 && !mecanicoIds.has(String(t.personal.id || t.idpersonal))) return false;
            }
            return true;
        });
    };

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [personalData, trabajosData] = await Promise.all([
                getPersonal(),
                getTrabajosAsignadosFilter({
                    ordenEstado: "terminado",
                    soloMecanicos: true
                })
            ]);
            const mecanicos = (Array.isArray(personalData) ? personalData : []).filter(
                p => p.estado === "activo" && isMecanico(p)
            );
            setPersonalList(mecanicos);
            setTrabajos(filterTrabajos(trabajosData, mecanicos));
        } catch (error) {
            console.error("Error loading produccion data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilter = async () => {
        setLoading(true);
        try {
            const data = await getTrabajosAsignadosFilter({
                personalId: selectedPersonalId ? Number(selectedPersonalId) : undefined,
                fechaInicio: fechaInicio || undefined,
                fechaFin: fechaFin || undefined,
                ordenEstado: "terminado",
                soloMecanicos: true
            });
            setTrabajos(filterTrabajos(data, personalList));
        } catch (error) {
            console.error("Error filtering trabajos:", error);
            Swal.fire("Error", "No se pudieron filtrar los trabajos", "error");
        } finally {
            setLoading(false);
        }
    };

    const totalFacturadoOrden = trabajos.reduce((acc, t) => acc + Number(t.detalle_orden_trabajo?.total || 0), 0);
    const totalArancelMecanico = trabajos.reduce((acc, t) => {
        const ca = t.costo_arancel !== undefined && t.costo_arancel !== null && Number(t.costo_arancel) > 0
            ? Number(t.costo_arancel)
            : Number(t.detalle_orden_trabajo?.precio_hora || t.detalle_orden_trabajo?.precio_taller?.precio_hora || 0);
        return acc + ca;
    }, 0);
    const totalMontoMecanico = trabajos.reduce((acc, t) => acc + Number(t.monto || 0), 0);
    const totalPagado = trabajos.filter(t => t.cancelado).reduce((acc, t) => acc + Number(t.monto || 0), 0);
    const totalPendientePago = trabajos.filter(t => !t.cancelado).reduce((acc, t) => acc + Number(t.monto || 0), 0);

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(trabajos.map(t => {
            const ot = t.detalle_orden_trabajo?.orden_trabajo;
            const tiempoHoras = getTiempoHoras(t);
            const costoArancel = t.costo_arancel !== undefined && t.costo_arancel !== null && Number(t.costo_arancel) > 0
                ? Number(t.costo_arancel)
                : Number(t.detalle_orden_trabajo?.precio_hora || t.detalle_orden_trabajo?.precio_taller?.precio_hora || 0);
            return {
                'OT': ot?.id ? `#${ot.id}` : 'S/N',
                'Fecha Asignación': t.fecha_asignado ? new Date(t.fecha_asignado).toLocaleDateString() : '-',
                'Vehículo': `${ot?.placa || '-'} (${ot?.marca_auto?.marca || ''} ${ot?.modelo || ''})`.trim(),
                'Cliente': ot?.cliente || '-',
                'Mecánico': t.personal ? `${t.personal.nombre} ${t.personal.paterno}` : '-',
                'Trabajo Realizado': t.detalle_orden_trabajo?.detalle || t.detalle_orden_trabajo?.precio_taller?.detalle || 'Sin detalle',
                'Tiempo (Horas)': tiempoHoras > 0 ? tiempoHoras.toFixed(2) : '0',
                'Arancel Mecánico (Bs)': costoArancel.toFixed(2),
                'Monto Mecánico (Bs)': Number(t.monto || 0).toFixed(2),
                'Estado Pago': t.cancelado ? 'Pagado' : 'Pendiente'
            };
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Produccion");
        XLSX.writeFile(workbook, `Produccion_Personal_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        const selectedMec = personalList.find(p => p.id === selectedPersonalId);
        const filtros: string[] = [];
        if (selectedMec) filtros.push(`Mecánico: ${selectedMec.nombre} ${selectedMec.paterno}`);
        if (fechaInicio) filtros.push(`Desde: ${fechaInicio}`);
        if (fechaFin) filtros.push(`Hasta: ${fechaFin}`);

        await exportStandardPDF({
            title: 'Reporte de Producción de Mecánicos',
            subtitle: 'EDKOR MOTORS - Evaluación de Trabajos en Órdenes Terminadas',
            filtersText: filtros.length > 0 ? filtros.join(' | ') : undefined,
            totalRecords: trabajos.length,
            totalRecordsLabel: 'Trabajos Registrados',
            filename: `Produccion_Mecanicos_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'OT', 'Vehículo / Cliente', 'Mecánico', 'Trabajo Realizado', 'Hrs', 'Arancel (Bs)', 'Monto (Bs)', 'Estado']],
                body: trabajos.map((t, idx) => {
                    const ot = t.detalle_orden_trabajo?.orden_trabajo;
                    const tiempoHoras = getTiempoHoras(t);
                    const costoArancel = t.costo_arancel !== undefined && t.costo_arancel !== null && Number(t.costo_arancel) > 0
                        ? Number(t.costo_arancel)
                        : Number(t.detalle_orden_trabajo?.precio_hora || t.detalle_orden_trabajo?.precio_taller?.precio_hora || 0);
                    return [
                        idx + 1,
                        ot?.id ? `#${ot.id}` : '-',
                        `${ot?.placa || '-'} - ${ot?.cliente || ''}`.trim(),
                        t.personal ? `${t.personal.nombre} ${t.personal.paterno}` : '-',
                        t.detalle_orden_trabajo?.detalle || t.detalle_orden_trabajo?.precio_taller?.detalle || '-',
                        tiempoHoras > 0 ? tiempoHoras.toFixed(1) : '-',
                        `Bs ${costoArancel.toFixed(2)}`,
                        `Bs ${Number(t.monto || 0).toFixed(2)}`,
                        t.cancelado ? 'PAGADO' : 'PENDIENTE'
                    ];
                }),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 8 },
                    1: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
                    2: { cellWidth: 45 },
                    3: { cellWidth: 35 },
                    4: { cellWidth: 'auto' },
                    5: { halign: 'center', cellWidth: 14 },
                    6: { halign: 'right', cellWidth: 24 },
                    7: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
                    8: { halign: 'center', cellWidth: 20, fontSize: 6.5, fontStyle: 'bold' }
                }
            }
        });
    };

    const printList = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 150);
    };

    const manualSections: ManualSection[] = [
        {
            title: 'Producción de Personal',
            content: 'Monitorea los trabajos ejecutados por los mecánicos asignados a Órdenes de Trabajo terminadas.'
        },
        {
            title: 'Arancel vs Monto Asignado',
            content: 'El Arancel Mecánico corresponde a la tarifa base por hora/trabajo según tarifario, y el Monto Mecánico es el valor real asignado a pagar.'
        },
        {
            title: 'Integración con Planillas',
            content: 'Al generar la Planilla de Sueldos mensual, los montos de producción pendientes se liquidan y quedan marcados como pagados.'
        }
    ];

    return (
        <>
        <div className="container mx-auto p-6 max-w-7xl print:hidden">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <TrendingUp className="text-blue-600" size={32} />
                        Producción y Evaluación de Mecánicos
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Control de trabajos ejecutados por Mecánicos en Órdenes de Trabajo terminadas
                    </p>
                </div>
                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={printList}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual"
                >
                    <button
                        onClick={() => navigate("/personal/planillas")}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-md transition-all transform hover:-translate-y-0.5 text-sm"
                    >
                        <DollarSign size={18} />
                        Ir a Planillas
                    </button>
                </StandardExportToolbar>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Trabajos Realizados</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{trabajos.length}</p>
                    <p className="text-xs text-green-600 mt-1">
                        En Órdenes de Trabajo Terminadas
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Facturado en OT (Taller)</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">Bs {totalFacturadoOrden.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1">Valor cobrado al cliente</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Costo Mecánico (Arancel)</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">Bs {totalArancelMecanico.toFixed(2)}</p>
                    <p className="text-xs text-gray-400 mt-1">Asignado: Bs {totalMontoMecanico.toFixed(2)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Pendiente de Pago</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">Bs {totalPendientePago.toFixed(2)}</p>
                    <p className="text-xs text-green-600 mt-1">Pagado: Bs {totalPagado.toFixed(2)}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                            Mecánico
                        </label>
                        <div className="relative">
                            <User size={16} className="absolute left-3 top-3 text-gray-400" />
                            <select
                                value={selectedPersonalId}
                                onChange={(e) => setSelectedPersonalId(e.target.value ? Number(e.target.value) : "")}
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Todos los mecánicos</option>
                                {personalList.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre} {p.paterno} {p.materno}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                            Desde Fecha
                        </label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                            Hasta Fecha
                        </label>
                        <div className="relative">
                            <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            onClick={handleFilter}
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            <Search size={18} />
                            Filtrar
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">OT / Fecha</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Vehículo / Cliente</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Mecánico</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Trabajo Realizado</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">T. Estimado vs Real</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Arancel Mec.</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Monto Mec.</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Estado Pago</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {trabajos.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron trabajos de mecánicos con órdenes de trabajo terminadas.
                                    </td>
                                </tr>
                            ) : (
                                trabajos.map((t) => {
                                    const ot = t.detalle_orden_trabajo?.orden_trabajo;
                                    const tiempoHoras = getTiempoHoras(t);
                                    const costoArancel = t.costo_arancel !== undefined && t.costo_arancel !== null && Number(t.costo_arancel) > 0
                                        ? Number(t.costo_arancel)
                                        : Number(t.detalle_orden_trabajo?.precio_hora || t.detalle_orden_trabajo?.precio_taller?.precio_hora || 0);

                                    return (
                                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-3 text-sm">
                                                <div className="font-bold text-blue-600 dark:text-blue-400">
                                                    {ot?.id ? `OT #${ot.id}` : "S/N"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {new Date(t.fecha_asignado).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm">
                                                <div className="font-bold text-gray-800 dark:text-gray-200">
                                                    {ot?.placa || "-"} ({ot?.marca_auto?.marca || ""} {ot?.modelo || ""})
                                                </div>
                                                <div className="text-xs text-gray-500">{ot?.cliente || ""}</div>
                                            </td>
                                            <td className="p-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {t.personal ? `${t.personal.nombre} ${t.personal.paterno}` : "-"}
                                            </td>
                                            <td className="p-3 text-sm text-gray-700 dark:text-gray-200">
                                                {t.detalle_orden_trabajo?.detalle || t.detalle_orden_trabajo?.precio_taller?.detalle || "Sin detalle"}
                                            </td>
                                            <td className="p-3 text-xs">
                                                <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                                                    <Clock size={13} className="shrink-0" />
                                                    <span>{tiempoHoras > 0 ? `${tiempoHoras.toFixed(2)} hrs` : "-"}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-right font-semibold text-amber-600 dark:text-amber-400">
                                                Bs {costoArancel.toFixed(2)}
                                            </td>
                                            <td className="p-3 text-sm text-right font-bold text-gray-800 dark:text-gray-100">
                                                Bs {Number(t.monto || 0).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-center text-xs">
                                                {t.cancelado ? (
                                                    t.idplanilla || t.planilla ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                                            <FileCheck size={11} />
                                                            Planilla {t.planilla ? `${String(t.planilla.mes).padStart(2, '0')}/${t.planilla.anio}` : ''}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                                            <CheckCircle size={11} />
                                                            Pagado
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                                        <AlertCircle size={11} />
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Printable View */}
        <div className="hidden print:block font-sans text-black p-4 bg-white min-h-screen">
            <StandardPrintHeader
                title="REPORTE DE PRODUCCIÓN DE MECÁNICOS"
                subtitle="Evaluación de Trabajos en Órdenes de Trabajo Terminadas"
                filtersText={(() => {
                    const selectedMec = personalList.find(p => p.id === selectedPersonalId);
                    const filtros: string[] = [];
                    if (selectedMec) filtros.push(`Mecánico: ${selectedMec.nombre} ${selectedMec.paterno}`);
                    if (fechaInicio) filtros.push(`Desde: ${fechaInicio}`);
                    if (fechaFin) filtros.push(`Hasta: ${fechaFin}`);
                    return filtros.length > 0 ? filtros.join(' | ') : undefined;
                })()}
            />

            <table className="w-full text-left border-collapse border border-gray-400 text-xs mt-3">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-400">
                        <th className="border border-gray-300 p-1.5 text-center w-8">#</th>
                        <th className="border border-gray-300 p-1.5 text-center">OT</th>
                        <th className="border border-gray-300 p-1.5">Vehículo / Cliente</th>
                        <th className="border border-gray-300 p-1.5">Mecánico</th>
                        <th className="border border-gray-300 p-1.5">Trabajo Realizado</th>
                        <th className="border border-gray-300 p-1.5 text-center">Hrs</th>
                        <th className="border border-gray-300 p-1.5 text-right">Arancel</th>
                        <th className="border border-gray-300 p-1.5 text-right">Monto</th>
                        <th className="border border-gray-300 p-1.5 text-center">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {trabajos.map((t, idx) => {
                        const ot = t.detalle_orden_trabajo?.orden_trabajo;
                        const tiempoHoras = getTiempoHoras(t);
                        const costoArancel = t.costo_arancel !== undefined && t.costo_arancel !== null && Number(t.costo_arancel) > 0
                            ? Number(t.costo_arancel)
                            : Number(t.detalle_orden_trabajo?.precio_hora || t.detalle_orden_trabajo?.precio_taller?.precio_hora || 0);
                        return (
                            <tr key={t.id} className="border-b border-gray-200">
                                <td className="border border-gray-200 p-1.5 text-center">{idx + 1}</td>
                                <td className="border border-gray-200 p-1.5 text-center font-bold">{ot?.id ? `#${ot.id}` : '-'}</td>
                                <td className="border border-gray-200 p-1.5">{ot?.placa || '-'} - {ot?.cliente || ''}</td>
                                <td className="border border-gray-200 p-1.5">{t.personal ? `${t.personal.nombre} ${t.personal.paterno}` : '-'}</td>
                                <td className="border border-gray-200 p-1.5">{t.detalle_orden_trabajo?.detalle || t.detalle_orden_trabajo?.precio_taller?.detalle || '-'}</td>
                                <td className="border border-gray-200 p-1.5 text-center">{tiempoHoras > 0 ? tiempoHoras.toFixed(1) : '-'}</td>
                                <td className="border border-gray-200 p-1.5 text-right">Bs {costoArancel.toFixed(2)}</td>
                                <td className="border border-gray-200 p-1.5 text-right font-bold">Bs {Number(t.monto || 0).toFixed(2)}</td>
                                <td className="border border-gray-200 p-1.5 text-center font-semibold">{t.cancelado ? 'PAGADO' : 'PENDIENTE'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="mt-4 flex justify-between items-center text-xs border-t pt-2 border-gray-300">
                <span>Total Registros: <strong>{trabajos.length}</strong></span>
                <span className="font-bold">Total Facturado OT: Bs {totalFacturadoOrden.toFixed(2)} | Total Mecánicos: Bs {totalMontoMecanico.toFixed(2)}</span>
            </div>

            <StandardPrintFooter />
        </div>

        <ManualModal
            isOpen={showManual}
            onClose={() => setShowManual(false)}
            title="Manual - Producción de Personal"
            sections={manualSections}
        />
        </>
    );
};

export default PersonalProduccion;
