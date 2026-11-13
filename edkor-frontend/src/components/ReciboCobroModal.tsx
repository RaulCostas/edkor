import React from "react";
import { Printer, X, CheckCircle, Receipt, Clock } from "lucide-react";
import { formatDate } from "../utils/dateUtils";
import { ReciboCobroPrintView } from "./ReciboCobroPrintView";

export interface ReciboCobroInfo {
  id_pago: number;
  idorden_trabajo: number;
  fecha: string;
  cliente: string;
  cliente_telefono?: string;
  placa: string;
  vehiculo_modelo?: string;
  vehiculo_marca?: string;
  total_orden: number;
  saldo_anterior: number;
  monto_pagado: number;
  saldo_restante: number;
  moneda: string;
  forma_pago: string;
  recibo?: string;
  factura?: string;
  observacion?: string;
  usuario_nombre?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  reciboData: ReciboCobroInfo | null;
}

const ReciboCobroModal: React.FC<Props> = ({ isOpen, onClose, reciboData }) => {
  if (!isOpen || !reciboData) return null;

  const esCancelacionTotal = reciboData.saldo_restante <= 0.05;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Vista de Impresión (Solo visible al imprimir) */}
      <div className="hidden print:block w-full bg-white text-black p-0 m-0 text-xs font-sans">
        <style>{`
          @media print {
            @page {
              size: auto;
              margin: 8mm 12mm 8mm 10mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
              display: block !important;
            }
            .recibo-print-container {
              position: static !important;
              margin: 0 !important;
              margin-left: 0 !important;
              margin-right: auto !important;
              width: 100% !important;
              max-width: 175mm !important;
              display: block !important;
            }
          }
        `}</style>

        <ReciboCobroPrintView reciboData={reciboData} />
      </div>

      {/* Modal en Pantalla (Interactivo) */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 print:hidden">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-100 dark:border-gray-700 animate-in fade-in duration-200">
          
          {/* Header Modal */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Receipt size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Comprobante de Pago</h2>
                <p className="text-xs text-blue-100">
                  Orden #{reciboData.idorden_trabajo} • Pago #{reciboData.id_pago}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 rounded-lg font-semibold text-xs shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <Printer size={15} /> Imprimir Recibo
              </button>
              <button
                onClick={onClose}
                className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Cuerpo */}
          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Badge de tipo de cobro */}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                {esCancelacionTotal ? (
                  <CheckCircle className="text-green-500 w-5 h-5 shrink-0" />
                ) : (
                  <Clock className="text-amber-500 w-5 h-5 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Tipo de Movimiento
                  </p>
                  <p className={`text-sm font-bold ${esCancelacionTotal ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {esCancelacionTotal ? "Cancelación Total (Saldo Saldado)" : "Pago Parcial / Abono a Cuenta"}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${esCancelacionTotal ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                {esCancelacionTotal ? "100% Pagado" : "Con Saldo"}
              </span>
            </div>

            {/* Datos del Cliente y Vehículo */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 dark:bg-gray-700/20 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Cliente:</p>
                <p className="font-bold text-gray-900 dark:text-white">{reciboData.cliente}</p>
                {reciboData.cliente_telefono && (
                  <p className="text-gray-600 dark:text-gray-300 font-mono mt-0.5">{reciboData.cliente_telefono}</p>
                )}
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Vehículo / Placa:</p>
                <p className="font-mono font-bold text-gray-900 dark:text-white uppercase">{reciboData.placa}</p>
                {(reciboData.vehiculo_marca || reciboData.vehiculo_modelo) && (
                  <p className="text-gray-600 dark:text-gray-300 mt-0.5">
                    {`${reciboData.vehiculo_marca || ""} ${reciboData.vehiculo_modelo || ""}`.trim()}
                  </p>
                )}
              </div>
            </div>

            {/* Cuadro de Saldos */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
              <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 font-bold text-gray-700 dark:text-gray-200 text-xs uppercase tracking-wide">
                Movimiento del Saldo
              </div>
              <div className="p-4 space-y-2.5 bg-white dark:bg-gray-800">
                <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                  <span>Total Orden de Trabajo:</span>
                  <span className="font-bold text-gray-900 dark:text-white">{Number(reciboData.total_orden).toFixed(2)} Bs</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                  <span>Saldo Antes de este Pago:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{Number(reciboData.saldo_anterior).toFixed(2)} Bs</span>
                </div>
                
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="font-bold text-gray-800 dark:text-gray-100">
                    Monto Abonado / Cobrado:
                  </span>
                  <span className="text-lg font-black text-green-600 dark:text-green-400">
                    {Number(reciboData.monto_pagado).toFixed(2)} {reciboData.moneda === "Dólares" ? "$us" : "Bs"}
                  </span>
                </div>

                <div className={`p-2.5 rounded-lg flex justify-between items-center ${esCancelacionTotal ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800"}`}>
                  <span className="font-bold text-xs uppercase">
                    {esCancelacionTotal ? "Estado Final:" : "Nuevo Saldo Restante:"}
                  </span>
                  <span className="font-black text-base">
                    {esCancelacionTotal ? "CANCELADO (0.00 Bs)" : `${Number(reciboData.saldo_restante).toFixed(2)} Bs`}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadatos adicionales */}
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
              <div>
                <span className="font-semibold text-gray-500 dark:text-gray-400">Forma de Pago: </span>
                <span>{reciboData.forma_pago}</span>
              </div>
              <div>
                <span className="font-semibold text-gray-500 dark:text-gray-400">Fecha: </span>
                <span>{formatDate(reciboData.fecha)}</span>
              </div>
              {reciboData.recibo && (
                <div>
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Recibo Físico: </span>
                  <span className="font-mono">{reciboData.recibo}</span>
                </div>
              )}
              {reciboData.factura && (
                <div>
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Factura: </span>
                  <span className="font-mono">{reciboData.factura}</span>
                </div>
              )}
              {reciboData.observacion && (
                <div className="col-span-2">
                  <span className="font-semibold text-gray-500 dark:text-gray-400">Observación: </span>
                  <span className="italic">{reciboData.observacion}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Modal */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/40 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2.5">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <Printer size={15} /> Imprimir Comprobante
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg font-semibold text-xs shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
            >
              <X size={15} /> Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReciboCobroModal;
