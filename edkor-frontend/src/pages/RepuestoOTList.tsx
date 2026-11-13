import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Package,
  Eye,
  Pencil,
  Trash2,
  X,
  Car,
  CheckCircle2,
  Save,
  Hash,
} from "lucide-react";
import Pagination from "../components/Pagination";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import {
  getCargasRepuestos,
  deleteCargaRepuesto,
  updateCargaRepuesto,
} from "../services/repuestoOTService";
import type { DetalleOrdenTrabajo } from "../types/detalleOrdenTrabajo";
import { exportStandardPDF } from "../utils/pdfExportHelper";
import { StandardExportToolbar } from "../components/common/StandardExportToolbar";
import { StandardPrintHeader, StandardPrintFooter } from "../components/common/StandardPrintHeader";
import ManualModal, { type ManualSection } from "../components/ManualModal";

const RepuestoOTList = () => {
  const navigate = useNavigate();
  const [cargas, setCargas] = useState<DetalleOrdenTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEstadoOT, setSelectedEstadoOT] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showManual, setShowManual] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const itemsPerPage = 10;
  const [selectedCarga, setSelectedCarga] = useState<DetalleOrdenTrabajo | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Estado para modal de edición
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCarga, setEditingCarga] = useState<DetalleOrdenTrabajo | null>(null);
  const [editCantidad, setEditCantidad] = useState<string>("1");
  const [editObservaciones, setEditObservaciones] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchCargas = async () => {
    try {
      setLoading(true);
      const data = await getCargasRepuestos();
      setCargas(data);
    } catch (error) {
      console.error("Error al cargar repuestos:", error);
      Swal.fire(
        "Error",
        "No se pudieron cargar los repuestos asignados a órdenes de trabajo",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCargas();
  }, []);

  const handleOpenEdit = (carga: DetalleOrdenTrabajo) => {
    const est = (carga.orden_trabajo?.estado || "").toLowerCase();
    if (
      est.includes("cerrad") ||
      est.includes("entregad") ||
      est.includes("finaliz") ||
      est.includes("terminad") ||
      est.includes("anulad")
    ) {
      Swal.fire({
        icon: "warning",
        title: "Acción bloqueada",
        text: "No se puede editar un repuesto de una orden de trabajo cerrada o entregada.",
      });
      return;
    }

    setEditingCarga(carga);
    setEditCantidad(String(carga.cantidad));
    setEditObservaciones(carga.observaciones || "");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCarga) return;

    const cantVal = parseFloat(editCantidad) || 0;
    if (cantVal <= 0) {
      Swal.fire("Atención", "La cantidad debe ser mayor a 0", "warning");
      return;
    }

    const stockActual = Number(editingCarga.inventario?.cantidad_existente || 0);
    const cantAnterior = Number(editingCarga.cantidad || 0);
    const maxDisponible = stockActual + cantAnterior;

    if (cantVal > maxDisponible) {
      Swal.fire({
        icon: "error",
        title: "Stock Insuficiente",
        text: `La cantidad ingresada (${cantVal}) supera el stock disponible en almacén (${maxDisponible}).`,
      });
      return;
    }

    const precioCompra = Number(editingCarga.inventario?.precio_compra || 0);
    const totalCostoCalc = Number((precioCompra * cantVal).toFixed(2));

    try {
      setSavingEdit(true);
      await updateCargaRepuesto(editingCarga.id, {
        cantidad: cantVal,
        observaciones: editObservaciones.trim() || undefined,
        total_costo: totalCostoCalc,
      });

      setCargas((prev) =>
        prev.map((c) =>
          c.id === editingCarga.id
            ? {
                ...c,
                cantidad: cantVal,
                observaciones: editObservaciones.trim() || undefined,
                total_costo: totalCostoCalc,
              }
            : c
        )
      );

      setEditModalOpen(false);
      setEditingCarga(null);

      await Swal.fire({
        icon: "success",
        title: "Actualizado",
        text: "El repuesto asignado fue actualizado correctamente.",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error("Error al actualizar carga:", error);
      Swal.fire("Error", "No se pudo actualizar el repuesto", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (carga: DetalleOrdenTrabajo) => {
    const ordenEst = (carga.orden_trabajo?.estado || "").toLowerCase();
    if (
      ordenEst.includes("cerrad") ||
      ordenEst.includes("entregad") ||
      ordenEst.includes("finaliz") ||
      ordenEst.includes("terminad") ||
      ordenEst.includes("anulad")
    ) {
      Swal.fire({
        icon: "warning",
        title: "Acción bloqueada",
        text: "No se puede retirar un repuesto de una orden de trabajo cerrada, entregada, finalizada o anulada.",
      });
      return;
    }

    const repuestoNombre = carga.inventario?.descripcion || carga.detalle || "este repuesto";
    const result = await Swal.fire({
      title: "¿Retirar repuesto de la Orden?",
      html: `¿Está seguro de retirar <b>${repuestoNombre}</b> (Cant: ${carga.cantidad}) de la Orden de Trabajo #<b>${
        carga.orden_trabajo?.id || ""
      }</b>?<br/><span class="text-xs text-gray-500 mt-2 block">El stock será reintegrado automáticamente al inventario.</span>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, retirar y reintegrar",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        await deleteCargaRepuesto(carga.id);
        setCargas((prev) => prev.filter((c) => c.id !== carga.id));
        Swal.fire(
          "Repuesto retirado",
          "El ítem fue retirado de la orden y el stock se reintegró al inventario.",
          "success"
        );
      } catch (error) {
        console.error("Error eliminando carga:", error);
        Swal.fire("Error", "No se pudo retirar el repuesto de la orden", "error");
      }
    }
  };

  const getEstadoBadgeClass = (estado?: string) => {
    const est = (estado || "").toLowerCase();
    if (est.includes("creada")) {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800";
    }
    if (est.includes("proceso")) {
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800";
    }
    if (est.includes("terminad") || est.includes("finaliz")) {
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800";
    }
    if (est.includes("cerrad")) {
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700";
    }
    if (est.includes("anulad")) {
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800";
    }
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800";
  };

  const filteredCargas = cargas.filter((c) => {
    const ot = c.orden_trabajo;
    const inv = c.inventario;
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      (ot?.cliente_nombre && ot.cliente_nombre.toLowerCase().includes(term)) ||
      (ot?.vehiculo_placa && ot.vehiculo_placa.toLowerCase().includes(term)) ||
      (ot?.id && ot.id.toString().includes(term)) ||
      (c.id && c.id.toString().includes(term)) ||
      (inv?.codigo && inv.codigo.toLowerCase().includes(term)) ||
      (inv?.descripcion && inv.descripcion.toLowerCase().includes(term)) ||
      (c.detalle && c.detalle.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (selectedEstadoOT) {
      const est = (ot?.estado || "").toLowerCase();
      if (!est.includes(selectedEstadoOT.toLowerCase())) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredCargas.length / itemsPerPage);
  const paginatedCargas = filteredCargas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredCargas.map((carga, idx) => {
      const ot = carga.orden_trabajo;
      const inv = carga.inventario;
      return {
        '#': idx + 1,
        'OT': ot?.id ? `#${String(ot.id).padStart(6, '0')}` : '-',
        'Fecha OT': ot?.fecha_registro ? new Date(ot.fecha_registro).toLocaleDateString() : '-',
        'Placa': ot?.vehiculo_placa || '-',
        'Vehículo': `${ot?.marca_auto?.marca || ot?.vehiculo_marca || ''} ${ot?.vehiculo_modelo || ''}`.trim(),
        'Cliente': ot?.cliente_nombre || '-',
        'Repuesto / Insumo': inv?.descripcion || carga.detalle || '-',
        'Código': inv?.codigo || '-',
        'Cantidad': carga.cantidad,
        'Estado OT': (ot?.estado || '-').toUpperCase()
      };
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RepuestosOT");
    XLSX.writeFile(workbook, `Repuestos_Cargados_OT_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = async () => {
    const filtros: string[] = [];
    if (searchTerm) filtros.push(`Búsqueda: "${searchTerm}"`);
    if (selectedEstadoOT) filtros.push(`Estado OT: ${selectedEstadoOT}`);

    await exportStandardPDF({
      title: 'Repuestos y Materiales Asignados a O.T.',
      subtitle: 'EDKOR MOTORS - Despacho de Repuestos de Almacén a Órdenes de Trabajo',
      filtersText: filtros.length > 0 ? filtros.join(' | ') : undefined,
      totalRecords: filteredCargas.length,
      totalRecordsLabel: 'Despachos Registrados',
      filename: `Repuestos_OT_${new Date().toISOString().split('T')[0]}.pdf`,
      tableOptions: {
        head: [['#', 'OT', 'Fecha', 'Placa', 'Vehículo / Cliente', 'Repuesto Asignado', 'Cant.', 'Estado OT']],
        body: filteredCargas.map((carga, idx) => {
          const ot = carga.orden_trabajo;
          const inv = carga.inventario;
          return [
            idx + 1,
            ot?.id ? `#${String(ot.id).padStart(6, '0')}` : '-',
            ot?.fecha_registro ? new Date(ot.fecha_registro).toLocaleDateString() : '-',
            ot?.vehiculo_placa || '-',
            `${ot?.marca_auto?.marca || ot?.vehiculo_marca || ''} - ${ot?.cliente_nombre || ''}`.trim(),
            inv?.codigo ? `[${inv.codigo}] ${inv.descripcion || carga.detalle}` : (inv?.descripcion || carga.detalle || '-'),
            carga.cantidad,
            (ot?.estado || '-').toUpperCase()
          ];
        }),
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
          4: { cellWidth: 45 },
          5: { cellWidth: 'auto', fontStyle: 'bold' },
          6: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
          7: { halign: 'center', cellWidth: 22, fontSize: 6.5, fontStyle: 'bold' }
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
      title: 'Cargar Repuestos a O.T.',
      content: 'Permite registrar la salida de piezas, insumos y repuestos desde el almacén e imputarlos directamente a una Orden de Trabajo activa.'
    },
    {
      title: 'Descuento de Inventario',
      content: 'Al cargar un repuesto, la cantidad existente en inventario se descuenta automáticamente según el método PEPS / FIFO.'
    },
    {
      title: 'Restricciones de Edición',
      content: 'No se pueden modificar repuestos en órdenes de trabajo que ya hayan sido entregadas, cerradas o anuladas.'
    }
  ];

  return (
    <>
      <div className="container mx-auto relative min-h-screen print:hidden">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
              <Package className="text-blue-600" size={32} />
              Cargar Repuestos a O.T.
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Despacho y asignación directa de repuestos de almacén a las órdenes de trabajo
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
              onClick={() => navigate("/inventario/cargar-repuestos/nuevo")}
              className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium"
            >
              <Plus className="h-5 w-5" /> Cargar Repuesto
            </button>
          </StandardExportToolbar>
        </div>

        {/* Filtros */}
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
              placeholder="Buscar por repuesto, código, placa o N° OT..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={selectedEstadoOT}
              onChange={(e) => {
                setSelectedEstadoOT(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-56 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all text-sm cursor-pointer"
            >
              <option value="">Todos los Estados de OT</option>
              <option value="creada">Orden Creada</option>
              <option value="proceso">En Proceso</option>
              <option value="terminad">Terminado / Finalizado</option>
              <option value="cerrad">Orden Cerrada</option>
            </select>
          </div>

          {(searchTerm || selectedEstadoOT) && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedEstadoOT("");
                setCurrentPage(1);
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
          Mostrando {filteredCargas.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{" "}
          {Math.min(currentPage * itemsPerPage, filteredCargas.length)} de {filteredCargas.length} registros
        </div>

        {/* Tabla idéntica a Hoja de Recepción */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-14">
                    #
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    N° OT
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha OT
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Placa
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Vehículo
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Repuesto Asignado
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Cant.
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado OT
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
                      Cargando repuestos asignados...
                    </td>
                  </tr>
                ) : filteredCargas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-gray-400" />
                        <p>No se encontraron repuestos cargados a órdenes de trabajo</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedCargas.map((carga, index) => {
                    const ot = carga.orden_trabajo;
                    const inv = carga.inventario;
                    const fechaOT = ot?.fecha_registro
                      ? new Date(ot.fecha_registro).toLocaleDateString()
                      : "-";

                    const est = (ot?.estado || "").toLowerCase();
                    const isBloqueada =
                      est.includes("cerrad") ||
                      est.includes("entregad") ||
                      est.includes("terminad") ||
                      est.includes("finaliz") ||
                      est.includes("anulad");

                    return (
                      <tr
                        key={carga.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="p-4 text-blue-600 dark:text-blue-400 font-bold text-sm">
                          {ot?.id ? `OT #${String(ot.id).padStart(6, "0")}` : "-"}
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                          {fechaOT}
                        </td>
                        <td className="p-4 text-gray-800 dark:text-gray-200 font-mono font-bold uppercase text-sm">
                          {(ot?.vehiculo_placa || "S/P").toUpperCase()}
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {ot?.marca_auto?.marca || ot?.vehiculo_marca || "N/A"}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {ot?.vehiculo_modelo || ""}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-200 font-medium text-sm">
                          {ot?.cliente_nombre || "Cliente no registrado"}
                        </td>
                        <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                          <div className="flex flex-col max-w-xs">
                            <div className="font-semibold flex items-center gap-1.5 text-gray-900 dark:text-white">
                              {inv?.codigo && (
                                <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                  [{inv.codigo}]
                                </span>
                              )}
                              <span>{inv?.descripcion || carga.detalle}</span>
                            </div>
                            {carga.observaciones && (
                              <span className="text-xs text-gray-400 italic truncate mt-0.5" title={carga.observaciones}>
                                Nota: {carga.observaciones}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-mono">
                            {carga.cantidad}
                          </span>
                        </td>
                        <td className="p-4 text-sm">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getEstadoBadgeClass(
                              ot?.estado
                            )}`}
                          >
                            {ot?.estado || "En Proceso"}
                          </span>
                        </td>
                        <td className="p-4 text-right no-print">
                          <div className="flex justify-end gap-1.5">
                            {/* 1. Ver */}
                            <button
                              onClick={() => {
                                setSelectedCarga(carga);
                                setViewModalOpen(true);
                              }}
                              className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                              title="Ver Comprobante de Carga"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* 2. Editar (Al medio) */}
                            <button
                              onClick={() => !isBloqueada && handleOpenEdit(carga)}
                              disabled={isBloqueada}
                              className={`p-2 rounded-lg shadow-sm transition-all ${
                                isBloqueada
                                  ? "bg-gray-200 dark:bg-gray-700/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                  : "bg-amber-400 hover:bg-amber-500 text-white transform hover:-translate-y-0.5 cursor-pointer"
                              }`}
                              title={
                                isBloqueada
                                  ? "Orden cerrada o entregada: edición bloqueada"
                                  : "Editar repuesto asignado"
                              }
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* 3. Eliminar */}
                            <button
                              onClick={() => !isBloqueada && handleDelete(carga)}
                              disabled={isBloqueada}
                              className={`p-2 rounded-lg shadow-sm transition-all ${
                                isBloqueada
                                  ? "bg-gray-200 dark:bg-gray-700/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                  : "bg-red-500 hover:bg-red-600 text-white transform hover:-translate-y-0.5 cursor-pointer"
                              }`}
                              title={
                                isBloqueada
                                  ? "Orden cerrada o entregada: retiro bloqueado"
                                  : "Retirar repuesto y reintegrar al stock"
                              }
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* Paginación idéntica a Hoja de Recepción */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalle / Ficha de Despacho */}
      {viewModalOpen && selectedCarga && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 print:hidden animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Package size={20} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                    Detalle de Repuesto Asignado
                  </h2>
                  <p className="text-xs text-gray-500">
                    Registro de entrega de repuesto a Orden de Trabajo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              {/* Bloque OT / Vehículo */}
              <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
                  <Car size={14} className="text-blue-500" /> Datos de la Orden de Trabajo
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-xs text-gray-400 block">N° Orden</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                      OT #{String(selectedCarga.orden_trabajo?.id || "").padStart(6, "0")}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Placa</span>
                    <span className="font-bold font-mono text-gray-900 dark:text-white">
                      {(selectedCarga.orden_trabajo?.vehiculo_placa || "S/P").toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Vehículo</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                      {selectedCarga.orden_trabajo?.marca_auto?.marca || selectedCarga.orden_trabajo?.vehiculo_marca}{" "}
                      {selectedCarga.orden_trabajo?.vehiculo_modelo}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-gray-400 block">Cliente</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {selectedCarga.orden_trabajo?.cliente_nombre || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Estado OT</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getEstadoBadgeClass(
                        selectedCarga.orden_trabajo?.estado
                      )}`}
                    >
                      {selectedCarga.orden_trabajo?.estado || "En Proceso"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloque Repuesto */}
              <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-1.5">
                  <Package size={14} /> Información del Repuesto
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Descripción</span>
                    <p className="text-base font-bold text-gray-900 dark:text-white">
                      {selectedCarga.inventario?.codigo && (
                        <span className="font-mono text-purple-600 dark:text-purple-400 mr-2">
                          [{selectedCarga.inventario.codigo}]
                        </span>
                      )}
                      {selectedCarga.inventario?.descripcion || selectedCarga.detalle}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-100 dark:border-purple-900/40">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Cantidad Despachada</span>
                      <span className="text-lg font-bold font-mono text-purple-800 dark:text-purple-300">
                        {selectedCarga.cantidad}{" "}
                        <span className="text-xs font-normal text-gray-500">
                          {selectedCarga.inventario?.unidad_medida?.medida || "uds."}
                        </span>
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Stock Actual en Almacén</span>
                      <span className="font-semibold text-gray-700 dark:text-gray-300 font-mono">
                        {selectedCarga.inventario?.cantidad_existente !== undefined
                          ? selectedCarga.inventario.cantidad_existente
                          : "-"}{" "}
                        uds.
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 block">Estado Asignación</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 size={13} /> Cargado a OT
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              {selectedCarga.observaciones && (
                <div className="bg-gray-50 dark:bg-gray-700/30 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-400 block mb-1">Notas de Entrega / Observaciones:</span>
                  <p className="text-gray-700 dark:text-gray-200 italic">
                    "{selectedCarga.observaciones}"
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición del Repuesto Asignado */}
      {editModalOpen && editingCarga && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 print:hidden animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col border border-gray-200 dark:border-gray-700">
            {/* Cabecera del Modal */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-lg">
                  <Pencil size={18} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                    Editar Repuesto Asignado
                  </h2>
                  <p className="text-xs text-gray-500">
                    Modifique la cantidad o nota del repuesto entregado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Formulario */}
            <div className="p-6 space-y-4 text-sm">
              {/* Información de la OT (Solo lectura) */}
              <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Orden de Trabajo</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">
                    OT #{String(editingCarga.orden_trabajo?.id || "").padStart(6, "0")}
                  </span>
                </div>
                <div className="flex items-center justify-between font-semibold text-gray-800 dark:text-gray-200 text-sm">
                  <span>Placa: {(editingCarga.orden_trabajo?.vehiculo_placa || "S/P").toUpperCase()}</span>
                  <span>{editingCarga.orden_trabajo?.cliente_nombre || "Cliente"}</span>
                </div>
              </div>

              {/* Información del Repuesto */}
              <div className="p-3.5 rounded-lg bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 mb-1">
                  <Package size={14} />
                  <span>Repuesto</span>
                </div>
                <p className="font-bold text-gray-900 dark:text-white">
                  {editingCarga.inventario?.codigo && (
                    <span className="font-mono text-purple-600 dark:text-purple-400 mr-1.5">
                      [{editingCarga.inventario.codigo}]
                    </span>
                  )}
                  {editingCarga.inventario?.descripcion || editingCarga.detalle}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Stock actual en almacén:{" "}
                  <strong className="text-gray-800 dark:text-gray-200 font-mono">
                    {editingCarga.inventario?.cantidad_existente !== undefined
                      ? editingCarga.inventario.cantidad_existente
                      : "-"}{" "}
                    {editingCarga.inventario?.unidad_medida?.medida || "uds."}
                  </strong>
                </p>
              </div>

              {/* Cantidad Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Cantidad Despachada *
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={editCantidad}
                    onChange={(e) => setEditCantidad(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Máximo disponible sumando entrega actual:{" "}
                  {Number(editingCarga.inventario?.cantidad_existente || 0) + Number(editingCarga.cantidad || 0)}{" "}
                  {editingCarga.inventario?.unidad_medida?.medida || "uds."}
                </p>
              </div>

              {/* Observaciones Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Observaciones / Notas de Despacho
                </label>
                <input
                  type="text"
                  value={editObservaciones}
                  onChange={(e) => setEditObservaciones(e.target.value)}
                  placeholder="Notas o detalles de entrega..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer de Acciones */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/80 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-[#3498db] hover:bg-[#2980b9] text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingEdit ? "Guardando..." : "Guardar Cambios"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable View */}
      <div className="hidden print:block font-sans text-black p-4 bg-white min-h-screen">
        <StandardPrintHeader
          title="REPUESTOS Y MATERIALES ASIGNADOS A O.T."
          subtitle="Despacho de Piezas de Almacén a Órdenes de Trabajo"
          filtersText={(() => {
            const filtros: string[] = [];
            if (searchTerm) filtros.push(`Búsqueda: "${searchTerm}"`);
            if (selectedEstadoOT) filtros.push(`Estado OT: ${selectedEstadoOT}`);
            return filtros.length > 0 ? filtros.join(" | ") : undefined;
          })()}
        />

        <table className="w-full text-left border-collapse border border-gray-400 text-xs mt-3">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-400">
              <th className="border border-gray-300 p-1.5 text-center w-8">#</th>
              <th className="border border-gray-300 p-1.5 text-center">OT</th>
              <th className="border border-gray-300 p-1.5 text-center">Fecha</th>
              <th className="border border-gray-300 p-1.5 text-center">Placa</th>
              <th className="border border-gray-300 p-1.5">Vehículo / Cliente</th>
              <th className="border border-gray-300 p-1.5">Repuesto Asignado</th>
              <th className="border border-gray-300 p-1.5 text-center">Cant.</th>
              <th className="border border-gray-300 p-1.5 text-center">Estado OT</th>
            </tr>
          </thead>
          <tbody>
            {filteredCargas.map((carga, idx) => {
              const ot = carga.orden_trabajo;
              const inv = carga.inventario;
              return (
                <tr key={carga.id} className="border-b border-gray-200">
                  <td className="border border-gray-200 p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-gray-200 p-1.5 text-center font-bold">
                    {ot?.id ? `#${String(ot.id).padStart(6, "0")}` : "-"}
                  </td>
                  <td className="border border-gray-200 p-1.5 text-center">
                    {ot?.fecha_registro ? new Date(ot.fecha_registro).toLocaleDateString() : "-"}
                  </td>
                  <td className="border border-gray-200 p-1.5 text-center font-bold">
                    {ot?.vehiculo_placa || "-"}
                  </td>
                  <td className="border border-gray-200 p-1.5">
                    {`${ot?.marca_auto?.marca || ot?.vehiculo_marca || ""} - ${ot?.cliente_nombre || ""}`.trim()}
                  </td>
                  <td className="border border-gray-200 p-1.5 font-bold">
                    {inv?.codigo ? `[${inv.codigo}] ${inv.descripcion || carga.detalle}` : (inv?.descripcion || carga.detalle || "-")}
                  </td>
                  <td className="border border-gray-200 p-1.5 text-center font-bold">
                    {carga.cantidad}
                  </td>
                  <td className="border border-gray-200 p-1.5 text-center font-bold uppercase">
                    {ot?.estado || "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-4 flex justify-between items-center text-xs border-t pt-2 border-gray-300">
          <span>Total Despachos: <strong>{filteredCargas.length}</strong></span>
          <span className="font-semibold text-gray-600">EDKOR MOTORS</span>
        </div>

        <StandardPrintFooter />
      </div>

      <ManualModal
        isOpen={showManual}
        onClose={() => setShowManual(false)}
        title="Manual - Cargar Repuestos a O.T."
        sections={manualSections}
      />
    </>
  );
};

export default RepuestoOTList;
