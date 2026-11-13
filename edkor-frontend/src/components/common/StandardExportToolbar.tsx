import React from "react";

interface StandardExportToolbarProps {
  onExportExcel: () => void;
  onExportPDF: () => void;
  onPrint: () => void;
  onHelp?: () => void;
  helpTitle?: string;
  children?: React.ReactNode; // Botón "+ Nuevo ..."
}

export const StandardExportToolbar: React.FC<StandardExportToolbarProps> = ({
  onExportExcel,
  onExportPDF,
  onPrint,
  onHelp,
  helpTitle = "Ayuda / Manual",
  children,
}) => {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
      {onHelp && (
        <button
          type="button"
          onClick={onHelp}
          className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1 sm:p-1.5 rounded-full flex items-center justify-center w-[28px] h-[28px] sm:w-[30px] sm:h-[30px] text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shrink-0"
          title={helpTitle}
        >
          ?
        </button>
      )}

      <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
        <button
          type="button"
          onClick={onExportExcel}
          className="p-1.5 sm:p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-w-[50px] sm:min-w-[60px]"
          title="Exportar a Excel"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 sm:w-5 sm:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="8" y1="13" x2="16" y2="13"></line>
            <line x1="8" y1="17" x2="16" y2="17"></line>
          </svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">Excel</span>
        </button>

        <button
          type="button"
          onClick={onExportPDF}
          className="p-1.5 sm:p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-w-[50px] sm:min-w-[60px]"
          title="Exportar a PDF"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 sm:w-5 sm:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">PDF</span>
        </button>

        <button
          type="button"
          onClick={onPrint}
          className="p-1.5 sm:p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex flex-col items-center justify-center gap-0.5 sm:gap-1 min-w-[50px] sm:min-w-[60px]"
          title="Imprimir"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 sm:w-5 sm:h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          <span className="text-[9px] sm:text-[10px] font-semibold">Imprimir</span>
        </button>

        {children && (
          <>
            <div className="w-px h-8 sm:h-10 bg-gray-300 dark:bg-gray-600 mx-1 sm:mx-2"></div>
            {children}
          </>
        )}
      </div>
    </div>
  );
};
