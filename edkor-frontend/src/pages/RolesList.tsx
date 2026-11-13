import { useEffect, useState } from "react";
import type { Role } from "../services/rolesService";
import {
  getRoles,
  deleteRole,
  createRole,
  updateRole,
} from "../services/rolesService";
import { RoleForm, PERMISOS_DISPONIBLES } from "../components/roles/RoleForm";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import Pagination from "../components/Pagination";
import ManualModal, { type ManualSection } from "../components/ManualModal";
import { Shield, Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { exportStandardPDF } from "../utils/pdfExportHelper";
import { StandardExportToolbar } from "../components/common/StandardExportToolbar";
import { StandardPrintHeader, StandardPrintFooter } from "../components/common/StandardPrintHeader";
const RolesList = () => {
  const { user, refreshUserRole } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showManual, setShowManual] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const limit = 10;
  const manualSections: ManualSection[] = [
    {
      title: "Agregar Nuevo Rol",
      content:
        'Haga clic en el botón azul "+ Nuevo Rol" en la parte superior derecha. Complete el formulario con el nombre, estado y seleccione los permisos, luego guarde.',
    },
    {
      title: "Editar Rol",
      content:
        "Localice al rol en la lista y haga clic en el botón amarillo con el icono de lápiz. Modifique los datos necesarios y guarde los cambios.",
    },
    {
      title: "Eliminar Rol",
      content:
        "Para eliminar/desactivar un rol, haga clic en el botón rojo con el icono de papelera. Se le pedirá confirmación antes de desactivar.",
    },
    {
      title: "Búsqueda",
      content:
        "Utilice la barra de búsqueda superior para encontrar roles por nombre. Escriba y la lista se filtrará automáticamente.",
    },
    {
      title: "Exportar e Imprimir",
      content:
        "Puede exportar la lista completa a Excel o PDF, o imprimirla directamente usando los botones correspondientes en la parte superior.",
    },
  ];
  useEffect(() => {
    loadRoles();
  }, []);
  const loadRoles = async () => {
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      setError("Error al cargar roles");
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: "¿Desactivar rol?",
      text: "El rol pasará a estado inactivo.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, desactivar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      try {
        await deleteRole(id);
        setRoles(
          roles.map((role) =>
            role.id === id ? { ...role, estado: "inactivo" } : role,
          ),
        );
        await Swal.fire({
          icon: "success",
          title: "¡Rol desactivado!",
          text: "El rol ha sido desactivado exitosamente.",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo desactivar el rol",
        });
      }
    }
  };
  const handleReactivate = async (id: number) => {
    const result = await Swal.fire({
      title: "¿Reactivar rol?",
      text: "El rol volverá a estar activo.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, reactivar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      try {
        await updateRole(id, { estado: "activo" });
        setRoles(
          roles.map((role) =>
            role.id === id ? { ...role, estado: "activo" } : role,
          ),
        );
        await Swal.fire({
          icon: "success",
          title: "¡Rol reactivado!",
          text: "El rol ha sido reactivado exitosamente.",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo reactivar el rol",
        });
      }
    }
  };
  const handleSave = async (roleData: Omit<Role, "id">) => {
    try {
      if (editingRole) {
        await updateRole(editingRole.id, roleData);
        if (user && (user.rol?.id === editingRole.id || user.rol_id === editingRole.id)) {
          await refreshUserRole();
        }
        await Swal.fire({
          icon: "success",
          title: "Rol Actualizado",
          text: "Rol actualizado exitosamente",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createRole(roleData);
        await Swal.fire({
          icon: "success",
          title: "Rol Creado",
          text: "Rol creado exitosamente",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      setShowModal(false);
      setEditingRole(null);
      loadRoles();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al guardar el rol",
      });
    }
  };
  const openCreateModal = () => {
    setEditingRole(null);
    setShowModal(true);
  };
  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setShowModal(true);
  };
  const getActivePermisos = (permisos?: Record<string, boolean>) =>
    PERMISOS_DISPONIBLES.filter((p) => !!permisos?.[p.module]);

  const exportToExcel = () => {
    try {
      const excelData = filteredRoles.map((role) => ({
        Nombre: role.nombre,
        Estado: role.estado,
        Permisos: getActivePermisos(role.permisos)
          .map((p) => p.label)
          .join(", "),
      }));
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Roles");
      const date = new Date().toISOString().split("T")[0];
      const filename = `roles_${date}.xlsx`;
      XLSX.writeFile(wb, filename);
      Swal.fire({
        icon: "success",
        title: "¡Exportado!",
        text: `Se exportaron ${filteredRoles.length} roles exitosamente`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Error al exportar a Excel",
      });
    }
  };
  const exportToPDF = async () => {
    await exportStandardPDF({
      title: "Reporte de Roles y Permisos del Sistema",
      subtitle: "EDKOR MOTORS - Configuración de Perfiles de Acceso",
      orientation: "portrait",
      filtersText: searchTerm ? `Búsqueda: "${searchTerm}"` : undefined,
      totalRecords: filteredRoles.length,
      totalRecordsLabel: "Roles Configurados",
      filename: `Roles_${new Date().toISOString().split("T")[0]}.pdf`,
      tableOptions: {
        head: [["#", "Rol / Perfil", "Permisos Asignados", "Estado"]],
        body: filteredRoles.map((role, idx) => [
          idx + 1,
          role.nombre,
          getActivePermisos(role.permisos)
            .map((p) => p.label)
            .join(", ") || "Sin permisos asignados",
          role.estado.toUpperCase(),
        ]),
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: 45, fontStyle: "bold" },
          2: { cellWidth: "auto" },
          3: { halign: "center", cellWidth: 25 },
        },
      },
    });
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 150);
  };

  const filteredRoles = roles.filter((role) =>
    role.nombre.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const totalPages = Math.ceil(filteredRoles.length / limit);
  const paginatedRoles = filteredRoles.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );
  const displayedRoles = isPrinting ? filteredRoles : paginatedRoles;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-600 dark:text-gray-400">
          Cargando...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden print:block mb-4">
        <StandardPrintHeader
          title="Reporte de Roles y Permisos"
          subtitle="EDKOR MOTORS - Configuración del Sistema"
          orientation="portrait"
          filtersText={searchTerm ? `Búsqueda: "${searchTerm}"` : undefined}
          totalRecords={filteredRoles.length}
          totalRecordsLabel="Total Roles"
        />
      </div>

      <div className="container mx-auto relative min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 no-print gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Volver"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-600 dark:text-gray-300"
              >
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <Shield className="text-indigo-600" size={32} /> Roles y
                Permisos
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Configure los accesos a los distintos módulos del sistema.
              </p>
            </div>
          </div>

          <StandardExportToolbar
            onExportExcel={exportToExcel}
            onExportPDF={exportToPDF}
            onPrint={handlePrint}
            onHelp={() => setShowManual(true)}
            helpTitle="Ayuda / Manual"
          >
            <button
              onClick={openCreateModal}
              className="bg-[#3498db] hover:bg-[#2980b9] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium"
            >
              <Plus className="h-5 w-5" />
              Nuevo Rol
            </button>
          </StandardExportToolbar>
        </div>{" "}
      {/* Search Bar */}{" "}
      <div className="mb-6 flex items-center gap-2 no-print">
        {" "}
        <div className="relative flex-grow max-w-md">
          {" "}
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-300"
          />{" "}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {" "}
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {" "}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>{" "}
            </svg>{" "}
          </div>{" "}
        </div>{" "}
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setCurrentPage(1);
            }}
            className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors border border-red-200 shadow-sm"
            title="Limpiar búsqueda"
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
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />{" "}
            </svg>{" "}
          </button>
        )}{" "}
      </div>{" "}
      <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
        {" "}
        Mostrando{" "}
        {filteredRoles.length === 0 ? 0 : (currentPage - 1) * limit + 1} -{" "}
        {Math.min(currentPage * limit, filteredRoles.length)} de{" "}
        {filteredRoles.length} registros{" "}
      </div>{" "}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          {" "}
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {" "}
          <thead className="bg-gray-50 dark:bg-gray-700">
            {" "}
            <tr>
              {" "}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                #
              </th>{" "}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Rol
              </th>{" "}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Permisos Asignados
              </th>{" "}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Estado
              </th>{" "}
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">
                Acciones
              </th>{" "}
            </tr>{" "}
          </thead>{" "}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {" "}
            {displayedRoles.map((role, index) => (
              <tr
                key={role.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {" "}
                <td className="p-3 text-gray-700 dark:text-gray-300">
                  {isPrinting ? index + 1 : (currentPage - 1) * limit + index + 1}
                </td>{" "}
                <td className="p-3 text-gray-700 dark:text-gray-300 font-medium">
                  {role.nombre}
                </td>{" "}
                <td className="p-3 text-gray-700 dark:text-gray-300">
                  <div className="flex flex-wrap gap-2">
                    {getActivePermisos(role.permisos).map((p) => (
                      <span
                        key={p.module}
                        className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded"
                      >
                        {p.label}
                      </span>
                    ))}
                  </div>
                </td>{" "}
                <td className="p-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${role.estado === "activo" ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"}`}
                  >
                    {role.estado.charAt(0).toUpperCase() +
                      role.estado.slice(1)}
                  </span>
                </td>
                <td className="p-3 flex gap-2 no-print">
                  <button
                    onClick={() => openEditModal(role)}
                    className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  {role.estado === "activo" ? (
                    <button
                      onClick={() => handleDelete(role.id)}
                      className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                      title="Desactivar"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivate(role.id)}
                      className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                      title="Reactivar"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </td>{" "}
              </tr>
            ))}{" "}
          </tbody>{" "}
        </table>{" "}
        </div>
      </div>{" "}
      {filteredRoles.length === 0 && (
        <p className="text-center mt-5 text-gray-500 dark:text-gray-400">
          {" "}
          {searchTerm
            ? "No se encontraron resultados"
            : "No hay roles registrados"}{" "}
        </p>
      )}{" "}
      {/* Pagination */}{" "}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />{" "}
      {/* Manual Modal */}{" "}
      <ManualModal
        isOpen={showManual}
        onClose={() => setShowManual(false)}
        title="Manual de Usuario - Roles y Permisos"
        sections={manualSections}
      />{" "}
      {/* Role Form Modal */}{" "}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          {" "}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {" "}
            <RoleForm
              initialData={editingRole}
              onSubmit={handleSave}
              onCancel={() => {
                setShowModal(false);
                setEditingRole(null);
              }}
            />{" "}
          </div>{" "}
        </div>
      )}{" "}

      <div className="hidden print:block mt-8">
        <StandardPrintFooter />
      </div>
    </div>
    </>
  );
};
export default RolesList;
