import { useEffect, useState } from "react";
import {
  X,
  TrendingUp,
  Wrench,
  Package,
  DollarSign,
  User,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  getUtilidadOrdenTrabajo,
  type UtilidadOrdenResponse,
} from "../services/ordenTrabajoService";

interface UtilidadOrdenModalProps {
  ordenId: number | null;
  onClose: () => void;
}

const UtilidadOrdenModal = ({ ordenId, onClose }: UtilidadOrdenModalProps) => {
  const [data, setData] = useState<UtilidadOrdenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ordenId) return;
    const fetchUtilidad = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getUtilidadOrdenTrabajo(ordenId);
        setData(res);
      } catch (err) {
        console.error("Error cargando utilidad de la orden:", err);
        setError("No se pudo calcular la utilidad de esta orden de trabajo.");
      } finally {
        setLoading(false);
      }
    };
    fetchUtilidad();
  }, [ordenId]);

  if (!ordenId) return null;

  const sym =
    data?.orden?.moneda?.toLowerCase() === "bolivianos" || !data?.orden?.moneda
      ? "Bs."
      : "$us";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-3 sm:p-4 print:hidden">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-5 py-3.5 flex items-center justify-between z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white">
                  Rentabilidad
                </span>
                <h2 className="text-lg sm:text-xl font-bold">
                  Utilidad Neta — Orden #{data?.orden?.nro_orden || ordenId}
                </h2>
              </div>
              {data?.orden && (
                <p className="text-emerald-100 text-xs mt-0.5 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <User size={12} /> {data.orden.cliente}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono font-semibold">
                    <Car size={12} /> {data.orden.placa} ({data.orden.vehiculo})
                  </span>
                  {data.orden.asesor && (
                    <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[11px] font-medium">
                      Asesor: {data.orden.asesor}
                    </span>
                  )}
                  <span>
                    Fecha:{" "}
                    {new Date(data.orden.fecha_registro).toLocaleDateString()}
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white/20 hover:bg-red-500 text-white rounded-lg transition-all transform hover:-translate-y-0.5 shadow-sm"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">
                Calculando ingresos, pagos a mecánicos y costos de repuestos...
              </p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center text-red-600 dark:text-red-400 flex flex-col items-center gap-2">
              <AlertCircle size={28} />
              <p className="font-semibold text-sm">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* KPI Summary Cards */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${Boolean(data.resumen.costo_terceros && data.resumen.costo_terceros > 0) ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3.5`}>
                {/* 1. Total Cobrado al Cliente */}
                <div className="bg-blue-50/70 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      Ingreso Orden (Cliente)
                    </span>
                    <DollarSign size={16} />
                  </div>
                  <div className="text-xl font-extrabold text-gray-900 dark:text-white font-mono">
                    {sym} {data.resumen.ingreso_neto_orden.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                    <span>Subtotal: {sym} {data.resumen.sub_total.toFixed(2)}</span>
                    {data.resumen.descuento > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        Desc: -{sym} {data.resumen.descuento.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Pago a Mecánicos */}
                <div className="bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      Pago a Mecánicos
                    </span>
                    <Wrench size={16} />
                  </div>
                  <div className="text-xl font-extrabold text-amber-700 dark:text-amber-300 font-mono">
                    {sym} {data.resumen.costo_mecanicos.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      Pagado: {sym} {data.resumen.costo_mecanicos_pagado.toFixed(2)}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      Pend.: {sym} {data.resumen.costo_mecanicos_pendiente.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 3. Costo Compra Repuestos */}
                <div className="bg-purple-50/70 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wide">
                      Costo Compra Repuestos
                    </span>
                    <Package size={16} />
                  </div>
                  <div className="text-xl font-extrabold text-purple-700 dark:text-purple-300 font-mono">
                    {sym} {data.resumen.costo_repuestos.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Precio venta repuestos: {sym}{" "}
                    {data.resumen.ingreso_repuestos.toFixed(2)}
                  </div>
                </div>

                {/* 3.1 Costo Trabajos de Terceros */}
                {Boolean(data.resumen.costo_terceros && data.resumen.costo_terceros > 0) && (
                  <div className="bg-indigo-50/70 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3.5">
                    <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
                      <span className="text-xs font-bold uppercase tracking-wide">
                        Trabajos de Terceros
                      </span>
                      <ExternalLink size={16} />
                    </div>
                    <div className="text-xl font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">
                      {sym} {data.resumen.costo_terceros?.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Costo externo (torno, alineado, etc.)
                    </div>
                  </div>
                )}

                {/* 4. Utilidad Neta */}
                <div
                  className={`rounded-xl p-3.5 border ${
                    data.resumen.utilidad_neta >= 0
                      ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700"
                      : "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between mb-1 ${
                      data.resumen.utilidad_neta >= 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    <span className="text-xs font-bold uppercase tracking-wide">
                      Utilidad Neta Real
                    </span>
                    <TrendingUp size={16} />
                  </div>
                  <div
                    className={`text-xl font-extrabold font-mono ${
                      data.resumen.utilidad_neta >= 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {sym} {data.resumen.utilidad_neta.toFixed(2)}
                  </div>
                  <div className="text-[11px] mt-1 flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">
                      Margen de ganancia:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold ${
                        data.resumen.utilidad_neta >= 0
                          ? "bg-emerald-200/80 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200"
                          : "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                      }`}
                    >
                      {data.resumen.margen_porcentaje}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Sección 1: Trabajos / Mano de Obra y Pago al Mecánico */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3.5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Wrench size={16} className="text-amber-600 dark:text-amber-400" />
                    1. Mano de Obra / Servicios y Pago al Mecánico (
                    {data.servicios.length})
                  </h3>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Utilidad Mano de Obra:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {sym}{" "}
                      {(
                        data.resumen.ingreso_servicios -
                        data.servicios.reduce((a, s) => a + s.costo_mecanico, 0)
                      ).toFixed(2)}
                    </strong>
                  </span>
                </div>

                {data.servicios.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold">
                          <th className="text-left py-2 px-3 w-8">#</th>
                          <th className="text-left py-2 px-3">Trabajo / Servicio</th>
                          <th className="text-left py-2 px-3">Mecánico</th>
                          <th className="text-center py-2 px-3">Hrs × Precio/Hr</th>
                          <th className="text-right py-2 px-3">Cobrado Cliente</th>
                          <th className="text-right py-2 px-3 text-amber-700 dark:text-amber-300">
                            Pago Mecánico / Costo Directo
                          </th>
                          <th className="text-center py-2 px-3">Estado Pago</th>
                          <th className="text-right py-2 px-3 text-emerald-700 dark:text-emerald-300">
                            Utilidad
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800/60">
                        {data.servicios.map((srv, idx) => (
                          <tr
                            key={srv.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/40 align-top"
                          >
                            <td className="py-2 px-3 font-mono text-gray-500">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-medium text-gray-800 dark:text-gray-200">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{srv.detalle}</span>
                                {srv.es_tercero && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                    <ExternalLink size={10} /> Terceros
                                  </span>
                                )}
                                {srv.es_grupo && srv.sub_items && srv.sub_items.length > 0 && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                    Grupo ({srv.sub_items.length} ítems)
                                  </span>
                                )}
                                {!srv.es_grupo && srv.cantidad > 1 && (
                                  <span className="text-[11px] text-gray-500 font-mono">
                                    (x{srv.cantidad})
                                  </span>
                                )}
                              </div>
                              {srv.es_grupo && srv.sub_items && srv.sub_items.length > 0 && (
                                <div className="mt-1.5 pl-2.5 border-l-2 border-indigo-200 dark:border-indigo-700 space-y-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                                  {srv.sub_items.map((sub) => (
                                    <div
                                      key={sub.id}
                                      className="flex items-center justify-between gap-3 max-w-xs"
                                    >
                                      <span className="truncate">• {sub.detalle}</span>
                                      <span className="font-mono font-semibold text-gray-700 dark:text-gray-300 shrink-0">
                                        {sym} {sub.ingreso_total.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                              {srv.es_tercero ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400">
                                  Trabajo Externo / Tercero
                                </span>
                              ) : srv.tiene_mecanico ? (
                                <span className="font-medium">{srv.mecanico}</span>
                              ) : (
                                <span className="italic text-gray-400">
                                  Sin mecánico asignado
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-mono text-gray-600 dark:text-gray-400">
                              {srv.es_tercero ? (
                                <span className="text-gray-400 italic">Externo</span>
                              ) : (srv.tiempo_estimado > 0 || srv.precio_hora > 0) ? (
                                <div className="flex flex-col items-center">
                                  <span>
                                    {srv.tiempo_estimado}h × {srv.precio_hora.toFixed(2)}
                                  </span>
                                  {srv.es_grupo && (
                                    <span className="text-[10px] font-sans font-semibold text-indigo-600 dark:text-indigo-400">
                                      (Global grupo)
                                    </span>
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                              {sym} {srv.ingreso_total.toFixed(2)}
                            </td>
                            <td className={`py-2 px-3 text-right font-mono font-semibold ${srv.es_tercero ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {sym} {(srv.costo_tercero || srv.costo_mecanico || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {srv.es_tercero ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                  Costo Tercero
                                </span>
                              ) : srv.costo_mecanico <= 0 ? (
                                <span className="text-gray-400 text-[10px]">-</span>
                              ) : srv.mecanico_pagado ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                  <CheckCircle2 size={11} /> Pagado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                  <Clock size={11} /> Pendiente
                                </span>
                              )}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-mono font-bold ${
                                srv.utilidad >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-500"
                              }`}
                            >
                              {sym} {srv.utilidad.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic py-2 text-center">
                    No hay servicios de mano de obra registrados en esta orden.
                  </p>
                )}
              </div>

              {/* Sección 2: Repuestos / Materiales Utilizados */}
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3.5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Package
                      size={16}
                      className="text-purple-600 dark:text-purple-400"
                    />
                    2. Repuestos e Insumos Utilizados ({data.repuestos.length})
                  </h3>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Utilidad en Repuestos:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                      {sym}{" "}
                      {(
                        data.resumen.ingreso_repuestos -
                        data.resumen.costo_repuestos
                      ).toFixed(2)}
                    </strong>
                  </span>
                </div>

                {data.repuestos.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold">
                          <th className="text-left py-2 px-3 w-8">#</th>
                          <th className="text-left py-2 px-3">Repuesto / Material</th>
                          <th className="text-center py-2 px-3">Cant.</th>
                          <th className="text-right py-2 px-3 text-purple-700 dark:text-purple-300">
                            P. Compra Unit.
                          </th>
                          <th className="text-right py-2 px-3 text-purple-700 dark:text-purple-300">
                            Costo Compra Total
                          </th>
                          <th className="text-right py-2 px-3">P. Venta Unit.</th>
                          <th className="text-right py-2 px-3">Venta Cliente</th>
                          <th className="text-right py-2 px-3 text-emerald-700 dark:text-emerald-300">
                            Utilidad Repuesto
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800/60">
                        {data.repuestos.map((rep, idx) => (
                          <tr
                            key={rep.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/40"
                          >
                            <td className="py-2 px-3 font-mono text-gray-500">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-medium text-gray-800 dark:text-gray-200">
                              <div>
                                {rep.codigo && (
                                  <span className="font-mono text-[11px] text-purple-600 dark:text-purple-400 mr-1">
                                    [{rep.codigo}]
                                  </span>
                                )}
                                {rep.detalle}
                              </div>
                              {rep.lotes && rep.lotes.length > 0 && (
                                <div className="text-[10px] text-gray-400 font-mono">
                                  Lote: {rep.lotes.join(", ")}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-semibold text-gray-700 dark:text-gray-300">
                              {rep.cantidad}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-purple-600 dark:text-purple-400">
                              {sym} {rep.costo_compra_unitario.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-purple-700 dark:text-purple-300">
                              {sym} {rep.costo_compra_total.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-gray-700 dark:text-gray-300">
                              {sym} {rep.precio_venta_unitario.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-gray-900 dark:text-white">
                              {sym} {rep.ingreso_total.toFixed(2)}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-mono font-bold ${
                                rep.utilidad >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-500"
                              }`}
                            >
                              {sym} {rep.utilidad.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic py-2 text-center">
                    No se utilizaron repuestos de inventario en esta orden.
                  </p>
                )}
              </div>

              {/* Resumen Final de Liquidación */}
              <div className="bg-gradient-to-r from-gray-50 to-emerald-50/40 dark:from-gray-700/50 dark:to-emerald-900/10 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  Balance Final de la Orden de Trabajo
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>(+) Ingreso por Mano de Obra / Servicios:</span>
                      <span className="font-mono font-semibold">
                        {sym} {data.resumen.ingreso_servicios.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>(+) Ingreso por Venta de Repuestos:</span>
                      <span className="font-mono font-semibold">
                        {sym} {data.resumen.ingreso_repuestos.toFixed(2)}
                      </span>
                    </div>
                    {data.resumen.descuento > 0 && (
                      <div className="flex justify-between text-amber-600 dark:text-amber-400">
                        <span>(-) Descuento otorgado al cliente:</span>
                        <span className="font-mono font-semibold">
                          {sym} {data.resumen.descuento.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-600 pt-1.5">
                      <span>(=) Total Orden Cobrado al Cliente:</span>
                      <span className="font-mono">
                        {sym} {data.resumen.ingreso_neto_orden.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-amber-700 dark:text-amber-300">
                      <span>(-) Pago Total a Mecánicos:</span>
                      <span className="font-mono font-semibold">
                        {sym} {data.resumen.costo_mecanicos.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-purple-700 dark:text-purple-300">
                      <span>(-) Costo de Compra de Repuestos:</span>
                      <span className="font-mono font-semibold">
                        {sym} {data.resumen.costo_repuestos.toFixed(2)}
                      </span>
                    </div>
                    {data.resumen.comisiones_tarjeta > 0 && (
                      <div className="flex justify-between text-rose-600 dark:text-rose-400">
                        <span className="flex items-center gap-1">
                          <CreditCard size={12} /> (-) Comisión Bancaria Tarjeta:
                        </span>
                        <span className="font-mono font-semibold">
                          {sym} {data.resumen.comisiones_tarjeta.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex justify-between text-sm font-extrabold border-t border-gray-300 dark:border-gray-600 pt-1.5 ${
                        data.resumen.utilidad_neta >= 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      <span>(=) UTILIDAD NETA DEL TRABAJO:</span>
                      <span className="font-mono">
                        {sym} {data.resumen.utilidad_neta.toFixed(2)} (
                        {data.resumen.margen_porcentaje}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-gray-800/90 px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all transform hover:-translate-y-0.5"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UtilidadOrdenModal;
