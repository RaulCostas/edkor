import React from "react";
import type { Cotizacion, DetalleCotizacion } from "../types/cotizacion";

interface Props {
  cotizacion: Cotizacion;
}

const formatPhoneDisplay = (phone?: string | null): string => {
  if (!phone) return "-";
  const clean = phone.trim();
  if (clean.startsWith("(")) return clean;
  const KNOWN_CODES = [
    "+591", "+595", "+598", "+54", "+55", "+56", "+57", "+51", "+58", "+52", "+34", "+1"
  ];
  for (const code of KNOWN_CODES) {
    if (clean.startsWith(code)) {
      const rest = clean.slice(code.length).trim();
      return `(${code}) ${rest}`;
    }
  }
  if (/^\d{8}$/.test(clean)) return `(+591) ${clean}`;
  return clean;
};

const CotizacionPrintView: React.FC<Props> = ({ cotizacion }) => {
  const monedaSymbol = cotizacion.moneda?.toLowerCase() === "dolares" ? "$us" : "Bs";
  const detalles: DetalleCotizacion[] = cotizacion.detalles || [];
  const activeDetalles = detalles.filter(d => d.estado_trabajo !== "descartado");

  const subTotalCalc = activeDetalles.reduce((acc, d) => {
    const pUnit = Number(d.precio_unitario || 0);
    const cant = Number(d.cantidad || 1);
    return acc + (cant * pUnit);
  }, 0);

  const descuentoNum = Number(cotizacion.descuento || 0);
  const totalCalc = Math.max(0, subTotalCalc - descuentoNum);

  const tipoOrdenName =
    cotizacion.tipo_orden?.tipo_orden ||
    cotizacion.hoja_recepcion?.tipo_orden?.tipo_orden ||
    (cotizacion as any).tipo_orden ||
    "Particular";
  const isSeguro = String(tipoOrdenName).toLowerCase().includes("seguro");

  return (
    <div className="cotizacion-print bg-white text-black p-6 max-w-4xl mx-auto text-xs font-sans print:p-0 print:max-w-none print:text-[11px] leading-tight">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background: white !important;
            color: black !important;
          }
          .cotizacion-print h2 {
            text-align: left !important;
            margin-bottom: 4px !important;
          }
          .page-break-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Header */}
      <div className="relative flex justify-between items-center border-b-2 border-black pb-3 mb-3">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="EDKOR MOTORS"
            className="w-24 h-16 object-contain"
          />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-xl font-black uppercase tracking-wider text-black">
            Cotización
          </h1>
          <p className="text-[10px] text-gray-600 font-semibold uppercase">
            EDKOR MOTORS - Presupuesto de Taller
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-blue-600">
            Nro: {String(cotizacion.id).padStart(6, "0")}
          </p>
          <p className="text-xs text-gray-700 font-semibold">
            Fecha: {new Date(cotizacion.fecha_registro || Date.now()).toLocaleDateString()}
          </p>
          {isSeguro && (
            <span className="inline-block mt-0.5 text-xs font-black text-blue-600 border border-blue-600 px-1.5 py-0.2 rounded uppercase">
              SEGURO
            </span>
          )}
        </div>
      </div>

      {/* Datos del Cliente y Vehículo */}
      <div className="grid grid-cols-2 gap-4 mb-3 border border-gray-300 rounded p-2.5">
        <div>
          <h2 className="font-bold border-b border-gray-400 pb-1 mb-1.5 uppercase text-[11px] tracking-wide text-black">
            Datos del Cliente
          </h2>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
            <span className="font-bold text-gray-800">Nombre / Cliente:</span>
            <span className="font-medium text-black">{cotizacion.cliente_nombre || (cotizacion as any).cliente || "N/A"}</span>
            <span className="font-bold text-gray-800">Celular / WhatsApp:</span>
            <span className="font-mono">{formatPhoneDisplay(cotizacion.cliente_telefono || (cotizacion as any).celular)}</span>
            <span className="font-bold text-gray-800">Tipo de Orden:</span>
            <span className="font-medium text-black">{tipoOrdenName}</span>
            <span className="font-bold text-gray-800">Plazo de Entrega:</span>
            <span className="font-medium text-black">{cotizacion.plazo_entrega ? `${cotizacion.plazo_entrega} días` : "A coordinar"}</span>
            <span className="font-bold text-gray-800">Moneda:</span>
            <span className="font-medium text-black">{cotizacion.moneda || "Bolivianos"}</span>
          </div>
        </div>

        <div>
          <h2 className="font-bold border-b border-gray-400 pb-1 mb-1.5 uppercase text-[11px] tracking-wide text-black">
            Datos del Vehículo
          </h2>
          <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-1 text-xs">
            <span className="font-bold text-gray-800">Marca:</span>
            <span className="font-medium text-black">{cotizacion.marca_auto?.marca || cotizacion.vehiculo_marca || "N/A"}</span>
            <span className="font-bold text-gray-800">Placa:</span>
            <span className="font-bold font-mono text-black uppercase bg-gray-100 px-1.5 py-0.5 rounded border border-gray-400 inline-block text-center">
              {(cotizacion.vehiculo_placa || (cotizacion as any).placa || "S/P").toUpperCase()}
            </span>
            <span className="font-bold text-gray-800">Modelo:</span>
            <span>{cotizacion.vehiculo_modelo || (cotizacion as any).modelo || "N/A"}</span>
            <span className="font-bold text-gray-800">Color:</span>
            <span>{cotizacion.vehiculo_color || (cotizacion as any).color || "N/A"}</span>
            <span className="font-bold text-gray-800">Kilometraje:</span>
            <span>{cotizacion.vehiculo_kilometraje ?? "N/A"}</span>
            <span className="font-bold text-gray-800">Chasis / VIN:</span>
            <span>{cotizacion.vehiculo_chasis || (cotizacion as any).chasis || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Tabla de Trabajos a Realizar */}
      <div className="mb-3 border border-gray-300 rounded overflow-hidden">
        <h2 className="font-bold bg-gray-100 border-b border-gray-400 px-2.5 py-1.5 uppercase text-[11px] tracking-wide text-black">
          Trabajos a Realizar / Servicios y Repuestos Cotizados
        </h2>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-300 text-[10px] uppercase font-bold text-gray-700">
              <th className="p-2 border-r border-gray-200 w-8 text-center">#</th>
              <th className="p-2 border-r border-gray-200 w-28">Categoría</th>
              <th className="p-2 border-r border-gray-200">Detalle del Trabajo / Ítem</th>
              <th className="p-2 border-r border-gray-200 text-center w-12">Cant.</th>
              <th className="p-2 border-r border-gray-200 text-right w-20">P. Unit</th>
              <th className="p-2 text-right w-24">Sub Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {activeDetalles.length > 0 ? (
              activeDetalles.map((d: any, idx: number) => {
                const isRepuesto = !!(d.id_inventario || d.inventario);
                const categoria = isRepuesto
                  ? "REPUESTO"
                  : (d.precio_taller?.categoria?.categoria_servicio || d.precio_seguro?.categoria?.categoria_servicio || "SERVICIO");
                const detalleNombre = d.detalle || d.precio_taller?.detalle || d.precio_seguro?.detalle || d.inventario?.descripcion || "Sin detalle";
                const pUnit = Number(d.precio_unitario || 0).toFixed(2);
                const totalItem = Number(d.total || (Number(d.cantidad || 1) * Number(d.precio_unitario || 0))).toFixed(2);

                return (
                  <tr key={d.id || idx} className="hover:bg-gray-50/50">
                    <td className="p-2 border-r border-gray-200 text-center font-mono text-[11px] text-gray-500">{idx + 1}</td>
                    <td className="p-2 border-r border-gray-200 font-semibold text-[10px] uppercase text-gray-700">{categoria}</td>
                    <td className="p-2 border-r border-gray-200 font-medium text-black">{detalleNombre}</td>
                    <td className="p-2 border-r border-gray-200 text-center font-medium">{d.cantidad}</td>
                    <td className="p-2 border-r border-gray-200 text-right font-mono">{pUnit}</td>
                    <td className="p-2 text-right font-mono font-bold">{totalItem}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500 italic">
                  No se registraron trabajos específicos en esta cotización.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Observaciones y Resumen Económico */}
      <div className="grid grid-cols-[1fr_260px] gap-4 mb-4 items-start">
        <div className="border border-gray-300 rounded p-2.5 bg-white min-h-[5rem]">
          <h2 className="font-bold border-b border-gray-400 pb-1 mb-1.5 uppercase text-[11px] tracking-wide text-black">
            Observaciones
          </h2>
          <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
            {cotizacion.observaciones || "Sin observaciones registradas."}
          </p>
        </div>

        <div className="border border-gray-300 rounded p-2.5 bg-gray-50/50 text-xs">
          <div className="flex justify-between py-0.5 text-gray-700">
            <span>Subtotal:</span>
            <span className="font-mono font-semibold">
              {monedaSymbol} {subTotalCalc.toFixed(2)}
            </span>
          </div>
          {descuentoNum > 0 && (
            <div className="flex justify-between py-0.5 text-red-600">
              <span>Descuento:</span>
              <span className="font-mono font-semibold">- {monedaSymbol} {descuentoNum.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between pt-1.5 mt-1 border-t-2 border-black font-black text-sm text-black">
            <span>TOTAL:</span>
            <span className="font-mono">{monedaSymbol} {totalCalc.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Nota Legal / Disclaimer */}
      <div className="mb-4 text-[9px] text-gray-600 italic border-t border-gray-300 pt-2 leading-relaxed">
        * Nota: La presente cotización tiene una validez de 15 días hábiles a partir de la fecha de emisión. En caso de detectarse anomalías o averías adicionales durante el desmontaje o ejecución de los trabajos, las mismas serán comunicadas previamente para su aprobación. Los repuestos corren por cuenta del cliente.
      </div>

      {/* Firmas */}
      <div className="grid grid-cols-2 gap-8 mt-10 pt-4 border-t-2 border-gray-300 page-break-avoid">
        <div className="text-center flex flex-col items-center justify-end min-h-[4.5rem]">
          <div className="border-t-2 border-black w-48 pt-1.5">
            <p className="font-black text-xs uppercase tracking-wider text-black">
              Firma del Cliente
            </p>
            <p className="text-[10px] text-gray-600 font-medium">Aceptación y Conformidad</p>
          </div>
        </div>
        <div className="text-center flex flex-col items-center justify-end min-h-[4.5rem]">
          <div className="border-t-2 border-black w-48 pt-1.5">
            <p className="font-black text-xs uppercase tracking-wider text-black">
              Firma del Taller / Responsable
            </p>
            <p className="text-[10px] text-gray-600 font-medium">EDKOR MOTORS</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CotizacionPrintView;
