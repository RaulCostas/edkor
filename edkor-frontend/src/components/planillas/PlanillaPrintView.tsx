import React from "react";

export interface PlanillaPrintItem {
  personal_id?: number;
  nombre: string;
  paterno: string;
  materno?: string;
  ci: string;
  area?: any;
  salario?: number;
  haber_basico?: number;
  horas_produccion?: number;
  monto_produccion?: number;
  faltas?: number;
  descuento_faltas?: number;
  bonos?: number;
  descuentos?: number;
  anticipos?: number;
  liquido_pagable: number;
  personal?: any;
}

interface Props {
  mes: number;
  anio: number;
  items: PlanillaPrintItem[];
  totalPlanilla?: number;
}

const MONTH_NAMES = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const PlanillaPrintView: React.FC<Props> = ({ mes, anio, items, totalPlanilla }) => {
  const monthLabel = MONTH_NAMES[mes] || `Mes ${mes}`;

  // Totales consolidados
  const totalHaberBasico = items.reduce(
    (sum, i) => sum + Number(i.salario !== undefined ? i.salario : (i.haber_basico !== undefined ? i.haber_basico : (i.personal?.salario || 0))),
    0
  );
  const totalProduccion = items.reduce((sum, i) => sum + Number(i.monto_produccion || 0), 0);
  const totalFaltas = items.reduce((sum, i) => sum + Number(i.faltas || 0), 0);
  const totalCostoFaltas = items.reduce((sum, i) => {
    const haber = Number(
      i.salario !== undefined
        ? i.salario
        : (i.haber_basico !== undefined ? i.haber_basico : (i.personal?.salario || 0))
    );
    return sum + (haber / 30) * Number(i.faltas || 0);
  }, 0);
  const totalDescFaltas = items.reduce((sum, i) => sum + Number(i.descuento_faltas || 0), 0);
  const totalBonos = items.reduce((sum, i) => sum + Number(i.bonos || 0), 0);
  const totalDescuentos = items.reduce((sum, i) => sum + Number(i.descuentos || 0), 0);
  const totalAnticipos = items.reduce((sum, i) => sum + Number(i.anticipos || 0), 0);
  const totalLiquidoCalculado = totalPlanilla !== undefined
    ? Number(totalPlanilla)
    : items.reduce((sum, i) => sum + Number(i.liquido_pagable || 0), 0);

  return (
    <div className="planilla-print-view bg-white text-black p-4 text-xs font-sans leading-tight">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 8mm;
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

      {/* ===================== HEADER OFICIAL EDKOR MOTORS ===================== */}
      <div className="relative flex justify-between items-center border-b-2 border-black pb-2.5 mb-3">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="EDKOR MOTORS"
            className="w-24 h-14 object-contain"
          />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 text-center">
          <h1 className="text-xl font-black uppercase tracking-wider text-black">
            Planilla de Sueldos y Salarios
          </h1>
          <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">
            EDKOR MOTORS S.R.L. • GESTIÓN DE PERSONAL Y TALLER
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-black text-red-600">
            Periodo: {monthLabel} / {anio}
          </p>
          <p className="text-xs text-gray-700 font-semibold">
            Fecha: {new Date().toLocaleDateString("es-ES")}
          </p>
          <p className="text-[10px] text-gray-600 font-medium">
            Personal: {items.length} trabajadores
          </p>
        </div>
      </div>

      {/* ===================== TABLA DE PERSONAL ===================== */}
      <table className="w-full text-left border border-black border-collapse text-[10px] mb-4">
        <thead>
          <tr className="bg-gray-100 text-black border-y border-black font-bold uppercase text-[9px]">
            <th className="p-1.5 border-r border-black text-center w-7">#</th>
            <th className="p-1.5 border-r border-black">Personal</th>
            <th className="p-1.5 border-r border-black text-center w-18">C.I.</th>
            <th className="p-1.5 border-r border-black w-24">Área / Cargo</th>
            <th className="p-1.5 border-r border-black text-right w-20">Haber Básico</th>
            <th className="p-1.5 border-r border-black text-right w-24">Producción</th>
            <th className="p-1.5 border-r border-black text-center w-18">Faltas</th>
            <th className="p-1.5 border-r border-black text-right w-16">Bonos</th>
            <th className="p-1.5 border-r border-black text-right w-16">Desc.</th>
            <th className="p-1.5 border-r border-black text-right w-18">Anticipos</th>
            <th className="p-1.5 border-r border-black text-right w-22 bg-gray-200">Líquido Pagable</th>
            <th className="p-1.5 text-center w-28">Firma Conforme</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const nombreCompleto = item.nombre
              ? `${item.nombre} ${item.paterno || ""} ${item.materno || ""}`.trim()
              : (item.personal ? `${item.personal.nombre} ${item.personal.paterno || ""} ${item.personal.materno || ""}`.trim() : "N/A");
            const ci = item.ci || item.personal?.ci || "-";
            const area = item.area?.area || item.personal?.area?.area || "-";

            const haber = Number(
              item.salario !== undefined
                ? item.salario
                : (item.haber_basico !== undefined ? item.haber_basico : (item.personal?.salario || 0))
            );
            const prod = Number(item.monto_produccion || 0);
            const hrs = Number(item.horas_produccion || 0);
            const costoFaltas = (haber / 30) * Number(item.faltas || 0);
            const bonos = Number(item.bonos || 0);
            const desc = Number(item.descuentos || 0) + Number(item.descuento_faltas || 0);
            const antic = Number(item.anticipos || 0);
            const liquido = Number(item.liquido_pagable || 0);

            return (
              <tr
                key={item.personal_id || idx}
                className={`border-b border-gray-300 ${idx % 2 === 1 ? "bg-gray-50/70" : "bg-white"}`}
              >
                <td className="p-1 border-r border-gray-300 text-center font-medium">{idx + 1}</td>
                <td className="p-1 border-r border-gray-300 font-semibold text-black">
                  {nombreCompleto}
                </td>
                <td className="p-1 border-r border-gray-300 text-center font-mono text-[9px]">{ci}</td>
                <td className="p-1 border-r border-gray-300 text-[9px] text-gray-700">{area}</td>
                <td className="p-1 border-r border-gray-300 text-right font-mono">{haber.toFixed(2)}</td>
                <td className="p-1 border-r border-gray-300 text-right font-mono">
                  {prod > 0 ? (
                    <span>
                      {prod.toFixed(2)}
                      {hrs > 0 && <span className="text-[8px] text-gray-500 block">({hrs.toFixed(1)}h)</span>}
                    </span>
                  ) : "-"}
                </td>
                <td className="p-1 border-r border-gray-300 text-center font-mono">
                  {Number(item.faltas) > 0 ? (
                    <span>
                      <span className="font-bold text-black">{item.faltas}</span>
                      <span className="text-[8px] text-red-600 block">
                        (Bs {costoFaltas.toFixed(2)})
                      </span>
                    </span>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                </td>
                <td className="p-1 border-r border-gray-300 text-right font-mono">{bonos > 0 ? bonos.toFixed(2) : "-"}</td>
                <td className="p-1 border-r border-gray-300 text-right font-mono text-red-700">{desc > 0 ? desc.toFixed(2) : "-"}</td>
                <td className="p-1 border-r border-gray-300 text-right font-mono text-red-700">{antic > 0 ? antic.toFixed(2) : "-"}</td>
                <td className="p-1 border-r border-black text-right font-mono font-bold text-black bg-gray-100">
                  {liquido.toFixed(2)}
                </td>
                <td className="p-1 text-center border-b border-gray-300">
                  <div className="h-6 border-b border-dashed border-gray-400 mx-2"></div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 text-black font-black border-t-2 border-black text-[9px]">
            <td colSpan={4} className="p-1.5 text-right uppercase border-r border-black">
              Totales ({items.length} empleados):
            </td>
            <td className="p-1.5 text-right border-r border-black font-mono">Bs {totalHaberBasico.toFixed(2)}</td>
            <td className="p-1.5 text-right border-r border-black font-mono">Bs {totalProduccion.toFixed(2)}</td>
            <td className="p-1.5 text-center border-r border-black font-mono">
              <span className="font-bold">{totalFaltas}</span>
              {totalCostoFaltas > 0 && (
                <span className="text-[8px] text-red-700 block">
                  (Bs {totalCostoFaltas.toFixed(2)})
                </span>
              )}
            </td>
            <td className="p-1.5 text-right border-r border-black font-mono">Bs {totalBonos.toFixed(2)}</td>
            <td className="p-1.5 text-right border-r border-black font-mono text-red-700">Bs {(totalDescuentos + totalDescFaltas).toFixed(2)}</td>
            <td className="p-1.5 text-right border-r border-black font-mono text-red-700">Bs {totalAnticipos.toFixed(2)}</td>
            <td className="p-1.5 text-right border-r border-black font-mono text-emerald-800 bg-gray-200">
              Bs {totalLiquidoCalculado.toFixed(2)}
            </td>
            <td className="p-1.5"></td>
          </tr>
        </tfoot>
      </table>

      {/* ===================== FIRMAS DE RESPONSABILIDAD ===================== */}
      <div className="grid grid-cols-3 gap-8 text-center pt-6 mt-4 border-t border-dashed border-gray-400 text-[10px] page-break-avoid">
        <div>
          <div className="border-t border-black w-40 mx-auto pt-1">
            <p className="font-bold text-black">Elaborado Por</p>
            <p className="text-[9px] text-gray-600">Recursos Humanos / Taller</p>
          </div>
        </div>
        <div>
          <div className="border-t border-black w-40 mx-auto pt-1">
            <p className="font-bold text-black">Revisado Por</p>
            <p className="text-[9px] text-gray-600">Contabilidad / Finanzas</p>
          </div>
        </div>
        <div>
          <div className="border-t border-black w-40 mx-auto pt-1">
            <p className="font-bold text-black">Aprobado Por</p>
            <p className="text-[9px] text-gray-600">Gerencia General</p>
          </div>
        </div>
      </div>

      {/* ===================== FOOTER SISTEMA ===================== */}
      <div className="mt-4 pt-2 border-t border-gray-300 flex justify-between items-center text-[9px] text-gray-500 page-break-avoid">
        <span>Sistema de Gestión de Taller EDKOR MOTORS • Documento Oficial Interno</span>
        <span>Impreso el: {new Date().toLocaleString("es-ES")}</span>
      </div>
    </div>
  );
};

export default PlanillaPrintView;
