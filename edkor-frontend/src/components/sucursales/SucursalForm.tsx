import React, { useState } from "react";
import type { Sucursal } from "../../types/sucursal";
interface SucursalFormProps {
  initialData?: Sucursal | null;
  onSubmit: (data: Omit<Sucursal, "id">) => Promise<void>;
  onCancel: () => void;
}
export const SucursalForm: React.FC<SucursalFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    nombre: initialData?.nombre || "",
    direccion: initialData?.direccion || "",
    celular: initialData?.celular || "",
    estado: initialData?.estado || "activo",
  });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        nombre: formData.nombre,
        direccion: formData.direccion,
        celular: formData.celular,
        estado: formData.estado,
      });
    } finally {
      setLoading(false);
    }
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />{" "}
            </svg>{" "}
          </span>{" "}
          {initialData ? "Editar Sucursal" : "Nueva Sucursal"}{" "}
        </h2>{" "}
      </div>{" "}
      <form onSubmit={handleSubmit} className="space-y-4">
        {" "}
        <div className="mb-4">
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Nombre de Sucursal:
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
              <rect x="2" y="5" width="20" height="14" rx="2" />{" "}
              <line x1="2" y1="10" x2="22" y2="10" />{" "}
            </svg>{" "}
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Sucursal Central"
              required
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="mb-4">
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Dirección:
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
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />{" "}
              <circle cx="12" cy="10" r="3" />{" "}
            </svg>{" "}
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Av. Principal #123"
              required
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="mb-4">
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Celular:
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
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />{" "}
              <line x1="12" y1="18" x2="12.01" y2="18" />{" "}
            </svg>{" "}
            <input
              type="text"
              value={formData.celular}
              onChange={(e) =>
                setFormData({ ...formData, celular: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: 71234567"
              required
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="mb-4">
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Estado:
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
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
            >
              {" "}
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>{" "}
              <line x1="12" y1="2" x2="12" y2="12"></line>{" "}
            </svg>{" "}
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
