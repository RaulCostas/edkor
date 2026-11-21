import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Swal from "sweetalert2";
import { useEffect } from "react";

interface ProtectedRouteProps {
  permission?: string;
  children?: React.ReactNode;
}

export const ProtectedRoute = ({
  permission,
  children,
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (permission) {
      if (!user.rol) return; // Si no tiene rol, asumimos que es el admin principal / legacy
      const roleName = user.rol?.nombre?.toLowerCase()?.trim();
      if (roleName === "admin" || roleName === "administrador") return; // Admin has all permissions

      const hasPermission = user.rol?.permisos?.[permission] === true;
      if (!hasPermission) {
        Swal.fire(
          "Acceso Denegado",
          "No tienes permiso para acceder a esta sección",
          "error",
        );
      }
    }
  }, [user, permission]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 dark:text-gray-400">Cargando sesión...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permission && user.rol) {
    const roleName = user.rol?.nombre?.toLowerCase()?.trim();
    if (roleName !== "admin" && roleName !== "administrador" && user.rol?.permisos?.[permission] !== true) {
      return <Navigate to="/" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
