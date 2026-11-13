import React from "react";

export interface AltaRecepcionData {
  nro?: number | string;
  fecha?: string;
  tipo_orden?: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
  cliente_fecha_nacimiento?: string;
  asesor_nombre?: string;
  asesor_celular?: string;
  vehiculo_marca?: string;
  vehiculo_modelo?: string;
  vehiculo_placa?: string;
  vehiculo_color?: string;
  vehiculo_kilometraje?: string | number;
  vehiculo_chasis?: string;
  trabajos_solicitados?: string;
  observaciones?: string;
}

interface Props {
  data: AltaRecepcionData;
}

const formatPhoneDisplay = (phone?: string): string => {
  if (!phone) return "N/A";
  const clean = phone.trim();
  if (!clean) return "N/A";
  if (clean.startsWith("(")) return clean;
  const KNOWN_CODES = [
    "+591", "+595", "+598", "+54", "+55", "+56", "+57", "+51", "+58", "+52", "+34", "+1"
  ];
  for (const code of KNOWN_CODES) {
    if (clean.startsWith(code)) {
      const rest = clean.slice(code.length).trim().replace(/^[\s-]+/, "");
      return `(${code}) ${rest}`;
    }
  }
  for (const code of KNOWN_CODES) {
    const rawCode = code.replace("+", "");
    if (clean.startsWith(rawCode) && clean.length > rawCode.length + 4) {
      const rest = clean.slice(rawCode.length).trim().replace(/^[\s-]+/, "");
      return `(${code}) ${rest}`;
    }
  }
  const onlyDigits = clean.replace(/[^0-9]/g, "");
  if (onlyDigits.length === 8 || onlyDigits.length === 7) {
    return `(+591) ${onlyDigits}`;
  }
  return clean;
};

