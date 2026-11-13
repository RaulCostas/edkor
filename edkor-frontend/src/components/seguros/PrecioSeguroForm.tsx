import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import type {
  CreatePrecioSeguroData,
  PrecioSeguro,
} from "../../types/precioSeguro";
import type { Seguro } from "../../types/seguro";
import type { CategoriaServicio } from "../../types/categoriaServicio";
import { getSeguros } from "../../services/seguroService";
import {
  getCategoriasServicio,
  createCategoriaServicio,
} from "../../services/categoriaServicioService";
import {
  Shield,
  List,
  FileText,
  DollarSign,
  Brush,
  Wrench,
  Save,
  X,
  Power,
  Plus,
} from "lucide-react";
interface PrecioSeguroFormProps {
  initialData?: PrecioSeguro | null;
  onSubmit: (data: CreatePrecioSeguroData) => Promise<void>;
  onCancel: () => void;
}
export const PrecioSeguroForm = ({
  initialData,
  onSubmit,
  onCancel,
}: PrecioSeguroFormProps) => {
  const [formData, setFormData] = useState<CreatePrecioSeguroData>({
    idseguro: initialData?.seguro?.id || "",
    idcategoria_servicio: initialData?.categoria?.id || "",
    detalle: initialData?.detalle || "",
    nivel1: initialData?.nivel1 || 0,
    nivel2: initialData?.nivel2 || 0,
    nivel3: initialData?.nivel3 || 0,
    pintado: initialData?.pintado || 0,
    instalacion: initialData?.instalacion || 0,
    estado: initialData?.estado || "activo",
  });
  const [seguros, setSeguros] = useState<Seguro[]>([]);
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([]);
  const [loading, setLoading] = useState(false);

  // Quick modal for new CategoriaServicio
  const [showModalCategoria, setShowModalCategoria] = useState(false);
  const [nuevaCategoriaNombre, setNuevaCategoriaNombre] = useState("");
  const [savingCategoria, setSavingCategoria] = useState(false);
  useEffect(() => {
    const loadDependencias = async () => {
      try {
        const [segurosData, categoriasData] = await Promise.all([
          getSeguros(),
          getCategoriasServicio(),
        ]);
        setSeguros(segurosData.filter((s) => s.estado === "activo"));
        setCategorias(categoriasData.filter((c) => c.estado === "activo"));
      } catch (error) {
        console.error("Error cargando dependencias", error);
      }
    };
    loadDependencias();
  }, []);
  const handleCreateCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nuevaCategoriaNombre.trim();
    if (!clean) return;
    try {
      setSavingCategoria(true);
      const created = await createCategoriaServicio({
        categoria_servicio: clean,
        estado: "activo",
      });
      const categoriasData = await getCategoriasServicio();
      setCategorias(categoriasData.filter((c) => c.estado === "activo"));
      setFormData((prev) => ({
        ...prev,
        idcategoria_servicio: created.id,
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
      console.error("Error creating categoria servicio:", error);
      Swal.fire(
        "Error",
        error?.response?.data?.message || "No se pudo crear la categoría",
        "error"
      );
    } finally {
      setSavingCategoria(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
        <span className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-300">
          <PlusCircleIcon />
        </span>
        {initialData ? "Editar Precio" : "Nuevo Precio"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Seguro
            </label>
            <div className="relative">
              <Shield
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
                size={18}
              />
              <select
                value={formData.idseguro}
                onChange={(e) =>
                  setFormData({ ...formData, idseguro: e.target.value })
                }
                required
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] appearance-none text-sm font-medium"
              >
                <option value="">Seleccione un seguro</option>
                {seguros.map((seguro) => (
                  <option key={seguro.id} value={seguro.id}>
                    {seguro.seguro}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Categoría
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <List
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
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
                  className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] appearance-none text-sm font-medium"
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
        </div>{" "}
        <div>
          {" "}
          <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Detalle
          </label>{" "}
          <div className="relative">
            {" "}
            <FileText
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />{" "}
            <input
              type="text"
              value={formData.detalle}
              onChange={(e) =>
                setFormData({ ...formData, detalle: e.target.value })
              }
              required
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción del precio"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-3 gap-4">
          {" "}
          <div>
            {" "}
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Nivel 1
            </label>{" "}
            <div className="relative">
              {" "}
              <DollarSign
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                size={18}
              />{" "}
              <input
                type="number"
                step="0.01"
                value={formData.nivel1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nivel1: parseFloat(e.target.value),
                  })
                }
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Nivel 2
            </label>{" "}
            <div className="relative">
              {" "}
              <DollarSign
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                size={18}
              />{" "}
              <input
                type="number"
                step="0.01"
                value={formData.nivel2}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nivel2: parseFloat(e.target.value),
                  })
                }
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Nivel 3
            </label>{" "}
            <div className="relative">
              {" "}
              <DollarSign
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                size={18}
              />{" "}
              <input
                type="number"
                step="0.01"
                value={formData.nivel3}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nivel3: parseFloat(e.target.value),
                  })
                }
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-4">
          {" "}
          <div>
            {" "}
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Pintado
            </label>{" "}
            <div className="relative">
              {" "}
              <Brush
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                size={18}
              />{" "}
              <input
                type="number"
                step="0.01"
                value={formData.pintado}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    pintado: parseFloat(e.target.value),
                  })
                }
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Instalación
            </label>{" "}
            <div className="relative">
              {" "}
              <Wrench
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                size={18}
              />{" "}
              <input
                type="number"
                step="0.01"
                value={formData.instalacion}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    instalacion: parseFloat(e.target.value),
                  })
                }
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Estado
          </label>{" "}
          <div className="relative">
            {" "}
            <Power
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />{" "}
            <select
              value={formData.estado}
              onChange={(e) =>
                setFormData({ ...formData, estado: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              {" "}
              <option value="activo">Activo</option>{" "}
              <option value="inactivo">Inactivo</option>{" "}
            </select>{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex justify-end gap-3 mt-6 pt-2 border-t border-gray-100 dark:border-gray-700">
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

      {/* Quick Modal for Nueva Categoria */}
      {showModalCategoria && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-lg">
                  <Plus className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  Nueva Categoría de Servicio
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalCategoria(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
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
                  required
                  autoFocus
                  placeholder="Ej: CHAPERIA, PINTURA, MECANICA, etc."
                  value={nuevaCategoriaNombre}
                  onChange={(e) => setNuevaCategoriaNombre(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
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
        </div>
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
    {" "}
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />{" "}
  </svg>
);
