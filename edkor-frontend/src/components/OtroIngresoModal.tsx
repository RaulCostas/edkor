import React, { useState, useEffect, useMemo } from "react";
import { X, Save, AlertCircle, PackageCheck, DollarSign, Plus } from "lucide-react";
import Swal from "sweetalert2";
import type { OtroIngreso, CreateOtroIngresoData } from "../types/otroIngreso";
import type { Inventario } from "../types/inventario";
import type { FormaPago } from "../types/formaPago";
import type { Personal } from "../types/personal";
import { getInventarios } from "../services/inventarioService";
import { getFormasPago, createFormaPago } from "../services/formaPagoService";
import { getPersonal } from "../services/personalService";
import { getLocalDateString } from "../utils/dateUtils";
import { SearchableSelect } from "./common/SearchableSelect";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: OtroIngreso | null;
  onSubmit: (data: CreateOtroIngresoData) => Promise<any>;
}

const TIPOS_INGRESO = [
  "Venta de Insumo",
  "Auxilio Mecánico",
  "Servicio Rápido",
  "Otro",
];

export const OtroIngresoModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
  onSubmit,
}) => {
  const [loading, setLoading] = useState(false);
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [asesores, setAsesores] = useState<Personal[]>([]);

  const [fecha, setFecha] = useState<string>(getLocalDateString());
  const [tipoIngreso, setTipoIngreso] = useState<string>("Venta de Insumo");
  const [motivo, setMotivo] = useState<string>("");
  const [monto, setMonto] = useState<string>("");
  const [moneda, setMoneda] = useState<string>("Bolivianos");
  const [observacion, setObservacion] = useState<string>("");
  const [cliente, setCliente] = useState<string>("");
  const [telefonoCliente, setTelefonoCliente] = useState<string>("");
  const [placa, setPlaca] = useState<string>("");
  const [comprobante, setComprobante] = useState<string>("");
  const [asesorId, setAsesorId] = useState<string>("");
  const [formaPagoId, setFormaPagoId] = useState<string>("");

  // Inventario fields
  const [linkInventario, setLinkInventario] = useState<boolean>(false);
  const [inventarioId, setInventarioId] = useState<string>("");
  const [cantidad, setCantidad] = useState<number>(1);
  const [descontarStock, setDescontarStock] = useState<boolean>(true);

  // Modal nueva forma de pago
  const [showModalFormaPago, setShowModalFormaPago] = useState(false);
  const [nuevaFormaPagoNombre, setNuevaFormaPagoNombre] = useState("");
  const [savingFormaPago, setSavingFormaPago] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      if (initialData) {
        setFecha(
          initialData.fecha
            ? String(initialData.fecha).split("T")[0]
            : getLocalDateString()
        );
        setTipoIngreso(initialData.tipo_ingreso || "Venta de Insumo");
        setMotivo(initialData.motivo || "");
        setMonto(initialData.monto ? String(initialData.monto) : "");
        setMoneda(initialData.moneda || "Bolivianos");
        setObservacion(initialData.observacion || "");
        setCliente(initialData.cliente || "");
        setTelefonoCliente(initialData.telefono_cliente || "");
        setPlaca(initialData.placa || "");
        setComprobante(initialData.comprobante || "");
        setAsesorId(initialData.asesor_id ? String(initialData.asesor_id) : "");
        setFormaPagoId(
          initialData.forma_pago_id ? String(initialData.forma_pago_id) : ""
        );
        setLinkInventario(Boolean(initialData.idinventario));
        setInventarioId(
          initialData.idinventario ? String(initialData.idinventario) : ""
        );
        setCantidad(Number(initialData.cantidad || 1));
        setDescontarStock(Boolean(initialData.descontar_stock));
      } else {
        // Reset defaults
        setFecha(getLocalDateString());
        setTipoIngreso("Venta de Insumo");
        setMotivo("");
        setMonto("");
        setMoneda("Bolivianos");
        setObservacion("");
        setCliente("");
        setTelefonoCliente("");
        setPlaca("");
        setComprobante("");
        setAsesorId("");
        setFormaPagoId("");
        setLinkInventario(false);
        setInventarioId("");
        setCantidad(1);
        setDescontarStock(true);
      }
    }
  }, [isOpen, initialData]);

  const loadDependencies = async () => {
    try {
      const [invRes, fpRes, perRes] = await Promise.all([
        getInventarios().catch(() => []),
        getFormasPago().catch(() => []),
        getPersonal().catch(() => []),
      ]);
      setInventarios(invRes);
      setFormasPago(fpRes);
      setAsesores(perRes);

      // Default forma de pago si no está seleccionada
      if (!formaPagoId && fpRes.length > 0) {
        const efectivo = fpRes.find(
          (f) => f.forma_pago.toLowerCase().includes("efectivo")
        );
        if (efectivo) {
          setFormaPagoId(String(efectivo.id));
        }
      }
    } catch (err) {
      console.error("Error al cargar dependencias en modal:", err);
    }
  };

  const inventarioOptions = useMemo(() => {
    return inventarios.map((item) => {
      const codigo = item.codigo ? `[${item.codigo}] ` : "";
      const unidad = item.unidad_medida?.unidad || "uds.";
      return {
        value: item.id,
        label: `${codigo}${item.descripcion}`,
        sublabel: `Stock: ${item.cantidad_existente} ${unidad}`,
      };
    });
  }, [inventarios]);

  const handleCreateFormaPago = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nuevaFormaPagoNombre.trim();
    if (!trimmed) return;
    setSavingFormaPago(true);
    try {
      const created = await createFormaPago({
        forma_pago: trimmed,
        estado: "activo",
      });
      const updatedList = await getFormasPago();
      setFormasPago(updatedList);
      setFormaPagoId(String(created.id));
      setShowModalFormaPago(false);
      setNuevaFormaPagoNombre("");
      Swal.fire({
        icon: "success",
        title: "Forma de Pago Creada",
        text: `Se agregó "${created.forma_pago}"`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error creando forma de pago:", error);
      Swal.fire("Error", "No se pudo registrar la forma de pago", "error");
    } finally {
      setSavingFormaPago(false);
    }
  };

  const handleSelectInventario = (idStr: string) => {
    setInventarioId(idStr);
    if (!idStr) return;

    const item = inventarios.find((i) => String(i.id) === idStr);
    if (item) {
      if (!motivo || motivo === initialData?.motivo) {
        setMotivo(item.descripcion);
      }
      if (item.precio_compra !== undefined && item.precio_compra !== null) {
        const total = Number(item.precio_compra) * cantidad;
        setMonto(total.toFixed(2));
      }
    }
  };

  const handleCantidadChange = (newCant: number) => {
    const val = Math.max(1, newCant);
    setCantidad(val);

    if (inventarioId) {
      const item = inventarios.find((i) => String(i.id) === inventarioId);
      if (item && item.precio_compra !== undefined && item.precio_compra !== null) {
        setMonto((Number(item.precio_compra) * val).toFixed(2));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivo.trim()) {
      Swal.fire("Atención", "Ingrese el motivo o descripción del ingreso", "warning");
      return;
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      Swal.fire("Atención", "Ingrese un monto o precio válido mayor a 0", "warning");
      return;
    }

    // Validar stock si seleccionó inventario y desea descontar
    if (linkInventario && inventarioId && descontarStock) {
      const item = inventarios.find((i) => String(i.id) === inventarioId);
      if (item && item.cantidad_existente < cantidad) {
        const confirm = await Swal.fire({
          title: "Stock Insuficiente",
          text: `El stock actual de "${item.descripcion}" es de ${item.cantidad_existente} unidades, y se intentan vender ${cantidad}. ¿Desea continuar de todos modos?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Sí, registrar",
          cancelButtonText: "Cancelar",
          confirmButtonColor: "#f59e0b",
        });
        if (!confirm.isConfirmed) return;
      }
    }

    setLoading(true);
    try {
      const payload: CreateOtroIngresoData = {
        fecha,
        motivo: motivo.trim(),
        tipo_ingreso: tipoIngreso,
        monto: montoNum,
        moneda,
        observacion: observacion.trim() || undefined,
        cliente: cliente.trim() || undefined,
        telefono_cliente: telefonoCliente.trim() || undefined,
        placa: placa.trim().toUpperCase() || undefined,
        comprobante: comprobante.trim() || undefined,
        asesor_id: asesorId ? Number(asesorId) : undefined,
        forma_pago_id: formaPagoId ? Number(formaPagoId) : undefined,
        idinventario: linkInventario && inventarioId ? Number(inventarioId) : undefined,
        cantidad: linkInventario && inventarioId ? cantidad : 1,
        descontar_stock: linkInventario && inventarioId ? descontarStock : false,
      };

      await onSubmit(payload);
      Swal.fire({
        icon: "success",
        title: initialData ? "Actualizado" : "Registrado",
        text: `El ingreso ha sido ${initialData ? "actualizado" : "registrado"} exitosamente.`,
        timer: 1800,
        showConfirmButton: false,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error al guardar Otro Ingreso:", err);
      Swal.fire(
        "Error",
        err.response?.data?.message || "No se pudo guardar el registro",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedItem = inventarios.find((i) => String(i.id) === inventarioId);

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-bold">
                {initialData ? `Editar Ingreso N° ${initialData.nro || initialData.id}` : "Registrar Otro Ingreso"}
              </h2>
              <p className="text-xs text-blue-100">
                Ventas directas de insumos/aditivos, auxilios mecánicos o ingresos varios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Fila 1: Fecha, Tipo de Ingreso y Moneda */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Tipo de Ingreso *
              </label>
              <select
                value={tipoIngreso}
                onChange={(e) => {
                  const val = e.target.value;
                  setTipoIngreso(val);
                  if (val === "Venta de Insumo") {
                    setLinkInventario(true);
                  }
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {TIPOS_INGRESO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {tipo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Moneda *
              </label>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Bolivianos">Bolivianos (Bs)</option>
                <option value="Dólares">Dólares ($us)</option>
              </select>
            </div>
          </div>

          {/* Sección Inventario / Aditivos (Control de Stock) */}
          <div className="bg-blue-50/60 dark:bg-blue-950/20 rounded-xl p-3.5 border border-blue-100 dark:border-blue-900/40">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-blue-900 dark:text-blue-300">
                <input
                  type="checkbox"
                  checked={linkInventario}
                  onChange={(e) => setLinkInventario(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <PackageCheck className="h-4 w-4 text-blue-600" />
                Vincular con Producto de Inventario / Aditivo (Control de Stock)
              </label>
            </div>

            {linkInventario && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Seleccionar Producto / Insumo
                    </label>
                    <SearchableSelect
                      options={inventarioOptions}
                      value={inventarioId ? Number(inventarioId) : ""}
                      onChange={(val) => handleSelectInventario(val ? String(val) : "")}
                      placeholder="-- Buscar producto del inventario --"
                      searchPlaceholder="Buscar por nombre, código..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={cantidad}
                      onChange={(e) => handleCantidadChange(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {selectedItem && (
                  <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 gap-2">
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <span>Stock Disponible: </span>
                        <strong className={selectedItem.cantidad_existente < cantidad ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>
                          {selectedItem.cantidad_existente} {selectedItem.unidad_medida?.unidad || "uds."}
                        </strong>
                      </div>
                      <div>
                        <span>P. Compra Unitario: </span>
                        <strong className="text-blue-600 dark:text-blue-400 font-bold">
                          Bs {Number(selectedItem.precio_compra || 0).toFixed(2)}
                        </strong>
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={descontarStock}
                        onChange={(e) => setDescontarStock(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      Descontar automáticamente del stock
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fila 2: Motivo / Descripción y Monto */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Motivo o Descripción del Ingreso *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Venta de aditivo limpia inyectores, Auxilio mecánico en carretera..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Monto o Precio ({moneda === "Dólares" ? "$us" : "Bs"}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg font-bold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Fila 3: Forma de Pago y Asesor Técnico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Forma de Pago
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={formaPagoId}
                  onChange={(e) => setFormaPagoId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Seleccionar Forma de Pago --</option>
                  {formasPago.map((fp) => (
                    <option key={fp.id} value={fp.id}>
                      {fp.forma_pago}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setNuevaFormaPagoNombre("");
                    setShowModalFormaPago(true);
                  }}
                  className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0 cursor-pointer"
                  title="Registrar nueva Forma de Pago"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Asesor Técnico / Responsable
              </label>
              <select
                value={asesorId}
                onChange={(e) => setAsesorId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Seleccionar Asesor --</option>
                {asesores.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} {p.paterno || ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 4: Cliente, Teléfono y Placa (opcionales) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Cliente (Opcional)
              </label>
              <input
                type="text"
                placeholder="Nombre del cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Teléfono / Celular
              </label>
              <input
                type="text"
                placeholder="Ej. 70000000"
                value={telefonoCliente}
                onChange={(e) => setTelefonoCliente(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Placa Vehicular
              </label>
              <input
                type="text"
                placeholder="Ej. 1234ABC"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm rounded-lg font-mono font-bold uppercase border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Fila 5: Comprobante y Observaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                N° Comprobante / Recibo
              </label>
              <input
                type="text"
                placeholder="Ej. REC-0012, FAC-89"
                value={comprobante}
                onChange={(e) => setComprobante(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Observaciones
              </label>
              <input
                type="text"
                placeholder="Notas adicionales..."
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={16} />
              {loading ? "Guardando..." : initialData ? "Actualizar Ingreso" : "Guardar Ingreso"}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Modal para Crear Nueva Forma de Pago */}
    {showModalFormaPago && (
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-500" /> Nueva Forma de Pago
            </h2>
            <button
              type="button"
              onClick={() => setShowModalFormaPago(false)}
              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={handleCreateFormaPago} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre de la Forma de Pago *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="Ej: QR, Transferencia BNB, Efectivo..."
                value={nuevaFormaPagoNombre}
                onChange={(e) => setNuevaFormaPagoNombre(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModalFormaPago(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span>Cancelar</span>
              </button>
              <button
                type="submit"
                disabled={savingFormaPago || !nuevaFormaPagoNombre.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{savingFormaPago ? "Guardando..." : "Guardar Forma de Pago"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </>
);
};

export default OtroIngresoModal;
