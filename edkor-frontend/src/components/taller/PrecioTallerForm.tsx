import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Swal from "sweetalert2";
import type {
  CreatePrecioTallerData,
  PrecioTaller,
  ItemPrecioTaller,
} from "../../types/precioTaller";
import type { CategoriaServicio } from "../../types/categoriaServicio";
import {
  getCategoriasServicio,
  createCategoriaServicio,
} from "../../services/categoriaServicioService";
import { normalizeItems } from "./MantenimientoDetalleModal";
import {
  List,
  FileText,
  DollarSign,
  Save,
  X,
  Plus,
  Trash2,
  Wrench,
  Sparkles,
  ChevronDown,
} from "lucide-react";

const REVISIONES_ESTANDAR_IMCRUZ: string[] = [
  "Cambiar aceite de motor.",
  "Afinado de motor con scanner de marca.",
  "Engrasar cardan modelos 4x4.",
  "Cambiar filtro de aceite.",
  "Cambiar filtro de aire.",
  "Cambiar bujías de motor. (Las de Iridio cada 50.000 km)",
  "Inspección funcionamiento de motor, con scanner.",
  "Cambio de fluidos de frenos y anticongelante (60.000 km).",
  "Inspección de funcionamiento de controles de A/C.",
  "Revisión funcionamiento de la radio.",
  "Limpieza de filtro de A/C y cambio si corresponde.",
  "Inspección sistema de dirección.",
  "Revisión con desmontado completo de frenos.",
  "Limpieza y regulado de freno de mano.",
  "Revisión líquido.",
  "Inspección y reajuste de sistema de suspensión.",
  "Inspección líquido de embrague y regulado.",
  "Inspección nivel de agua depósito limpiaparabrisas.",
  "Inspección nivel de líquido refrigerante.",
  "Inspección nivel de solución de batería.",
  "Revisión de Estado y sistema de carga con herramienta electrónica MITRONIC.",
  "Balanceo 4 ruedas y alineado en 60.000 km. Rotación de llantas.",
  "Limpieza e inspección chisguete y escobillas limpiaparabrisas.",
  "Lubricadas bisagras de puertas.",
  "Revisión de luces en general. Regulado de faroles si corresponde.",
  "Revisión presión de llantas.",
  "Inspección de correas auxiliares.",
  "Ajuste de carrocería y chasis.",
  "Inspección cañerías y mangueras de sistema de frenos.",
  "Cambio de lubricantes de Transmisión y coronas (si aplica 40.000 km).",
];

const sanitizeDecimalInput = (raw: string): string => {
  const normalized = raw.replace(/,/g, ".");
  const cleaned = normalized.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) {
    return parts[0] + "." + parts.slice(1).join("");
  }
  return cleaned;
};

interface PrecioTallerFormProps {
  initialData?: PrecioTaller | null;
  onSubmit: (data: CreatePrecioTallerData) => Promise<void>;
  onCancel: () => void;
}

