import { useState, useEffect } from "react";
import type { Role } from "../../services/rolesService";
interface RoleFormProps {
  initialData?: Role | null;
  onSubmit: (role: any) => Promise<void>;
  onCancel: () => void;
}
export const PERMISOS_MODULOS = [
  { module: "recepcion", label: "Operaciones Taller: Hoja de Recepción" },
  { module: "ordenes", label: "Operaciones Taller: Órdenes de Trabajo" },
  { module: "utilidad_ordenes", label: "Operaciones Taller: Utilidad Neta Mensual de O.T." },
  { module: "cotizaciones", label: "Cotizaciones" },
  { module: "cobros_registro", label: "Cobros: Registro de Pagos" },
  { module: "cobros_deudas", label: "Cobros: Deudas por Cobrar" },
  { module: "seguros_registro", label: "Seguros: Registro de Seguros" },
  { module: "seguros_inspectores", label: "Seguros: Inspectores" },
  { module: "seguros_precios", label: "Seguros: Lista de Precios" },
  { module: "personal_registro", label: "Personal: Registro de Personal" },
  { module: "personal_produccion", label: "Personal: Producción de Personal" },
  { module: "personal_mi_produccion", label: "Personal: Mi Producción / Horas" },
  { module: "personal_planilla", label: "Personal: Planilla de Sueldos" },
  { module: "personal_faltas", label: "Personal: Faltas y Vacaciones" },
  { module: "personal_anticipos", label: "Personal: Anticipos de Sueldo" },
  { module: "pagos_status", label: "Trabajos Cancelados / No Cancelados" },
  { module: "proveedores_registro", label: "Proveedores: Registro de Proveedores" },
  { module: "proveedores_pedidos", label: "Proveedores: Compra de Material y/o Repuestos" },
  { module: "proveedores_pagos", label: "Proveedores: Pago a Proveedores" },
  { module: "inventario", label: "Inventario: Control de Inventario" },
  { module: "inventario_cargar_repuestos", label: "Inventario: Cargar Repuestos a O.T." },
  { module: "inventario_devoluciones", label: "Inventario: Retorno a Almacén" },
  { module: "aranceles", label: "Precios Servicios" },
  { module: "egresos", label: "Egresos Diarios" },
  { module: "gastos_fijos", label: "Gastos Fijos" },
  { module: "hoja_diaria", label: "Hoja Diaria" },
  { module: "utilidades", label: "Utilidades" },
  { module: "usuarios", label: "Usuarios" },
  { module: "configuraciones", label: "Configuraciones" },
];

export const PERMISOS_INICIO = [
  { module: "inicio_ordenes_proceso", label: "Inicio: Órdenes en Proceso" },
  { module: "inicio_ordenes_terminadas", label: "Inicio: Órdenes Terminadas en Taller" },
  { module: "inicio_inventario", label: "Inicio: Alertas de Stock / Inventario" },
  { module: "inicio_retorno_inventario", label: "Inicio: Retorno de Inventario a Almacén" },
  { module: "inicio_cumpleanos", label: "Inicio: Cumpleañeros" },
  { module: "inicio_gastos_fijos", label: "Inicio: Gastos Fijos Programados" },
];

export const PERMISOS_DISPONIBLES = [...PERMISOS_MODULOS, ...PERMISOS_INICIO];

