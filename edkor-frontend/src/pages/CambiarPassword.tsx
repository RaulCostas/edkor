import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { changeUserPassword } from '../services/userService';
import Swal from 'sweetalert2';
import ManualModal, { type ManualSection } from '../components/ManualModal';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Save, X, User as UserIcon, Shield } from 'lucide-react';
import { API_BASE_URL } from '../config';

const CambiarPassword = () => {
    const { user } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [showManual, setShowManual] = useState(false);

    const manualSections: ManualSection[] = [
        {
            title: 'Cambio de Contraseña',
            content: 'Este módulo permite actualizar la clave de acceso de su cuenta personal en el sistema EDKOR MOTORS.'
        },
        {
            title: 'Requisitos de Seguridad',
            content: '1. Debe ingresar su contraseña actual correctamente.\n2. La nueva contraseña debe tener al menos 6 caracteres.\n3. La confirmación debe coincidir exactamente con la nueva contraseña.'
        },
        {
            title: 'Recomendaciones',
            content: 'Utilice una combinación de letras, números y símbolos para mayor seguridad. No comparta su clave de acceso con terceros.'
        }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || !user.id) {
            Swal.fire({
                icon: 'error',
                title: 'Error de Sesión',
                text: 'No se pudo identificar al usuario actual.'
            });
            return;
        }

        if (!currentPassword.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo requerido',
                text: 'Por favor ingrese su contraseña actual.'
            });
            return;
        }

        if (newPassword.length < 6) {
            Swal.fire({
                icon: 'warning',
                title: 'Contraseña muy corta',
                text: 'La nueva contraseña debe tener al menos 6 caracteres.'
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Las contraseñas no coinciden',
                text: 'La nueva contraseña y su confirmación deben ser exactamente iguales.'
            });
            return;
        }

        if (currentPassword === newPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Contraseña idéntica',
                text: 'La nueva contraseña debe ser diferente a la contraseña actual.'
            });
            return;
        }

        setLoading(true);
        try {
            await changeUserPassword(user.id, {
                currentPassword,
                newPassword,
            });

            await Swal.fire({
                icon: 'success',
                title: '¡Contraseña Actualizada!',
                text: 'Su contraseña ha sido modificada exitosamente.',
                timer: 2000,
                showConfirmButton: false,
            });

            // Limpiar formulario
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            const errorMsg =
                error.response?.data?.message ||
                'No se pudo cambiar la contraseña. Verifique que la contraseña actual sea la correcta.';

            Swal.fire({
                icon: 'error',
                title: 'Error al cambiar contraseña',
                text: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;
    const isMinLength = newPassword.length >= 6;

    return (
        <div className="container mx-auto p-4 md:p-6 max-w-4xl min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-xl text-blue-600 dark:text-blue-400">
                        <KeyRound size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                            Cambiar Contraseña
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Actualiza tu clave de acceso personal al sistema
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setShowManual(true)}
                    className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2 rounded-full flex items-center justify-center w-[36px] h-[36px] text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                    title="Ayuda / Manual"
                >
                    ?
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Info Card */}
                <div className="md:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center text-center">
                        <div className="relative mb-4">
                            {user?.avatar || user?.foto ? (
                                <img
                                    src={user.foto ? `${API_BASE_URL}/files/${user.foto}` : user.avatar}
                                    alt={user.name}
                                    className="w-24 h-24 rounded-full object-cover border-4 border-blue-500/20 shadow-md"
                                    onError={(e) => {
                                        (e.target as any).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0D8ABC&color=fff&rounded=true&bold=true`;
                                    }}
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center border-4 border-blue-500/20 shadow-md">
                                    <UserIcon size={44} />
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 p-1.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" title="En línea" />
                        </div>

                        <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                            {user?.name || 'Usuario'}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {user?.email || 'email@ejemplo.com'}
                        </p>

                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 w-full space-y-2 text-left text-xs">
                            <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                <span className="font-medium flex items-center gap-1.5">
                                    <Shield size={14} className="text-blue-500" /> Rol:
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-semibold uppercase text-[10px]">
                                    {user?.rol?.nombre || user?.rol?.name || 'Usuario'}
                                </span>
                            </div>

                            {user?.sucursal?.nombre && (
                                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                                    <span className="font-medium">Sucursal:</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                        {user.sucursal.nombre}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl text-left w-full">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                                    Al cambiar tu contraseña deberás usar la nueva clave la próxima vez que inicies sesión.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form Card */}
                <div className="md:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 md:p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Contraseña Actual */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Contraseña Actual *
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showCurrentPassword ? 'text' : 'password'}
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Ingresa tu contraseña actual"
                                        className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    >
                                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Nueva Contraseña */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Nueva Contraseña *
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    >
                                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="mt-1 flex items-center gap-1.5 text-xs">
                                    {isMinLength ? (
                                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                                            <CheckCircle2 size={13} /> Cumple con longitud mínima (6+ caracteres)
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 dark:text-gray-500">
                                            Debe tener al menos 6 caracteres
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Confirmar Nueva Contraseña */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Confirmar Nueva Contraseña *
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repite la nueva contraseña"
                                        className={`w-full pl-10 pr-11 py-2.5 rounded-lg border ${
                                            confirmPassword && !isMatch
                                                ? 'border-red-400 focus:ring-red-400'
                                                : isMatch
                                                ? 'border-green-500 focus:ring-green-500'
                                                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
                                        } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 text-sm shadow-sm transition-all`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {confirmPassword && (
                                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                                        {isMatch ? (
                                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1 font-medium">
                                                <CheckCircle2 size={13} /> Las contraseñas coinciden
                                            </span>
                                        ) : (
                                            <span className="text-red-500 dark:text-red-400 flex items-center gap-1 font-medium">
                                                <AlertCircle size={13} /> Las contraseñas no coinciden
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
                                >
                                    <X size={16} />
                                    Limpiar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !isMinLength || !isMatch}
                                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            <span>Actualizando...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            <span>Guardar Cambios</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Cambiar Contraseña"
                sections={manualSections}
            />
        </div>
    );
};

export default CambiarPassword;
