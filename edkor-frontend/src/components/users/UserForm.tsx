import { useState, useEffect } from "react";
import type { User } from "../../types/user";
import { getRoles } from "../../services/rolesService";
import type { Role } from "../../services/rolesService";
import { getPersonal } from "../../services/personalService";
import type { Personal } from "../../types/personal";
import { getSucursales } from "../../services/sucursalService";
import type { Sucursal } from "../../types/sucursal";

interface UserFormProps {
  initialData?: User | null;
  onSubmit: (user: Omit<User, "id">) => Promise<void>;
  onCancel: () => void;
}
export const UserForm = ({
  initialData,
  onSubmit,
  onCancel,
}: UserFormProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    estado: "activo",
    foto: "",
    rol_id: undefined as number | undefined,
    personal_id: undefined as number | undefined,
    sucursal_id: undefined as number | undefined,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [personalList, setPersonalList] = useState<Personal[]>([]);
  const [sucursalesList, setSucursalesList] = useState<Sucursal[]>([]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [rolesData, personalData, sucursalesData] = await Promise.all([
          getRoles(),
          getPersonal(),
          getSucursales(),
        ]);
        setRoles(rolesData.filter((r) => r.estado === "activo"));
        setPersonalList(personalData.filter((p) => p.estado === "activo"));
        setSucursalesList(sucursalesData.filter((s) => s.estado === "activo"));
      } catch (err) {
        console.error(err);
      }
    };
    fetchMetadata();
    if (initialData) {
      setFormData({
        name: initialData.name,
        email: initialData.email,
        password: "",
        estado: initialData.estado,
        foto: initialData.foto || "",
        rol_id: initialData.rol?.id || initialData.rol_id || undefined,
        personal_id: initialData.personal?.id || initialData.personal_id || undefined,
        sucursal_id: initialData.sucursal?.id || initialData.sucursal_id || undefined,
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const dataToSubmit = { ...formData };
      if (initialData && !dataToSubmit.password) {
        delete (dataToSubmit as any).password;
      }
      await onSubmit(dataToSubmit);
    } catch (err: any) {
      console.error("Submit error:", err.response?.data || err);
      let errorMsg =
        "Error al guardar el usuario. Por favor verifique los datos.";
      if (err.response?.data?.message) {
        const msgs = err.response.data.message;
        const msgStr = Array.isArray(msgs)
          ? msgs.join(", ")
          : typeof msgs === "string"
            ? msgs
            : "";
        if (msgStr.includes("password must be longer than or equal to")) {
          errorMsg = "La contraseña debe tener al menos 6 caracteres";
        } else if (msgStr.includes("email must be an email")) {
          errorMsg = "El formato del correo electrónico es inválido";
        } else if (msgStr) {
          errorMsg = msgStr;
        }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="p-6">
      {" "}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
          <span className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-300">
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </span>
          {initialData ? "Editar Usuario" : "Nuevo Usuario"}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 p-2 rounded-lg transition-all"
          title="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>{" "}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-lg">
          {" "}
          {error}{" "}
        </div>
      )}{" "}
      <form onSubmit={handleSubmit} className="space-y-4">
        {" "}
        {/* Fake inputs to absorb aggressive browser autofill (must not be display: none) */}{" "}
        <input
          type="text"
          name="fakeusernameremembered"
          tabIndex={-1}
          style={{
            position: "absolute",
            opacity: 0,
            height: 0,
            width: 0,
            zIndex: -1,
          }}
        />{" "}
        <input
          type="password"
          name="fakepasswordremembered"
          tabIndex={-1}
          style={{
            position: "absolute",
            opacity: 0,
            height: 0,
            width: 0,
            zIndex: -1,
          }}
        />{" "}
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
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              autoComplete="off"
              name="new-name-field"
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="mb-4">
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Email:
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
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>{" "}
              <polyline points="22,6 12,13 2,6"></polyline>{" "}
            </svg>{" "}
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              autoComplete="off"
              name="new-email-field"
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="mb-4">
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            {" "}
            Contraseña{" "}
            {initialData ? "(Dejar en blanco para mantener)" : ""}{" "}
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
              <rect
                x="3"
                y="11"
                width="18"
                height="11"
                rx="2"
                ry="2"
              ></rect>{" "}
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>{" "}
            </svg>{" "}
            <input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required={!initialData}
              autoComplete="new-password"
              name="new-password-field"
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
              Rol:
            </label>
            <select
              value={formData.rol_id || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  rol_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Sin Rol --</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
              Estado:
            </label>
            <select
              value={formData.estado}
              onChange={(e) =>
                setFormData({ ...formData, estado: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
              Personal Vinculado (Taller):
            </label>
            <select
              value={formData.personal_id || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  personal_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">-- Sin Personal Vinculado --</option>
              {personalList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.paterno} {p.materno} {p.area ? `(${p.area.area})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
              Sucursal Asignada:
            </label>
            <select
              value={formData.sucursal_id || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  sucursal_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">-- Todas / Sin Sucursal --</option>
              {sucursalesList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} ({s.ciudad})
                </option>
              ))}
            </select>
          </div>
        </div>{" "}
        <div className="mb-4">
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Foto:
          </label>{" "}
          <div className="flex gap-4 items-center">
            {" "}
            {formData.foto && (
              <div className="relative group">
                {" "}
                <img
                  src={formData.foto}
                  alt="Preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                />{" "}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, foto: "" })}
                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar Foto"
                >
                  {" "}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {" "}
                    <line x1="18" y1="6" x2="6" y2="18"></line>{" "}
                    <line x1="6" y1="6" x2="18" y2="18"></line>{" "}
                  </svg>{" "}
                </button>{" "}
              </div>
            )}{" "}
            <button
              type="button"
              onClick={() => document.getElementById("foto-input")?.click()}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all"
            >
              {" "}
              {formData.foto ? "Cambiar Foto" : "Seleccionar Foto"}{" "}
            </button>{" "}
            <input
              id="foto-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setFormData({ ...formData, foto: reader.result as string });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />{" "}
          </div>{" "}
        </div>{" "}
        <div className="flex gap-3 pt-4 mt-6 justify-end border-t border-gray-100 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 z-10">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50"
          >
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
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            {loading
              ? initialData
                ? "Actualizando..."
                : "Guardando..."
              : initialData
                ? "Actualizar"
                : "Guardar"}
          </button>
        </div>{" "}
      </form>{" "}
    </div>
  );
};
