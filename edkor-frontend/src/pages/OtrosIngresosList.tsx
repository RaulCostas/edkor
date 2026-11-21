import React, { useEffect, useState } from "react";
import {
  Plus,
  DollarSign,
  Eye,
  Printer,
  Pencil,
  Trash2,
  X,
  Package,
  Wrench,
  HelpCircle,
  FileText,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import Pagination from "../components/Pagination";
import ManualModal, { type ManualSection } from "../components/ManualModal";
import { StandardExportToolbar } from "../components/common/StandardExportToolbar";
import { getLocalDateString } from "../utils/dateUtils";
import type { OtroIngreso, CreateOtroIngresoData } from "../types/otroIngreso";
import {
  getOtrosIngresos,
  createOtroIngreso,
  updateOtroIngreso,
  deleteOtroIngreso,
  getOtroIngreso,
} from "../services/otrosIngresosService";
import OtroIngresoModal from "../components/OtroIngresoModal";
import OtrosIngresosPrintView from "../components/OtrosIngresosPrintView";

const OtrosIngresosList: React.FC = () => {
  const [ingresos, setIngresos] = useState<OtroIngreso[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipo, setSelectedTipo] = useState<string>("");
  const [selectedMoneda, setSelectedMoneda] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<
    "todos" | "hoy" | "ayer" | "semana"
  >("todos");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OtroIngreso | null>(null);
  const [selectedIngreso, setSelectedIngreso] = useState<OtroIngreso | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [isPrintingList, setIsPrintingList] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getOtrosIngresos();
      setIngresos(data);
    } catch (error) {
      console.error("Error al cargar otros ingresos:", error);
      Swal.fire("Error", "No se pudieron cargar los registros de otros ingresos", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormModalOpen(true);
  };

  const handleOpenEdit = (item: OtroIngreso) => {
    setEditingItem(item);
    setFormModalOpen(true);
  };

  const handleSave = async (data: CreateOtroIngresoData) => {
    if (editingItem) {
      await updateOtroIngreso(editingItem.id, data);
    } else {
      await createOtroIngreso(data);
    }
    await loadData();
  };

  const handleView = async (id: number) => {
    try {
      const data = await getOtroIngreso(id);
      setSelectedIngreso(data);
      setViewModalOpen(true);
    } catch (error) {
      Swal.fire("Error", "No se pudo cargar el comprobante", "error");
    }
  };

  const handlePrintSingle = async (id: number) => {
    try {
      const data = await getOtroIngreso(id);
      setIsPrintingList(false);
      setSelectedIngreso(data);
      setTimeout(() => {
        window.print();
      }, 350);
    } catch (error) {
      Swal.fire("Error", "No se pudo preparar la impresión", "error");
    }
  };

  const handleDelete = async (id: number) => {
    const target = ingresos.find((i) => i.id === id);
    const result = await Swal.fire({
      title: "¿Está seguro?",
      text: target?.descontar_stock && target?.inventario
        ? `Se eliminará el ingreso N° ${target.nro || target.id}. La cantidad de ${target.cantidad} unidad(es) será devuelta al stock de inventario.`
        : "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await deleteOtroIngreso(id);
        setIngresos((prev) => prev.filter((i) => i.id !== id));
        Swal.fire("Eliminado", "El registro ha sido eliminado exitosamente.", "success");
      } catch (error) {
        Swal.fire("Error", "No se pudo eliminar el registro", "error");
      }
    }
  };

  const filteredIngresos = ingresos.filter((item) => {
    const matchesSearch =
      item.motivo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nro?.toString().includes(searchTerm) ||
      (item.asesor
        ? `${item.asesor.nombre} ${item.asesor.paterno || ""}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        : false);

    if (!matchesSearch) return false;

    if (selectedTipo && item.tipo_ingreso !== selectedTipo) {
      return false;
    }

    if (selectedMoneda && item.moneda !== selectedMoneda) {
      return false;
    }

    if (selectedDateFilter !== "todos") {
      const todayStr = getLocalDateString(new Date());
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterdayDate);

      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const mondayDate = new Date(now);
      mondayDate.setDate(now.getDate() - diffToMonday);
      const mondayStr = getLocalDateString(mondayDate);

      const itemDate = getLocalDateString(item.fecha || (item as any).created_at);

      if (selectedDateFilter === "hoy" && itemDate !== todayStr) return false;
      if (selectedDateFilter === "ayer" && itemDate !== yesterdayStr) return false;
      if (
        selectedDateFilter === "semana" &&
        (itemDate < mondayStr || itemDate > todayStr)
      )
        return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredIngresos.length / itemsPerPage);
  const paginatedIngresos = filteredIngresos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Totales
  const totalBs = filteredIngresos
    .filter((i) => (i.moneda || "Bolivianos") === "Bolivianos")
    .reduce((sum, i) => sum + Number(i.monto || 0), 0);

  const totalSus = filteredIngresos
    .filter((i) => i.moneda === "Dólares")
    .reduce((sum, i) => sum + Number(i.monto || 0), 0);

  // Exportar Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredIngresos.map((item, idx) => ({
        "#": idx + 1,
        "N° Comprobante": String(item.nro || item.id).padStart(6, "0"),
        Fecha: item.fecha
          ? new Date(item.fecha).toLocaleDateString("es-ES")
          : "-",
        Tipo: item.tipo_ingreso || "Venta de Insumo",
        "Motivo / Detalle": item.motivo,
        Monto: Number(item.monto || 0).toFixed(2),
        Moneda: item.moneda || "Bolivianos",
        "Forma de Pago": item.forma_pago?.forma_pago || "-",
        Cliente: item.cliente || "-",
        Teléfono: item.telefono_cliente || "-",
        Placa: item.placa || "-",
        Asesor: item.asesor
          ? `${item.asesor.nombre || ""} ${item.asesor.paterno || ""}`.trim()
          : "-",
        "Item Inventario": item.inventario?.descripcion || "-",
        "Cant. Vendida": item.cantidad || 1,
        "Stock Descontado": item.descontar_stock ? "SÍ" : "NO",
        Observaciones: item.observacion || "-",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "OtrosIngresos");
    XLSX.writeFile(
      workbook,
      `OtrosIngresos_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  // Exportar PDF
  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("EDKOR MOTORS - REPORTE DE OTROS INGRESOS", margin, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Filtros aplicados: ${selectedTipo || "Todos los tipos"} | Moneda: ${selectedMoneda || "Todas"} | Fecha: ${selectedDateFilter.toUpperCase()}`,
      margin,
      17
    );

    const fechaHoy = new Date().toLocaleDateString("es-ES");
    const horaHoy = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `Total Registros: ${filteredIngresos.length}  |  Total Bs: ${totalBs.toFixed(2)}  |  Total $us: ${totalSus.toFixed(2)}`,
      pageWidth - margin,
      12,
      { align: "right" }
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generado: ${fechaHoy} ${horaHoy}`, pageWidth - margin, 17, {
      align: "right",
    });

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.4);
    doc.line(margin, 20, pageWidth - margin, 20);

    autoTable(doc, {
      startY: 23,
      head: [
        [
          "#",
          "N°",
          "Fecha",
          "Tipo",
          "Motivo / Concepto",
          "Monto",
          "Forma Pago",
          "Cliente / Placa",
          "Asesor",
          "Stock Inv.",
        ],
      ],
      body: filteredIngresos.map((item, index) => [
        index + 1,
        String(item.nro || item.id).padStart(6, "0"),
        item.fecha ? new Date(item.fecha).toLocaleDateString("es-ES") : "-",
        item.tipo_ingreso || "Venta",
        item.motivo,
        `${item.moneda === "Dólares" ? "$us" : "Bs"} ${Number(item.monto || 0).toFixed(2)}`,
        item.forma_pago?.forma_pago || "-",
        `${item.cliente || "-"}${item.placa ? ` (${item.placa})` : ""}`,
        item.asesor
          ? `${item.asesor.nombre || ""} ${item.asesor.paterno || ""}`.trim()
          : "-",
        item.inventario
          ? `${item.cantidad || 1} x ${item.inventario.descripcion}`
          : "N/A",
      ]),
      foot: [
        [
          {
            content: `TOTALES: ${filteredIngresos.length} REGISTROS   |   TOTAL BS: ${totalBs.toFixed(2)}   |   TOTAL $US: ${totalSus.toFixed(2)}`,
            colSpan: 10,
            styles: { halign: "right", fontStyle: "bold" },
          },
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        fontSize: 7.5,
        halign: "left",
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [15, 23, 42],
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontSize: 8,
      },
      margin: { left: margin, right: margin },
    });

    doc.save(`OtrosIngresos_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const printList = () => {
    setSelectedIngreso(null);
    setIsPrintingList(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const manualSections: ManualSection[] = [
    {
      title: "Módulo de Otros Ingresos",
      content:
        "Este módulo permite registrar todos los ingresos económicos al taller que no corresponden a una Hoja de Recepción u Orden de Trabajo formal, por ejemplo: venta directa de aditivos/refrigerantes, auxilio mecánico en carretera, recargas rápidas, o servicios exprés.",
    },
    {
      title: "Control de Inventario y Aditivos",
      content:
        "Al registrar un aditivo o producto, puede activar la casilla 'Vincular con Producto de Inventario'. El sistema verificará el stock disponible y, al guardar, descontará automáticamente la cantidad vendida del inventario, registrando la salida en el Kardex. Si se elimina o anula el ingreso, el stock se restituye automáticamente.",
    },
    {
      title: "Integración Financiera",
      content:
        "Los ingresos aquí registrados se reflejan automáticamente en la pestaña 'Otros Ingresos' de la Hoja Diaria y se suman a los totales de Ingresos en el módulo de Utilidades.",
    },
  ];

  return (
    <>
      <div className="container mx-auto relative min-h-screen print:hidden">
        {/* Encabezado Principal */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
              <DollarSign className="text-blue-600" size={32} />
              Otros Ingresos
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Registro y control de ingresos por venta de aditivos, auxilios mecánicos y servicios directos
            </p>
          </div>
          <StandardExportToolbar
            onExportExcel={exportToExcel}
            onExportPDF={exportToPDF}
            onPrint={printList}
            onHelp={() => setShowManual(true)}
            helpTitle="Ayuda / Manual de Otros Ingresos"
          >
            <button
              onClick={handleOpenCreate}
              className="bg-[#3498db] hover:bg-[#2980b9] text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium text-xs sm:text-sm cursor-pointer"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Nuevo Ingreso
            </button>
          </StandardExportToolbar>
        </div>

        {/* Tarjetas Resumen de Totales Rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 no-print">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                Total Registros
              </p>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                {filteredIngresos.length}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <FileText size={22} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                Total Bolivianos (Bs)
              </p>
              <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
                Bs {totalBs.toFixed(2)}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <DollarSign size={22} />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
                Total Dólares ($us)
              </p>
              <h3 className="text-xl font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
                $us {totalSus.toFixed(2)}
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <DollarSign size={22} />
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros Rápidos (Idéntica a HojaRecepcionList) */}
        <div className="mb-6 flex flex-wrap items-center gap-3 no-print">
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por motivo, cliente, placa o asesor..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-xs transition-all text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={selectedTipo}
              onChange={(e) => {
                setSelectedTipo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-48 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-xs transition-all text-sm cursor-pointer"
            >
              <option value="">Todos los Tipos</option>
              <option value="Venta de Insumo">Venta de Insumo</option>
              <option value="Auxilio Mecánico">Auxilio Mecánico</option>
              <option value="Servicio Rápido">Servicio Rápido</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={selectedMoneda}
              onChange={(e) => {
                setSelectedMoneda(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-xs transition-all text-sm cursor-pointer"
            >
              <option value="">Todas las Monedas</option>
              <option value="Bolivianos">Bolivianos (Bs)</option>
              <option value="Dólares">Dólares ($us)</option>
            </select>
          </div>

          {/* Filtro Rápido de Fechas: Todas, Hoy, Ayer, Esta Semana */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => {
                setSelectedDateFilter("todos");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedDateFilter === "todos"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDateFilter("hoy");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedDateFilter === "hoy"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Ingresos registrados hoy"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDateFilter("ayer");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedDateFilter === "ayer"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Ingresos registrados ayer"
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDateFilter("semana");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedDateFilter === "semana"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Ingresos de esta semana"
            >
              Esta Semana
            </button>
          </div>

          {(searchTerm ||
            selectedTipo ||
            selectedMoneda ||
            selectedDateFilter !== "todos") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedTipo("");
                setSelectedMoneda("");
                setSelectedDateFilter("todos");
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors border border-red-200 dark:border-red-800 flex items-center gap-1 cursor-pointer shrink-0"
              title="Limpiar filtros"
            >
              <X className="h-4 w-4" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        {/* Contador de registros */}
        <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
          Mostrando{" "}
          {filteredIngresos.length === 0
            ? 0
            : (currentPage - 1) * itemsPerPage + 1}{" "}
          - {Math.min(currentPage * itemsPerPage, filteredIngresos.length)} de{" "}
          {filteredIngresos.length} registros
        </div>

        {/* Tabla Principal */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                    #
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    N° Ingreso
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Motivo / Descripción
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Forma Pago
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente / Placa
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Asesor
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right no-print">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500">
                      Cargando registros de otros ingresos...
                    </td>
                  </tr>
                ) : filteredIngresos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <DollarSign className="h-8 w-8 text-gray-400" />
                        <p>No se encontraron registros de otros ingresos</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedIngresos.map((item, index) => {
                    const isVenta = item.tipo_ingreso === "Venta de Insumo";
                    const isAuxilio = item.tipo_ingreso === "Auxilio Mecánico";
                    const isServicio = item.tipo_ingreso === "Servicio Rápido";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="p-4 text-blue-600 dark:text-blue-400 font-bold text-sm">
                          {String(item.nro || item.id).padStart(6, "0")}
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-200 text-sm whitespace-nowrap">
                          {item.fecha
                            ? new Date(item.fecha).toLocaleDateString("es-ES")
                            : "-"}
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold border ${
                              isVenta
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                                : isAuxilio
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                                : isServicio
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                            }`}
                          >
                            {item.tipo_ingreso || "Venta de Insumo"}
                          </span>
                        </td>
                        <td className="p-4 text-gray-800 dark:text-gray-200 text-sm">
                          <div className="font-medium">{item.motivo}</div>
                          {item.inventario && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                              <Package size={12} />
                              <span>
                                {item.cantidad || 1} x {item.inventario.descripcion}
                                {item.descontar_stock ? " (Stock descontado)" : ""}
                              </span>
                            </div>
                          )}
                          {item.observacion && (
                            <div className="text-xs text-gray-400 italic mt-0.5">
                              Obs: {item.observacion}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-gray-900 dark:text-white font-bold text-sm whitespace-nowrap">
                          <span
                            className={
                              item.moneda === "Dólares"
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }
                          >
                            {item.moneda === "Dólares" ? "$us" : "Bs"}{" "}
                            {Number(item.monto || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-300 text-sm">
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                            {item.forma_pago?.forma_pago || "Efectivo"}
                          </span>
                          {item.comprobante && (
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {item.comprobante}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                          <div>{item.cliente || "Cliente General"}</div>
                          {item.placa && (
                            <span className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                              {item.placa.toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                          {item.asesor
                            ? `${item.asesor.nombre} ${item.asesor.paterno || ""}`.trim()
                            : "-"}
                        </td>
                        <td className="p-4 text-right no-print">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleView(item.id)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors cursor-pointer"
                              title="Ver Comprobante"
                            >
                              <Eye size={17} />
                            </button>
                            <button
                              onClick={() => handlePrintSingle(item.id)}
                              className="p-1.5 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                              title="Imprimir Comprobante"
                            >
                              <Printer size={17} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-center no-print">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </div>

      {/* Modal Formulario Registro / Edición */}
      <OtroIngresoModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={loadData}
        initialData={editingItem}
        onSubmit={handleSave}
      />

      {/* Modal Ver Comprobante */}
      {viewModalOpen && selectedIngreso && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="bg-gray-100 dark:bg-gray-700 px-6 py-3 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FileText size={18} />
                Comprobante de Ingreso N° {String(selectedIngreso.nro || selectedIngreso.id).padStart(6, "0")}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintSingle(selectedIngreso.id)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={15} /> Imprimir
                </button>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="p-1 text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <OtrosIngresosPrintView ingreso={selectedIngreso} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ayuda / Manual */}
      <ManualModal
        isOpen={showManual}
        onClose={() => setShowManual(false)}
        title="Manual de Usuario - Otros Ingresos"
        sections={manualSections}
      />

      {/* Vista de Impresión Oculta (Activa solo al mandar a imprimir) */}
      <div className="hidden print:block">
        {selectedIngreso ? (
          <OtrosIngresosPrintView ingreso={selectedIngreso} />
        ) : (
          <div className="p-4">
            <h1 className="text-xl font-bold mb-2">EDKOR MOTORS - Reporte de Otros Ingresos</h1>
            <p className="text-xs text-gray-500 mb-4">
              Fecha: {new Date().toLocaleDateString("es-ES")} | Total Registros: {filteredIngresos.length}
            </p>
            <table className="w-full text-xs border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">#</th>
                  <th className="border p-2">N°</th>
                  <th className="border p-2">Fecha</th>
                  <th className="border p-2">Tipo</th>
                  <th className="border p-2">Motivo</th>
                  <th className="border p-2">Monto</th>
                  <th className="border p-2">Forma Pago</th>
                  <th className="border p-2">Cliente</th>
                  <th className="border p-2">Asesor</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngresos.map((i, idx) => (
                  <tr key={i.id}>
                    <td className="border p-1.5 text-center">{idx + 1}</td>
                    <td className="border p-1.5 text-center font-bold">{i.nro || i.id}</td>
                    <td className="border p-1.5 text-center">
                      {i.fecha ? new Date(i.fecha).toLocaleDateString("es-ES") : "-"}
                    </td>
                    <td className="border p-1.5">{i.tipo_ingreso}</td>
                    <td className="border p-1.5">{i.motivo}</td>
                    <td className="border p-1.5 text-right font-bold">
                      {i.moneda === "Dólares" ? "$us" : "Bs"} {Number(i.monto || 0).toFixed(2)}
                    </td>
                    <td className="border p-1.5">{i.forma_pago?.forma_pago || "-"}</td>
                    <td className="border p-1.5">{i.cliente || "-"}</td>
                    <td className="border p-1.5">
                      {i.asesor ? `${i.asesor.nombre} ${i.asesor.paterno || ""}` : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default OtrosIngresosList;
