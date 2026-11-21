import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSucursal } from "../context/SucursalContext";
import { useAuth } from "../context/AuthContext";
import {
  getInventarios,
  getDevolucionesInventario,
  type InventarioDevolucion,
} from "../services/inventarioService";
import {
  getOrdenesTrabajo,
  updateOrdenTrabajo,
  getOrdenTrabajo,
} from "../services/ordenTrabajoService";
import { getDetallesByOrden } from "../services/detalleOrdenTrabajoService";
import type { Inventario } from "../types/inventario";
import type { OrdenTrabajo } from "../types/ordenTrabajo";
import type { DetalleOrdenTrabajo } from "../types/detalleOrdenTrabajo";
import {
  AlertTriangle,
  CheckCircle,
  LayoutDashboard,
  Timer,
  Eye,
  Landmark,
  DollarSign,
  Calendar,
  Cake,
  Gift,
  MessageCircle,
  Sparkles,
  User as UserIcon,
  Briefcase,
  Phone,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../services/api";
import ViewOrdenModal from "../components/ViewOrdenModal";
import { getBoliviaDateParts } from "../utils/dateUtils";

interface GastoFijo {
  id: number;
  gasto_fijo: string;
  monto: number;
  moneda: string;
  dia: number;
  estado: string;
  paid?: boolean;
}

interface Cumpleanero {
  tipo: 'personal' | 'cliente';
  id: string;
  nombre: string;
  telefono: string;
  fecha_nacimiento: string;
  detalle?: string;
  dia: number;
  mes: number;
  anio?: number;
  edad?: number;
  diasRestantes: number;
  esHoy: boolean;
  esEsteMes: boolean;
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const formatWhatsAppLink = (nombre: string, rawPhone?: string) => {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/[^0-9]/g, "");
  if (!digits || digits.length < 7) return null;
  const fullPhone = digits.startsWith("591") ? digits : digits.length === 8 ? `591${digits}` : digits;
  const firstName = nombre.split(" ")[0];
  const msg = `¡Hola ${firstName}! 🎉 Desde EDKOR MOTORS te deseamos un muy feliz cumpleaños 🎂 Que tengas un día excelente lleno de bendiciones y éxitos.`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
};

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
  if (clean.startsWith("591") && clean.length > 5) {
    return `(+591) ${clean.slice(3).trim()}`;
  }
  const onlyDigits = clean.replace(/[^0-9]/g, "");
  if (onlyDigits.length >= 7 && onlyDigits.length <= 8) {
    return `(+591) ${clean}`;
  }
  return clean;
};

