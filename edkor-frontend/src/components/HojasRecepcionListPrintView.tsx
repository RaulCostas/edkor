import React from 'react';
import type { HojaRecepcion } from '../services/hojaRecepcionService';

interface HojasRecepcionListPrintViewProps {
  hojas: HojaRecepcion[];
  searchTerm?: string;
  selectedTipoOrden?: string;
  selectedEstado?: string;
}

export const HojasRecepcionListPrintView: React.FC<HojasRecepcionListPrintViewProps> = ({
  hojas,
  searchTerm,
  selectedTipoOrden,
  selectedEstado,
}) => {
  return (
    <div className="hojas-list-print bg-white text-black p-4 text-[11px] leading-tight font-sans">
      <style>{`
        @media print {
          @page {
            size: letter landscape;
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            color: black !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Cabecera con Logo y Título */}
      <div className="relative flex justify-between items-center border-b-2 border-black pb-3 mb-3">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="EDKOR MOTORS"
            className="w-24 h-14 object-contain"
          />
        </div>

        <div className="text-center flex-1 px-4">
          <h1 className="text-lg font-black uppercase tracking-wider text-black">
            Reporte de Hojas de Recepción
          </h1>
          <p className="text-[10px] text-gray-700 font-semibold uppercase">
            EDKOR MOTORS - Control y Gestión de Taller
          </p>
          {(searchTerm || selectedTipoOrden || (selectedEstado && selectedEstado !== 'todos')) && (
            <p className="text-[9px] text-gray-500 italic mt-0.5">
              Filtros: {[
                selectedTipoOrden ? `Tipo: ${selectedTipoOrden}` : '',
                selectedEstado && selectedEstado !== 'todos' ? `Estado: ${selectedEstado}` : '',
                searchTerm ? `Búsqueda: "${searchTerm}"` : ''
              ].filter(Boolean).join(' | ')}
            </p>
          )}
        </div>

        <div className="text-right min-w-[150px]">
          <p className="text-xs font-bold text-gray-800">
            Total Hojas: <span className="text-blue-700 font-black">{hojas.length}</span>
          </p>
          <p className="text-[10px] text-gray-600 font-medium">
            Fecha: {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
          <p className="text-[10px] text-gray-600 font-medium">
            Hora: {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Tabla de Hojas */}
      <table className="w-full text-left border border-gray-400 text-[10px]">
        <thead>
          <tr className="bg-gray-100 text-gray-900 border-b border-gray-400 font-bold uppercase text-[9px]">
            <th className="p-1.5 border-r border-gray-300 text-center w-8">#</th>
            <th className="p-1.5 border-r border-gray-300 text-center w-16">N° Hoja</th>
            <th className="p-1.5 border-r border-gray-300 w-24">Tipo Orden</th>
            <th className="p-1.5 border-r border-gray-300 text-center w-20">Fecha</th>
            <th className="p-1.5 border-r border-gray-300 text-center w-16">Placa</th>
            <th className="p-1.5 border-r border-gray-300 w-36">Vehículo</th>
            <th className="p-1.5 border-r border-gray-300">Cliente</th>
            <th className="p-1.5 border-r border-gray-300 w-24">Teléfono</th>
            <th className="p-1.5 border-r border-gray-300 w-32">Asesor</th>
            <th className="p-1.5 text-center w-24">Estado</th>
          </tr>
        </thead>
        <tbody>
          {hojas.length === 0 ? (
            <tr>
              <td colSpan={10} className="p-4 text-center text-gray-500 italic">
                No hay hojas de recepción disponibles para imprimir con los filtros seleccionados.
              </td>
            </tr>
          ) : (
            hojas.map((hoja, index) => {
              const nroHoja = String(hoja.nro || hoja.id).padStart(6, '0');
              const tipoOrden =
                hoja.tipo_orden?.tipo_orden ||
                (hoja as any)?.tipo_orden ||
                'Particular';
              const vehiculo = `${hoja.vehiculo_marca || ''} ${hoja.vehiculo_modelo || ''}`.trim() || '-';
              const cliente = hoja.cliente_nombre || '-';
              const telefono = hoja.cliente_telefono || '-';
              const asesor = hoja.asesor
                ? `${hoja.asesor.nombre || ''} ${hoja.asesor.paterno || ''}`.trim()
                : '-';

              return (
                <tr
                  key={hoja.id}
                  className={`border-b border-gray-200 ${index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}
                >
                  <td className="p-1.5 border-r border-gray-200 text-center font-medium">{index + 1}</td>
                  <td className="p-1.5 border-r border-gray-200 text-center font-bold text-gray-900">{nroHoja}</td>
                  <td className="p-1.5 border-r border-gray-200">{tipoOrden}</td>
                  <td className="p-1.5 border-r border-gray-200 text-center">
                    {hoja.fecha_ingreso ? new Date(hoja.fecha_ingreso).toLocaleDateString('es-ES') : '-'}
                  </td>
                  <td className="p-1.5 border-r border-gray-200 text-center font-bold">{hoja.vehiculo_placa || '-'}</td>
                  <td className="p-1.5 border-r border-gray-200 font-medium">{vehiculo}</td>
                  <td className="p-1.5 border-r border-gray-200">{cliente}</td>
                  <td className="p-1.5 border-r border-gray-200 text-[9px]">{telefono}</td>
                  <td className="p-1.5 border-r border-gray-200 text-[9px]">{asesor}</td>
                  <td className="p-1.5 text-center uppercase font-semibold text-[9px]">
                    {hoja.estado || 'REGISTRADO'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {hojas.length > 0 && (
          <tfoot>
            <tr className="bg-gray-100 font-bold border-t-2 border-gray-400 text-[10px]">
              <td colSpan={10} className="p-2 text-right uppercase">
                Total Registros: {hojas.length} hojas de recepción
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Pie de Página */}
      <div className="mt-4 pt-2 border-t border-gray-300 flex justify-between items-center text-[9px] text-gray-500">
        <span>Sistema de Gestión de Taller EDKOR MOTORS</span>
        <span>Impreso por el usuario el {new Date().toLocaleString('es-ES')}</span>
      </div>
    </div>
  );
};