const AltaRecepcionPrintView: React.FC<Props> = ({ data }) => {
  const diagnosticLines = Array.from({ length: 10 });
  const repuestosRows = Array.from({ length: 10 });

  return (
    <div className="alta-recepcion-print bg-white text-black p-6 max-w-4xl mx-auto text-xs font-sans print:p-0 print:max-w-none print:text-[11px] leading-tight">
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
          .alta-recepcion-print h2 {
            text-align: left !important;
            margin-bottom: 4px !important;
            font-size: 11px !important;
          }
          .alta-recepcion-print th,
          .alta-recepcion-print td {
            padding: 3px 6px !important;
          }
          .page-break-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Header */}
      <div className="relative flex justify-between items-center border-b-2 border-black pb-2 mb-2.5">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="EDKOR MOTORS"
            className="w-24 h-14 object-contain"
          />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-xl font-black uppercase tracking-wider text-black">
            ORDEN DE TRABAJO
          </h1>
          <p className="text-[10px] text-gray-600 font-semibold uppercase">
            EDKOR MOTORS - Orden de Diagnóstico y Repuestos
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-red-600">
            Nro: {String(data.nro || "0").padStart(6, "0")}
          </p>
          <p className="text-xs text-gray-700 font-semibold">
            Fecha:{" "}
            {data.fecha
              ? new Date(data.fecha).toLocaleDateString()
              : new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Datos del Propietario y Datos del Vehículo */}
      <div className="grid grid-cols-2 gap-4 mb-2.5 border border-gray-400 rounded p-2.5">
        <div>
          <h2 className="font-bold border-b border-gray-400 pb-1 mb-1.5 uppercase text-[11px] tracking-wide text-black">
            Datos del Propietario
          </h2>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
            {data.tipo_orden && (
              <>
                <span className="font-bold text-gray-800">Tipo de Orden:</span>
                <span className="font-semibold text-black">{data.tipo_orden}</span>
              </>
            )}
            <span className="font-bold text-gray-800">Nombre:</span>
            <span className="font-medium text-black">
              {data.cliente_nombre || "N/A"}
            </span>
            <span className="font-bold text-gray-800">Celular / WhatsApp:</span>
            <span className="font-mono">{formatPhoneDisplay(data.cliente_telefono)}</span>
            {data.cliente_fecha_nacimiento && (
              <>
                <span className="font-bold text-gray-800">F. Nacimiento:</span>
                <span>{data.cliente_fecha_nacimiento}</span>
              </>
            )}
            {data.asesor_nombre && (
              <>
                <span className="font-bold text-gray-800">Asesor Técnico:</span>
                <span>{data.asesor_nombre}</span>
              </>
            )}
            {data.asesor_celular && (
              <>
                <span className="font-bold text-gray-800">Cel. Asesor:</span>
                <span className="font-mono">{data.asesor_celular}</span>
              </>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-bold border-b border-gray-400 pb-1 mb-1.5 uppercase text-[11px] tracking-wide text-black">
            Datos del Vehículo
          </h2>
          <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-x-3 gap-y-1 text-xs">
            <span className="font-bold text-gray-800">Marca:</span>
            <span className="font-medium text-black">
              {data.vehiculo_marca || "N/A"}
            </span>
            <span className="font-bold text-gray-800">Placa:</span>
            <span className="font-bold font-mono text-black">
              {data.vehiculo_placa || "N/A"}
            </span>
            <span className="font-bold text-gray-800">Modelo:</span>
            <span>{data.vehiculo_modelo || "N/A"}</span>
            <span className="font-bold text-gray-800">Color:</span>
            <span>{data.vehiculo_color || "N/A"}</span>
            <span className="font-bold text-gray-800">Kilometraje:</span>
            <span>{data.vehiculo_kilometraje || "N/A"}</span>
            <span className="font-bold text-gray-800">Chasis:</span>
            <span>{data.vehiculo_chasis || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Trabajos a Realizar / Solicitud del Cliente */}
      <div className="mb-2.5 border border-gray-400 rounded p-2.5">
        <h2 className="font-bold border-b border-gray-400 pb-1 mb-1.5 uppercase text-[11px] tracking-wide text-black">
          Trabajos a Realizar / Solicitud del Cliente
        </h2>
        <p className="min-h-[30px] text-xs whitespace-pre-wrap leading-relaxed text-black">
          {data.trabajos_solicitados || data.observaciones || "Ninguno especificado"}
        </p>
        {data.trabajos_solicitados && data.observaciones && (
          <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-300 text-[11px] text-gray-800">
            <span className="font-bold">Observaciones de Recepción: </span>
            {data.observaciones}
          </div>
        )}
      </div>

      {/* Recuadro 1: Diagnóstico del Mecánico (A pulso) */}
      <div className="mb-2.5 border-2 border-black rounded p-2.5 page-break-avoid">
        <div className="flex flex-wrap items-center justify-between border-b-2 border-black pb-1 mb-1.5 gap-2">
          <h2 className="font-black uppercase text-xs tracking-wide text-black !mb-0">
            Diagnóstico del Mecánico / Trabajos Adicionales a Realizar
          </h2>
          <div className="flex items-center gap-4 text-[11px] font-bold text-black">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 border-2 border-black"></span>
              Solo lo solicitado por el cliente
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3.5 h-3.5 border-2 border-black"></span>
              Trabajos adicionales (detallar abajo)
            </span>
          </div>
        </div>
        <p className="text-[10px] text-gray-600 italic mb-1">
          Complete a pulso el diagnóstico técnico indicando si requiere trabajos adicionales o únicamente lo solicitado por el cliente:
        </p>
        <div className="space-y-0">
          {diagnosticLines.map((_, idx) => (
            <div
              key={idx}
              className="h-7.5 print:h-7 border-b border-gray-400 flex items-end pb-1 text-[11px] text-gray-500 font-medium"
            >
              {idx + 1}.
            </div>
          ))}
        </div>
      </div>

      {/* Recuadro 2: Repuestos que se solicita cambiar (A pulso) */}
      <div className="mb-2 border-2 border-black rounded p-2.5 page-break-avoid">
        <div className="border-b-2 border-black pb-1 mb-1.5">
          <h2 className="font-black uppercase text-xs tracking-wide text-black !mb-0">
            Repuestos que se Solicita Cambiar
          </h2>
          <p className="text-[10px] text-gray-600 italic mt-0.5">
            Anote a pulso los repuestos, piezas o insumos que deben ser reemplazados:
          </p>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black py-1 px-2 w-10 text-center font-bold uppercase text-[10px]">
                N°
              </th>
              <th className="border border-black py-1 px-2 w-20 text-center font-bold uppercase text-[10px]">
                Cantidad
              </th>
              <th className="border border-black py-1 px-2 text-left font-bold uppercase text-[10px]">
                Descripción del Repuesto / Pieza a Cambiar
              </th>
              <th className="border border-black py-1 px-2 w-44 text-left font-bold uppercase text-[10px]">
                Observación / Muestra
              </th>
            </tr>
          </thead>
          <tbody>
            {repuestosRows.map((_, idx) => (
              <tr key={idx} className="h-6 print:h-5.5">
                <td className="border border-black px-2 text-center text-[10px] text-gray-500 font-medium">
                  {idx + 1}
                </td>
                <td className="border border-black px-2"></td>
                <td className="border border-black px-2"></td>
                <td className="border border-black px-2"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AltaRecepcionPrintView;
