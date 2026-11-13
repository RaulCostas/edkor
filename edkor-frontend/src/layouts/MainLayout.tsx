import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  Settings,
  LogOut,
  Shield,
  ChevronDown,
  ChevronRight,
  FileText,
  UserCheck,
  CreditCard,
  Truck,
  Package,
  DollarSign,
  Users as UsersIcon,
  UserPlus,
  TrendingUp,
  ClipboardList,
  CalendarX,
  Boxes,
  Mail,
  Wallet,
  Receipt,
  Menu,
  X,
  KeyRound,
  Clock,
  RotateCcw,
} from "lucide-react";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { useCorreos } from "../context/CorreosContext";
import { useSucursal } from "../context/SucursalContext";
import ChatWidget from "../components/Chat/ChatWidget";
import "./Layout.css";

interface NavItem {
  path: string;
  label: string;
  icon: any;
  subItems?: NavItem[];
  requiredPermission?: string;
}

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useCorreos();
  const { sucursales, selectedSucursal, setSelectedSucursal } = useSucursal();
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>(
    () => {
      // Initialize state based on current path
      const initialState: Record<string, boolean> = {};
      if (location.pathname.startsWith("/operaciones"))
        initialState["/operaciones"] = true;
      if (location.pathname.startsWith("/seguros"))
        initialState["/seguros"] = true;
      if (location.pathname.startsWith("/proveedores"))
        initialState["/proveedores"] = true;
      if (location.pathname.startsWith("/personal"))
        initialState["/personal"] = true;
      if (location.pathname.startsWith("/cobros"))
        initialState["/cobros"] = true;
      if (location.pathname.startsWith("/inventario"))
        initialState["/inventario"] = true;
      return initialState;
    },
  );

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(
    () => typeof window !== "undefined" && window.innerWidth <= 768,
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobileViewport(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const effectiveCollapsed = isCollapsed && !isMobileViewport;

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("sidebar_collapsed", JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
        return next;
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleSubMenu = (path: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const rawNavItems: NavItem[] = [
    { path: "/", label: "Inicio", icon: Home },
    {
      path: "/operaciones",
      label: "Operaciones Taller",
      icon: Settings,
      subItems: [
        {
          path: "/hoja-recepcion",
          label: "Hoja de Recepción",
          icon: FileText,
          requiredPermission: "recepcion",
        },
        {
          path: "/ordenes-trabajo",
          label: "Órdenes de Trabajo",
          icon: ClipboardList,
          requiredPermission: "ordenes",
        },
        {
          path: "/utilidad-ordenes",
          label: "Utilidad Neta de O.T.",
          icon: TrendingUp,
          requiredPermission: "utilidad_ordenes",
        },
      ],
    },
    {
      path: "/cotizaciones",
      label: "Cotizaciones",
      icon: FileText,
      requiredPermission: "cotizaciones",
    },
    {
      path: "/cobros",
      label: "Cobros",
      icon: Wallet,
      subItems: [
        {
          path: "/cobros/registro-pagos",
          label: "Registro de Pagos",
          icon: Receipt,
          requiredPermission: "cobros_registro",
        },
        {
          path: "/cobros/deudas-por-cobrar",
          label: "Deudas por Cobrar",
          icon: FileText,
          requiredPermission: "cobros_deudas",
        },
      ],
    },
    {
      path: "/seguros",
      label: "Seguros",
      icon: Shield,
      subItems: [
        {
          path: "/seguros/registro",
          label: "Registro de Seguros",
          icon: Shield,
          requiredPermission: "seguros_registro",
        },
        {
          path: "/seguros/inspectores",
          label: "Inspectores",
          icon: UserCheck,
          requiredPermission: "seguros_inspectores",
        },
        {
          path: "/seguros/precios",
          label: "Lista de Precios",
          icon: DollarSign,
          requiredPermission: "seguros_precios",
        },
      ],
    },
    {
      path: "/personal",
      label: "Personal",
      icon: Users,
      subItems: [
        {
          path: "/personal/registro",
          label: "Registro de Personal",
          icon: UserPlus,
          requiredPermission: "personal_registro",
        },
        {
          path: "/personal/produccion",
          label: "Producción de Personal",
          icon: TrendingUp,
          requiredPermission: "personal_produccion",
        },
        {
          path: "/personal/mi-produccion",
          label: "Mi Producción / Horas",
          icon: Clock,
          requiredPermission: "personal_mi_produccion",
        },
        {
          path: "/personal/planilla",
          label: "Planilla de Sueldos",
          icon: ClipboardList,
          requiredPermission: "personal_planilla",
        },
        {
          path: "/personal/faltas",
          label: "Faltas y Vacaciones",
          icon: CalendarX,
          requiredPermission: "personal_faltas",
        },
        {
          path: "/personal/anticipos",
          label: "Anticipos de Sueldo",
          icon: DollarSign,
          requiredPermission: "personal_anticipos",
        },
      ],
    },
    {
      path: "/pagos-trabajos/status",
      label: "Trabajos Cancelados / No Cancelados",
      icon: ClipboardList,
      requiredPermission: "pagos_status",
    },
    {
      path: "/proveedores",
      label: "Proveedores",
      icon: Truck,
      subItems: [
        {
          path: "/proveedores/registro",
          label: "Registro de Proveedores",
          icon: UsersIcon,
          requiredPermission: "proveedores_registro",
        },
        {
          path: "/proveedores/pedidos",
          label: "Compra de Material y/o Repuestos",
          icon: Package,
          requiredPermission: "proveedores_pedidos",
        },
        {
          path: "/proveedores/pagos",
          label: "Pago a Proveedores",
          icon: DollarSign,
          requiredPermission: "proveedores_pagos",
        },
      ],
    },
    {
      path: "/inventario",
      label: "Inventario",
      icon: Boxes,
      subItems: [
        {
          path: "/inventario",
          label: "Control de Inventario",
          icon: Boxes,
          requiredPermission: "inventario",
        },
        {
          path: "/inventario/cargar-repuestos",
          label: "Cargar Repuestos a O.T.",
          icon: Package,
          requiredPermission: "inventario_cargar_repuestos",
        },
        {
          path: "/inventario/devoluciones",
          label: "Retorno a Almacén",
          icon: RotateCcw,
          requiredPermission: "inventario_devoluciones",
        },
      ],
    },
    {
      path: "/precios-taller",
      label: "Precios Servicios",
      icon: DollarSign,
      requiredPermission: "aranceles",
    },
    {
      path: "/egresos",
      label: "Egresos Diarios",
      icon: CreditCard,
      requiredPermission: "egresos",
    },
    {
      path: "/gastos-fijos",
      label: "Gastos Fijos",
      icon: FileText,
      requiredPermission: "gastos_fijos",
    },
    {
      path: "/hoja-diaria",
      label: "Hoja Diaria",
      icon: FileText,
      requiredPermission: "hoja_diaria",
    },
    {
      path: "/utilidades",
      label: "Utilidades",
      icon: FileText,
      requiredPermission: "utilidades",
    },
    {
      path: "/users",
      label: "Usuarios",
      icon: Users,
      requiredPermission: "usuarios",
    },
    {
      path: "/cambiar-password",
      label: "Cambiar Contraseña",
      icon: KeyRound,
    },
    {
      path: "/configuraciones",
      label: "Configuraciones",
      icon: Settings,
      requiredPermission: "configuraciones",
    },
  ];

  const hasMenuPermission = (requiredPermission?: string) => {
    if (!requiredPermission) return true;
    if (!user?.rol) return true;
    if (user.rol.nombre?.toLowerCase() === "admin") return true;
    return user.rol.permisos?.[requiredPermission] === true;
  };

  const navItems = rawNavItems
    .map((item) => {
      if (item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter((sub) =>
            hasMenuPermission(sub.requiredPermission),
          ),
        };
      }
      return item;
    })
    .filter((item) => {
      // If it's a folder, hide if all subItems got filtered out (assuming it had subItems originally)
      if (item.subItems && item.subItems.length === 0) return false;
      return hasMenuPermission(item.requiredPermission);
    });

  return (
    <div className="dashboard-container">
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${effectiveCollapsed ? "collapsed" : ""} ${isMobileOpen ? "active" : ""}`}
      >
        <div className="sidebar-header flex items-center justify-center relative">
          {!effectiveCollapsed ? (
            <div className="flex items-center justify-center w-full py-1">
              <img
                src="/logo.jpg"
                alt="EDKOR MOTORS"
                className="max-h-14 w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full py-1">
              <img
                src="/logo.jpg"
                alt="EDKOR"
                className="w-11 h-auto max-h-10 object-contain rounded shadow-sm"
                title="EDKOR MOTORS"
              />
            </div>
          )}

          {/* Close button for mobile */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.subItems
                ? item.subItems.some((sub) => location.pathname === sub.path)
                : location.pathname === item.path;

              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isOpen = openSubMenus[item.path];

              return (
                <li
                  key={item.path}
                  className="nav-item-container"
                  title={effectiveCollapsed ? item.label : undefined}
                >
                  <div
                    className={`nav-item flex items-center cursor-pointer ${effectiveCollapsed ? "justify-center" : "justify-between"} ${isActive && !hasSubItems ? "active" : ""}`}
                    onClick={() => {
                      if (hasSubItems) {
                        if (effectiveCollapsed) {
                          setIsCollapsed(false);
                          setOpenSubMenus((prev) => ({
                            ...prev,
                            [item.path]: true,
                          }));
                        } else {
                          toggleSubMenu(item.path);
                        }
                      } else {
                        navigate(item.path);
                      }
                    }}
                  >
                    <div
                      className={`flex items-center w-full ${effectiveCollapsed ? "justify-center" : ""}`}
                    >
                      {hasSubItems ? (
                        <button
                          type="button"
                          className={`flex items-center w-full text-left nav-link bg-transparent border-0 ${effectiveCollapsed ? "justify-center p-2.5" : "p-0"} ${isActive && effectiveCollapsed ? "active text-white" : ""}`}
                          title={effectiveCollapsed ? item.label : undefined}
                        >
                          <Icon size={20} className="shrink-0" />
                          {!effectiveCollapsed && (
                            <span className="ml-3 flex-1">{item.label}</span>
                          )}
                          {!effectiveCollapsed &&
                            (isOpen ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            ))}
                        </button>
                      ) : (
                        <Link
                          to={item.path}
                          className={`nav-link w-full ${isActive ? "active" : ""} ${effectiveCollapsed ? "justify-center p-2.5" : ""}`}
                          title={effectiveCollapsed ? item.label : undefined}
                        >
                          <Icon size={20} className="shrink-0" />
                          {!effectiveCollapsed && (
                            <span className="ml-3">{item.label}</span>
                          )}
                        </Link>
                      )}
                    </div>
                  </div>

                  {hasSubItems && isOpen && !effectiveCollapsed && (
                    <ul className="nav-sub-list ml-4 pl-3 my-1.5 space-y-1 border-l-2 border-blue-400/40 dark:border-blue-500/30 bg-black/20 dark:bg-black/30 rounded-r-lg py-1.5">
                      {item.subItems!.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive =
                          subItem.path === "/inventario"
                            ? location.pathname === "/inventario"
                            : location.pathname.startsWith(subItem.path);
                        return (
                          <li key={subItem.path} className="nav-sub-item">
                            <Link
                              to={subItem.path}
                              className={`nav-link sub-nav-link text-xs md:text-sm py-2 px-3 flex items-center rounded-lg transition-all ${
                                isSubActive
                                  ? "active bg-blue-600 text-white font-semibold shadow-xs"
                                  : "text-gray-300 hover:text-white hover:bg-white/10"
                              }`}
                            >
                              <SubIcon size={15} className="shrink-0 opacity-80" />
                              <span className="ml-2 leading-snug">{subItem.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        <header className="top-header">
          <div className="header-left flex items-center">
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 mr-2 sm:mr-3 rounded-lg text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none flex items-center justify-center cursor-pointer shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0"
              title={effectiveCollapsed ? "Mostrar menú completo" : "Ocultar menú"}
              aria-label="Alternar menú"
            >
              <Menu size={20} />
            </button>
          </div>
          <div className="header-actions min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 mr-2 sm:mr-4 md:mr-6 border-r border-gray-300 dark:border-gray-700 pr-2 sm:pr-4 md:pr-6 min-w-0">
              <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400 font-medium shrink-0">
                Sucursal:
              </span>
              <select
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-xs sm:text-sm rounded-lg focus:ring-blue-500 block w-full max-w-[130px] sm:max-w-[180px] md:max-w-none p-1.5 sm:p-2 text-gray-900 dark:text-white truncate"
                value={selectedSucursal?.id || ""}
                onChange={(e) => {
                  const sucursal = sucursales.find(
                    (s) => s.id.toString() === e.target.value,
                  );
                  if (sucursal) setSelectedSucursal(sucursal);
                }}
              >
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="header-buttons flex items-center gap-1 sm:gap-2 shrink-0">
              <ThemeToggle />
              <div className="relative">
                <button
                  onClick={() => navigate("/correos")}
                  className="bg-transparent p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors"
                  title="Correos Internos"
                >
                  <Mail size={20} />
                </button>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>

              <button
                onClick={() => navigate("/")}
                className="hidden sm:inline-flex bg-transparent p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors"
                title="Inicio"
              >
                <Home size={20} />
              </button>

              {user && (
                <div className="flex items-center gap-2 px-1 sm:px-2 py-1 select-none">
                  <img
                    src={user.foto || user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm object-cover shrink-0"
                  />
                  <span className="hidden lg:inline text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap max-w-[140px] truncate">
                    {user.name}
                  </span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="bg-transparent p-1.5 sm:p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors"
                title="Salir"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>
        <div className="content-area">
          <Outlet />
        </div>
      </main>
      <ChatWidget />
    </div>
  );
};

export default MainLayout;