export const PrecioTallerForm = ({
  initialData,
  onSubmit,
  onCancel,
}: PrecioTallerFormProps) => {
  const initialItems = normalizeItems(initialData?.items);

  const [formData, setFormData] = useState<CreatePrecioTallerData>({
    codigo: initialData?.codigo || "",
    idcategoria_servicio: initialData?.categoria?.id || "",
    detalle: initialData?.detalle || "",
    precio: Number(initialData?.precio || 0),
    tiempo_estimado: Number(initialData?.tiempo_estimado || 0),
    precio_hora: Number(initialData?.precio_hora || 0),
    items: initialItems,
    revisiones: initialData?.revisiones ? [...initialData.revisiones] : [],
    estado: initialData?.estado || "activo",
  });

  // Estados en texto para permitir escribir "." y decimales sin borrar los números
  const [precioText, setPrecioText] = useState<string>(
    initialData?.precio !== undefined ? String(Number(initialData.precio)) : "0"
  );
  const [tiempoEstimadoText, setTiempoEstimadoText] = useState<string>(
    initialData?.tiempo_estimado !== undefined
      ? String(Number(initialData.tiempo_estimado))
      : "0"
  );
  const [precioHoraText, setPrecioHoraText] = useState<string>(
    initialData?.precio_hora !== undefined
      ? String(Number(initialData.precio_hora))
      : "0"
  );
  const [itemPreciosText, setItemPreciosText] = useState<string[]>(
    initialItems.map((it) => String(Number(it.precio || 0)))
  );

  const [categorias, setCategorias] = useState<CategoriaServicio[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal para agregar nueva categoría
  const [showModalCategoria, setShowModalCategoria] = useState(false);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("");
  const [savingCategoria, setSavingCategoria] = useState(false);

  // Grupo de trabajo (desglose y revisiones): colapsado por defecto al crear nuevo
  const [showGrupoTrabajo, setShowGrupoTrabajo] = useState<boolean>(() => {
    return Boolean(
      (initialData?.items && initialData.items.length > 0) ||
      (initialData?.revisiones && initialData.revisiones.length > 0)
    );
  });

  const handleCreateCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nuevaCategoriaNombre.trim();
    if (!clean) return;

    setSavingCategoria(true);
    try {
      const created = await createCategoriaServicio({
        categoria_servicio: clean,
        estado: "activo",
      });

      const categoriasData = await getCategoriasServicio();
      setCategorias(categoriasData.filter((c) => c.estado === "activo"));
      setFormData((prev) => ({
        ...prev,
        idcategoria_servicio: String(created.id),
      }));
      setShowModalCategoria(false);
      setNuevaCategoriaNombre("");
      Swal.fire({
        icon: "success",
        title: "Categoría Creada",
        text: `Se agregó "${clean}" correctamente.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: any) {
      console.error("Error creating categoría de servicio:", error);
      const serverMsg = error.response?.data?.message;
      const message = Array.isArray(serverMsg)
        ? serverMsg.join(", ")
        : serverMsg || "No se pudo crear la categoría.";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: message,
      });
    } finally {
      setSavingCategoria(false);
    }
  };

  useEffect(() => {
    const loadCategorias = async () => {
      try {
        const categoriasData = await getCategoriasServicio();
        setCategorias(categoriasData.filter((c) => c.estado === "activo"));
      } catch (error) {
        console.error("Error cargando categorías", error);
      }
    };
    loadCategorias();
  }, []);

  const recalcularPrecioTotal = (
    itemsList: ItemPrecioTaller[],
    fallbackPrecio: number
  ) => {
    if (!itemsList || itemsList.length === 0) return fallbackPrecio;
    const suma = itemsList.reduce(
      (acc, item) => acc + (Number(item.precio) || 0),
      0
    );
    return Number(suma.toFixed(2));
  };

  // --- Gestión de Ítems (Tabla de Desglose con Precio) ---
  const handleAddItem = () => {
    setFormData((prev) => {
      const nuevos = [...(prev.items || []), { detalle: "", precio: 0 }];
      return { ...prev, items: nuevos };
    });
    setItemPreciosText((prev) => [...prev, "0"]);
  };

  const handleItemDetalleChange = (index: number, detalle: string) => {
    const updated = [...(formData.items || [])];
    updated[index] = { ...updated[index], detalle };
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const handleItemPrecioChange = (index: number, rawVal: string) => {
    const cleaned = sanitizeDecimalInput(rawVal);
    setItemPreciosText((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });

    const updated = [...(formData.items || [])];
    const numPrecio = parseFloat(cleaned) || 0;
    updated[index] = { ...updated[index], precio: numPrecio };
    const nuevoTotal = recalcularPrecioTotal(updated, formData.precio);
    setPrecioText(String(nuevoTotal));
    setFormData((prev) => ({
      ...prev,
      items: updated,
      precio: nuevoTotal,
    }));
  };

  const handleRemoveItem = (index: number) => {
    const updated = (formData.items || []).filter((_, i) => i !== index);
    setItemPreciosText((prev) => prev.filter((_, i) => i !== index));
    const nuevoTotal = recalcularPrecioTotal(updated, formData.precio);
    setPrecioText(String(nuevoTotal));
    setFormData((prev) => ({
      ...prev,
      items: updated,
      precio: nuevoTotal,
    }));
  };

  // --- Gestión de Revisiones (Listado con llave 🔧) ---
  const handleAddRevision = () => {
    setFormData((prev) => ({
      ...prev,
      revisiones: [...(prev.revisiones || []), ""],
    }));
  };

  const handleCargarRevisionesEstandar = () => {
    setFormData((prev) => ({
      ...prev,
      revisiones: [...REVISIONES_ESTANDAR_IMCRUZ],
    }));
  };

  const handleLimpiarRevisiones = () => {
    setFormData((prev) => ({
      ...prev,
      revisiones: [],
    }));
  };

  const handleRevisionChange = (index: number, value: string) => {
    const updated = [...(formData.revisiones || [])];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, revisiones: updated }));
  };

  const handleRemoveRevision = (index: number) => {
    const updated = (formData.revisiones || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, revisiones: updated }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cleanedItems = (formData.items || [])
        .map((item) => ({
          detalle: (item.detalle || "").trim(),
          precio: Number(item.precio || 0),
        }))
        .filter((item) => item.detalle.length > 0);

      const cleanedRevisiones = (formData.revisiones || [])
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      const finalPrecio =
        cleanedItems.length > 0
          ? Number(
              cleanedItems
                .reduce((acc, cur) => acc + Number(cur.precio || 0), 0)
                .toFixed(2)
            )
          : Number(formData.precio || 0);

      const totalCostoCalc = Number(
        (
          Number(formData.tiempo_estimado || 0) *
          Number(formData.precio_hora || 0)
        ).toFixed(2)
      );

      await onSubmit({
        ...formData,
        codigo: (formData.codigo || "").trim().toUpperCase(),
        detalle: (formData.detalle || "").trim(),
        precio: finalPrecio,
        tiempo_estimado: Number(formData.tiempo_estimado || 0),
        precio_hora: Number(formData.precio_hora || 0),
        total_costo: totalCostoCalc,
        items: cleanedItems,
        revisiones: cleanedRevisiones,
      });
    } finally {
      setLoading(false);
    }
  };

  const tieneDesglosePrecios =
    (formData.items?.length || 0) > 0 &&
    formData.items!.some((i) => Number(i.precio) > 0);

  const totalTiempoPorPrecioHora = (
    (Number(formData.tiempo_estimado) || 0) *
    (Number(formData.precio_hora) || 0)
  ).toFixed(2);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <span className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-300">
            <PlusCircleIcon />
          </span>
          {initialData
            ? `Editar Precio / Mantenimiento #${initialData.id}`
            : "Nuevo Precio / Mantenimiento"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-400 rounded-lg transition-all transform hover:-translate-y-0.5"
          title="Cerrar"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Categoría *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <List
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                  size={18}
                />
                <select
                  value={formData.idcategoria_servicio}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      idcategoria_servicio: e.target.value,
                    })
                  }
                  required
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                >
                  <option value="">Seleccione categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.categoria_servicio}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNuevaCategoriaNombre("");
                  setShowModalCategoria(true);
                }}
                className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0"
                title="Registrar nueva Categoría"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Detalle / Nombre del Mantenimiento *
            </label>
            <div className="relative">
              <FileText
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={formData.detalle}
                onChange={(e) =>
                  setFormData({ ...formData, detalle: e.target.value })
                }
                required
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Ej: 10K TRADICIONAL / Mantenimiento 10.000 km"
              />
            </div>
          </div>
        </div>

        {/* Fila 2: Precio Total (Cliente), Tiempo Estimado, Precio Hora, Total (Tiempo x Precio Hora) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50/70 dark:bg-gray-700/30 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
          <div>
            <label className="block mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
              Precio Total (Cliente) (Bs) *
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                size={16}
              />
              <input
                type="text"
                inputMode="decimal"
                value={tieneDesglosePrecios ? String(formData.precio) : precioText}
                readOnly={tieneDesglosePrecios}
                onChange={(e) => {
                  const cleaned = sanitizeDecimalInput(e.target.value);
                  setPrecioText(cleaned);
                  setFormData({
                    ...formData,
                    precio: parseFloat(cleaned) || 0,
                  });
                }}
                required
                className={`w-full pl-9 pr-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 ${
                  tieneDesglosePrecios
                    ? "bg-gray-100 dark:bg-gray-600 font-bold cursor-not-allowed"
                    : "bg-white dark:bg-gray-700"
                } text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
              Tiempo Estimado (Hrs) *
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={tiempoEstimadoText}
              onChange={(e) => {
                const cleaned = sanitizeDecimalInput(e.target.value);
                setTiempoEstimadoText(cleaned);
                setFormData({
                  ...formData,
                  tiempo_estimado: parseFloat(cleaned) || 0,
                });
              }}
              required
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
              Precio Hora (Bs) *
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                size={16}
              />
              <input
                type="text"
                inputMode="decimal"
                value={precioHoraText}
                onChange={(e) => {
                  const cleaned = sanitizeDecimalInput(e.target.value);
                  setPrecioHoraText(cleaned);
                  setFormData({
                    ...formData,
                    precio_hora: parseFloat(cleaned) || 0,
                  });
                }}
                required
                className="w-full pl-9 pr-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
              Total (Tiempo x Precio Hora) (Bs)
            </label>
            <div className="relative">
              <DollarSign
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                size={16}
              />
              <input
                type="text"
                readOnly
                value={totalTiempoPorPrecioHora}
                className="w-full pl-9 pr-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 font-bold cursor-not-allowed text-gray-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Botón: Grupo de trabajo */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowGrupoTrabajo((prev) => !prev)}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-between transition-all transform hover:-translate-y-0.5 shadow-sm ${
              showGrupoTrabajo
                ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span>Grupo de trabajo</span>
              {((formData.items?.length || 0) > 0 || (formData.revisiones?.length || 0) > 0) && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 dark:bg-white/10 font-normal">
                  {[
                    (formData.items?.length || 0) > 0 ? `${formData.items?.length} ítems de costo` : null,
                    (formData.revisiones?.length || 0) > 0 ? `${formData.revisiones?.length} revisiones` : null
                  ].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span>{showGrupoTrabajo ? "Ocultar detalles" : "Configurar desglose y revisiones"}</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  showGrupoTrabajo ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>
        </div>

        {/* Desglose y Revisiones (visibles al activar "Grupo de trabajo") */}
        {showGrupoTrabajo && (
          <div className="space-y-4 animate-in fade-in duration-200 pt-1">
        {/* 1. TABLA DE DESGLOSE DE COSTOS (DETALLE + PRECIO) */}
        <div className="bg-gray-50 dark:bg-gray-700/40 p-3.5 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2.5">
            <div>
              <label className="text-sm font-bold text-[#001a41] dark:text-white block">
                1. Desglose del Mantenimiento (Detalle y Precio por Ítem)
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Ej: Productos varios, Balanceo, Mano de obra, Filtro aceite, Lubricante...
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs bg-[#001a41] hover:bg-[#002863] text-white font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-1"
            >
              <Plus size={14} /> Agregar Ítem de Costo
            </button>
          </div>

          {!formData.items || formData.items.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic py-1">
              Sin desglose de ítems. Si agrega ítems con precio aquí, el Precio Total se calculará automáticamente.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase text-white bg-[#001a41] px-2.5 py-1.5 rounded-t-md">
                <div className="col-span-1 text-center">#</div>
                <div className="col-span-7">DETALLE</div>
                <div className="col-span-3 text-right">PRECIO (Bs)</div>
                <div className="col-span-1 text-center"></div>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {formData.items.map((subItem, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <span className="col-span-1 text-xs font-mono text-gray-600 dark:text-gray-300 text-center">
                      {idx + 1}
                    </span>
                    <div className="col-span-7">
                      <input
                        type="text"
                        value={subItem.detalle}
                        onChange={(e) =>
                          handleItemDetalleChange(idx, e.target.value)
                        }
                        placeholder="Ej: MANO DE OBRA, FILTRO ACEITE..."
                        className="w-full px-2.5 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={
                          itemPreciosText[idx] !== undefined
                            ? itemPreciosText[idx]
                            : String(subItem.precio)
                        }
                        onChange={(e) =>
                          handleItemPrecioChange(idx, e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full px-2.5 py-1 text-xs text-right rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                        title="Eliminar fila"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center bg-[#001a41] text-white px-3 py-1.5 rounded-b-md text-xs font-bold">
                <span>TOTAL DESGLOSE</span>
                <span>
                  {Number(formData.precio || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  Bs
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 2. LISTADO DE REVISIONES OBLIGATORIAS (CON LLAVE 🔧) */}
        <div className="bg-amber-50/60 dark:bg-gray-700/40 p-3.5 rounded-lg border border-amber-200 dark:border-gray-600">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-2.5">
            <div>
              <label className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                <Wrench size={15} className="text-amber-600" />
                2. Listado de Revisiones Incluidas (Fabricante)
              </label>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Se mostrarán con ícono de llave 🔧 en el modal de "Detalle del mantenimiento".
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={handleCargarRevisionesEstandar}
                className="text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold py-1.5 px-2.5 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-1"
                title="Cargar las 30 revisiones estándar de mantenimiento"
              >
                <Sparkles size={13} /> Cargar Estándar (30)
              </button>
              <button
                type="button"
                onClick={handleAddRevision}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-2.5 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-1"
              >
                <Plus size={14} /> Agregar Revisión
              </button>
              {formData.revisiones && formData.revisiones.length > 0 && (
                <button
                  type="button"
                  onClick={handleLimpiarRevisiones}
                  className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-2.5 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-1"
                  title="Vaciar lista de revisiones"
                >
                  <Trash2 size={13} /> Limpiar
                </button>
              )}
            </div>
          </div>

          {!formData.revisiones || formData.revisiones.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 italic py-1">
              Sin revisiones registradas. Haga clic en "Cargar Estándar (30)" o "+ Agregar Revisión".
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {formData.revisiones.map((rev, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <Wrench
                    size={13}
                    className="text-gray-500 dark:text-gray-400 shrink-0"
                  />
                  <input
                    type="text"
                    value={rev}
                    onChange={(e) => handleRevisionChange(idx, e.target.value)}
                    placeholder={`Revisión #${idx + 1}...`}
                    className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveRevision(idx)}
                    className="p-1 bg-red-500 hover:bg-red-600 text-white rounded shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                    title="Eliminar revisión"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50"
          >
            <X size={20} /> Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50"
          >
            <Save size={20} /> {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>

      {/* Quick Modal: Nueva Categoría de Servicio */}
      {showModalCategoria &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700 mb-4">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  Registrar Nueva Categoría
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModalCategoria(false)}
                  className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleCreateCategoria} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre de la Categoría *
                  </label>
                  <input
                    type="text"
                    value={nuevaCategoriaNombre}
                    onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                    placeholder="Ej. Frenos, Suspensión, Mantenimiento..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowModalCategoria(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                  >
                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Cancelar</span>
                  </button>
                  <button
                    type="submit"
                    disabled={savingCategoria || !nuevaCategoriaNombre.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingCategoria ? "Guardando..." : "Guardar Categoría"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

const PlusCircleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-6 w-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
