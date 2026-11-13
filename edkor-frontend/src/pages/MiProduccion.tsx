import { useState, useEffect } from "react";
import { User, Calendar, DollarSign, Clock, Search, CheckCircle, AlertCircle, FileCheck, Wrench, CheckSquare, Layers } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getPersonal } from "../services/personalService";
import { getTrabajosAsignadosFilter, type TrabajoAsignado } from "../services/trabajosAsignadosService";
import type { Personal } from "../types/personal";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { exportStandardPDF } from "../utils/pdfExportHelper";
import { StandardExportToolbar } from "../components/common/StandardExportToolbar";
import { StandardPrintHeader, StandardPrintFooter } from "../components/common/StandardPrintHeader";
import ManualModal, { type ManualSection } from "../components/ManualModal";

const ESTADOS_TERMINADOS = [
    "terminado",
    "terminada",
    "terminados",
    "finalizado",
    "finalizada",
    "cerrada",
    "cerrado",
    "orden_cerrada",
    "orden cerrada",
    "entregado",
    "entregado_con_saldo",
    "entregado_por_pagar"
];

const MiProduccion = () => {
    const { user } = useAuth();
    const [personalList, setPersonalList] = useState<Personal[]>([]);
    const [trabajos, setTrabajos] = useState<TrabajoAsignado[]>([]);
    const [loading, setLoading] = useState(false);

    // Si el usuario es mecánico, bloqueamos su ID; si es admin, puede seleccionar
    const [selectedPersonalId, setSelectedPersonalId] = useState<number | "">("");
    const [isMecanicoUser, setIsMecanicoUser] = useState(false);

    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [tabEstado, setTabEstado] = useState<"todos" | "terminados" | "en_proceso">("todos");
    const [showManual, setShowManual] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);

    const isMecanicoArea = (p: Personal) => {
        const areaName = (p.area?.area || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        return areaName === "mecanico";
    };

    const isOtTerminada = (t: TrabajoAsignado) => {
        const estado = (t.detalle_orden_trabajo?.orden_trabajo?.estado || "").toLowerCase().trim();
        return ESTADOS_TERMINADOS.includes(estado);
    };

    const getTiempoHoras = (t: TrabajoAsignado): number => {
        const val = t.detalle_orden_trabajo?.tiempo_estimado ?? t.tiempo_estimado;
        const num = Number(val);
        return (!isNaN(num) && num > 0) ? num : 0;
    };

    const filterTrabajos = (list: TrabajoAsignado[], validMecanicos: Personal[], personalIdFilter?: number | "") => {
        if (!Array.isArray(list)) return [];
        const mecanicoIds = new Set(validMecanicos.map(m => String(m.id)));

        return list.filter(t => {
            if (t.detalle_orden_trabajo?.estado_trabajo === "descartado") return false;

            // Filtro por mecánico
            const tPersonalId = String(t.personal?.id || t.idpersonal);
            if (personalIdFilter) {
                if (tPersonalId !== String(personalIdFilter)) return false;
            } else if (mecanicoIds.size > 0 && !mecanicoIds.has(tPersonalId)) {
                return false;
            }

            return true;
        });
    };

    useEffect(() => {
        loadInitialData();
    }, [user]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [personalData, trabajosData] = await Promise.all([
                getPersonal(),
                getTrabajosAsignadosFilter({
                    soloMecanicos: true
                })
            ]);

            const mecanicos = (Array.isArray(personalData) ? personalData : []).filter(
                p => p.estado === "activo" && isMecanicoArea(p)
            );
            setPersonalList(mecanicos);

            // Determinar si el usuario logueado es mecánico
            const loggedPersonalId = user?.personal_id || user?.personal?.id;
            let targetPersonalId: number | "" = "";

            if (loggedPersonalId) {
                const isUserMec = mecanicos.some(m => Number(m.id) === Number(loggedPersonalId));
                if (isUserMec) {
                    targetPersonalId = Number(loggedPersonalId);
                    setIsMecanicoUser(true);
                    setSelectedPersonalId(targetPersonalId);
                }
            }

            setTrabajos(filterTrabajos(trabajosData, mecanicos, targetPersonalId));
        } catch (error) {
            console.error("Error loading mi produccion data:", error);
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
                soloMecanicos: true
            });
            setTrabajos(filterTrabajos(data, personalList, selectedPersonalId));
        } catch (error) {
            console.error("Error filtering trabajos:", error);
            Swal.fire("Error", "No se pudieron filtrar los trabajos", "error");
        } finally {
            setLoading(false);
        }
    };

    // Clasificación de trabajos
    const trabajosTerminados = trabajos.filter(t => isOtTerminada(t));
    const trabajosEnProceso = trabajos.filter(t => !isOtTerminada(t));

    // Cálculos de KPIs
    // 1. Horas concluidas y monto de concluidas
    const totalHorasProducidas = trabajosTerminados.reduce((acc, t) => acc + getTiempoHoras(t), 0);

    const totalMontoProducido = trabajosTerminados.reduce((acc, t) => acc + Number(t.monto || 0), 0);
    const totalPagado = trabajosTerminados.filter(t => t.cancelado).reduce((acc, t) => acc + Number(t.monto || 0), 0);
    const totalPendientePago = trabajosTerminados.filter(t => !t.cancelado).reduce((acc, t) => acc + Number(t.monto || 0), 0);

    // 2. Horas y trabajos en proceso
    const totalHorasEnProceso = trabajosEnProceso.reduce((acc, t) => acc + getTiempoHoras(t), 0);

    // Trabajos a desplegar según la pestaña seleccionada
    const trabajosMostrados = tabEstado === "todos"
        ? trabajos
        : tabEstado === "terminados"
            ? trabajosTerminados
            : trabajosEnProceso;

    const formatFecha = (fechaStr?: string) => {
        if (!fechaStr) return "-";
        const parts = fechaStr.split("T")[0].split("-");
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return new Date(fechaStr).toLocaleDateString();
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(trabajosMostrados.map(t => {
            const ot = t.detalle_orden_trabajo?.orden_trabajo;
            const esTerminada = isOtTerminada(t);
            const tiempoHoras = getTiempoHoras(t);
            return {
                'OT': ot?.id ? `#${ot.id}` : 'S/N',
                'Fecha Asignación': formatFecha(t.fecha_asignado),
                'Vehículo': `${ot?.placa || '-'} (${ot?.marca_auto?.marca || ''} ${ot?.modelo || ''})`.trim(),
                'Cliente': ot?.cliente || '-',
                'Mecánico': t.personal ? `${t.personal.nombre} ${t.personal.paterno}` : '-',
                'Trabajo': t.detalle_orden_trabajo?.detalle || t.detalle_orden_trabajo?.precio_taller?.detalle || 'Sin detalle',
                'Tiempo (Hrs)': tiempoHoras > 0 ? tiempoHoras.toFixed(2) : '0',
                'Monto (Bs)': Number(t.monto || 0).toFixed(2),
                'Estado OT': esTerminada ? 'Terminada' : 'En Proceso',
                'Estado Pago': t.cancelado ? 'Pagado' : 'Pendiente'
            };
        }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "MiProduccion");
        XLSX.writeFile(workbook, `Mi_Produccion_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const exportToPDF = async () => {
        const selectedMec = personalList.find(p => p.id === selectedPersonalId);
        const filtros: string[] = [];
        if (selectedMec) filtros.push(`Mecánico: ${selectedMec.nombre} ${selectedMec.paterno}`);
        if (tabEstado !== 'todos') filtros.push(`Vista: ${tabEstado === 'terminados' ? 'Concluidos' : 'En Proceso'}`);
        if (fechaInicio) filtros.push(`Desde: ${fechaInicio}`);
        if (fechaFin) filtros.push(`Hasta: ${fechaFin}`);

        await exportStandardPDF({
            title: 'Reporte de Mi Producción y Control de Horas',
            subtitle: 'EDKOR MOTORS - Detalle de Trabajos y Rendimiento',
            filtersText: filtros.length > 0 ? filtros.join(' | ') : undefined,
            totalRecords: trabajosMostrados.length,
            totalRecordsLabel: 'Trabajos Registrados',
            filename: `Mi_Produccion_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'OT', 'Vehículo / Cliente', 'Mecánico', 'Trabajo', 'Hrs', 'Monto (Bs)', 'Estado OT', 'Pago']],
                body: trabajosMostrados.map((t, idx) => {
                    const ot = t.detalle_orden_trabajo?.orden_trabajo;
                    const esTerminada = isOtTerminada(t);
                    const tiempoHoras = getTiempoHoras(t);
                    return [
                        idx + 1,
                        ot?.id ? `#${ot.id}` : '-',
                        `${ot?.placa || '-'} - ${ot?.cliente || ''}`.trim(),
                        t.personal ? `${t.personal.nombre} ${t.personal.paterno}` : '-',
                        t.detalle_orden_trabajo?.detalle || t.detalle_orden_trabajo?.precio_taller?.detalle || '-',
                        tiempoHoras > 0 ? tiempoHoras.toFixed(1) : '-',
                        `Bs ${Number(t.monto || 0).toFixed(2)}`,
                        esTerminada ? 'TERMINADA' : 'EN PROCESO',
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
                    6: { halign: 'right', cellWidth: 24, fontStyle: 'bold' },
                    7: { halign: 'center', cellWidth: 22, fontSize: 6.5 },
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
            title: 'Mi Producción y Horas',
            content: 'Permite visualizar y controlar las horas concluidas, los trabajos en proceso y los montos devengados por mecánico.'
        },
        {
            title: 'Filtro por Pestañas',
            content: 'Puede filtrar entre "Todos los Trabajos", "Concluidos (OTs Terminadas)" y "En Proceso" para conocer la carga de trabajo pendiente.'
        }
    ];

    return (
        <>
        <div className="container mx-auto p-6 max-w-7xl print:hidden">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Clock className="text-blue-600" size={32} />
                        Mi Producción y Control de Horas
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Control de trabajos asignados, horas producidas y órdenes en proceso
                    </p>
                </div>
                <StandardExportToolbar
                    onExportExcel={exportToExcel}
                    onExportPDF={exportToPDF}
                    onPrint={printList}
                    onHelp={() => setShowManual(true)}
                    helpTitle="Ayuda / Manual"
                />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* KPI 1: Horas Producidas */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Clock size={15} className="text-blue-600" />
                        Horas Concluidas
                    </p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                        {totalHorasProducidas.toFixed(2)} hrs
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        En {trabajosTerminados.length} trabajos concluidos
                    </p>
                </div>

                {/* KPI 2: Monto Producido */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <DollarSign size={15} className="text-emerald-600" />
                        Monto Producido
                    </p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        Bs {totalMontoProducido.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Órdenes terminadas / cerradas</p>
                </div>

                {/* KPI 3: Trabajos en Proceso */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Wrench size={15} className="text-amber-600" />
                        En Proceso (Por Terminar)
                    </p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                        {trabajosEnProceso.length} trabajos
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                        ~{totalHorasEnProceso.toFixed(2)} hrs por completar
                    </p>
                </div>

                {/* KPI 4: Pendiente de Pago */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <AlertCircle size={15} className="text-red-600" />
                        Pendiente de Pago
                    </p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                        Bs {totalPendientePago.toFixed(2)}
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                        Pagado / Planilla: Bs {totalPagado.toFixed(2)}
                    </p>
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
                                disabled={isMecanicoUser}
                                className={`w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none ${
                                    isMecanicoUser ? "opacity-75 cursor-not-allowed bg-gray-100 dark:bg-gray-800" : ""
                                }`}
                            >
                                {!isMecanicoUser && <option value="">Todos los mecánicos</option>}
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

            {/* Segmented Controls / Tabs for O.T. Status */}
            <div className="flex gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                <button
                    onClick={() => setTabEstado("todos")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tabEstado === "todos"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    <Layers size={16} />
                    Todos ({trabajos.length})
                </button>
                <button
                    onClick={() => setTabEstado("terminados")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tabEstado === "terminados"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    <CheckSquare size={16} />
                    Horas Concluidas ({trabajosTerminados.length})
                </button>
                <button
                    onClick={() => setTabEstado("en_proceso")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tabEstado === "en_proceso"
                            ? "bg-amber-600 text-white shadow-sm"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                >
                    <Wrench size={16} />
                    En Proceso por Terminar ({trabajosEnProceso.length})
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">OT / Fecha</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Vehículo</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Mecánico</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Trabajo Asignado</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Horas Estimadas</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-right">Monto Mec.</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Estado O.T.</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase text-center">Estado Pago</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {trabajosMostrados.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                        No se encontraron trabajos asignados en este criterio.
                                    </td>
                                </tr>
                            ) : (
                                trabajosMostrados.map((t) => {
                                    const ot = t.detalle_orden_trabajo?.orden_trabajo;
                                    const tiempoHoras = getTiempoHoras(t);
                                    const esTerminada = isOtTerminada(t);
                                    const otEstado = (ot?.estado || "en_proceso").toLowerCase().trim();

                                    return (
                                        <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-3 text-sm">
                                                <div className="font-bold text-blue-600 dark:text-blue-400">
                                                    {ot?.id ? `OT #${ot.id}` : "S/N"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {formatFecha(t.fecha_asignado)}
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm">
                                                <div className="font-bold text-gray-800 dark:text-gray-200">
                                                    {ot?.placa || "-"}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {ot?.marca_auto?.marca || ""} {ot?.modelo || ""}
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                                                {t.personal ? `${t.personal.nombre} ${t.personal.paterno}` : "-"}
                                            </td>
                                            <td className="p-3 text-sm text-gray-700 dark:text-gray-200">
                                                {t.detalle_orden_trabajo?.detalle || t.detalle_orden_trabajo?.precio_taller?.detalle || "Sin detalle"}
                                            </td>
                                            <td className="p-3 text-xs text-center">
                                                <div className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                                                    <Clock size={13} className="shrink-0" />
                                                    <span>{tiempoHoras > 0 ? `${tiempoHoras.toFixed(2)} hrs` : "-"}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-right font-bold text-gray-800 dark:text-gray-100">
                                                Bs {Number(t.monto || 0).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-center text-xs">
                                                {esTerminada ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 uppercase">
                                                        <CheckCircle size={11} />
                                                        {otEstado === "cerrada" ? "Cerrada" : "Terminada"}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 uppercase">
                                                        <Wrench size={11} />
                                                        En Proceso
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center text-xs">
                                                {!esTerminada ? (
                                                    <span className="text-xs text-gray-400 italic">
                                                        Pendiente de cierre OT
                                                    </span>
                                                ) : t.cancelado ? (
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
                title="REPORTE DE MI PRODUCCIÓN Y HORAS"
                subtitle="Control de Horas Concluidas y Rendimiento Técnico"
                filtersText={(() => {
                    const selectedMec = personalList.find(p => p.id === selectedPersonalId);
                    const filtros: string[] = [];
                    if (selectedMec) filtros.push(`Mecánico: ${selectedMec.nombre} ${selectedMec.paterno}`);
                    if (tabEstado !== 'todos') filtros.push(`Filtro: ${tabEstado === 'terminados' ? 'Concluidos' : 'En Proceso'}`);
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
                        <th className="border border-gray-300 p-1.5">Trabajo Asignado</th>
                        <th className="border border-gray-300 p-1.5 text-center">Hrs</th>
                        <th className="border border-gray-300 p-1.5 text-right">Monto</th>
                        <th className="border border-gray-300 p-1.5 text-center">Estado OT</th>
                        <th className="border border-gray-300 p-1.5 text-center">Pago</th>
                    </tr>
                </thead>
                <tbody>
                    {trabajosMostrados.map((t, idx) => {
                        const ot = t.detalle_orden_trabajo?.orden_trabajo;
                        const esTerminada = isOtTerminada(t);
                        const tiempoHoras = getTiempoHoras(t);
                        return (
                            <tr key={t.id} className="border-b border-gray-200">
                                <td className="border border-gray-200 p-1.5 text-center">{idx + 1}</td>
                                <td className="border border-gray-200 p-1.5 text-center font-bold">{ot?.id ? `#${ot.id}` : '-'}</td>
                                <td className="border border-gray-200 p-1.5">{ot?.placa || '-'} - {ot?.cliente || ''}</td>
                                <td className="border border-gray-200 p-1.5">{t.personal ? `${t.personal.nombre} ${t.personal.paterno}` : '-'}</td>
                                <td className="border border-gray-200 p-1.5">{t.detalle_orden_trabajo?.detalle || t.detalle_orden_trabajo?.precio_taller?.detalle || '-'}</td>
                                <td className="border border-gray-200 p-1.5 text-center">{tiempoHoras > 0 ? tiempoHoras.toFixed(1) : '-'}</td>
                                <td className="border border-gray-200 p-1.5 text-right font-bold">Bs {Number(t.monto || 0).toFixed(2)}</td>
                                <td className="border border-gray-200 p-1.5 text-center font-semibold">{esTerminada ? 'TERMINADA' : 'EN PROCESO'}</td>
                                <td className="border border-gray-200 p-1.5 text-center font-semibold">{t.cancelado ? 'PAGADO' : 'PENDIENTE'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div className="mt-4 flex justify-between items-center text-xs border-t pt-2 border-gray-300">
                <span>Total Registros: <strong>{trabajosMostrados.length}</strong></span>
                <span className="font-bold">Total Horas: {totalHorasProducidas.toFixed(2)} hrs | Monto Producido: Bs {totalMontoProducido.toFixed(2)}</span>
            </div>

            <StandardPrintFooter />
        </div>

        <ManualModal
            isOpen={showManual}
            onClose={() => setShowManual(false)}
            title="Manual - Mi Producción"
            sections={manualSections}
        />
        </>
    );
};

export default MiProduccion;
