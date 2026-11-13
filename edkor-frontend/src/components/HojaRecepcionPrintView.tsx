import React, { useEffect, useRef } from "react";
import type { HojaRecepcion } from "../services/hojaRecepcionService";
import { drawFourDoorVehicleBlueprint } from "./VehicleDiagramCanvas";

interface Props {
  hoja: HojaRecepcion;
}

const getAsesorPhone = (asesor?: any): string => {
  if (!asesor) return "";
  const cel = (asesor.celular || "").trim();
  const tel = (asesor.telefono || "").trim();
  const celDigits = cel.replace(/[^0-9]/g, "");
  const telDigits = tel.replace(/[^0-9]/g, "");

  // Si celular solo contiene el código '591' o está vacío, y teléfono tiene el número
  if ((celDigits === "591" || celDigits.length <= 4) && telDigits.length >= 7) {
    return tel;
  }
  if (celDigits.length >= 7) {
    return cel;
  }
  if (telDigits.length >= 7) {
    return tel;
  }
  return cel || tel || "";
};

const formatPhoneDisplay = (phone?: string): string => {
  if (!phone) return "";
  const clean = phone.trim();
  if (!clean) return "";
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

const ChecklistCheckbox: React.FC<{ checked?: boolean }> = ({ checked }) => (
  <div className="w-3.5 h-3.5 border border-black flex items-center justify-center flex-shrink-0 p-[1.5px] bg-white">
    {checked && (
      <svg
        viewBox="0 0 10 10"
        className="w-full h-full text-black stroke-current"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
        <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
      </svg>
    )}
  </div>
);

const HojaRecepcionPrintView: React.FC<Props> = ({ hoja }) => {
  const EXTERIOR_ITEMS = [
    "Faros delanteros",
    "Stop",
    "Antena",
    "Limpia parabrisas",
    "Espejos",
    "Vidrios",
    "Tapa",
    "Aros",
    "Dado de seguridad",
    "Tapa tanque",
    "Placa",
    "Salpicaderas",
    "Tapa cubos",
    "Emblemas",
    "Mando A/C",
    "Radio",
    "Encendedor",
    "Retrovisor",
    "Cinturones",
    "Pisos",
    "Bocina",
    "Jalador de puertas",
    "Palanca de cambios",
  ];

  const ACCESORIOS_ITEMS = [
    "Gata",
    "Llave de ruedas",
    "Herramientas",
    "Triangulo",
    "Rueda de auxilio",
    "Extintor",
    "Botiquin",
  ];

  const COMBUSTIBLE_LEVELS = ["E", "1/4", "1/2", "3/4", "F"];
  const fallbackCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!hoja.diagrama_vehiculo && fallbackCanvasRef.current) {
      const ctx = fallbackCanvasRef.current.getContext("2d");
      if (ctx) {
        drawFourDoorVehicleBlueprint(ctx);
      }
    }
  }, [hoja.diagrama_vehiculo]);

  return (
    <div className="hoja-recepcion-print bg-white text-black p-6 max-w-4xl mx-auto text-xs font-sans print:p-0 print:max-w-none print:text-[11px] leading-tight">
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
          .hoja-recepcion-print h2 {
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
            Hoja de Recepción
          </h1>
          <p className="text-[10px] text-gray-600 font-semibold uppercase">
            EDKOR MOTORS - Control de Taller
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-red-600">
            Nro: {String(hoja.nro).padStart(6, "0")}
          </p>
          <p className="text-xs text-gray-700 font-semibold">
            Fecha: {new Date(hoja.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Datos */}
      <div className="grid grid-cols-2 gap-4 mb-3 border border-gray-300 rounded p-2.5">
        <div>
          <h2 className="font-bold border-b border-gray-400 pb-1 mb-1.5 uppercase text-[11px] tracking-wide text-black">
            Datos del Propietario
          </h2>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
            {hoja.tipo_orden && (
              <>
                <span className="font-bold text-gray-800">Tipo de Orden:</span>
                <span className="font-medium text-black">{hoja.tipo_orden.tipo_orden}</span>
              </>
            )}
            <span className="font-bold text-gray-800">Nombre:</span>
            <span className="font-medium text-black">{hoja.cliente_nombre}</span>
            <span className="font-bold text-gray-800">Celular / WhatsApp:</span>
            <span className="font-mono">
              {formatPhoneDisplay(hoja.cliente_telefono) || "N/A"}
            </span>
            {hoja.cliente_fecha_nacimiento && (
              <>
                <span className="font-bold text-gray-800">F. Nacimiento:</span>
                <span>{hoja.cliente_fecha_nacimiento}</span>
              </>
            )}
            <span className="font-bold text-gray-800">Asesor:</span>
            <span>
              {hoja.asesor
                ? `${hoja.asesor.nombre} ${hoja.asesor.paterno || ""}`.trim()
                : "N/A"}
            </span>
            <span className="font-bold text-gray-800">Cel. Asesor:</span>
            <span className="font-mono">
              {hoja.asesor
                ? formatPhoneDisplay(getAsesorPhone(hoja.asesor)) || "N/A"
                : "N/A"}
            </span>
            {hoja.jefe_mecanico && (
              <>
                <span className="font-bold text-gray-800">Jefe Mecánicos:</span>
                <span>{`${hoja.jefe_mecanico.nombre} ${hoja.jefe_mecanico.paterno}`}</span>
              </>
            )}
            {hoja.mecanico && (
              <>
                <span className="font-bold text-gray-800">Mecánico Diag.:</span>
                <span>{`${hoja.mecanico.nombre} ${hoja.mecanico.paterno}`}</span>
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
            <span className="font-medium text-black">{hoja.vehiculo_marca}</span>
            <span className="font-bold text-gray-800">Placa:</span>
            <span className="font-bold font-mono text-black uppercase">{hoja.vehiculo_placa?.toUpperCase()}</span>
            <span className="font-bold text-gray-800">Modelo:</span>
            <span>{hoja.vehiculo_modelo || "N/A"}</span>
            <span className="font-bold text-gray-800">Color:</span>
            <span>{hoja.vehiculo_color || "N/A"}</span>
            <span className="font-bold text-gray-800">Kilometraje:</span>
            <span>{hoja.vehiculo_kilometraje || "N/A"}</span>
            <span className="font-bold text-gray-800">Chasis:</span>
            <span>{hoja.vehiculo_chasis || "N/A"}</span>
          </div>
        </div>
      </div>

      {/* Checklists & Diagrama del Vehículo */}
      <div className="grid grid-cols-12 gap-3 mb-3 border border-gray-300 rounded p-2.5">
        {/* Diagrama 4 puertas */}
        <div className="col-span-5 flex flex-col">
          <h2 className="font-bold border-b border-gray-400 pb-1 mb-1.5 uppercase text-[11px] tracking-wide text-black">
            Recepción del Vehículo (4 Puertas)
          </h2>
          <div className="flex-1 flex items-center justify-center border border-gray-200 rounded p-1 bg-white">
            {hoja.diagrama_vehiculo ? (
              <img
                src={hoja.diagrama_vehiculo}
                alt="Diagrama del Vehículo"
                className="w-full h-auto max-h-[210px] object-contain"
              />
            ) : (
              <canvas
                ref={fallbackCanvasRef}
                width={520}
                height={440}
                className="w-full h-auto max-h-[210px] object-contain"
              />
            )}
          </div>
        </div>

        {/* Exterior / Interior */}
        <div className="col-span-4">
          <h2 className="font-bold border-b border-gray-400 pb-1 mb-1.5 uppercase text-[11px] tracking-wide text-black">
            Exterior / Interior
          </h2>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px]">
            {EXTERIOR_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-1.5 min-h-[16px]">
                <ChecklistCheckbox checked={!!hoja.checklist_exterior_interior?.[item]} />
                <span className="text-[9.5px] leading-normal whitespace-nowrap text-black">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Accesorios y Combustible */}
        <div className="col-span-3 flex flex-col justify-between">
          <div>
            <h2 className="font-bold border-b border-gray-400 pb-1 mb-1.5 uppercase text-[11px] tracking-wide text-black">
              Accesorios
            </h2>
            <div className="grid grid-cols-1 gap-y-1 text-[10px] mb-2">
              {ACCESORIOS_ITEMS.map((item) => (
                <div key={item} className="flex items-center gap-1.5 min-h-[16px]">
                  <ChecklistCheckbox checked={!!hoja.checklist_accesorios?.[item]} />
                  <span className="text-[9.5px] leading-normal text-black">{item}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 mt-1 min-h-[16px]">
                <ChecklistCheckbox checked={!!hoja.checklist_accesorios?.["Otros"]} />
                <span className="text-[9.5px] leading-normal text-black">Otros: {hoja.accesorios_otros || "Ninguno"}</span>
              </div>
            </div>
          </div>

          {/* NIVEL DE COMBUSTIBLE */}
          <div className="pt-2 border-t border-gray-300 mt-2">
            <h3 className="font-bold mb-1.5 text-[10px] uppercase text-black">
              Nivel de Combustible:
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              {COMBUSTIBLE_LEVELS.map((level) => {
                const isSelected =
                  String(hoja.nivel_combustible || "").trim().toUpperCase() ===
                  level.toUpperCase();
                return (
                  <div key={level} className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16">
                      <circle
                        cx="8"
                        cy="8"
                        r="6.5"
                        fill="none"
                        stroke="black"
                        strokeWidth="1.5"
                      />
                      {isSelected && (
                        <circle cx="8" cy="8" r="4.2" fill="black" />
                      )}
                    </svg>
                    <span
                      className={`text-[10px] ${
                        isSelected
                          ? "font-black text-black"
                          : "text-gray-700 font-medium"
                      }`}
                    >
                      {level}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Observaciones y Trabajos */}
      <div className="mb-3 space-y-2 border border-gray-300 rounded p-2.5">
        <div>
          <h2 className="font-bold border-b border-gray-400 pb-0.5 mb-1 uppercase text-[11px] tracking-wide text-black">
            Observaciones
          </h2>
          <p className="min-h-[24px] text-xs whitespace-pre-wrap leading-relaxed text-gray-800">
            {hoja.observaciones || "Ninguna"}
          </p>
        </div>
        <div>
          <h2 className="font-bold border-b border-gray-400 pb-0.5 mb-1 uppercase text-[11px] tracking-wide text-black">
            Trabajos Solicitados
          </h2>
          <p className="min-h-[24px] text-xs whitespace-pre-wrap leading-relaxed text-gray-800">
            {hoja.trabajos_solicitados || "Ninguno"}
          </p>
        </div>
      </div>

      {/* Autorización */}
      <div className="mb-4 flex items-center gap-2 px-1">
        <div className="w-4 h-4 border-2 border-black flex items-center justify-center flex-shrink-0 p-0.5 bg-white">
          {hoja.autoriza_pruebas && (
            <svg
              viewBox="0 0 10 10"
              className="w-full h-full text-black stroke-current"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
              <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
            </svg>
          )}
        </div>
        <span className="font-bold text-xs text-black">
          Autorizo a conducir mi vehículo para pruebas técnicas y de control de calidad.
        </span>
      </div>

      {/* Firmas */}
      <div className="grid grid-cols-2 gap-10 mt-4 pt-3 border-t-2 border-gray-300 page-break-avoid">
        {/* Firma Cliente */}
        <div className="text-center flex flex-col items-center justify-end min-h-[5.5rem]">
          {hoja.firma_cliente ? (
            <img
              src={hoja.firma_cliente}
              alt="Firma Cliente"
              className="h-16 max-w-[220px] object-contain mb-1"
            />
          ) : (
            <div className="h-16 mb-1"></div>
          )}
          <div className="border-t-2 border-black w-4/5 pt-1.5">
            <p className="font-black text-xs uppercase tracking-wider text-black">
              Firma del Cliente
            </p>
            <p className="text-xs text-gray-800 font-medium">{hoja.cliente_nombre}</p>
          </div>
        </div>

        {/* Firma Asesor */}
        <div className="text-center flex flex-col items-center justify-end min-h-[5.5rem]">
          {hoja.firma_asesor ? (
            <img
              src={hoja.firma_asesor}
              alt="Firma Asesor"
              className="h-16 max-w-[220px] object-contain mb-1"
            />
          ) : (
            <div className="h-16 mb-1"></div>
          )}
          <div className="border-t-2 border-black w-4/5 pt-1.5">
            <p className="font-black text-xs uppercase tracking-wider text-black">
              Firma del Asesor Técnico
            </p>
            <p className="text-xs text-gray-800 font-medium">
              {hoja.asesor
                ? `${hoja.asesor.nombre} ${hoja.asesor.paterno || ""}`.trim()
                : "Asesor Técnico"}
            </p>
            {hoja.asesor && getAsesorPhone(hoja.asesor) && (
              <p className="text-[11px] text-gray-700 font-mono mt-0.5">
                Cel: {formatPhoneDisplay(getAsesorPhone(hoja.asesor))}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HojaRecepcionPrintView;
