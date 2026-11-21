import React from "react";
import type { OtroIngreso } from "../types/otroIngreso";

interface Props {
  ingreso: OtroIngreso;
}

export const OtrosIngresosPrintView: React.FC<Props> = ({ ingreso }) => {
  const asesorNombre = ingreso.asesor
    ? `${ingreso.asesor.nombre || ""} ${ingreso.asesor.paterno || ""}`.trim()
    : "Sin Asesor";

  const monedaSimbolo = ingreso.moneda === "Dólares" ? "$us" : "Bs";

  return (
    <div className="otros-ingresos-print bg-white text-black p-6 max-w-3xl mx-auto text-xs font-sans print:p-0 print:max-w-none print:text-[11px] leading-tight">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            background: white !important;
            color: black !important;
          }
          .page-break-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      {/* Header */}
      <div className="relative flex justify-between items-center border-b-2 border-black pb-3 mb-4">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="EDKOR MOTORS"
            className="w-24 h-14 object-contain"
          />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-black uppercase tracking-wider text-black">
            COMPROBANTE DE OTROS INGRESOS
          </h1>
          <p className="text-[10px] text-gray-600 font-semibold uppercase">
            EDKOR MOTORS - Taller Automotriz Especializado
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-blue-700">
            N° {String(ingreso.nro || ingreso.id).padStart(6, "0")}
          </p>
          <p className="text-xs text-gray-700 font-semibold">
            Fecha:{" "}
            {ingreso.fecha
              ? new Date(ingreso.fecha).toLocaleDateString("es-ES")
              : new Date().toLocaleDateString("es-ES")}
          </p>
        </div>
      </div>

      {/* Resumen / Datos Generales */}
      <div className="grid grid-cols-2 gap-4 mb-4 border border-gray-400 rounded p-3">
        <div>
          <h2 className="font-bold text-gray-800 uppercase border-b border-gray-300 pb-1 mb-2">
            Información del Cliente / Contacto
          </h2>
          <div className="space-y-1">
            <p>
              <span className="font-semibold text-gray-700">Cliente:</span>{" "}
              {ingreso.cliente || "Cliente General"}
            </p>
            <p>
              <span className="font-semibold text-gray-700">Teléfono:</span>{" "}
              {ingreso.telefono_cliente || "-"}
            </p>
            <p>
              <span className="font-semibold text-gray-700">Placa Vehicular:</span>{" "}
              <span className="font-mono font-bold uppercase">
                {ingreso.placa || "N/A"}
              </span>
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-bold text-gray-800 uppercase border-b border-gray-300 pb-1 mb-2">
            Detalles Administrativos
          </h2>
          <div className="space-y-1">
            <p>
              <span className="font-semibold text-gray-700">Tipo de Ingreso:</span>{" "}
              <span className="font-semibold">{ingreso.tipo_ingreso || "Venta de Insumo"}</span>
            </p>
            <p>
              <span className="font-semibold text-gray-700">Asesor Responsable:</span>{" "}
              {asesorNombre}
            </p>
            <p>
              <span className="font-semibold text-gray-700">Forma de Pago:</span>{" "}
              {ingreso.forma_pago?.forma_pago || "Efectivo"}
            </p>
            {ingreso.comprobante && (
              <p>
                <span className="font-semibold text-gray-700">Comprobante / N°:</span>{" "}
                {ingreso.comprobante}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Detalle del Ingreso */}
      <div className="mb-4 border border-gray-400 rounded overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-400 font-bold text-gray-800">
              <th className="p-2.5">Concepto / Motivo</th>
              <th className="p-2.5 text-center w-28">Cant.</th>
              <th className="p-2.5 text-right w-36">Total ({monedaSimbolo})</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="p-2.5">
                <p className="font-semibold text-gray-900">{ingreso.motivo}</p>
                {ingreso.inventario && (
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Ítem de Almacén: {ingreso.inventario.descripcion}
                    {ingreso.descontar_stock ? " (Descontado de stock)" : ""}
                  </p>
                )}
                {ingreso.observacion && (
                  <p className="text-[10px] text-gray-600 italic mt-1">
                    Obs: {ingreso.observacion}
                  </p>
                )}
              </td>
              <td className="p-2.5 text-center font-mono">
                {ingreso.cantidad || 1}
              </td>
              <td className="p-2.5 text-right font-bold text-sm">
                {monedaSimbolo} {Number(ingreso.monto || 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold border-t border-gray-400 text-sm">
              <td colSpan={2} className="p-2.5 text-right uppercase">
                Monto Total Recibido:
              </td>
              <td className="p-2.5 text-right text-blue-700 font-black">
                {monedaSimbolo} {Number(ingreso.monto || 0).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Observaciones generales */}
      {ingreso.observacion && (
        <div className="border border-gray-300 rounded p-2.5 mb-8">
          <p className="font-semibold text-gray-700">Observaciones Generales:</p>
          <p className="text-gray-600 mt-1 whitespace-pre-line">{ingreso.observacion}</p>
        </div>
      )}

      {/* Firmas */}
      <div className="mt-16 grid grid-cols-2 gap-12 page-break-avoid">
        <div className="text-center">
          <div className="border-t border-gray-600 pt-1.5 mx-8">
            <p className="font-bold text-gray-800">{asesorNombre}</p>
            <p className="text-[10px] text-gray-500 uppercase">Asesor / Entregado Por</p>
          </div>
        </div>

        <div className="text-center">
          <div className="border-t border-gray-600 pt-1.5 mx-8">
            <p className="font-bold text-gray-800">{ingreso.cliente || "Cliente / Receptor"}</p>
            <p className="text-[10px] text-gray-500 uppercase">Firma del Cliente</p>
          </div>
        </div>
      </div>

      {/* Pie de página */}
      <div className="mt-12 text-center text-[10px] text-gray-400 border-t border-gray-200 pt-2">
        <p>EDKOR MOTORS - Sistema de Gestión de Taller Automotriz</p>
      </div>
    </div>
  );
};

export default OtrosIngresosPrintView;
