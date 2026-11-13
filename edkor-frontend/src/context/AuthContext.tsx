import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import api from "../services/api";
import { getRole } from "../services/rolesService";
import { API_BASE_URL } from "../config";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  foto?: string;
  estado?: string;
  rol?: any;
  rol_id?: number;
  personal_id?: number;
  sucursal_id?: number;
  personal?: any;
  sucursal?: any;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refreshUserRole: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  // Inicialización sincrónica desde localStorage para evitar redirección a /login en F5
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error("Error al leer el usuario de localStorage:", e);
      return null;
    }
  });

  const [loading] = useState<boolean>(false);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
  }, []);

  const userId = user?.id;
  const roleId = user?.rol?.id ?? user?.rol_id;

  const refreshUserRole = useCallback(async () => {
    if (!roleId) return;
    try {
      const freshRole = await getRole(Number(roleId));
      setUser((prev) => {
        if (!prev) return prev;
        if (JSON.stringify(prev.rol) === JSON.stringify(freshRole)) {
          return prev;
        }
        const updated = { ...prev, rol: freshRole };
        try {
          localStorage.setItem("user", JSON.stringify(updated));
        } catch (e) {
          console.error("Error al actualizar usuario en localStorage:", e);
        }
        return updated;
      });
    } catch (error) {
      console.error("Error al sincronizar permisos del rol:", error);
    }
  }, [roleId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const syncSession = async () => {
      try {
        const res = await api.get(`/users/${userId}`);
        if (!active) return;
        const freshUser = res.data;
        if (!freshUser || (freshUser.estado || "").toLowerCase() === "inactivo") {
          logout();
          return;
        }
        if (freshUser.rol) {
          setUser((prev) => {
            if (!prev) return prev;
            if (
              prev.estado === freshUser.estado &&
              JSON.stringify(prev.rol) === JSON.stringify(freshUser.rol)
            ) {
              return prev;
            }
            const updated = {
              ...prev,
              estado: freshUser.estado,
              rol: freshUser.rol,
            };
            try {
              localStorage.setItem("user", JSON.stringify(updated));
            } catch (e) {
              console.error("Error al actualizar usuario en localStorage:", e);
            }
            return updated;
          });
        }
      } catch (error) {
        console.error("Error al verificar sesión del usuario:", error);
      }
    };
    syncSession();
    return () => {
      active = false;
    };
  }, [userId, logout]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.error) {
        return { ok: false, error: data.error };
      }

      if ((data.estado || "").toLowerCase() === "inactivo") {
        return {
          ok: false,
          error: "Su usuario se encuentra inactivo. Contacte al administrador.",
        };
      }

      const avatar = data.foto
        ? data.foto
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=0D8ABC&color=fff&rounded=true&bold=true`;

      const newUser: User = {
        id: String(data.id),
        name: data.name,
        email: data.email,
        avatar: avatar,
        foto: data.foto,
        estado: data.estado,
        rol: data.rol,
        rol_id: data.rol_id,
        personal_id: data.personal_id,
        sucursal_id: data.sucursal_id,
        personal: data.personal,
        sucursal: data.sucursal,
      };

      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
      return { ok: true };
    } catch (error) {
      console.error("Error logging in:", error);
      return {
        ok: false,
        error: "No se pudo conectar con el servidor. Por favor intente más tarde.",
      };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, refreshUserRole, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
