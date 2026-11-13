import { useEffect, useState } from "react";
import {
  RotateCcw,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Package,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import {
  getDevolucionesInventario,
  confirmarDevolucionInventario,
  rechazarDevolucionInventario,
  type InventarioDevolucion,
} from "../services/inventarioService";
import { useAuth } from "../context/AuthContext";
import { useSucursal } from "../context/SucursalContext";
import Pagination from "../components/Pagination";
import { exportStandardPDF } from "../utils/pdfExportHelper";
import { StandardExportToolbar } from "../components/common/StandardExportToolbar";
import { StandardPrintHeader, StandardPrintFooter } from "../components/common/StandardPrintHeader";
import ManualModal, { type ManualSection } from "../components/ManualModal";

type EstadoTab = "pendiente" | "recibido" | "rechazado" | "todos";

const InventarioDevoluciones = () => {
  const { user } = useAuth();
  const { selectedSucursal } = useSucursal();

  const [devoluciones, setDevoluciones] = useState<InventarioDevolucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EstadoTab>("pendiente");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showManual, setShowManual] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const itemsPerPage = 10;

  const fetchDevoluciones = async () => {
    try {
      setLoading(true);
      const data = await getDevolucionesInventario("todos");
      setDevoluciones(data);
    } catch (error) {
      console.error("Error cargando devoluciones:", error);
      Swal.fire("Error", "No se pudieron cargar los retornos a almacén.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevoluciones();
  }, [selectedSucursal?.id]);

  const handleConfirmar = async (dev: InventarioDevolucion) => {
    const desc = dev.inventario?.descripcion || dev.detalle_descripcion || "este ítem";
    const unidad = dev.inventario?.unidad_medida?.medida || "uds.";
    const { value: observaciones, isConfirmed } = await Swal.fire({
      title: "Confirmar Recepción Física",
      html: `
        <div class="text-left text-sm space-y-2 mb-3">
          <p class="text-gray-600 dark:text-gray-300">
            ¿Confirmas que recibiste en físico en almacén el siguiente ítem?
          </p>
          <div class="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <p class="font-bold text-gray-900 dark:text-white">${desc}</p>
            <p class="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
              Cantidad a reingresar al stock: <strong>${dev.cantidad} ${unidad}</strong>
              ${dev.idorden_trabajo ? ` · OT #${String(dev.idorden_trabajo).padStart(6, "0")}` : ""}
            </p>
          </div>
        </div>
      `,
      input: "text",
      inputLabel: "Observación de almacén (opcional)",
      inputPlaceholder: "Ej: Pieza revisada en buen estado, guardada en estante A...",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, dar visto bueno y reingresar stock",
      cancelButtonText: "Cancelar",
    });

    if (!isConfirmed) return;

    try {
      await confirmarDevolucionInventario(dev.id, {
        idusuario: user?.id ? Number(user.id) : undefined,
        usuario_nombre: user?.name,
        observaciones: observaciones || undefined,
      });
      await Swal.fire({
        icon: "success",
        title: "Recepción Confirmada",
        text: `Se reingresaron ${dev.cantidad} ${unidad} de "${desc}" al inventario.`,
        timer: 1800,
        showConfirmButton: false,
      });
      fetchDevoluciones();
    } catch (error: any) {
      console.error("Error confirmando devolución:", error);
      Swal.fire(
        "Error",
        error?.response?.data?.message || "No se pudo confirmar la recepción.",
        "error",
      );
    }
  };

  const handleRechazar = async (dev: InventarioDevolucion) => {
    const desc = dev.inventario?.descripcion || dev.detalle_descripcion || "este ítem";
    const { value: observaciones, isConfirmed } = await Swal.fire({
      title: "Reportar No Devuelto / Pérdida",
      html: `
        <div class="text-left text-sm space-y-2 mb-3">
          <p class="text-gray-600 dark:text-gray-300">
            Al marcar como <strong>No Devuelto</strong>, el ítem <u>NO volverá a sumarse al stock</u> y quedará registrado como pérdida o no entregado a almacén.
          </p>
          <div class="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <p class="font-bold text-gray-900 dark:text-white">${desc}</p>
            <p class="text-xs text-red-700 dark:text-red-300 mt-1">
              Cantidad: <strong>${dev.cantidad}</strong>
              ${dev.idorden_trabajo ? ` · OT #${String(dev.idorden_trabajo).padStart(6, "0")}` : ""}
            </p>
          </div>
        </div>
      `,
      input: "text",
      inputLabel: "Motivo / Observación *",
      inputPlaceholder: "Ej: No se encontró en taller / pieza dañada en desmontaje...",
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return "Debe indicar el motivo o detalle";
        }
        return null;
      },
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Confirmar No Devuelto",
      cancelButtonText: "Cancelar",
    });

    if (!isConfirmed) return;

    try {
      await rechazarDevolucionInventario(dev.id, {
        idusuario: user?.id ? Number(user.id) : undefined,
        usuario_nombre: user?.name,
        observaciones,
      });
      await Swal.fire({
        icon: "info",
        title: "Registrado",
        text: "El ítem quedó registrado como no devuelto. El stock no se modificó.",
        timer: 1800,
        showConfirmButton: false,
      });
      fetchDevoluciones();
    } catch (error: any) {
      console.error("Error rechazando devolución:", error);
      Swal.fire(
        "Error",
        error?.response?.data?.message || "No se pudo registrar el estado.",
        "error",
      );
    }
  };

  const countPendiente = devoluciones.filter((d) => d.estado === "pendiente").length;
  const countRecibido = devoluciones.filter((d) => d.estado === "recibido").length;
  const countRechazado = devoluciones.filter((d) => d.estado === "rechazado").length;

  const filtered = devoluciones.filter((d) => {
    if (activeTab !== "todos" && d.estado !== activeTab) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (d.inventario?.descripcion && d.inventario.descripcion.toLowerCase().includes(term)) ||
      (d.inventario?.codigo && d.inventario.codigo.toLowerCase().includes(term)) ||
      (d.detalle_descripcion && d.detalle_descripcion.toLowerCase().includes(term)) ||
      (d.idorden_trabajo && String(d.idorden_trabajo).includes(term)) ||
      (d.orden_trabajo?.vehiculo_placa && d.orden_trabajo.vehiculo_placa.toLowerCase().includes(term)) ||
      (d.orden_trabajo?.cliente_nombre && d.orden_trabajo.cliente_nombre.toLowerCase().includes(term)) ||
      (d.usuario_solicita_nombre && d.usuario_solicita_nombre.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return "-";
    const date = new Date(iso);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filtered.map((d, idx) => ({
      '#': idx + 1,
      'Fecha Solicitud': formatDateTime(d.fecha_solicitud),
      'OT Origen': d.idorden_trabajo ? `#${String(d.idorden_trabajo).padStart(6, '0')}` : '-',
      'Vehículo': d.orden_trabajo?.vehiculo_placa || '-',
      'Cliente': d.orden_trabajo?.cliente_nombre || '-',
      'Ítem / Repuesto': d.inventario?.descripcion || d.detalle_descripcion || '-',
      'Código': d.inventario?.codigo || '-',
      'Cantidad': d.cantidad,
      'Unidad': d.inventario?.unidad_medida?.medida || 'uds.',
      'Estado': (d.estado || 'PENDIENTE').toUpperCase(),
      'Solicitante': d.usuario_solicita_nombre || '-',
      'Motivo': d.motivo || '-'
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RetornosAlmacen");
    XLSX.writeFile(workbook, `Retornos_Almacen_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = async () => {
    const filtros: string[] = [];
    if (activeTab !== 'todos') filtros.push(`Estado: ${activeTab.toUpperCase()}`);
    if (searchTerm) filtros.push(`Búsqueda: "${searchTerm}"`);

    await exportStandardPDF({
      title: 'Retorno de Repuestos e Insumos a Almacén',
      subtitle: 'EDKOR MOTORS - Control de Devoluciones y Reingreso al Inventario',
      filtersText: filtros.length > 0 ? filtros.join(' | ') : undefined,
      totalRecords: filtered.length,
      totalRecordsLabel: 'Retornos Registrados',
      filename: `Retornos_Almacen_${new Date().toISOString().split('T')[0]}.pdf`,
      tableOptions: {
        head: [['#', 'Fecha', 'OT', 'Vehículo / Cliente', 'Ítem / Repuesto', 'Cant.', 'Estado', 'Motivo']],
        body: filtered.map((d, idx) => [
          idx + 1,
          formatDateTime(d.fecha_solicitud),
          d.idorden_trabajo ? `#${String(d.idorden_trabajo).padStart(6, '0')}` : '-',
          `${d.orden_trabajo?.vehiculo_placa || '-'} / ${d.orden_trabajo?.cliente_nombre || ''}`.trim(),
          d.inventario?.codigo ? `[${d.inventario.codigo}] ${d.inventario.descripcion || d.detalle_descripcion}` : (d.inventario?.descripcion || d.detalle_descripcion || '-'),
          `${d.cantidad} ${d.inventario?.unidad_medida?.medida || ''}`.trim(),
          (d.estado || 'PENDIENTE').toUpperCase(),
          d.motivo || '-'
        ]),
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { halign: 'center', cellWidth: 26 },
          2: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
          3: { cellWidth: 40 },
          4: { cellWidth: 'auto', fontStyle: 'bold' },
          5: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
          6: { halign: 'center', cellWidth: 22, fontSize: 6.5, fontStyle: 'bold' },
          7: { cellWidth: 35 }
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
      title: 'Retorno a Almacén',
      content: 'Permite controlar repuestos o insumos desestimados o retirados de una Orden de Trabajo que deben ingresar nuevamente al stock físico del almacén.'
    },
    {
      title: 'Visto Bueno de Almacén',
      content: 'El encargado de almacén debe presionar "Visto Bueno" solo una vez que la pieza haya sido verificada físicamente, sumándose nuevamente al stock disponible.'
    },
    {
      title: 'Rechazo o Pérdida',
      content: 'Si la pieza fue dañada o no devuelta, se presiona el botón rojo de rechazo para registrar la pérdida sin alterar el inventario.'
    }
  ];

  return (
    <>
    <div className="container mx-auto relative min-h-screen print:hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <RotateCcw className="text-amber-600" size={30} />
            Retorno a Almacén
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Revisión física y visto bueno de repuestos o materiales retirados de Órdenes de Trabajo antes de reingresar al stock
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
            onClick={fetchDevoluciones}
            className="px-3.5 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-gray-700 dark:text-blue-400 dark:hover:bg-gray-600 rounded-lg transition-all flex items-center gap-2 text-sm font-medium cursor-pointer"
            title="Actualizar lista"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </button>
        </StandardExportToolbar>
      </div>

      {/* Tabs de estado */}
      <div className="flex flex-wrap gap-2 mb-5">
        <button
          onClick={() => {
            setActiveTab("pendiente");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "pendiente"
              ? "bg-amber-500 text-white shadow-sm"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <Clock size={16} />
          <span>Pendientes</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === "pendiente"
                ? "bg-white/25 text-white"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
            }`}
          >
            {countPendiente}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("recibido");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "recibido"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <CheckCircle2 size={16} />
          <span>Recibidos (Visto Bueno)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === "recibido"
                ? "bg-white/25 text-white"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
            }`}
          >
            {countRecibido}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("rechazado");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "rechazado"
              ? "bg-red-600 text-white shadow-sm"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <AlertTriangle size={16} />
          <span>No Devueltos / Pérdida</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === "rechazado"
                ? "bg-white/25 text-white"
                : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
            }`}
          >
            {countRechazado}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("todos");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === "todos"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <Package size={16} />
          <span>Todos ({devoluciones.length})</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-5">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por repuesto, código, N° OT, placa o asesor..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="p-3.5">Fecha Solicitud</th>
                <th className="p-3.5">Orden / Vehículo</th>
                <th className="p-3.5">Repuesto / Material</th>
                <th className="p-3.5 text-center">Cant.</th>
                <th className="p-3.5">Retirado por / Motivo</th>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5">Resolución Almacén</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Cargando registros...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No hay retornos {activeTab !== "todos" ? `en estado "${activeTab}"` : ""} para mostrar.
                  </td>
                </tr>
              ) : (
                paginated.map((dev) => {
                  const unidad = dev.inventario?.unidad_medida?.medida || "uds.";
                  return (
                    <tr
                      key={dev.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      <td className="p-3.5 text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {formatDateTime(dev.fecha_solicitud)}
                      </td>
                      <td className="p-3.5">
                        {dev.idorden_trabajo ? (
                          <div>
                            <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                              OT #{String(dev.idorden_trabajo).padStart(6, "0")}
                            </span>
                            {dev.orden_trabajo && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">
                                  {(dev.orden_trabajo.vehiculo_placa || "S/P").toUpperCase()}
                                </span>{" "}
                                · {dev.orden_trabajo.cliente_nombre || ""}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          {dev.inventario?.codigo && (
                            <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                              {dev.inventario.codigo}
                            </span>
                          )}
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {dev.inventario?.descripcion || dev.detalle_descripcion}
                          </span>
                        </div>
                        {dev.observaciones_asesor && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Nota: {dev.observaciones_asesor}
                          </p>
                        )}
                      </td>
                      <td className="p-3.5 text-center font-bold font-mono text-gray-900 dark:text-white whitespace-nowrap">
                        {dev.cantidad} <span className="text-xs font-normal text-gray-500">{unidad}</span>
                      </td>
                      <td className="p-3.5 text-xs">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">
                          {dev.usuario_solicita_nombre || "Asesor / Sistema"}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                          {dev.motivo || "-"}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {dev.estado === "pendiente" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 whitespace-nowrap">
                            Pendiente físico
                          </span>
                        )}
                        {dev.estado === "recibido" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                            Recibido (Stock reingresado)
                          </span>
                        )}
                        {dev.estado === "rechazado" && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800 whitespace-nowrap">
                            No devuelto / Pérdida
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-xs text-gray-600 dark:text-gray-300">
                        {dev.estado === "pendiente" ? (
                          <span className="text-gray-400 italic">Esperando revisión</span>
                        ) : (
                          <div>
                            <div className="font-semibold text-gray-800 dark:text-gray-200">
                              {dev.usuario_almacen_nombre || "Almacén"}
                            </div>
                            <div className="text-gray-400">{formatDateTime(dev.fecha_resolucion)}</div>
                            {dev.observaciones_almacen && (
                              <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                                {dev.observaciones_almacen}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        {dev.estado === "pendiente" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleConfirmar(dev)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                              title="Confirmar recepción física y reingresar al stock"
                            >
                              <CheckCircle2 size={14} />
                              <span>Visto Bueno</span>
                            </button>
                            <button
                              onClick={() => handleRechazar(dev)}
                              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs shadow-sm transition-all cursor-pointer"
                              title="Reportar como no devuelto / pérdida"
                            >
                              <XCircle size={15} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>

    {/* Printable View */}
    <div className="hidden print:block font-sans text-black p-4 bg-white min-h-screen">
      <StandardPrintHeader
        title="RETORNO DE REPUESTOS E INSUMOS A ALMACÉN"
        subtitle="Registro de Retornos y Reingreso al Inventario Físico"
        filtersText={(() => {
          const filtros: string[] = [];
          if (activeTab !== "todos") filtros.push(`Estado: ${activeTab.toUpperCase()}`);
          if (searchTerm) filtros.push(`Búsqueda: "${searchTerm}"`);
          return filtros.length > 0 ? filtros.join(" | ") : undefined;
        })()}
      />

      <table className="w-full text-left border-collapse border border-gray-400 text-xs mt-3">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-400">
            <th className="border border-gray-300 p-1.5 text-center w-8">#</th>
            <th className="border border-gray-300 p-1.5 text-center">Fecha Solicitud</th>
            <th className="border border-gray-300 p-1.5 text-center">OT Origen</th>
            <th className="border border-gray-300 p-1.5">Vehículo / Cliente</th>
            <th className="border border-gray-300 p-1.5">Ítem / Repuesto</th>
            <th className="border border-gray-300 p-1.5 text-center">Cant.</th>
            <th className="border border-gray-300 p-1.5 text-center">Estado</th>
            <th className="border border-gray-300 p-1.5">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d, idx) => (
            <tr key={d.id} className="border-b border-gray-200">
              <td className="border border-gray-200 p-1.5 text-center">{idx + 1}</td>
              <td className="border border-gray-200 p-1.5 text-center">{formatDateTime(d.fecha_solicitud)}</td>
              <td className="border border-gray-200 p-1.5 text-center font-bold">
                {d.idorden_trabajo ? `#${String(d.idorden_trabajo).padStart(6, "0")}` : "-"}
              </td>
              <td className="border border-gray-200 p-1.5">
                {`${d.orden_trabajo?.vehiculo_placa || "-"} / ${d.orden_trabajo?.cliente_nombre || ""}`.trim()}
              </td>
              <td className="border border-gray-200 p-1.5 font-bold">
                {d.inventario?.codigo
                  ? `[${d.inventario.codigo}] ${d.inventario.descripcion || d.detalle_descripcion}`
                  : (d.inventario?.descripcion || d.detalle_descripcion || "-")}
              </td>
              <td className="border border-gray-200 p-1.5 text-center font-bold">
                {`${d.cantidad} ${d.inventario?.unidad_medida?.medida || ""}`.trim()}
              </td>
              <td className="border border-gray-200 p-1.5 text-center font-bold uppercase">
                {d.estado}
              </td>
              <td className="border border-gray-200 p-1.5">{d.motivo || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-between items-center text-xs border-t pt-2 border-gray-300">
        <span>Total Registros: <strong>{filtered.length}</strong></span>
        <span className="font-semibold text-gray-600">EDKOR MOTORS</span>
      </div>

      <StandardPrintFooter />
    </div>

    <ManualModal
      isOpen={showManual}
      onClose={() => setShowManual(false)}
      title="Manual - Retorno a Almacén"
      sections={manualSections}
    />
    </>
  );
};

export default InventarioDevoluciones;
