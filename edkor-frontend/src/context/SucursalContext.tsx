import React, { createContext, useContext, useState, useEffect } from "react";
import type { Sucursal } from "../types/sucursal";
import { getSucursales } from "../services/sucursalService";

interface SucursalContextType {
  sucursales: Sucursal[];
  selectedSucursal: Sucursal | null;
  setSelectedSucursal: (sucursal: Sucursal) => void;
  loading: boolean;
}

const SucursalContext = createContext<SucursalContextType | undefined>(
  undefined,
);

export const SucursalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [selectedSucursal, setSelectedSucursalState] =
    useState<Sucursal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSucursales();
  }, []);

  const fetchSucursales = async () => {
    try {
      const data = await getSucursales();
      const activeSucursales = data.filter((s) => s.estado === "activo");
      setSucursales(activeSucursales);

      const savedId = localStorage.getItem("selectedSucursalId");
      if (savedId && activeSucursales.length > 0) {
        const found = activeSucursales.find((s) => s.id.toString() === savedId);
        if (found) {
          setSelectedSucursalState(found);
        } else {
          setSelectedSucursalState(activeSucursales[0]);
          localStorage.setItem(
            "selectedSucursalId",
            activeSucursales[0].id.toString(),
          );
        }
      } else if (activeSucursales.length > 0) {
        setSelectedSucursalState(activeSucursales[0]);
        localStorage.setItem(
          "selectedSucursalId",
          activeSucursales[0].id.toString(),
        );
      }
    } catch (error) {
      console.error("Error fetching sucursales:", error);
    } finally {
      setLoading(false);
    }
  };

  const setSelectedSucursal = (sucursal: Sucursal) => {
    setSelectedSucursalState(sucursal);
    localStorage.setItem("selectedSucursalId", sucursal.id.toString());
    // We could also reload the page or let components react to the change
    window.location.reload(); // Hard reload to ensure all data is fetched with new context
  };

  return (
    <SucursalContext.Provider
      value={{ sucursales, selectedSucursal, setSelectedSucursal, loading }}
    >
      {children}
    </SucursalContext.Provider>
  );
};

export const useSucursal = () => {
  const context = useContext(SucursalContext);
  if (context === undefined) {
    throw new Error("useSucursal must be used within a SucursalProvider");
  }
  return context;
};
