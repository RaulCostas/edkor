import React from "react";

interface StandardPrintHeaderProps {
  title: string;
  subtitle?: string;
  filtersText?: string;
  totalRecords?: number;
  totalRecordsLabel?: string;
  orientation?: "portrait" | "landscape";
}

export const StandardPrintHeader: React.FC<StandardPrintHeaderProps> = ({
  title,
  subtitle = "EDKOR MOTORS - Control y Gestión de Taller",
  filtersText,
  totalRecords,
  totalRecordsLabel = "Total Registros",
  orientation = "landscape",
}) => {
  return (
    <>
      <style>{`
        @media print {
          @page {
            size: letter ${orientation} !important;
            margin: ${orientation === "portrait" ? "10mm 12mm" : "8mm 10mm"} !important;
          }
          body {
            page: ${orientation}-page !important;
          }
        }
      `}</style>
      <div className={`print-${orientation} relative flex justify-between items-center border-b-2 border-black pb-3 mb-3`}>
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="EDKOR MOTORS"
            className="w-24 h-14 object-contain"
          />
        </div>

        <div className="text-center flex-1 px-4">
          <h1 className="text-lg font-black uppercase tracking-wider text-black">
            {title}
          </h1>
          <p className="text-[10px] text-gray-700 font-semibold uppercase">
            {subtitle}
          </p>
          {filtersText && (
            <p className="text-[9px] text-gray-500 italic mt-0.5">
              {filtersText}
            </p>
          )}
        </div>

        <div className="text-right min-w-[150px]">
          {totalRecords !== undefined && (
            <p className="text-xs font-bold text-gray-800">
              {totalRecordsLabel}:{" "}
              <span className="text-blue-700 font-black">{totalRecords}</span>
            </p>
          )}
          <p className="text-[10px] text-gray-600 font-medium">
            Fecha:{" "}
            {new Date().toLocaleDateString("es-ES", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
          <p className="text-[10px] text-gray-600 font-medium">
            Hora:{" "}
            {new Date().toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </>
  );
};

export const StandardPrintFooter: React.FC = () => {
  return (
    <div className="mt-4 pt-2 border-t border-gray-300 flex justify-between items-center text-[9px] text-gray-500">
      <span>Sistema de Gestión de Taller EDKOR MOTORS</span>
      <span>Impreso el {new Date().toLocaleString("es-ES")}</span>
    </div>
  );
};
