import React from "react";
import { formatDate } from "../utils/dateUtils";
import type { ReciboCobroInfo } from "./ReciboCobroModal";

interface Props {
  reciboData: ReciboCobroInfo;
}

export const ReciboCobroPrintView: React.FC<Props> = ({ reciboData }) => {
  const esCancelacionTotal = reciboData.saldo_restante <= 0.05;

  return (
    <div className="recibo-print-container border border-black rounded p-4 max-w-xl m-0 mr-auto bg-white text-black font-sans">
      {/* Header */}
      <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-3">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="EDKOR MOTORS" className="h-12 object-contain" />
          <div>
            <h1 className="text-base font-black tracking-wider uppercase text-black">EDKOR MOTORS</h1>
            <p className="text-[10px] text-gray-700">Taller Mecánico Especializado</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-black uppercase bg-black text-white px-2 py-0.5 rounded">
            {esCancelacionTotal ? "Recibo de Cancelación" : "Recibo de Abono Parcial"}
          </span>
          <p className="text-xs font-mono font-bold mt-1 text-red-600">
            N° Pago: #{String(reciboData.id_pago).padStart(6, "0")}
          </p>
          <p className="text-[10px] text-gray-700">
            Fecha: {formatDate(reciboData.fecha)}
          </p>
        </div>
      </div>

      {/* Datos Cliente y Vehículo */}
      <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 border-b border-gray-300 pb-2">
        <div>
          <p><span className="font-bold">Cliente:</span> {reciboData.cliente}</p>
          {reciboData.cliente_telefono && (
            <p><span className="font-bold">Celular:</span> {reciboData.cliente_telefono}</p>
          )}
          <p><span className="font-bold">N° Orden de Trabajo:</span> #{reciboData.idorden_trabajo}</p>
        </div>
        <div>
          <p><span className="font-bold">Placa:</span> <span className="font-mono font-bold uppercase">{reciboData.placa}</span></p>
          {(reciboData.vehiculo_marca || reciboData.vehiculo_modelo) && (
            <p><span className="font-bold">Vehículo:</span> {`${reciboData.vehiculo_marca || ""} ${reciboData.vehiculo_modelo || ""}`.trim()}</p>
          )}
          <p><span className="font-bold">Forma de Pago:</span> {reciboData.forma_pago}</p>
        </div>
      </div>

      {/* Cuadro de Movimiento Financiero y Saldos */}
      <div className="mb-3">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100 border-y border-black text-[11px]">
              <th className="py-1 text-left">Concepto</th>
              <th className="py-1 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="py-1.5 text-gray-700">Total de la Orden de Trabajo</td>
              <td className="py-1.5 text-right font-medium">
                {Number(reciboData.total_orden).toFixed(2)} {reciboData.moneda === "Dólares" ? "$us" : "Bs"}
              </td>
            </tr>
            <tr>
              <td className="py-1.5 text-gray-700">Saldo Anterior al Pago</td>
              <td className="py-1.5 text-right font-medium">
                {Number(reciboData.saldo_anterior).toFixed(2)} {reciboData.moneda === "Dólares" ? "$us" : "Bs"}
              </td>
            </tr>
            <tr className="bg-gray-50 font-bold border-t border-black">
              <td className="py-1.5 text-black uppercase">
                {esCancelacionTotal ? "Monto Cancelado (Liquidación Total)" : "Monto Cobrado (Abono a Cuenta)"}
              </td>
              <td className="py-1.5 text-right text-black text-sm">
                {Number(reciboData.monto_pagado).toFixed(2)} {reciboData.moneda === "Dólares" ? "$us" : "Bs"}
              </td>
            </tr>
            <tr className={`font-bold ${esCancelacionTotal ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"} border-t border-b border-black`}>
              <td className="py-1.5 uppercase">
                {esCancelacionTotal ? "Saldo Restante:" : "Saldo Pendiente Restante:"}
              </td>
              <td className="py-1.5 text-right text-sm">
                {esCancelacionTotal ? "0.00 Bs (TOTALMENTE CANCELADO)" : `${Number(reciboData.saldo_restante).toFixed(2)} Bs`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comprobantes y Observaciones */}
      {(reciboData.factura || reciboData.recibo || reciboData.observacion) && (
        <div className="text-[10px] border border-gray-300 rounded p-1.5 mb-4 bg-gray-50">
          {reciboData.recibo && <p><span className="font-bold">N° Recibo Físico:</span> {reciboData.recibo}</p>}
          {reciboData.factura && <p><span className="font-bold">N° Factura:</span> {reciboData.factura}</p>}
          {reciboData.observacion && <p><span className="font-bold">Observaciones:</span> {reciboData.observacion}</p>}
        </div>
      )}

      {/* Firmas */}
      <div className="grid grid-cols-2 gap-8 text-center pt-8 mt-4 border-t border-dashed border-gray-400 text-[10px]">
        <div>
          <div className="border-t border-black w-32 mx-auto pt-1">
            <p className="font-bold">Entregué Conforme</p>
            <p className="text-gray-600">{reciboData.cliente}</p>
          </div>
        </div>
        <div>
          <div className="border-t border-black w-32 mx-auto pt-1">
            <p className="font-bold">Recibí Conforme</p>
            <p className="text-gray-600">{reciboData.usuario_nombre || "Cajero / Administración"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReciboCobroPrintView;