const VALID_MODULES = new Set(PERMISOS_DISPONIBLES.map((p) => p.module));
export const RoleForm = ({
  initialData,
  onSubmit,
  onCancel,
}: RoleFormProps) => {
  const [formData, setFormData] = useState({
    nombre: "",
    estado: "activo",
    permisos: {} as Record<string, boolean>,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (initialData) {
      const sanitizedPermisos: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(initialData.permisos || {})) {
        if (VALID_MODULES.has(key) && value) {
          sanitizedPermisos[key] = true;
        }
      }
      setFormData({
        nombre: initialData.nombre,
        estado: initialData.estado || "activo",
        permisos: sanitizedPermisos,
      });
    }
  }, [initialData]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cleanPermisos: Record<string, boolean> = {};
      for (const p of PERMISOS_DISPONIBLES) {
        if (formData.permisos[p.module]) {
          cleanPermisos[p.module] = true;
        }
      }
      await onSubmit({ ...formData, permisos: cleanPermisos });
    } catch (err) {
      setError("Error al guardar el rol. Por favor verifique los datos.");
    } finally {
      setLoading(false);
    }
  };
  const handleToggleGroup = (items: { module: string; label: string }[]) => {
    const groupSelected = items.every((p) => !!formData.permisos[p.module]);
    setFormData((prev) => {
      const nextPermisos = { ...prev.permisos };
      for (const p of items) {
        if (groupSelected) {
          delete nextPermisos[p.module];
        } else {
          nextPermisos[p.module] = true;
        }
      }
      return { ...prev, permisos: nextPermisos };
    });
  };
  const handlePermisoChange = (module: string) => {
    setFormData((prev) => ({
      ...prev,
      permisos: { ...prev.permisos, [module]: !prev.permisos[module] },
    }));
  };
  const renderPermissionGroup = (
    title: string,
    items: { module: string; label: string }[],
  ) => {
    const groupSelected = items.every((p) => !!formData.permisos[p.module]);
    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium dark:text-gray-300">
            {title}
          </label>
          <button
            type="button"
            onClick={() => handleToggleGroup(items)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {groupSelected ? "Deseleccionar todos" : "Seleccionar todos"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700">
          {items.map((p) => (
            <label
              key={p.module}
              className="flex items-center gap-2 text-sm cursor-pointer dark:text-gray-300"
            >
              <input
                type="checkbox"
                checked={!!formData.permisos[p.module]}
                onChange={() => handlePermisoChange(p.module)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              {p.label.replace(/^Inicio:\s*/i, "")}
            </label>
          ))}
        </div>
      </div>
    );
  };
  return (
    <div className="p-6">
      {" "}
      <div className="flex items-center justify-between mb-6">
        {" "}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
          {" "}
          <span className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-300">
            {" "}
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
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />{" "}
            </svg>{" "}
          </span>{" "}
          {initialData ? "Editar Rol" : "Nuevo Rol"}{" "}
        </h2>{" "}
      </div>{" "}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          {" "}
          {error}{" "}
        </div>
      )}{" "}
      <form onSubmit={handleSubmit} className="space-y-4">
        {" "}
        <div className="mb-4">
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Nombre:
          </label>{" "}
          <div className="relative">
            {" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
            >
              {" "}
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>{" "}
              <circle cx="12" cy="7" r="4"></circle>{" "}
            </svg>{" "}
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              required
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="mb-4">
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Estado:
          </label>{" "}
          <select
            value={formData.estado}
            onChange={(e) =>
              setFormData({ ...formData, estado: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {" "}
            <option value="activo">Activo</option>{" "}
            <option value="inactivo">Inactivo</option>{" "}
          </select>{" "}
        </div>{" "}
        {renderPermissionGroup("Módulos Permitidos", PERMISOS_MODULOS)}
        {renderPermissionGroup("Alertas y Tarjetas de Inicio", PERMISOS_INICIO)}
        <div className="flex gap-3 mt-6 justify-end">
          {" "}
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50"
          >
            {" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              {" "}
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />{" "}
            </svg>{" "}
            Cancelar{" "}
          </button>{" "}
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50"
          >
            {" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {" "}
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>{" "}
              <polyline points="17 21 17 13 7 13 7 21"></polyline>{" "}
              <polyline points="7 3 7 8 15 8"></polyline>{" "}
            </svg>{" "}
            {loading ? "Guardando..." : "Guardar"}{" "}
          </button>{" "}
        </div>{" "}
      </form>{" "}
    </div>
  );
};
