import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  FileText,
  Users,
  Car,
  Building2,
} from "lucide-react";

interface ConfigCard {
  title: string;
  description: string;
  to: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  iconBg: string;
  iconColor: string;
  btnBg: string;
}

const CARDS: ConfigCard[] = [
  {
    title: "Área de Personal",
    description: "Defina las áreas y departamentos para la organización del personal.",
    to: "/configuraciones/area-personal",
    icon: Users,
    iconBg: "bg-indigo-100 dark:bg-indigo-900",
    iconColor: "text-indigo-600 dark:text-indigo-300",
    btnBg: "bg-indigo-600 hover:bg-indigo-700",
  },
  {
    title: "Categorías de Servicios",
    description: "Clasificación para los servicios ofrecidos por EDKOR MOTORS.",
    to: "/configuraciones/categoria-servicio",
    icon: FileText,
    iconBg: "bg-teal-100 dark:bg-teal-900",
    iconColor: "text-teal-600 dark:text-teal-300",
    btnBg: "bg-teal-600 hover:bg-teal-700",
  },
  {
    title: "Formas de Pago",
    description: "Administre los métodos de pago aceptados (Efectivo, Transferencia, QR, etc.)",
    to: "/configuraciones/forma-pago",
    icon: CreditCard,
    iconBg: "bg-emerald-100 dark:bg-emerald-900",
    iconColor: "text-emerald-600 dark:text-emerald-300",
    btnBg: "bg-emerald-600 hover:bg-emerald-700",
  },
  {
    title: "Grupos de Inventario",
    description: "Clasificación de grupos de inventario (Repuestos, Aceites, etc.)",
    to: "/configuraciones/grupo-inventario",
    icon: FileText,
    iconBg: "bg-purple-100 dark:bg-purple-900",
    iconColor: "text-purple-600 dark:text-purple-300",
    btnBg: "bg-purple-600 hover:bg-purple-700",
  },
  {
    title: "Marcas de Autos",
    description: "Gestión del catálogo de marcas de vehículos.",
    to: "/configuraciones/marca-auto",
    icon: Car,
    iconBg: "bg-orange-100 dark:bg-orange-900",
    iconColor: "text-orange-600 dark:text-orange-300",
    btnBg: "bg-orange-600 hover:bg-orange-700",
  },
  {
    title: "Red Banco",
    description: "Administre las redes de banco y sus comisiones por tarjeta.",
    to: "/configuraciones/comision-tarjeta",
    icon: CreditCard,
    iconBg: "bg-rose-100 dark:bg-rose-900",
    iconColor: "text-rose-600 dark:text-rose-300",
    btnBg: "bg-rose-600 hover:bg-rose-700",
  },
  {
    title: "Sucursales",
    description: "Administre las sucursales y puntos de atención de EDKOR MOTORS.",
    to: "/configuraciones/sucursales",
    icon: Building2,
    iconBg: "bg-indigo-100 dark:bg-indigo-900",
    iconColor: "text-indigo-600 dark:text-indigo-300",
    btnBg: "bg-indigo-600 hover:bg-indigo-700",
  },
  {
    title: "Tipo de Orden",
    description: "Defina los tipos de orden para las hojas de recepción y órdenes de trabajo.",
    to: "/configuraciones/tipo-orden",
    icon: FileText,
    iconBg: "bg-cyan-100 dark:bg-cyan-900",
    iconColor: "text-cyan-600 dark:text-cyan-300",
    btnBg: "bg-cyan-600 hover:bg-cyan-700",
  },
  {
    title: "Tipos de Vehículos",
    description: "Gestión del catálogo de tipos de vehículos (Sedán, SUV, Camioneta, etc.)",
    to: "/configuraciones/tipos-vehiculos",
    icon: Car,
    iconBg: "bg-blue-100 dark:bg-blue-900",
    iconColor: "text-blue-600 dark:text-blue-300",
    btnBg: "bg-blue-600 hover:bg-blue-700",
  },
  {
    title: "Unidades de Medida",
    description: "Gestión de unidades de medida (Metro, Litro, Pieza, etc.)",
    to: "/configuraciones/unidad-medida",
    icon: FileText,
    iconBg: "bg-red-100 dark:bg-red-900",
    iconColor: "text-red-600 dark:text-red-300",
    btnBg: "bg-red-600 hover:bg-red-700",
  },
];

const ConfiguracionesGeneral = () => {
  const navigate = useNavigate();

  const sortedCards = [...CARDS].sort((a, b) =>
    a.title.localeCompare(b.title, "es", { sensitivity: "base" })
  );

  return (
    <div className="container mx-auto relative min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/configuraciones")}
          className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Volver"
        >
          <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-3">
          <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </span>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
            Configuración General
          </h2>
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
        Administración de catálogos y parámetros generales del sistema.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <div
              key={card.to}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 ${card.iconBg} rounded-lg`}>
                    <IconComponent className={card.iconColor} size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {card.title}
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6 min-h-[40px]">
                  {card.description}
                </p>
              </div>
              <Link
                to={card.to}
                className={`block w-full text-center ${card.btnBg} text-white hover:text-white font-semibold py-2 px-4 rounded-lg transition-colors`}
              >
                Configurar
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConfiguracionesGeneral;