const Home = () => {
  const { selectedSucursal } = useSucursal();
  const { user } = useAuth();
  const [lowStockItems, setLowStockItems] = useState<Inventario[]>([]);
  const [pendingDevoluciones, setPendingDevoluciones] = useState<InventarioDevolucion[]>([]);
  const [inProgressOrders, setInProgressOrders] = useState<OrdenTrabajo[]>([]);
  const [finishedOrders, setFinishedOrders] = useState<OrdenTrabajo[]>([]);
  const [todayExpenses, setTodayExpenses] = useState<GastoFijo[]>([]);
  const [cumpleaneros, setCumpleaneros] = useState<Cumpleanero[]>([]);
  const [cumpleFiltroTipo, setCumpleFiltroTipo] = useState<'todos' | 'personal' | 'cliente'>('todos');
  const [cumpleFiltroPeriodo, setCumpleFiltroPeriodo] = useState<'hoy' | 'mes' | 'proximos' | 'todos'>('mes');
  const [loading, setLoading] = useState(true);

  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<OrdenTrabajo | null>(null);
  const [ordenDetalles, setOrdenDetalles] = useState<DetalleOrdenTrabajo[]>([]);

  const hasInicioPermission = (permissionKey: string) =>
    !user?.rol ||
    user.rol.nombre?.toLowerCase() === "admin" ||
    user.rol.permisos?.[permissionKey] === true;

  const canSeeOrdenesProceso = hasInicioPermission("inicio_ordenes_proceso");
  const canSeeOrdenesTerminadas = hasInicioPermission("inicio_ordenes_terminadas");
  const canSeeInventario = hasInicioPermission("inicio_inventario");
  const canSeeRetornoInventario = hasInicioPermission("inicio_retorno_inventario");
  const canSeeCumpleanos = hasInicioPermission("inicio_cumpleanos");
  const canSeeGastosFijos = hasInicioPermission("inicio_gastos_fijos");

  const hasAnyInicioCard =
    canSeeOrdenesProceso ||
    canSeeOrdenesTerminadas ||
    canSeeInventario ||
    canSeeRetornoInventario ||
    canSeeCumpleanos ||
    canSeeGastosFijos;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const now = new Date();
        const todayDay = now.getDate();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Define month range for payments
        const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
        const endDate = new Date(currentYear, currentMonth, 0)
          .toISOString()
          .split("T")[0];

        const needOrders = canSeeOrdenesProceso || canSeeOrdenesTerminadas;
        const [inventariosData, ordenesData, gastosData, pagosData, cumpleData, devolucionesData] =
          await Promise.all([
            canSeeInventario ? getInventarios() : Promise.resolve([]),
            needOrders ? getOrdenesTrabajo() : Promise.resolve([]),
            canSeeGastosFijos ? api.get("/gastos-fijos") : Promise.resolve({ data: [] }),
            canSeeGastosFijos
              ? api.get(`/pagos-gastos-fijos?startDate=${startDate}&endDate=${endDate}`)
              : Promise.resolve({ data: [] }),
            canSeeCumpleanos ? api.get("/cumpleaneros") : Promise.resolve({ data: [] }),
            canSeeRetornoInventario
              ? getDevolucionesInventario("pendiente").catch(() => [])
              : Promise.resolve([]),
          ]);

        setPendingDevoluciones(Array.isArray(devolucionesData) ? devolucionesData : []);

        setCumpleaneros(Array.isArray(cumpleData.data) ? cumpleData.data : []);

        // Filter Low Stock (Excluir ítems con stock actual 0 y stock mínimo 0)
        const lowStock = inventariosData.filter((item) => {
          if (item.estado !== "activo") return false;
          const stockAct = Number(item.cantidad_existente || 0);
          const stockMin = Number(item.stock_minimo || 0);
          if (stockAct === 0 && stockMin === 0) return false;
          return stockAct <= stockMin;
        });
        setLowStockItems(lowStock);

        // Filter In Progress Orders (Activas y En Proceso)
        const inProgress = ordenesData
          .filter((order) => {
            const est = (order.estado || "").toLowerCase().trim().replace(/\s+/g, "_");
            return est === "en_proceso" || est === "activo";
          })
          .sort(
            (a, b) =>
              new Date(b.fecha_registro || "").getTime() -
              new Date(a.fecha_registro || "").getTime(),
          );
        setInProgressOrders(inProgress);

        // Filter Finished Orders (Terminados en Taller)
        const finished = ordenesData
          .filter((order) => {
            const est = (order.estado || "").toLowerCase().trim().replace(/\s+/g, "_");
            return est === "terminado" || est === "finalizado" || est === "terminado_en_taller";
          })
          .sort(
            (a, b) =>
              new Date(b.fecha_registro || "").getTime() -
              new Date(a.fecha_registro || "").getTime(),
          );
        setFinishedOrders(finished);

        // Filter Today's Fixed Expenses and check if paid this month
        const pagosList = Array.isArray(pagosData.data) ? pagosData.data : [];
        const expenses = (gastosData.data as GastoFijo[])
          .filter((g) => g.estado === "activo" && g.dia === todayDay)
          .map((g) => {
            const isPaid = pagosList.some(
              (p: any) =>
                p.gastoFijoId === g.id ||
                p.gasto_fijo_id === g.id ||
                p.idgasto_fijo === g.id ||
                p.gastoFijo?.id === g.id,
            );
            return { ...g, paid: isPaid };
          });
        setTodayExpenses(expenses);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [
    selectedSucursal?.id,
    canSeeOrdenesProceso,
    canSeeOrdenesTerminadas,
    canSeeInventario,
    canSeeRetornoInventario,
    canSeeCumpleanos,
    canSeeGastosFijos,
  ]);

  const handleViewWorks = async (id: number) => {
    try {
      const [ordenData, detallesData] = await Promise.all([
        getOrdenTrabajo(id),
        getDetallesByOrden(id),
      ]);
      setSelectedOrden(ordenData);
      setOrdenDetalles(detallesData);
      setShowViewModal(true);
    } catch (error) {
      console.error("Error loading order details:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los detalles de la orden",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">
          Cargando Dashboard...
        </div>
      </div>
    );
  }

  const boToday = getBoliviaDateParts();
  const cumpleanerosHoy = cumpleaneros.filter(
    (c) => c.mes === boToday.month && c.dia === boToday.day
  );

  const filteredCumpleaneros = cumpleaneros.filter((c) => {
    if (cumpleFiltroTipo !== "todos" && c.tipo !== cumpleFiltroTipo) return false;
    const isHoy = c.mes === boToday.month && c.dia === boToday.day;
    const isEsteMes = c.mes === boToday.month;
    if (cumpleFiltroPeriodo === "hoy") return isHoy;
    if (cumpleFiltroPeriodo === "mes") return isEsteMes;
    if (cumpleFiltroPeriodo === "proximos") return c.diasRestantes <= 30;
    return true;
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
          <LayoutDashboard className="text-blue-600" size={32} />
          Panel Principal
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Resumen general del estado de EDKOR MOTORS
        </p>
      </div>

      {!hasAnyInicioCard && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm text-center text-gray-600 dark:text-gray-300">
          Bienvenido al sistema de gestión de EDKOR MOTORS. Utilice el menú lateral para acceder a sus módulos asignados.
        </div>
      )}

      {/* Banner de Cumpleaños de Hoy */}
      {canSeeCumpleanos && cumpleanerosHoy.length > 0 && (
        <div className="mb-8 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-500 to-rose-500 text-white shadow-lg animate-in fade-in flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-xs shrink-0">
              <Cake size={32} className="animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider bg-white/30 px-2.5 py-0.5 rounded-full">
                  ¡Hoy de Fiesta! 🎂
                </span>
                <span className="text-xs opacity-90 font-medium">
                  {new Date().toLocaleDateString("es-BO", { day: "numeric", month: "long" })}
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold mt-1">
                {cumpleanerosHoy
                  .map(
                    (c) =>
                      `${c.nombre} (${c.tipo === "personal" ? "Personal" : "Cliente"}${
                        c.edad ? ` • ${c.edad} años` : ""
                      })`
                  )
                  .join(" • ")}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {cumpleanerosHoy.map((c) => {
              const waLink = formatWhatsAppLink(c.nombre, c.telefono);
              if (!waLink) return null;
              return (
                <a
                  key={c.id}
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all transform hover:-translate-y-0.5"
                >
                  <MessageCircle size={15} /> Felicitar a {c.nombre.split(" ")[0]}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Órdenes en Proceso */}
      {canSeeOrdenesProceso && (
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Timer className="text-blue-600" size={20} />
            Órdenes En Proceso
          </h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
            {inProgressOrders.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 font-semibold text-center w-12">#</th>
                <th className="px-6 py-3 font-semibold">N° Orden</th>
                <th className="px-6 py-3 font-semibold">Tipo de Orden</th>
                <th className="px-6 py-3 font-semibold">Fecha Inicio</th>
                <th className="px-6 py-3 font-semibold">Placa</th>
                <th className="px-6 py-3 font-semibold">Vehículo</th>
                <th className="px-6 py-3 font-semibold">Cliente</th>
                <th className="px-6 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {inProgressOrders.length > 0 ? (
                inProgressOrders.map((order, index) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-center font-mono text-xs text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
                      <Link
                        to={`/ordenes-trabajo/${order.id}`}
                        className="hover:underline flex items-center gap-1"
                        title="Ver detalle de la orden"
                      >
                        #{order.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const tipo =
                          order.hoja_recepcion?.tipo_orden?.tipo_orden ||
                          (order as any).hoja_recepcion?.tipo_orden ||
                          "Particular";
                        const isSeguro = String(tipo)
                          .toLowerCase()
                          .includes("seguro");
                        return (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              isSeguro
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            }`}
                          >
                            {tipo}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {order.fecha_registro ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {(() => {
                              const d = new Date(order.fecha_registro);
                              const dia = String(d.getDate()).padStart(2, "0");
                              const mes = String(d.getMonth() + 1).padStart(2, "0");
                              const anio = d.getFullYear();
                              return `${dia}/${mes}/${anio}`;
                            })()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(order.fecha_registro).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-gray-200">
                      {order.vehiculo_placa || (order as any).placa || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {order.marca_auto?.marca || (order as any).marca || "-"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {order.vehiculo_modelo || (order as any).modelo || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {order.cliente_nombre || (order as any).cliente || "-"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatPhoneDisplay(order.cliente_telefono || (order as any).celular)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 flex justify-center">
                      <button
                        onClick={() => handleViewWorks(order.id)}
                        className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors cursor-pointer"
                        title="Ver Trabajos"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No hay órdenes en proceso actualmente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Órdenes Terminadas en Taller */}
      {canSeeOrdenesTerminadas && (
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <CheckCircle className="text-emerald-600 dark:text-emerald-400" size={20} />
            Órdenes Terminadas en Taller
          </h2>
          <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-emerald-900 dark:text-emerald-300">
            {finishedOrders.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 font-semibold text-center w-12">#</th>
                <th className="px-6 py-3 font-semibold">N° Orden</th>
                <th className="px-6 py-3 font-semibold">Tipo de Orden</th>
                <th className="px-6 py-3 font-semibold">Fecha</th>
                <th className="px-6 py-3 font-semibold">Placa</th>
                <th className="px-6 py-3 font-semibold">Vehículo</th>
                <th className="px-6 py-3 font-semibold">Cliente</th>
                <th className="px-6 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {finishedOrders.length > 0 ? (
                finishedOrders.map((order, index) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-center font-mono text-xs text-gray-500 dark:text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                      <Link
                        to={`/ordenes-trabajo/${order.id}`}
                        className="hover:underline flex items-center gap-1"
                        title="Ver detalle completo de la orden"
                      >
                        #{order.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const tipo =
                          order.hoja_recepcion?.tipo_orden?.tipo_orden ||
                          (order as any).hoja_recepcion?.tipo_orden ||
                          order.tipo_orden?.tipo_orden ||
                          (order as any).particular_seguro ||
                          "Particular";
                        const isSeguro = String(tipo)
                          .toLowerCase()
                          .includes("seguro");
                        return (
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              isSeguro
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                            }`}
                          >
                            {tipo}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      {order.fecha_registro ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {(() => {
                              const d = new Date(order.fecha_registro);
                              const dia = String(d.getDate()).padStart(2, "0");
                              const mes = String(d.getMonth() + 1).padStart(2, "0");
                              const anio = d.getFullYear();
                              return `${dia}/${mes}/${anio}`;
                            })()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(order.fecha_registro).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900 dark:text-gray-200">
                      {order.vehiculo_placa || (order as any).placa || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {order.marca_auto?.marca || (order as any).marca || "-"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {order.vehiculo_modelo || (order as any).modelo || "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {order.cliente_nombre || (order as any).cliente || "-"}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatPhoneDisplay(order.cliente_telefono || (order as any).celular)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 flex justify-center items-center">
                      <button
                        onClick={() => handleViewWorks(order.id)}
                        className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                        title="Ver Trabajos"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    No hay órdenes terminadas en taller actualmente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Alertas de Stock */}
      {canSeeInventario && (lowStockItems.length > 0 ? (
        <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-red-100 dark:bg-red-900/40 border-b border-red-200 dark:border-red-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-200 dark:bg-red-800 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-700 dark:text-red-200" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-red-800 dark:text-red-200">
                  Alerta de Stock Bajo
                </h2>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Hay {lowStockItems.length} items con stock crítico.
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-red-50 dark:bg-red-900/20 text-xs uppercase text-red-800 dark:text-red-300">
                <tr>
                  <th className="px-6 py-3 font-semibold">Item</th>
                  <th className="px-6 py-3 font-semibold">Grupo</th>
                  <th className="px-6 py-3 font-semibold text-right">
                    Stock Actual
                  </th>
                  <th className="px-6 py-3 font-semibold text-right">Mínimo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 dark:divide-red-800">
                {lowStockItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">
                      {item.descripcion}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                      {item.grupo_inventario?.grupo || "-"}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-red-600 dark:text-red-400">
                      {item.cantidad_existente}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">
                      {item.stock_minimo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-green-100 dark:bg-green-800 rounded-full">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-green-800 dark:text-green-200">
              Inventario Saludable
            </h2>
            <p className="text-green-600 dark:text-green-300">
              No hay items con stock bajo en este momento.
            </p>
          </div>
        </div>
      ))}

      {/* Alerta de Retornos Pendientes a Almacén */}
      {canSeeRetornoInventario && pendingDevoluciones.length > 0 && (
        <div className="mb-8 bg-amber-50 dark:bg-amber-950/30 rounded-xl shadow-sm border border-amber-200 dark:border-amber-800 overflow-hidden">
          <div className="p-4 border-b border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-100/70 dark:bg-amber-900/40">
            <div className="flex items-center gap-2.5">
              <RotateCcw className="text-amber-700 dark:text-amber-300 shrink-0" size={20} />
              <div>
                <h2 className="text-base md:text-lg font-bold text-amber-900 dark:text-amber-100">
                  Repuestos Pendientes de Retorno Físico a Almacén ({pendingDevoluciones.length})
                </h2>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Ítems retirados de Órdenes de Trabajo esperando revisión física y visto bueno para reingresar al stock.
                </p>
              </div>
            </div>
            <Link
              to="/inventario/devoluciones"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-center shrink-0"
            >
              <span>Revisar y Dar Visto Bueno</span>
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-amber-200/70 dark:divide-amber-800/60">
            {pendingDevoluciones.slice(0, 5).map((dev) => (
              <div
                key={dev.id}
                className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs md:text-sm"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {dev.idorden_trabajo && (
                    <span className="font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 text-xs">
                      OT #{String(dev.idorden_trabajo).padStart(6, "0")}
                    </span>
                  )}
                  {dev.orden_trabajo?.vehiculo_placa && (
                    <span className="font-mono font-semibold text-gray-700 dark:text-gray-300 text-xs">
                      ({dev.orden_trabajo.vehiculo_placa.toUpperCase()})
                    </span>
                  )}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {dev.inventario?.descripcion || dev.detalle_descripcion}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-amber-900 dark:text-amber-200 shrink-0">
                  <span className="font-bold font-mono">
                    {dev.cantidad} {dev.inventario?.unidad_medida?.medida || "uds."}
                  </span>
                  {dev.usuario_solicita_nombre && (
                    <span className="text-gray-600 dark:text-gray-400">
                      Retiró: {dev.usuario_solicita_nombre}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showViewModal && (
        <ViewOrdenModal
          orden={selectedOrden}
          detalles={ordenDetalles}
          onClose={() => setShowViewModal(false)}
        />
      )}

      {/* Sección Cumpleañeros (Clientes y Personal) */}
      {canSeeCumpleanos && (
      <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 dark:bg-pink-900/40 rounded-lg text-pink-600 dark:text-pink-400">
              <Cake size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                Cumpleañeros
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                  (Clientes y Personal)
                </span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Fidelización y agasajos para el equipo y clientes
              </p>
            </div>
          </div>

          {/* Filtros de Tipo y Período */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Tipo */}
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-800 shadow-2xs">
              <button
                onClick={() => setCumpleFiltroTipo("todos")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  cumpleFiltroTipo === "todos"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Todos ({cumpleaneros.length})
              </button>
              <button
                onClick={() => setCumpleFiltroTipo("cliente")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  cumpleFiltroTipo === "cliente"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Clientes ({cumpleaneros.filter((c) => c.tipo === "cliente").length})
              </button>
              <button
                onClick={() => setCumpleFiltroTipo("personal")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  cumpleFiltroTipo === "personal"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Personal ({cumpleaneros.filter((c) => c.tipo === "personal").length})
              </button>
            </div>

            {/* Filtro de Período */}
            <select
              value={cumpleFiltroPeriodo}
              onChange={(e) => setCumpleFiltroPeriodo(e.target.value as any)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold shadow-2xs"
            >
              <option value="hoy">🎂 Cumplen Hoy</option>
              <option value="mes">📅 Este Mes ({MESES[new Date().getMonth()]})</option>
              <option value="proximos">⏳ Próximos 30 días</option>
              <option value="todos">📋 Todo el año</option>
            </select>
          </div>
        </div>

        {/* Tabla / Lista de Cumpleañeros */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 font-semibold">Tipo</th>
                <th className="px-6 py-3 font-semibold">Nombre</th>
                <th className="px-6 py-3 font-semibold">Fecha de Cumpleaños</th>
                <th className="px-6 py-3 font-semibold">Detalle / Referencia</th>
                <th className="px-6 py-3 font-semibold text-center">Felicitar / Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredCumpleaneros.length > 0 ? (
                filteredCumpleaneros.map((item) => {
                  const waLink = formatWhatsAppLink(item.nombre, item.telefono);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                        item.esHoy
                          ? "bg-pink-50/70 dark:bg-pink-950/20 font-medium"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.tipo === "personal"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40"
                              : "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40"
                          }`}
                        >
                          {item.tipo === "personal" ? (
                            <>
                              <Briefcase size={12} /> Personal
                            </>
                          ) : (
                            <>
                              <UserIcon size={12} /> Cliente
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-gray-100">
                            {item.nombre}
                          </span>
                          {item.esHoy && (
                            <span className="text-[11px] bg-pink-500 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse shadow-xs">
                              <Cake size={11} /> ¡Hoy!
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                            {item.dia} de {MESES[item.mes - 1]}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {item.esHoy
                              ? "¡Cumple hoy!"
                              : item.diasRestantes === 1
                              ? "Mañana"
                              : `En ${item.diasRestantes} días`}
                            {item.edad ? ` • Cumple ${item.edad} años` : ""}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-300">
                        {item.detalle || "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {waLink ? (
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow-md transition-all transform hover:-translate-y-0.5"
                            title={`Enviar felicitación por WhatsApp a ${item.nombre}`}
                          >
                            <MessageCircle size={14} />
                            <span>WhatsApp ({item.telefono})</span>
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {item.telefono || "Sin teléfono"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Gift size={24} className="text-gray-400" />
                      <p className="text-sm font-medium">
                        No hay cumpleañeros registrados para el filtro seleccionado.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Gastos Fijos Programados para Hoy */}
      {canSeeGastosFijos && (
      <div className="mt-8 mb-8 pb-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                <Landmark
                  className="text-indigo-600 dark:text-indigo-400"
                  size={24}
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  Gastos Fijos Programados para Hoy
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Gastos recurrentes con vencimiento el día{" "}
                  {new Date().getDate()}
                </p>
              </div>
            </div>
            <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-indigo-900 dark:text-indigo-300">
              {todayExpenses.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Concepto</th>
                  <th className="px-6 py-3 font-semibold text-right">Monto</th>
                  <th className="px-6 py-3 font-semibold">Moneda</th>
                  <th className="px-6 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {todayExpenses.length > 0 ? (
                  todayExpenses.map((gasto) => (
                    <tr
                      key={gasto.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-200">
                        {gasto.gasto_fijo}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-100">
                        {Number(gasto.monto).toLocaleString("es-BO", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                        {gasto.moneda === "Bolivianos" ? "Bs." : "$us."}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {gasto.paid ? (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 py-1 px-3 rounded-full border border-green-100 dark:border-green-800/50">
                            <CheckCircle size={14} />
                            Pagado
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 py-1 px-3 rounded-full border border-amber-100 dark:border-amber-800/50">
                            <Calendar size={14} />
                            Pendiente
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-full">
                          <CheckCircle className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          No hay gastos fijos programados para el día{" "}
                          {new Date().getDate()}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default Home;
