import { createPortal } from "react-dom";
import { X, AlertTriangle, Wrench } from "lucide-react";
import type { PrecioTaller, ItemPrecioTaller } from "../../types/precioTaller";

interface MantenimientoDetalleModalProps {
  precio: PrecioTaller | null;
  onClose: () => void;
}

export const normalizeItems = (
  items?: (ItemPrecioTaller | string)[]
): ItemPrecioTaller[] => {
  if (!items || !Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === "string") {
        return { detalle: item, precio: 0 };
      }
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return { detalle: "", precio: 0 };
      }
      return {
        detalle: item?.detalle || "",
        precio: Number(item?.precio || 0),
      };
    })
    .filter((i) => i.detalle.trim().length > 0);
};

export const MantenimientoDetalleModal = ({
  precio,
  onClose,
}: MantenimientoDetalleModalProps) => {
  if (!precio) return null;

  const itemsList = normalizeItems(precio.items);
  const displayRows: ItemPrecioTaller[] =
    itemsList.length > 0
      ? itemsList
      : [{ detalle: precio.detalle, precio: Number(precio.precio || 0) }];

  const totalCalculado =
    itemsList.length > 0
      ? itemsList.reduce((acc, cur) => acc + Number(cur.precio || 0), 0)
      : Number(precio.precio || 0);

  const totalMostrar =
    totalCalculado > 0 ? totalCalculado : Number(precio.precio || 0);

  const revisiones = (precio.revisiones || []).filter(
    (r) => typeof r === "string" && r.trim().length > 0
  );

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto relative p-6 md:p-8 border border-gray-200 dark:border-gray-700">
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/40 dark:hover:bg-red-900/60 dark:text-red-400 rounded-lg transition-all transform hover:-translate-y-0.5"
          title="Cerrar"
        >
          <X size={20} />
        </button>

        {/* Encabezado estilo Imcruz */}
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#001a41] dark:text-white tracking-tight">
            Detalle del mantenimiento
          </h2>
          <p className="text-sm md:text-base font-semibold text-[#001a41]/80 dark:text-gray-300 uppercase mt-1">
            {precio.detalle}
          </p>
        </div>

        {/* Tabla de Desglose de Costos */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse border border-[#1f232d]">
            <thead>
              <tr className="bg-[#001a41] text-white uppercase text-xs md:text-sm font-bold">
                <th className="py-2 px-3 border border-[#1f232d] text-center w-16">
                  #
                </th>
                <th className="py-2 px-4 border border-[#1f232d] text-center">
                  DETALLE
                </th>
                <th className="py-2 px-4 border border-[#1f232d] text-center w-44">
                  PRECIO
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) => (
                <tr
                  key={idx}
                  className="bg-[#f1f1f1] dark:bg-gray-700 text-[#394650] dark:text-gray-100 text-sm"
                >
                  <td className="py-1.5 px-3 border border-[#1f232d]/60 text-center font-medium">
                    {idx + 1}
                  </td>
                  <td className="py-1.5 px-4 border border-[#1f232d]/60 uppercase">
                    {row.detalle}
                  </td>
                  <td className="py-1.5 px-4 border border-[#1f232d]/60 text-right font-medium">
                    {Number(row.precio || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    Bs
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#001a41] text-white font-bold text-sm md:text-base uppercase">
                <td
                  colSpan={2}
                  className="py-2 px-4 border border-[#001a41] text-center tracking-wide"
                >
                  TOTAL
                </td>
                <td className="py-2 px-4 border border-[#001a41] text-right">
                  {totalMostrar.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  Bs
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Banner Amarillo IMPORTANTE */}
        <div className="bg-[#ffe885] border border-[#f2cf43] rounded-md p-4 mb-6 flex items-start gap-3 text-[#394650] shadow-sm">
          <AlertTriangle
            className="text-[#f59e0b] shrink-0 mt-0.5"
            size={28}
          />
          <p className="text-xs md:text-sm leading-relaxed">
            <strong className="font-bold text-gray-900">IMPORTANTE!</strong> De
            acuerdo con el Fabricante, las siguientes revisiones/trabajos son
            obligatorios y forman parte de nuestro paquete de mantenimiento. En
            caso de no realizarse en tiempo y forma, su vehículo podría volverse
            inseguro y/o causar fallas significativas.
          </p>
        </div>

        {/* Listado de Revisiones */}
        {revisiones.length > 0 ? (
          <div>
            <h3 className="text-center text-xs md:text-sm font-semibold uppercase tracking-wider text-[#394650] dark:text-gray-300 mb-5">
              LISTADO DE REVISIONES:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2.5 text-xs text-[#394650] dark:text-gray-300">
              {revisiones.map((rev, index) => (
                <div key={index} className="flex items-start gap-2 leading-snug">
                  <Wrench
                    size={13}
                    className="text-[#394650] dark:text-blue-400 shrink-0 mt-0.5"
                  />
                  <span>{rev}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 italic">
            No se registraron revisiones específicas para este servicio.
          </p>
        )}

        {/* Botón inferior de cierre */}
        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
          >
            <X size={18} /> Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
