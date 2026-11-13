import { useEffect, useState } from 'react';
import type { User } from '../types/user';
import { getUsers, deleteUser, createUser, updateUser } from '../services/userService';
import { UserForm } from '../components/users/UserForm';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import Pagination from '../components/Pagination';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import { Users as UsersIcon, Plus, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { exportStandardPDF } from '../utils/pdfExportHelper';
import { StandardExportToolbar } from '../components/common/StandardExportToolbar';
import { StandardPrintHeader, StandardPrintFooter } from '../components/common/StandardPrintHeader';

const Users = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showManual, setShowManual] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const limit = 10;

    const manualSections: ManualSection[] = [
        {
            title: 'Agregar Nuevo Usuario',
            content: 'Haga clic en el botón azul "+ Nuevo Usuario" en la parte superior derecha. Complete el formulario con los datos requeridos (nombre, email, estado) y guarde.'
        },
        {
            title: 'Editar Usuario',
            content: 'Localice al usuario en la lista y haga clic en el botón amarillo con el icono de lápiz. Modifique los datos necesarios y guarde los cambios.'
        },
        {
            title: 'Eliminar Usuario',
            content: 'Para eliminar un usuario, haga clic en el botón rojo con el icono de papelera. Se le pedirá confirmación antes de eliminar.'
        },
        {
            title: 'Búsqueda',
            content: 'Utilice la barra de búsqueda superior para encontrar usuarios por nombre o email. Escriba y la lista se filtrará automáticamente.'
        },
        {
            title: 'Exportar e Imprimir',
            content: 'Puede exportar la lista completa a Excel o PDF, o imprimirla directamente usando los botones correspondientes en la parte superior.'
        }
    ];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            const sorted = [...data].sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })
            );
            setUsers(sorted);
        } catch (err) {
            setError('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: '¿Desactivar usuario?',
            text: 'El usuario pasará a estado inactivo.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, desactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await deleteUser(id);
                // Actualizar el estado localmente en lugar de eliminar
                setUsers(users.map(user =>
                    user.id === id ? { ...user, estado: 'inactivo' } : user
                ));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Usuario desactivado!',
                    text: 'El usuario ha sido desactivado exitosamente.',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo desactivar el usuario'
                });
            }
        }
    };

    const handleReactivate = async (id: string) => {
        const result = await Swal.fire({
            title: '¿Reactivar usuario?',
            text: 'El usuario volverá a estar activo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await updateUser(id, { estado: 'activo' });
                setUsers(users.map(user =>
                    user.id === id ? { ...user, estado: 'activo' } : user
                ));
                await Swal.fire({
                    icon: 'success',
                    title: '¡Usuario reactivado!',
                    text: 'El usuario ha sido reactivado exitosamente.',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar el usuario'
                });
            }
        }
    };

    const handleSave = async (userData: Omit<User, 'id'>) => {
        try {
            if (editingUser) {
                await updateUser(editingUser.id, userData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Usuario Actualizado',
                    text: 'Usuario actualizado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                await createUser(userData);
                await Swal.fire({
                    icon: 'success',
                    title: 'Usuario Creado',
                    text: 'Usuario creado exitosamente',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
            setShowModal(false);
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al guardar el usuario'
            });
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setShowModal(true);
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setShowModal(true);
    };

    const exportToExcel = () => {
        try {
            const excelData = filteredUsers.map(user => ({
                'Nombre': user.name,
                'Email': user.email,
                'Estado': user.estado
            }));

            const ws = XLSX.utils.json_to_sheet(excelData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');

            const date = new Date().toISOString().split('T')[0];
            const filename = `usuarios_${date}.xlsx`;
            XLSX.writeFile(wb, filename);

            Swal.fire({
                icon: 'success',
                title: '¡Exportado!',
                text: `Se exportaron ${filteredUsers.length} usuarios exitosamente`,
                timer: 2000,
                showConfirmButton: false
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al exportar a Excel'
            });
        }
    };

    const exportToPDF = async () => {
        await exportStandardPDF({
            title: 'Reporte de Usuarios del Sistema',
            subtitle: 'EDKOR MOTORS - Gestión de Cuentas y Accesos',
            orientation: 'portrait',
            filtersText: searchTerm ? `Búsqueda: "${searchTerm}"` : undefined,
            totalRecords: filteredUsers.length,
            totalRecordsLabel: 'Usuarios Registrados',
            filename: `Usuarios_${new Date().toISOString().split('T')[0]}.pdf`,
            tableOptions: {
                head: [['#', 'Nombre Completo / Usuario', 'Email', 'Roles / Perfil', 'Estado']],
                body: filteredUsers.map((u, idx) => [
                    idx + 1,
                    u.name,
                    u.email || '-',
                    Array.isArray(u.roles) ? u.roles.map((r: any) => r.name || r).join(', ') : (u.roles || '-'),
                    u.estado.toUpperCase()
                ]),
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },
                    1: { cellWidth: 60, fontStyle: 'bold' },
                    2: { cellWidth: 50 },
                    3: { cellWidth: 'auto' },
                    4: { halign: 'center', cellWidth: 25 }
                }
            }
        });
    };

    const handlePrint = () => {
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 150);
    };

    const filteredUsers = [...users]
        .filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' })
        );

    const totalPages = Math.ceil(filteredUsers.length / limit);
    const paginatedUsers = filteredUsers.slice((currentPage - 1) * limit, currentPage * limit);
    const displayedUsers = isPrinting ? filteredUsers : paginatedUsers;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-xl text-gray-600 dark:text-gray-400">Cargando...</div>
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
                    title="Reporte de Usuarios del Sistema"
                    subtitle="EDKOR MOTORS - Gestión de Accesos"
                    orientation="portrait"
                    filtersText={searchTerm ? `Búsqueda: "${searchTerm}"` : undefined}
                    totalRecords={filteredUsers.length}
                    totalRecordsLabel="Total Usuarios"
                />
            </div>

            <div className="container mx-auto relative min-h-screen">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 no-print gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                            <UsersIcon className="text-indigo-600" size={32} />
                            Lista de Usuarios
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Administra los usuarios y permisos del sistema</p>
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
                            Nuevo Usuario
                        </button>
                    </StandardExportToolbar>
                </div>

            {/* Search Bar */}
            <div className="mb-6 flex items-center gap-2 no-print">
                <div className="relative flex-grow max-w-md">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-300"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                </div>
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            setCurrentPage(1);
                        }}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors border border-red-200 shadow-sm"
                        title="Limpiar búsqueda"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
                Mostrando {filteredUsers.length === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, filteredUsers.length)} de {filteredUsers.length} registros
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Foto</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rol / Sucursal</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Personal Vinculado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider no-print">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {displayedUsers.map((user, index) => (
                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-3 text-gray-700 dark:text-gray-300">{isPrinting ? index + 1 : (currentPage - 1) * limit + index + 1}</td>
                                <td className="p-3 no-print">
                                    {user.foto ? (
                                        <img
                                            src={user.foto}
                                            alt={user.name}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </td>
                                <td className="p-3 text-gray-700 dark:text-gray-300 font-medium">{user.name}</td>
                                <td className="p-3 text-gray-700 dark:text-gray-300">{user.email}</td>
                                <td className="p-3 text-sm">
                                    <div className="font-semibold text-blue-600 dark:text-blue-400">
                                        {user.rol?.nombre || 'Sin Rol'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {user.sucursal?.nombre || 'Todas las sucursales'}
                                    </div>
                                </td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">
                                    {user.personal ? (
                                        <div>
                                            <span className="font-medium">{user.personal.nombre} {user.personal.paterno}</span>
                                            {user.personal.area && (
                                                <span className="text-xs text-gray-500 block">Área: {user.personal.area.area}</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">No vinculado</span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap border ${user.estado === 'activo'
                                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                        : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                        }`}>
                                        {user.estado.charAt(0).toUpperCase() + user.estado.slice(1)}
                                    </span>
                                </td>
                                <td className="p-3 flex gap-2 no-print">
                                    <button
                                        onClick={() => openEditModal(user)}
                                        className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                        title="Editar"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    {user.estado === 'activo' ? (
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                            title="Desactivar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReactivate(user.id)}
                                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                            title="Reactivar"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

            {filteredUsers.length === 0 && (
                <p className="text-center mt-5 text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No se encontraron resultados' : 'No hay usuarios registrados'}
                </p>
            )}

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />

            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Usuarios"
                sections={manualSections}
            />

            {/* User Form Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-auto">
                        <UserForm
                            initialData={editingUser}
                            onSubmit={handleSave}
                            onCancel={() => { setShowModal(false); setEditingUser(null); }}
                        />
                    </div>
                </div>
            )}

            <div className="hidden print:block mt-8">
                <StandardPrintFooter />
            </div>
        </div>
        </>
    );
};

export default Users;
