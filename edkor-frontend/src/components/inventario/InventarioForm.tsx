import { useState, useEffect } from 'react';
import type { Inventario, CreateInventarioData } from '../../types/inventario';
import type { UnidadMedida } from '../../types/unidadMedida';
import type { GrupoInventario } from '../../types/grupoInventario';
import { getUnidadesMedida, createUnidadMedida } from '../../services/unidadMedidaService';
import { getGruposInventario, createGrupoInventario } from '../../services/grupoInventarioService';
import { Tag, Package, Box, Layers, BarChart, Ruler, Power, Save, X, DollarSign, Hash, Plus } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

interface InventarioFormProps {
    initialData?: Inventario | null;
    onSubmit: (data: CreateInventarioData) => Promise<void>;
    onCancel: () => void;
}

export const InventarioForm = ({ initialData, onSubmit, onCancel }: InventarioFormProps) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState<CreateInventarioData>({
        codigo: '',
        descripcion: '',
        stock_inicial: 0,
        cantidad_existente: 0,
        stock_minimo: 0,
        precio_compra: 0,
        precio_venta: 0,
        estado: 'activo',
        idunidad_medida: '',
        id_grupo_inventario: ''
    });

    const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
    const [grupos, setGrupos] = useState<GrupoInventario[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Modales de creación rápida para Unidad y Grupo
    const [showModalUnidad, setShowModalUnidad] = useState(false);
    const [nuevaMedida, setNuevaMedida] = useState('');
    const [savingUnidad, setSavingUnidad] = useState(false);

    const [showModalGrupo, setShowModalGrupo] = useState(false);
    const [nuevoGrupo, setNuevoGrupo] = useState('');
    const [savingGrupo, setSavingGrupo] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [fetchedUnidades, fetchedGrupos] = await Promise.all([
                    getUnidadesMedida(),
                    getGruposInventario()
                ]);
                // Ensure we are filtering correctly, assuming API returns array
                setUnidades(Array.isArray(fetchedUnidades) ? fetchedUnidades.filter(u => u.estado === 'activo') : []);
                setGrupos(Array.isArray(fetchedGrupos) ? fetchedGrupos.filter(g => g.estado === 'activo') : []);
            } catch (err) {
                console.error('Error loading selects:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al cargar listas desplegables'
                });
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (initialData) {
            setFormData({
                codigo: initialData.codigo || '',
                descripcion: initialData.descripcion,
                stock_inicial: initialData.stock_inicial !== undefined ? Number(initialData.stock_inicial) : Number(initialData.cantidad_existente || 0),
                cantidad_existente: Number(initialData.cantidad_existente || 0),
                stock_minimo: Number(initialData.stock_minimo || 0),
                precio_compra: Number(initialData.precio_compra || 0),
                precio_venta: Number(initialData.precio_venta || 0),
                estado: initialData.estado,
                idunidad_medida: initialData.idunidad_medida || initialData.unidad_medida?.id || '',
                id_grupo_inventario: initialData.id_grupo_inventario || initialData.grupo_inventario?.id || ''
            });
        }
    }, [initialData]);

    const handleCreateUnidad = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = nuevaMedida.trim();
        if (!trimmed) return;
        setSavingUnidad(true);
        try {
            const created = await createUnidadMedida({ medida: trimmed, estado: 'activo' });
            const updated = await getUnidadesMedida();
            setUnidades(Array.isArray(updated) ? updated.filter(u => u.estado === 'activo') : []);
            setFormData(prev => ({ ...prev, idunidad_medida: String(created.id) }));
            setShowModalUnidad(false);
            setNuevaMedida('');
            Swal.fire({
                icon: 'success',
                title: 'Unidad Creada',
                text: `Se agregó la unidad "${created.medida}"`,
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (err) {
            console.error('Error creating unidad de medida:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo crear la unidad de medida',
            });
        } finally {
            setSavingUnidad(false);
        }
    };

    const handleCreateGrupo = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = nuevoGrupo.trim();
        if (!trimmed) return;
        setSavingGrupo(true);
        try {
            const created = await createGrupoInventario({ grupo: trimmed, estado: 'activo' });
            const updated = await getGruposInventario();
            setGrupos(Array.isArray(updated) ? updated.filter(g => g.estado === 'activo') : []);
            setFormData(prev => ({ ...prev, id_grupo_inventario: String(created.id) }));
            setShowModalGrupo(false);
            setNuevoGrupo('');
            Swal.fire({
                icon: 'success',
                title: 'Grupo Creado',
                text: `Se agregó el grupo "${created.grupo}"`,
                timer: 1500,
                showConfirmButton: false,
            });
        } catch (err) {
            console.error('Error creating grupo de inventario:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo crear el grupo de inventario',
            });
        } finally {
            setSavingGrupo(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validation
        if (!formData.idunidad_medida || !formData.id_grupo_inventario) {
            Swal.fire({
                icon: 'warning',
                title: 'Atención',
                text: 'Debe seleccionar Unidad de Medida y Grupo.'
            });
            setLoading(false);
            return;
        }

        try {
            await onSubmit({
                ...formData,
                idusuario: user?.id
            });
        } catch (err: any) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al guardar. Por favor verifique los datos.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                    <span className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-300">
                        <Box className="h-6 w-6" />
                    </span>
                    {initialData ? 'Editar Inventario' : 'Nuevo Item de Inventario'}
                </h2>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Código */}
                    <div className="mb-2">
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Código / Nro. Parte:</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Hash className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={formData.codigo || ''}
                                onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: REP-001"
                            />
                        </div>
                    </div>

                    {/* Descripcion */}
                    <div className="mb-2 md:col-span-2">
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Descripción:</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Tag className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={formData.descripcion}
                                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                required
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Ej: Aceite 20W50, Filtro de Aire..."
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Stock Inicial */}
                    <div className="mb-2">
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
                            {initialData ? 'Stock Inicial:' : 'Stock Inicial:'}
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Package className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="number"
                                step="any"
                                value={formData.stock_inicial ?? formData.cantidad_existente ?? 0}
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    setFormData(prev => ({
                                        ...prev,
                                        stock_inicial: val,
                                        cantidad_existente: initialData ? prev.cantidad_existente : val
                                    }));
                                }}
                                required
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                            {initialData ? `Stock actual: ${initialData.cantidad_existente}` : 'Cantidad inicial disponible'}
                        </p>
                    </div>
                    {/* Stock Minimo */}
                    <div className="mb-2">
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Stock Mínimo:</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <BarChart className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="number"
                                step="any"
                                value={formData.stock_minimo}
                                onChange={e => setFormData({ ...formData, stock_minimo: Number(e.target.value) })}
                                required
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Alerta cuando stock ≤ mínimo</p>
                    </div>
                    {/* Precio Compra */}
                    <div className="mb-2">
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">P. Compra (por Unidad):</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.precio_compra ?? 0}
                                onChange={e => setFormData({ ...formData, precio_compra: Number(e.target.value) })}
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Costo unitario de compra</p>
                    </div>
                    {/* Precio Venta */}
                    <div className="mb-2">
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">P. Venta (por Unidad):</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-5 w-5 text-emerald-500" />
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.precio_venta ?? 0}
                                onChange={e => setFormData({ ...formData, precio_venta: Number(e.target.value) })}
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Precio cobrado al cliente</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Unidad de Medida */}
                    <div className="mb-4">
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Unidad de Medida:</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Ruler className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    value={formData.idunidad_medida}
                                    onChange={e => setFormData({ ...formData, idunidad_medida: e.target.value })}
                                    required
                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                >
                                    <option value="">Seleccione...</option>
                                    {unidades.map(u => (
                                        <option key={u.id} value={u.id}>{u.medida}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setNuevaMedida('');
                                    setShowModalUnidad(true);
                                }}
                                className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0"
                                title="Registrar nueva Unidad de Medida"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Grupo */}
                    <div className="mb-4">
                        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Grupo:</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Layers className="h-5 w-5 text-gray-400" />
                                </div>
                                <select
                                    value={formData.id_grupo_inventario}
                                    onChange={e => setFormData({ ...formData, id_grupo_inventario: e.target.value })}
                                    required
                                    className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-sm"
                                >
                                    <option value="">Seleccione...</option>
                                    {grupos.map(g => (
                                        <option key={g.id} value={g.id}>{g.grupo}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setNuevoGrupo('');
                                    setShowModalGrupo(true);
                                }}
                                className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0"
                                title="Registrar nuevo Grupo de Inventario"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Estado */}
                <div className="mb-4">
                    <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">Estado:</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Power className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            value={formData.estado}
                            onChange={e => setFormData({ ...formData, estado: e.target.value })}
                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 mt-6 justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {loading ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </form>

            {/* Modal: Registrar Unidad de Medida */}
            {showModalUnidad && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700 animate-fade-in-down">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-orange-500" /> Nueva Unidad de Medida
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowModalUnidad(false)}
                                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                title="Cerrar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateUnidad} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre de la Unidad *
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="Ej: Litro, Pieza, Metro, Galón, etc."
                                    value={nuevaMedida}
                                    onChange={(e) => setNuevaMedida(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModalUnidad(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                                >
                                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    <span>Cancelar</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingUnidad || !nuevaMedida.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{savingUnidad ? "Guardando..." : "Guardar Unidad"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Registrar Grupo de Inventario */}
            {showModalGrupo && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700 animate-fade-in-down">
                        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-orange-500" /> Nuevo Grupo de Inventario
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowModalGrupo(false)}
                                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                                title="Cerrar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateGrupo} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nombre del Grupo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    placeholder="Ej: Lubricantes, Repuestos, Filtros, Pintura, etc."
                                    value={nuevoGrupo}
                                    onChange={(e) => setNuevoGrupo(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-sm"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModalGrupo(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                                >
                                    <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    <span>Cancelar</span>
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingGrupo || !nuevoGrupo.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{savingGrupo ? "Guardando..." : "Guardar Grupo"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
