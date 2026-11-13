import React from "react";
import { User, FileText, Car, X, Phone, Printer, Layers, Wrench, Package, Clock } from "lucide-react";
import type { OrdenTrabajo } from "../types/ordenTrabajo";
import type { DetalleOrdenTrabajo } from "../types/detalleOrdenTrabajo";

interface ViewOrdenModalProps {
  orden: OrdenTrabajo | null;
  detalles: DetalleOrdenTrabajo[];
  onClose: () => void;
}

const formatPhoneDisplay = (phone?: string | null) => {
  if (!phone) return "-";
  const clean = phone.trim();
  const KNOWN_CODES = [
    "+591", "+595", "+598", "+54", "+55", "+56",
    "+57", "+51", "+58", "+52", "+34", "+1",
  ];
  for (const code of KNOWN_CODES) {
    if (clean.startsWith(code)) {
      const rest = clean.slice(code.length).trim();
      return `(${code}) ${rest}`;
    }
  }
  return clean;
};

const ViewOrdenModal = ({ orden, detalles, onClose }: ViewOrdenModalProps) => {
  if (!orden) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-3 sm:p-4 print:hidden">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-3.5 flex items-center justify-between z-10 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                Detalle
              </span>
              <h2 className="text-xl font-bold">Orden de Trabajo #{orden.id}</h2>
            </div>
            <p className="text-blue-100 text-xs mt-0.5">
              Fecha de Registro: {new Date(orden.fecha_registro).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTimeout(() => {
                  window.print();
                }, 300);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all text-xs font-semibold shadow-sm"
              title="Imprimir Orden"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all transform hover:-translate-y-0.5 shadow-sm"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
          {/* Fila: Vehículo y Propietario en Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            {/* Información del Vehículo (ocupa 2 columnas en lg) */}
            <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2.5 flex items-center gap-2">
                <Car size={16} className="text-blue-600 dark:text-blue-400" />
                Información del Vehículo
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Placa</span>
                  <span className="text-gray-900 dark:text-white font-mono font-bold text-sm uppercase">
                    {(orden.vehiculo_placa || orden.placa || 'S/P').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Marca</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {orden.marca_auto?.marca || orden.vehiculo_marca || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Modelo</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {orden.vehiculo_modelo || orden.modelo || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Color</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {orden.vehiculo_color || orden.color || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Kilometraje</span>
                  <span className="text-gray-900 dark:text-white font-mono font-medium">
                    {orden.vehiculo_kilometraje ?? orden.km_ingreso ?? "N/A"} km
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Chasis</span>
                  <span className="text-gray-900 dark:text-white font-mono font-medium">
                    {orden.vehiculo_chasis || orden.chasis || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Información del Propietario (ocupa 1 columna) */}
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2.5 flex items-center gap-2">
                  <User size={16} className="text-blue-600 dark:text-blue-400" />
                  Datos del Propietario
                </h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Nombre</span>
                    <span className="text-gray-900 dark:text-white font-semibold">
                      {orden.cliente_nombre || orden.cliente}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Celular / WhatsApp</span>
                    <span className="text-gray-900 dark:text-white font-mono font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {formatPhoneDisplay(orden.cliente_telefono || orden.celular)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detalles de Trabajo */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3.5 border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
              <FileText size={16} className="text-blue-600 dark:text-blue-400" />
              Trabajos Realizados
            </h3>
            {detalles.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold">
                      <th className="text-left py-2 px-3 w-10">#</th>
                      <th className="text-left py-2 px-3">Detalle</th>
                      <th className="text-left py-2 px-3">Observaciones</th>
                      <th className="text-center py-2 px-3">Nivel</th>
                      <th className="text-center py-2 px-3">Cant.</th>
                      <th className="text-right py-2 px-3">P. Unit.</th>
                      <th className="text-right py-2 px-3">Total</th>
                      <th className="text-center py-2 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800/60">
                    {(() => {
                      const ptGroupMap = new Map<number, DetalleOrdenTrabajo[]>();
                      detalles.forEach((d) => {
                        const ptId = Number(d.idprecio_taller || d.precio_taller?.id || 0);
                        const ptObj = d.precio_taller as any;
                        const hasSubItems = Array.isArray(ptObj?.items) && ptObj.items.length > 0;
                        if (ptId > 0 && hasSubItems) {
                          const list = ptGroupMap.get(ptId) || [];
                          list.push(d);
                          ptGroupMap.set(ptId, list);
                        }
                      });

                      // Fallback if items share same idprecio_taller and have distinct sub-item names
                      detalles.forEach((d) => {
                        const ptId = Number(d.idprecio_taller || d.precio_taller?.id || 0);
                        if (ptId > 0 && !ptGroupMap.has(ptId)) {
                          const samePt = detalles.filter(
                            (x) => Number(x.idprecio_taller || x.precio_taller?.id || 0) === ptId
                          );
                          const ptName = (d.precio_taller?.detalle || "").trim();
                          if (samePt.length > 1 && ptName && samePt.some((x) => (x.detalle || "").trim() !== ptName)) {
                            ptGroupMap.set(ptId, samePt);
                          }
                        }
                      });

                      const renderedGroups = new Set<number>();
                      const rows: React.ReactNode[] = [];
                      const monedaSym = orden.moneda?.toLowerCase() === "bolivianos" ? "Bs." : "$us";

                      detalles.forEach((detalle, index) => {
                        const ptId = Number(detalle.idprecio_taller || detalle.precio_taller?.id || 0);
                        const groupItems = ptId > 0 ? ptGroupMap.get(ptId) : undefined;
                        const isGroupSubItem = !!groupItems && groupItems.length > 0;

                        if (isGroupSubItem && !renderedGroups.has(ptId)) {
                          renderedGroups.add(ptId);
                          const ptObj = detalle.precio_taller as any;
                          const groupName = ptObj?.detalle || "Grupo de Mantenimiento";
                          const activeGroupItems = groupItems!.filter((g) => g.estado_trabajo !== "descartado");
                          const groupTotal = activeGroupItems.reduce((acc, g) => acc + Number(g.total || 0), 0);
                          const globalTime =
                            groupItems!
                              .map((g) => Number(g.tiempo_estimado || 0))
                              .find((t) => t > 0) || Number(ptObj?.tiempo_estimado || 0);

                          rows.push(
                            <tr
                              key={`group-header-${ptId}`}
                              className="bg-indigo-50/90 dark:bg-indigo-950/40 border-y border-indigo-200 dark:border-indigo-800/70"
                            >
                              <td colSpan={6} className="py-2.5 px-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-600 text-white shadow-xs">
                                    <Layers size={13} />
                                    Grupo de Trabajo: {groupName}
                                  </span>
                                  <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-700">
                                    {groupItems!.length} sub-trabajos
                                  </span>
                                  {globalTime > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-white/80 dark:bg-gray-800 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-700">
                                      <Clock size={11} />
                                      Tiempo Global: <strong>{globalTime} hrs</strong>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-900 dark:text-indigo-200 whitespace-nowrap">
                                <span className="text-[10px] font-semibold uppercase text-indigo-600 dark:text-indigo-400 block">
                                  Total Grupo
                                </span>
                                {monedaSym} {groupTotal.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                  Paquete
                                </span>
                              </td>
                            </tr>
                          );
                        }

                        const isDescartado = detalle.estado_trabajo === "descartado";
                        const isRepuesto = !!(detalle.id_inventario || detalle.inventario);
                        const hasSeguimiento =
                          detalle.seguimiento &&
                          (detalle.seguimiento.fecha_recepcion ||
                            detalle.seguimiento.encargado ||
                            detalle.seguimiento.recibido ||
                            detalle.seguimiento.entregado);

                        rows.push(
                          <tr
                            key={detalle.id}
                            className={`transition-colors ${
                              isDescartado
                                ? "bg-red-50/50 dark:bg-red-900/10 opacity-70"
                                : isGroupSubItem
                                ? "bg-indigo-50/20 dark:bg-indigo-950/10 border-l-4 border-l-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20"
                                : hasSeguimiento
                                ? "bg-green-50/70 dark:bg-green-900/30 border-l-4 border-l-green-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                            }`}
                          >
                            <td className="py-2 px-3 text-gray-500 dark:text-gray-400 font-mono">
                              {index + 1}
                            </td>
                            <td
                              className={`py-2 px-3 text-gray-800 dark:text-gray-200 font-medium ${
                                isDescartado ? "line-through text-gray-400" : ""
                              }`}
                            >
                              <div className="flex flex-wrap items-center gap-1.5">
                                {isGroupSubItem ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    ↳ Sub-ítem
                                  </span>
                                ) : isRepuesto ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    <Package size={10} />
                                    Repuesto
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    <Wrench size={10} />
                                    Servicio
                                  </span>
                                )}
                                <span>{detalle.detalle || "N/A"}</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                              {detalle.observaciones || "-"}
                            </td>
                            <td className="py-2 px-3 text-center text-gray-700 dark:text-gray-300">
                              {detalle.nivel || "-"}
                            </td>
                            <td
                              className={`py-2 px-3 text-center font-mono text-gray-700 dark:text-gray-300 ${
                                isDescartado ? "line-through text-gray-400" : ""
                              }`}
                            >
                              {detalle.cantidad}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-mono text-gray-700 dark:text-gray-300 ${
                                isDescartado ? "line-through text-gray-400" : ""
                              }`}
                            >
                              {Number(detalle.precio_unitario).toFixed(2)}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-mono font-bold ${
                                isDescartado ? "line-through text-red-400" : "text-gray-900 dark:text-white"
                              }`}
                            >
                              {Number(detalle.total).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isDescartado ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                  Rechazado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  Aprobado
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      });

                      return rows;
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-3 text-xs italic">
                No hay trabajos registrados
              </p>
            )}
          </div>

          {/* Resumen Financiero */}
          <div className="bg-gradient-to-r from-blue-50/70 to-blue-100/70 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl p-3.5 border border-blue-200/50 dark:border-gray-700">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Moneda</span>
                <span className="text-gray-900 dark:text-white font-semibold">
                  {orden.moneda?.toLowerCase() === 'bolivianos' ? 'Bolivianos (Bs)' : (orden.moneda || '$us')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Subtotal</span>
                <span className="text-gray-900 dark:text-white font-mono font-bold">
                  {Number(orden.sub_total || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Descuento</span>
                <span className="text-gray-900 dark:text-white font-mono font-bold text-amber-600 dark:text-amber-400">
                  {Number(orden.descuento || 0).toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-[11px] font-medium">Total</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                  {orden.moneda?.toLowerCase() === 'bolivianos' ? 'Bs ' : '$us '}
                  {Number(orden.total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {orden.observaciones && (
            <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">
                Observaciones:
              </span>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                {orden.observaciones}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all transform hover:-translate-y-0.5 shadow-sm hover:shadow text-xs font-semibold"
          >
            <X className="w-4 h-4" />
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewOrdenModal;
