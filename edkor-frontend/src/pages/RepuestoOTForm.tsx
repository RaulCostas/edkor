import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Package,
  Car,
  User,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Search,
  Hash,
  Plus,
  Trash2,
  ClipboardList,
} from "lucide-react";
import Swal from "sweetalert2";
import { getOrdenesTrabajo } from "../services/ordenTrabajoService";
import { getInventarios } from "../services/inventarioService";
import {
  createCargasRepuestosBulk,
  type CargaRepuestoPayload,
} from "../services/repuestoOTService";
import type { OrdenTrabajo } from "../types/ordenTrabajo";
import type { Inventario } from "../types/inventario";
import { useAuth } from "../context/AuthContext";

interface PendingRepuestoItem {
  tempId: string;
  inventario: Inventario;
  cantidad: number;
  observaciones: string;
}

const RepuestoOTForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialOrdenId = searchParams.get("ordenId");
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([]);
  const [inventarios, setInventarios] = useState<Inventario[]>([]);

  // Form selections
  const [selectedOrdenId, setSelectedOrdenId] = useState<string>(initialOrdenId || "");
  const [selectedInventarioId, setSelectedInventarioId] = useState<string>("");
  const [cantidad, setCantidad] = useState<string>("1");
  const [observaciones, setObservaciones] = useState<string>("");
  const [pendingItems, setPendingItems] = useState<PendingRepuestoItem[]>([]);

  // Search filters inside selectors
  const [ordenSearchText, setOrdenSearchText] = useState("");
  const [repuestoSearchText, setRepuestoSearchText] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setInitialLoading(true);
        const [ordenesData, invData] = await Promise.all([
          getOrdenesTrabajo(),
          getInventarios(),
        ]);

        // Filter work orders that are currently "En Proceso"
        const enProceso = ordenesData.filter((o) => {
          const est = (o.estado || "").toLowerCase().replace(/_/g, " ").trim();
          return est === "en proceso";
        });
        setOrdenes(enProceso);

        // Filter active inventory products
        const invActivos = invData.filter((i) => i.estado === "activo");
        setInventarios(invActivos);
      } catch (error) {
        console.error("Error al cargar datos para el formulario:", error);
        Swal.fire("Error", "No se pudieron cargar las órdenes de trabajo o el inventario", "error");
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, []);

  const selectedOrden = ordenes.find((o) => String(o.id) === selectedOrdenId);
  const selectedRepuesto = inventarios.find((i) => String(i.id) === selectedInventarioId);

  const getCantidadEnLista = (invId: number) =>
    pendingItems
      .filter((item) => item.inventario.id === invId)
      .reduce((sum, item) => sum + item.cantidad, 0);

  // Available stock check (taking pending list items into account)
  const stockDisponible = selectedRepuesto ? Number(selectedRepuesto.cantidad_existente || 0) : 0;
  const yaEnLista = selectedRepuesto ? getCantidadEnLista(selectedRepuesto.id) : 0;
  const stockRestante = Math.max(0, Number((stockDisponible - yaEnLista).toFixed(4)));
  const cantNum = parseFloat(cantidad) || 0;
  const stockInsuficiente = selectedRepuesto !== undefined && cantNum > stockRestante;

  const totalUnidadesLista = pendingItems.reduce((sum, item) => sum + item.cantidad, 0);

  const hasRowStockError = (item: PendingRepuestoItem) => {
    const totalSolicitado = getCantidadEnLista(item.inventario.id);
    const stock = Number(item.inventario.cantidad_existente || 0);
    return item.cantidad <= 0 || totalSolicitado > stock;
  };

  const anyListStockError = pendingItems.some(hasRowStockError);

  const handleAddItem = () => {
    if (!selectedInventarioId || !selectedRepuesto) {
      Swal.fire("Atención", "Debe seleccionar un repuesto o material del inventario.", "warning");
      return;
    }

    if (cantNum <= 0) {
      Swal.fire("Atención", "La cantidad debe ser mayor a 0.", "warning");
      return;
    }

    if (cantNum > stockRestante) {
      Swal.fire({
        icon: "error",
        title: "Stock Insuficiente",
        text: `La cantidad solicitada (${cantNum}) excede el stock disponible restante (${stockRestante}) para "${selectedRepuesto.descripcion}".`,
      });
      return;
    }

    const obsTrim = observaciones.trim();

    setPendingItems((prev) => {
      const existingIdx = prev.findIndex(
        (p) => p.inventario.id === selectedRepuesto.id && p.observaciones === obsTrim
      );
      if (existingIdx !== -1) {
        return prev.map((p, idx) =>
          idx === existingIdx
            ? { ...p, cantidad: Number((p.cantidad + cantNum).toFixed(4)) }
            : p
        );
      }
      return [
        ...prev,
        {
          tempId: `${selectedRepuesto.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          inventario: selectedRepuesto,
          cantidad: cantNum,
          observaciones: obsTrim,
        },
      ];
    });

    setSelectedInventarioId("");
    setCantidad("1");
    setObservaciones("");
    setRepuestoSearchText("");
  };

  const handleUpdateItemCantidad = (tempId: string, rawVal: string) => {
    const parsed = parseFloat(rawVal);
    setPendingItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? { ...item, cantidad: isNaN(parsed) ? 0 : parsed }
          : item
      )
    );
  };

  const handleUpdateItemObservaciones = (tempId: string, value: string) => {
    setPendingItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId ? { ...item, observaciones: value } : item
      )
    );
  };

  const handleRemoveItem = (tempId: string) => {
    setPendingItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  // Filtered dropdown lists for search
  const filteredOrdenes = ordenes.filter((o) => {
    if (!ordenSearchText.trim()) return true;
    const term = ordenSearchText.toLowerCase();
    return (
      o.id.toString().includes(term) ||
      (o.vehiculo_placa && o.vehiculo_placa.toLowerCase().includes(term)) ||
      (o.cliente_nombre && o.cliente_nombre.toLowerCase().includes(term)) ||
      (o.vehiculo_modelo && o.vehiculo_modelo.toLowerCase().includes(term))
    );
  });

  const filteredRepuestos = inventarios.filter((i) => {
    if (!repuestoSearchText.trim()) return true;
    const term = repuestoSearchText.toLowerCase();
    return (
      (i.codigo && i.codigo.toLowerCase().includes(term)) ||
      (i.descripcion && i.descripcion.toLowerCase().includes(term))
    );
  });

  const buildPayload = (
    ordenId: number,
    inv: Inventario,
    qty: number,
    obs: string
  ): CargaRepuestoPayload => {
    const precioCompraUnitario = Number(inv.precio_compra || 0);
    const costoTotalCalculado = Number((precioCompraUnitario * qty).toFixed(2));
    return {
      idorden_trabajo: ordenId,
      id_inventario: Number(inv.id),
      detalle: inv.descripcion,
      cantidad: qty,
      precio_unitario: 0, // Se inicializa en 0 para que el asesor defina el precio al cliente
      total: 0,
      total_costo: costoTotalCalculado,
      observaciones: obs.trim() || undefined,
      estado_trabajo: "confirmado",
      idusuario: user?.id ? Number(user.id) : undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOrdenId) {
      Swal.fire("Atención", "Debe seleccionar una Orden de Trabajo activa.", "warning");
      return;
    }

    let itemsToSubmit = [...pendingItems];

    // Si la lista está vacía pero hay un ítem seleccionado en el selector, permitir cargarlo directo
    if (itemsToSubmit.length === 0) {
      if (!selectedInventarioId || !selectedRepuesto) {
        Swal.fire(
          "Atención",
          "Debe agregar al menos un repuesto o material a la lista antes de guardar.",
          "warning"
        );
        return;
      }
      if (cantNum <= 0) {
        Swal.fire("Atención", "La cantidad debe ser mayor a 0.", "warning");
        return;
      }
      if (stockInsuficiente) {
        Swal.fire({
          icon: "error",
          title: "Stock Insuficiente",
          text: `La cantidad solicitada (${cantNum}) excede el stock disponible en almacén (${stockDisponible}).`,
        });
        return;
      }
      itemsToSubmit = [
        {
          tempId: "single",
          inventario: selectedRepuesto,
          cantidad: cantNum,
          observaciones: observaciones.trim(),
        },
      ];
    } else if (selectedInventarioId && selectedRepuesto && cantNum > 0) {
      const result = await Swal.fire({
        title: "Ítem seleccionado sin agregar",
        text: `Tienes "${selectedRepuesto.descripcion}" (Cant: ${cantNum}) seleccionado arriba sin agregar a la lista. ¿Deseas incluirlo también?`,
        icon: "question",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Sí, incluirlo y guardar",
        denyButtonText: "Guardar solo la lista",
        cancelButtonText: "Cancelar",
      });

      if (result.isDismissed) return;
      if (result.isConfirmed) {
        if (cantNum > stockRestante) {
          Swal.fire({
            icon: "error",
            title: "Stock Insuficiente",
            text: `La cantidad solicitada (${cantNum}) excede el stock disponible restante (${stockRestante}) para "${selectedRepuesto.descripcion}".`,
          });
          return;
        }
        itemsToSubmit.push({
          tempId: "extra",
          inventario: selectedRepuesto,
          cantidad: cantNum,
          observaciones: observaciones.trim(),
        });
      }
    }

    // Validar cantidades y stock acumulado por producto
    const totalPorInv = new Map<number, { total: number; inv: Inventario }>();
    for (const item of itemsToSubmit) {
      if (item.cantidad <= 0) {
        Swal.fire(
          "Atención",
          `La cantidad para "${item.inventario.descripcion}" debe ser mayor a 0.`,
          "warning"
        );
        return;
      }
      const prev = totalPorInv.get(item.inventario.id);
      totalPorInv.set(item.inventario.id, {
        total: (prev?.total || 0) + item.cantidad,
        inv: item.inventario,
      });
    }

    for (const { total, inv } of totalPorInv.values()) {
      const stock = Number(inv.cantidad_existente || 0);
      if (total > stock) {
        Swal.fire({
          icon: "error",
          title: "Stock Insuficiente",
          text: `La cantidad total solicitada para "${inv.descripcion}" (${total}) excede el stock disponible en almacén (${stock}).`,
        });
        return;
      }
    }

    const payloads = itemsToSubmit.map((item) =>
      buildPayload(Number(selectedOrdenId), item.inventario, item.cantidad, item.observaciones)
    );

    setLoading(true);
    try {
      await createCargasRepuestosBulk(payloads);

      await Swal.fire({
        icon: "success",
        title: payloads.length === 1 ? "Repuesto Asignado" : "Repuestos Asignados",
        text:
          payloads.length === 1
            ? `El repuesto "${itemsToSubmit[0].inventario.descripcion}" (Cant: ${itemsToSubmit[0].cantidad}) fue cargado correctamente a la OT #${selectedOrdenId}.`
            : `Se cargaron ${payloads.length} ítems correctamente a la OT #${selectedOrdenId}.`,
        showConfirmButton: false,
        timer: 1800,
      });

      navigate("/inventario/cargar-repuestos");
    } catch (error: any) {
      console.error("Error al cargar repuestos:", error);
      Swal.fire(
        "Error",
        error?.response?.data?.message || "Ocurrió un error al registrar la carga de los repuestos.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabecera idéntica a Hoja de Recepción */}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate("/inventario/cargar-repuestos")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3.5 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm cursor-pointer"
          title="Volver a la lista de repuestos cargados"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Cargar Repuestos / Materiales a Orden de Trabajo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Asigne uno o varios repuestos y materiales desde el almacén a la orden de trabajo seleccionada
          </p>
        </div>
      </div>

      {initialLoading ? (
        <div className="bg-white dark:bg-gray-800 p-12 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 text-center text-gray-500">
          Cargando datos iniciales...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN 1: Selección y Datos de la Orden de Trabajo */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between gap-2 mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2 text-gray-800 dark:text-white font-semibold">
                <FileText className="w-5 h-5 text-blue-500" />
                <span>1. Seleccionar Orden de Trabajo</span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium border border-amber-200 dark:border-amber-800">
                {ordenes.length} OTs en Proceso
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Orden de Trabajo de Destino (Solo "En Proceso") *
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Filtrar por N° OT, placa o cliente..."
                      value={ordenSearchText}
                      onChange={(e) => setOrdenSearchText(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-1.5"
                    />
                  </div>
                  <select
                    required
                    value={selectedOrdenId}
                    onChange={(e) => setSelectedOrdenId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm cursor-pointer"
                  >
                    <option value="">-- Seleccione la Orden de Trabajo (En Proceso) --</option>
                    {filteredOrdenes.map((o) => (
                      <option key={o.id} value={o.id}>
                        OT #{String(o.id).padStart(6, "0")} — Placa: {(o.vehiculo_placa || "S/P").toUpperCase()} — Cliente: {o.cliente_nombre || "S/N"} ({o.marca_auto?.marca || o.vehiculo_marca || ""} {o.vehiculo_modelo})
                      </option>
                    ))}
                  </select>
                  {ordenes.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1 font-medium">
                      <AlertTriangle size={13} /> No hay órdenes de trabajo en estado "En Proceso" en este momento.
                    </p>
                  )}
                </div>
              </div>

              {/* Tarjetas de Datos de la OT / Vehículo (Solo Lectura) */}
              {selectedOrden && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tarjeta Cliente */}
                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border border-gray-200 dark:border-gray-600/60">
                      <div className="flex items-center justify-between mb-3 pb-1 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                          <User size={14} className="text-blue-500" /> Datos del Propietario
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                          Solo lectura
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-xs text-gray-400 block">Cliente:</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-100">
                            {selectedOrden.cliente_nombre || "No especificado"}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">Teléfono / Celular:</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {selectedOrden.cliente_telefono || "Sin teléfono registrado"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tarjeta Vehículo */}
                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border border-gray-200 dark:border-gray-600/60">
                      <div className="flex items-center justify-between mb-3 pb-1 border-b border-gray-200 dark:border-gray-600">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                          <Car size={14} className="text-emerald-500" /> Datos del Vehículo
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                          Solo lectura
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-gray-400 block">Placa:</span>
                          <span className="font-bold font-mono text-gray-900 dark:text-white text-base">
                            {(selectedOrden.vehiculo_placa || "S/P").toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">Vehículo:</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {selectedOrden.marca_auto?.marca || selectedOrden.vehiculo_marca || "N/A"}{" "}
                            {selectedOrden.vehiculo_modelo}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">Color:</span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {selectedOrden.vehiculo_color || "No indicado"}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-400 block">Estado OT:</span>
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                            {selectedOrden.estado || "En Proceso"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
                    <CheckCircle2 size={15} className="text-blue-600 shrink-0" />
                    <span>
                      La información de facturación, precios al cliente y mano de obra de la orden se mantiene confidencial.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 2: Selección y Agregado de Repuestos / Materiales */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between gap-2 mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2 text-gray-800 dark:text-white font-semibold">
                <Package className="w-5 h-5 text-purple-600" />
                <span>2. Agregar Repuestos / Materiales (Inventario)</span>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800">
                {pendingItems.length} ítem(s) en lista
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Repuesto / Material de Almacén *
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por código o descripción del repuesto..."
                      value={repuestoSearchText}
                      onChange={(e) => setRepuestoSearchText(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 mb-1.5"
                    />
                  </div>
                  <select
                    value={selectedInventarioId}
                    onChange={(e) => setSelectedInventarioId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm cursor-pointer"
                  >
                    <option value="">-- Seleccione un Repuesto o Material del Inventario --</option>
                    {filteredRepuestos.map((item) => {
                      const enLista = getCantidadEnLista(item.id);
                      const restante = Math.max(0, Number((Number(item.cantidad_existente || 0) - enLista).toFixed(4)));
                      return (
                        <option key={item.id} value={item.id}>
                          {item.codigo ? `[${item.codigo}] ` : ""}{item.descripcion} — (Stock: {restante}{enLista > 0 ? ` de ${item.cantidad_existente}` : ""} {item.unidad_medida?.medida || "uds."})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Ficha de Stock y Especificación del Repuesto Seleccionado */}
              {selectedRepuesto && (
                <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {selectedRepuesto.codigo && (
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200">
                            {selectedRepuesto.codigo}
                          </span>
                        )}
                        <h4 className="text-base font-bold text-gray-900 dark:text-white">
                          {selectedRepuesto.descripcion}
                        </h4>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Unidad: {selectedRepuesto.unidad_medida?.medida || "Unidades"} | Grupo:{" "}
                        {selectedRepuesto.grupo_inventario?.grupo || "General"}
                        {yaEnLista > 0 && (
                          <span className="ml-2 text-purple-700 dark:text-purple-300 font-semibold">
                            | Ya en lista: {yaEnLista}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 block font-medium">
                          Stock Disponible {yaEnLista > 0 ? "Restante" : ""}
                        </span>
                        <span
                          className={`text-xl font-extrabold font-mono ${
                            stockRestante > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"
                          }`}
                        >
                          {stockRestante}{" "}
                          <span className="text-xs font-normal text-gray-500">
                            {selectedRepuesto.unidad_medida?.medida || "uds."}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cantidad, Observaciones y Botón Agregar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cantidad *
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      max={stockRestante > 0 ? stockRestante : undefined}
                      value={cantidad}
                      onChange={(e) => setCantidad(e.target.value)}
                      placeholder="Ej: 1"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-lg border ${
                        stockInsuficiente
                          ? "border-red-500 focus:ring-red-500"
                          : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-bold`}
                    />
                  </div>
                  {stockInsuficiente && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-semibold">
                      <AlertTriangle size={12} /> Excede el stock disponible ({stockRestante})
                    </p>
                  )}
                </div>

                <div className="md:col-span-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observaciones / Notas (Opcional)
                  </label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Entregado al mecánico, repuesto original..."
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#3498db]"
                  />
                </div>

                <div className="md:col-span-3">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!selectedInventarioId || cantNum <= 0 || stockInsuficiente}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Agregar a Lista</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Lista de Ítems a Despachar */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2 text-gray-800 dark:text-white font-semibold">
                <ClipboardList className="w-5 h-5 text-emerald-600" />
                <span>3. Ítems a Cargar en la Orden</span>
              </div>
              {pendingItems.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
                    {pendingItems.length} ítem(s) · {Number(totalUnidadesLista.toFixed(2))} unidad(es)
                  </span>
                </div>
              )}
            </div>

            {pendingItems.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/30 text-sm text-gray-500 dark:text-gray-400">
                Aún no agregaste ítems a la lista. Selecciona un repuesto o material arriba y haz clic en{" "}
                <span className="font-semibold text-purple-600 dark:text-purple-400">"+ Agregar a Lista"</span> para cargar varios ítems a la vez.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <th className="p-3 w-10">#</th>
                      <th className="p-3">Repuesto / Material</th>
                      <th className="p-3 text-center w-28">Stock</th>
                      <th className="p-3 w-32">Cantidad</th>
                      <th className="p-3">Observaciones</th>
                      <th className="p-3 text-center w-16">Quitar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                    {pendingItems.map((item, idx) => {
                      const rowError = hasRowStockError(item);
                      const stockMax = Number(item.inventario.cantidad_existente || 0);
                      return (
                        <tr
                          key={item.tempId}
                          className={`${
                            rowError
                              ? "bg-red-50/60 dark:bg-red-950/20"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                          } transition-colors`}
                        >
                          <td className="p-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                            {idx + 1}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.inventario.codigo && (
                                <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200">
                                  {item.inventario.codigo}
                                </span>
                              )}
                              <span className="font-semibold text-gray-800 dark:text-gray-100">
                                {item.inventario.descripcion}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400">
                              {item.inventario.unidad_medida?.medida || "Unidades"}
                              {item.inventario.grupo_inventario?.grupo
                                ? ` · ${item.inventario.grupo_inventario.grupo}`
                                : ""}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono text-xs text-gray-600 dark:text-gray-300">
                            {stockMax} {item.inventario.unidad_medida?.medida || "uds."}
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="any"
                              min="0.01"
                              value={item.cantidad || ""}
                              onChange={(e) => handleUpdateItemCantidad(item.tempId, e.target.value)}
                              className={`w-24 px-2.5 py-1.5 rounded-lg border text-sm font-bold bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                                rowError
                                  ? "border-red-500 focus:ring-red-500"
                                  : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                              }`}
                            />
                            {rowError && (
                              <span className="block text-[11px] text-red-600 font-semibold mt-0.5">
                                Stock máx: {stockMax}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={item.observaciones}
                              onChange={(e) =>
                                handleUpdateItemObservaciones(item.tempId, e.target.value)
                              }
                              placeholder="Opcional..."
                              className="w-full min-w-[140px] px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.tempId)}
                              className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors cursor-pointer"
                              title="Quitar de la lista"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate("/inventario/cargar-repuestos")}
              className="w-full sm:w-auto px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                !selectedOrdenId ||
                anyListStockError ||
                (pendingItems.length === 0 && (!selectedInventarioId || stockInsuficiente || cantNum <= 0))
              }
              className="w-full sm:w-auto bg-[#3498db] hover:bg-[#2980b9] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Save className="w-5 h-5" />
              <span>
                {loading
                  ? "Guardando Carga..."
                  : pendingItems.length > 0
                    ? `Guardar Carga (${pendingItems.length} ${pendingItems.length === 1 ? "ítem" : "ítems"})`
                    : "Guardar Carga de Repuesto"}
              </span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default RepuestoOTForm;
