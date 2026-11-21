import React, { useState } from "react";
import Swal from "sweetalert2";
import ManualModal, { type ManualSection } from "./ManualModal";
import api from "../services/api";
import { Search, Eye, Landmark } from "lucide-react";
import * as XLSX from "xlsx";
import { exportStandardPDF } from "../utils/pdfExportHelper";
import { StandardExportToolbar } from "../components/common/StandardExportToolbar";
import { StandardPrintHeader, StandardPrintFooter } from "../components/common/StandardPrintHeader";
import { getLocalDateString } from "../utils/dateUtils";

// Interfaces
interface DetailItem {
  id: number;
  fecha: string;
  descripcion: string;
  monto: number;
  moneda: string;
  paciente?: string;
  cliente?: string;
  factura?: string;
  recibo?: string;
  formaPago?: string;
  proveedor?: string;
  personal?: string;
  gasto?: string;
  detalle?: string;
}

interface StatCategory {
  label: string;
  bs: number;
  sus: number;
  itemsBs: DetailItem[];
  itemsSus: DetailItem[];
}

const Utilidades: React.FC = () => {
  const [filterType, setFilterType] = useState<"date" | "month" | "year" | "">(
    "",
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    getLocalDateString().slice(0, 7),
  ); // YYYY-MM
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString(),
  );
  const [loading, setLoading] = useState(false);

  // DETAIL MODAL STATE
  const [selectedDetail, setSelectedDetail] = useState<{
    title: string;
    currency: "Bolivianos" | "Dólares";
    items: DetailItem[];
  } | null>(null);

  const [stats, setStats] = useState<{
    ingresos: StatCategory;
    otrosIngresos: StatCategory;
    egresosDiarios: StatCategory;
    sueldos: StatCategory; // NEW
    adelantos: StatCategory; // NEW
    pagosProveedores: StatCategory;
    pagosPersonal: StatCategory;
    gastosFijos: StatCategory;
    totalIngresos: { bs: number; sus: number };
    totalEgresos: { bs: number; sus: number };
    totalUtilidades: { bs: number; sus: number };
  } | null>(null);

  const [showManual, setShowManual] = useState(false);

  const manualSections: ManualSection[] = [
    {
      title: "Utilidades",
      content:
        "Vista general de las finanzas. Permite ver Ingresos VS Egresos y calcular la utilidad neta.",
    },
    {
      title: "Filtros",
      content:
        "Utilice los filtros por Fecha, Mes o Año para acotar los resultados mostrados en el reporte.",
    },
    {
      title: "Detalles",
      content:
        'Haga clic en los botones de "lupa" en cada fila para ver el desglose detallado de cada categoría.',
    },
  ];

  const handleSearch = async () => {
    let finalStartDate = "";
    let finalEndDate = "";

    if (filterType === "date") {
      if (!startDate || !endDate)
        return Swal.fire("Error", "Seleccione fecha inicio y fin", "warning");
      finalStartDate = startDate;
      finalEndDate = endDate;
    } else if (filterType === "month") {
      if (!selectedMonth)
        return Swal.fire("Error", "Seleccione un mes", "warning");
      const [year, month] = selectedMonth.split("-");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      finalStartDate = `${selectedMonth}-01`;
      finalEndDate = `${selectedMonth}-${lastDay}`;
    } else if (filterType === "year") {
      if (!selectedYear)
        return Swal.fire("Error", "Seleccione un año", "warning");
      finalStartDate = `${selectedYear}-01-01`;
      finalEndDate = `${selectedYear}-12-31`;
    } else {
      return Swal.fire("Error", "Seleccione un tipo de filtro", "warning");
    }

    setLoading(true);
    try {
      // Fetch all data and filter client-side (TALLER backend doesn't support params yet on these endpoints)
      const [
        resIngresos,
        resOtrosIngresos,
        resEgresos,
        resPersonal,
        resProveedores,
        resGastosFijos,
        resAnticipos,
        resPagosPlanillas,
      ] = await Promise.all([
        api.get("/pago-orden"),
        api.get("/otros-ingresos"),
        api.get("/egresos"),
        api.get("/pagos-trabajos-asignados"),
        api.get("/pago-pedidos"),
        api.get("/pagos-gastos-fijos"),
        api.get("/anticipos"),
        api.get("/pagos-planillas"),
      ]);

      // Client-side filtering check
      const isInRange = (dateStr: string) => {
        if (!dateStr) return false;
        const d = getLocalDateString(dateStr);
        return d >= finalStartDate && d <= finalEndDate;
      };

      const dataIngresos = resIngresos.data.filter((i: any) =>
        isInRange(i.fecha),
      );
      const dataOtrosIngresos = (
        Array.isArray(resOtrosIngresos.data)
          ? resOtrosIngresos.data
          : []
      ).filter((oi: any) => isInRange(oi.fecha));
      const dataEgresos = (
        Array.isArray(resEgresos.data.data)
          ? resEgresos.data.data
          : resEgresos.data
      ).filter((e: any) => isInRange(e.fecha));
      const dataPersonal = resPersonal.data.filter((p: any) =>
        isInRange(p.fecha_pago),
      );
      const dataProveedores = resProveedores.data.filter((p: any) =>
        isInRange(p.fecha),
      );
      const dataGastos = resGastosFijos.data.filter((g: any) =>
        isInRange(g.fecha),
      );
      const dataAnticipos = resAnticipos.data.filter((a: any) =>
        isInRange(a.fecha),
      );
      const dataPagosPlanillas = resPagosPlanillas.data.filter((p: any) =>
        isInRange(p.fecha_pago),
      );

      // Helper to sum amounts and collect items
      const sum = (
        items: any[],
        type:
          | "ingreso"
          | "otro_ingreso"
          | "egreso"
          | "personal"
          | "proveedor"
          | "gasto"
          | "anticipo"
          | "planilla",
      ) => {
        let bs = 0;
        let sus = 0;
        const itemsBs: DetailItem[] = [];
        const itemsSus: DetailItem[] = [];

        items.forEach((item) => {
          let amount = 0;
          let currency = item.moneda || "Bolivianos";
          let desc = "";
          let date = item.fecha
            ? item.fecha.split("T")[0]
            : item.fecha_pago
              ? item.fecha_pago.split("T")[0]
              : "";
          let id = item.id || Math.random();

          // Specific fields
          let cliente = "";
          let factura = "";
          let recibo = "";
          let formaPago = "";
          let proveedor = "";
          let personal = "";
          let gasto = "";
          let detalle = "";

          switch (type) {
            case "ingreso": // PagoOrden
              amount = Number(item.monto) || 0;
              formaPago = item.forma_pago?.forma_pago || "N/A";
              cliente = item.orden_trabajo?.cliente || "-";
              desc = `Orden #${item.orden_trabajo?.id} - ${cliente}`;
              if (item.observacion) desc += ` (${item.observacion})`;
              break;
            case "otro_ingreso": // OtrosIngresos
              amount = Number(item.monto) || 0;
              formaPago = item.forma_pago?.forma_pago || "-";
              cliente = item.cliente || "-";
              desc = `${item.tipo_ingreso || 'Ingreso'}: ${item.motivo}`;
              if (item.observacion) desc += ` (${item.observacion})`;
              if (item.placa) desc += ` [Placa: ${item.placa}]`;
              break;
            case "egreso": // Egresos
              amount = Number(item.monto) || 0;
              desc = item.detalle || "Egreso Diario";
              formaPago = item.formaPago?.forma_pago || "-";
              break;
            case "personal": // PagosTrabajosAsignados
              amount = Number(item.total) || 0;
              personal =
                `${item.personal?.nombre || ""} ${item.personal?.apellido_paterno || ""}`.trim();
              desc = `Pago a Personal: ${personal}`;
              detalle = item.detalle || "-";
              currency = "Bolivianos"; // Assume BS for personal
              break;
            case "proveedor": // PagoPedidos
              amount = Number(item.material_pedido?.total) || 0;
              proveedor = item.material_pedido?.proveedor?.proveedor || "-";
              factura = item.factura || "-";
              recibo = item.recibo || "-";
              formaPago = item.forma_pago?.forma_pago || "-";
              desc = `Prov: ${proveedor}`;
              if (item.material_pedido?.observaciones)
                desc += ` - ${item.material_pedido.observaciones}`;
              break;
            case "gasto": // GastosFijos
              amount = Number(item.monto) || 0;
              gasto = item.gastoFijo?.gasto_fijo || "Gasto Fijo";
              formaPago = item.formaPago?.forma_pago || "-";
              desc = `${gasto}`;
              break;
            case "anticipo":
              amount = Number(item.monto) || 0;
              personal =
                `${item.personal?.nombre || ""} ${item.personal?.apellido_paterno || ""}`.trim();
              desc = `Adelanto: ${personal} - ${item.motivo}`;
              currency = "Bolivianos";
              break;
            case "planilla":
              amount = Number(item.monto) || 0;
              personal = `Planilla ${item.planilla?.mes}/${item.planilla?.anio}`;
              desc = `Planilla ${item.planilla?.mes}/${item.planilla?.anio} ${item.observaciones || ""}`;
              currency = "Bolivianos";
              break;
          }

          const currUpper = currency.toUpperCase();
          const detailItem: DetailItem = {
            id,
            fecha: date,
            descripcion: desc,
            monto: amount,
            moneda: currency,
            cliente,
            factura,
            recibo,
            formaPago,
            proveedor,
            personal,
            gasto,
            detalle,
          };

          if (currUpper.includes("BOLIVIANO") || currUpper === "BS") {
            bs += amount;
            itemsBs.push(detailItem);
          } else {
            sus += amount;
            itemsSus.push(detailItem);
          }
        });
        return { bs, sus, itemsBs, itemsSus };
      };

      const ingresos = sum(dataIngresos, "ingreso");
      const otrosIngresosStats = sum(dataOtrosIngresos, "otro_ingreso");
      const egresosDiarios = sum(dataEgresos, "egreso");

      // Calculations
      const sueldosStats = sum(dataPagosPlanillas, "planilla");
      const adelantosStats = sum(dataAnticipos, "anticipo");
      const personalStats = sum(dataPersonal, "personal");

      const proveedores = sum(dataProveedores, "proveedor");
      // Calculate unified Gastos Fijos stats
      const gastosStats = sum(dataGastos, "gasto");

      const totalIngresos = {
        bs: ingresos.bs + otrosIngresosStats.bs,
        sus: ingresos.sus + otrosIngresosStats.sus,
      };
      const totalEgresos = {
        bs:
          egresosDiarios.bs +
          personalStats.bs +
          sueldosStats.bs +
          adelantosStats.bs +
          proveedores.bs +
          gastosStats.bs,
        sus:
          egresosDiarios.sus +
          personalStats.sus +
          sueldosStats.sus +
          adelantosStats.sus +
          proveedores.sus +
          gastosStats.sus,
      };

      setStats({
        ingresos: { label: "Ingresos por Órdenes", ...ingresos },
        otrosIngresos: { label: "Otros Ingresos", ...otrosIngresosStats },
        egresosDiarios: { label: "Egresos Diarios", ...egresosDiarios },
        sueldos: { label: "Sueldos", ...sueldosStats },
        adelantos: { label: "Adelantos", ...adelantosStats },
        pagosPersonal: { label: "Otros Pagos Personal", ...personalStats },
        pagosProveedores: { label: "Pagos a Proveedores", ...proveedores },
        gastosFijos: { label: "Gastos Fijos", ...gastosStats },
        totalIngresos,
        totalEgresos,
        totalUtilidades: {
          bs: totalIngresos.bs - totalEgresos.bs,
          sus: totalIngresos.sus - totalEgresos.sus,
        },
      });
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Error al calcular utilidades", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount: number, currency: "Bs" | "Sus") => {
    return amount.toLocaleString("es-BO", {
      style: "currency",
      currency: currency === "Bs" ? "BOB" : "USD",
    });
  };

  const handleOpenDetail = (
    category: StatCategory | undefined,
    currency: "Bolivianos" | "Dólares",
  ) => {
    if (!category) return;
    const items =
      currency === "Bolivianos" ? category.itemsBs : category.itemsSus;
    setSelectedDetail({
      title: category.label,
      currency,
      items,
    });
  };

  const closeModal = () => setSelectedDetail(null);

  const getPeriodoText = () => {
    if (filterType === 'date') return `Del ${startDate} al ${endDate}`;
    if (filterType === 'month') return `Mes: ${selectedMonth}`;
    if (filterType === 'year') return `Año: ${selectedYear}`;
    return 'General';
  };

  const exportToExcel = () => {
    if (!stats) {
      Swal.fire('Atención', 'Primero realice una búsqueda para exportar los datos', 'warning');
      return;
    }
    const data = [
      { Concepto: stats.ingresos.label, 'Bolivianos (Bs)': stats.ingresos.bs, 'Dólares ($us)': stats.ingresos.sus },
      { Concepto: stats.otrosIngresos.label, 'Bolivianos (Bs)': stats.otrosIngresos.bs, 'Dólares ($us)': stats.otrosIngresos.sus },
      { Concepto: 'TOTAL INGRESOS', 'Bolivianos (Bs)': stats.totalIngresos.bs, 'Dólares ($us)': stats.totalIngresos.sus },
      { Concepto: stats.egresosDiarios.label, 'Bolivianos (Bs)': stats.egresosDiarios.bs, 'Dólares ($us)': stats.egresosDiarios.sus },
      { Concepto: stats.pagosPersonal.label, 'Bolivianos (Bs)': stats.pagosPersonal.bs, 'Dólares ($us)': stats.pagosPersonal.sus },
      { Concepto: stats.pagosProveedores.label, 'Bolivianos (Bs)': stats.pagosProveedores.bs, 'Dólares ($us)': stats.pagosProveedores.sus },
      { Concepto: stats.gastosFijos.label, 'Bolivianos (Bs)': stats.gastosFijos.bs, 'Dólares ($us)': stats.gastosFijos.sus },
      { Concepto: stats.sueldos.label, 'Bolivianos (Bs)': stats.sueldos.bs, 'Dólares ($us)': stats.sueldos.sus },
      { Concepto: stats.adelantos.label, 'Bolivianos (Bs)': stats.adelantos.bs, 'Dólares ($us)': stats.adelantos.sus },
      { Concepto: 'TOTAL EGRESOS', 'Bolivianos (Bs)': stats.totalEgresos.bs, 'Dólares ($us)': stats.totalEgresos.sus },
      { Concepto: 'TOTAL UTILIDADES', 'Bolivianos (Bs)': stats.totalUtilidades.bs, 'Dólares ($us)': stats.totalUtilidades.sus },
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Utilidades');
    XLSX.writeFile(wb, `Reporte_Utilidades_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = async () => {
    if (!stats) {
      Swal.fire('Atención', 'Primero realice una búsqueda para exportar el reporte', 'warning');
      return;
    }
    await exportStandardPDF({
      title: 'Reporte Financiero de Utilidades y Balances',
      subtitle: 'EDKOR MOTORS - Estado de Resultados (Ingresos vs Egresos)',
      filtersText: `Periodo Evaluado: ${getPeriodoText()}`,
      filename: `Utilidades_${new Date().toISOString().split('T')[0]}.pdf`,
      tableOptions: {
        head: [['Concepto Financiero', 'Bolivianos (Bs)', 'Dólares ($us)']],
        body: [
          [stats.ingresos.label, `Bs ${stats.ingresos.bs.toFixed(2)}`, `$us ${stats.ingresos.sus.toFixed(2)}`],
          [stats.otrosIngresos.label, `Bs ${stats.otrosIngresos.bs.toFixed(2)}`, `$us ${stats.otrosIngresos.sus.toFixed(2)}`],
          [{ content: 'TOTAL INGRESOS', styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [4, 120, 87] } }, { content: `Bs ${stats.totalIngresos.bs.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [4, 120, 87] } }, { content: `$us ${stats.totalIngresos.sus.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [4, 120, 87] } }],
          [stats.egresosDiarios.label, `Bs ${stats.egresosDiarios.bs.toFixed(2)}`, `$us ${stats.egresosDiarios.sus.toFixed(2)}`],
          [stats.pagosPersonal.label, `Bs ${stats.pagosPersonal.bs.toFixed(2)}`, `$us ${stats.pagosPersonal.sus.toFixed(2)}`],
          [stats.pagosProveedores.label, `Bs ${stats.pagosProveedores.bs.toFixed(2)}`, `$us ${stats.pagosProveedores.sus.toFixed(2)}`],
          [stats.gastosFijos.label, `Bs ${stats.gastosFijos.bs.toFixed(2)}`, `$us ${stats.gastosFijos.sus.toFixed(2)}`],
          [stats.sueldos.label, `Bs ${stats.sueldos.bs.toFixed(2)}`, `$us ${stats.sueldos.sus.toFixed(2)}`],
          [stats.adelantos.label, `Bs ${stats.adelantos.bs.toFixed(2)}`, `$us ${stats.adelantos.sus.toFixed(2)}`],
          [{ content: 'TOTAL EGRESOS', styles: { fontStyle: 'bold', fillColor: [254, 242, 242], textColor: [185, 28, 28] } }, { content: `Bs ${stats.totalEgresos.bs.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [254, 242, 242], textColor: [185, 28, 28] } }, { content: `$us ${stats.totalEgresos.sus.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [254, 242, 242], textColor: [185, 28, 28] } }],
          [{ content: 'UTILIDAD NETA FINAL', styles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [29, 78, 216], fontSize: 9 } }, { content: `Bs ${stats.totalUtilidades.bs.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [239, 246, 255], textColor: stats.totalUtilidades.bs >= 0 ? [22, 101, 52] : [220, 38, 38], fontSize: 9 } }, { content: `$us ${stats.totalUtilidades.sus.toFixed(2)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [239, 246, 255], textColor: stats.totalUtilidades.sus >= 0 ? [22, 101, 52] : [220, 38, 38], fontSize: 9 } }]
        ],
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'right', cellWidth: 50 },
          2: { halign: 'right', cellWidth: 50 }
        }
      }
    });
  };

  const handlePrint = () => {
    if (!stats) {
      Swal.fire('Atención', 'Primero realice una búsqueda para imprimir los datos', 'warning');
      return;
    }
    window.print();
  };

  return (
    <>
      {/* Encabezado oficial para impresión */}
      <div className="hidden print:block mb-4">
        <StandardPrintHeader
          title="Reporte de Utilidades y Balances"
          subtitle={`Periodo: ${getPeriodoText()}`}
        />
      </div>

      <div className="container mx-auto relative min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 no-print">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <Landmark className="text-blue-600" size={32} />
                Utilidades
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Vista general de las finanzas. Ingresos VS Egresos y utilidad neta
              </p>
            </div>
          </div>
          <StandardExportToolbar
            onExportExcel={exportToExcel}
            onExportPDF={exportToPDF}
            onPrint={handlePrint}
            onHelp={() => setShowManual(true)}
            helpTitle="Ayuda / Manual"
          />
        </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Seleccione una Opción
            </label>
            <select
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm font-medium"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
            >
              <option value="">-- Seleccionar --</option>
              <option value="date">Por fecha</option>
              <option value="month">Mensual</option>
              <option value="year">Anual</option>
            </select>
          </div>

          {filterType === "date" && (
            <>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] outline-none transition-colors text-sm font-medium"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Final</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] outline-none transition-colors text-sm font-medium"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </>
          )}

          {filterType === "month" && (
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seleccionar Mes</label>
              <input
                type="month"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] outline-none transition-colors text-sm font-medium"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          )}

          {filterType === "year" && (
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seleccionar Año</label>
              <select
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-white text-gray-900 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] outline-none transition-colors text-sm font-medium"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {Array.from(
                  { length: 10 },
                  (_, i) => new Date().getFullYear() - 5 + i,
                ).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-[#3498db] hover:bg-[#2980b9] text-white font-medium py-2.5 px-4 rounded-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg text-sm"
            >
              <Search size={16} color="white" /> {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
      </div>

      {stats ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
          <div className="grid grid-cols-12 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-bold text-xs uppercase tracking-wider py-4 px-6">
            <div className="col-span-4">Concepto</div>
            <div className="col-span-3 text-right">Bolivianos</div>
            <div className="col-span-1 text-center">Detalle</div>
            <div className="col-span-3 text-right">Dólares</div>
            <div className="col-span-1 text-center">Detalle</div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
            {/* INGRESOS POR ORDENES */}
            <div className="grid grid-cols-12 py-4 px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 items-center transition-colors">
              <div className="col-span-4 font-semibold text-gray-900 dark:text-white">
                {stats.ingresos.label}
              </div>
              <div className="col-span-3 text-right font-medium">
                {formatMoney(stats.ingresos.bs, "Bs")}
              </div>
              <div className="col-span-1 text-center">
                <button
                  onClick={() =>
                    handleOpenDetail(stats?.ingresos, "Bolivianos")
                  }
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  title="Ver Detalle"
                >
                  <Eye size={16} />
                </button>
              </div>
              <div className="col-span-3 text-right font-medium">
                {formatMoney(stats.ingresos.sus, "Sus")}
              </div>
              <div className="col-span-1 text-center">
                <button
                  onClick={() => handleOpenDetail(stats?.ingresos, "Dólares")}
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  title="Ver Detalle"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>

            {/* OTROS INGRESOS (Debajo de Ingresos por Órdenes) */}
            <div className="grid grid-cols-12 py-4 px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 items-center transition-colors">
              <div className="col-span-4 font-semibold text-gray-900 dark:text-white">
                {stats.otrosIngresos.label}
              </div>
              <div className="col-span-3 text-right font-medium">
                {formatMoney(stats.otrosIngresos.bs, "Bs")}
              </div>
              <div className="col-span-1 text-center">
                <button
                  onClick={() =>
                    handleOpenDetail(stats?.otrosIngresos, "Bolivianos")
                  }
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  title="Ver Detalle"
                >
                  <Eye size={16} />
                </button>
              </div>
              <div className="col-span-3 text-right font-medium">
                {formatMoney(stats.otrosIngresos.sus, "Sus")}
              </div>
              <div className="col-span-1 text-center">
                <button
                  onClick={() => handleOpenDetail(stats?.otrosIngresos, "Dólares")}
                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  title="Ver Detalle"
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>

            {/* TOTAL INGRESOS */}
            <div className="grid grid-cols-12 py-3.5 px-6 bg-emerald-50 dark:bg-emerald-900/20 border-y border-emerald-100 dark:border-emerald-800 font-bold text-emerald-800 dark:text-emerald-300 items-center">
              <div className="col-span-4">TOTAL INGRESOS</div>
              <div className="col-span-3 text-right">
                {formatMoney(stats.totalIngresos.bs, "Bs")}
              </div>
              <div className="col-span-1"></div>
              <div className="col-span-3 text-right">
                $us {stats.totalIngresos.sus.toFixed(2)}
              </div>
              <div className="col-span-1"></div>
            </div>

            {/* EGRESOS ITEMS */}
            {[
              stats.egresosDiarios,
              stats.pagosPersonal,
              stats.pagosProveedores,
              stats.gastosFijos,
              stats.sueldos,
              stats.adelantos,
            ].map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 py-4 px-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 items-center transition-colors"
              >
                <div className="col-span-4 font-semibold text-gray-900 dark:text-white">{item.label}</div>
                <div className="col-span-3 text-right font-medium">
                  {formatMoney(item.bs, "Bs")}
                </div>
                <div className="col-span-1 text-center">
                  <button
                    onClick={() => handleOpenDetail(item, "Bolivianos")}
                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                    title="Ver Detalle"
                  >
                    <Eye size={16} />
                  </button>
                </div>
                <div className="col-span-3 text-right font-medium">
                  {formatMoney(item.sus, "Sus")}
                </div>
                <div className="col-span-1 text-center">
                  <button
                    onClick={() => handleOpenDetail(item, "Dólares")}
                    className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                    title="Ver Detalle"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>
            ))}

            {/* TOTAL EGRESOS */}
            <div className="grid grid-cols-12 py-3.5 px-6 bg-red-50 dark:bg-red-900/20 border-y border-red-100 dark:border-red-800 font-bold text-red-800 dark:text-red-300 items-center">
              <div className="col-span-4">TOTAL EGRESOS</div>
              <div className="col-span-3 text-right">
                {formatMoney(stats.totalEgresos.bs, "Bs")}
              </div>
              <div className="col-span-1"></div>
              <div className="col-span-3 text-right">
                $us {stats.totalEgresos.sus.toFixed(2)}
              </div>
              <div className="col-span-1"></div>
            </div>

            {/* TOTAL UTILIDADES */}
            <div className="grid grid-cols-12 py-5 px-6 bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-200 dark:border-blue-700 items-center">
              <div className="col-span-4 text-xl font-bold text-gray-800 dark:text-gray-200">
                TOTAL UTILIDADES
              </div>
              <div
                className={`col-span-3 text-right text-xl font-bold ${stats.totalUtilidades.bs >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {formatMoney(stats.totalUtilidades.bs, "Bs")}
              </div>
              <div className="col-span-1"></div>
              <div
                className={`col-span-3 text-right text-xl font-bold ${stats.totalUtilidades.sus >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                $us {stats.totalUtilidades.sus.toFixed(2)}
              </div>
              <div className="col-span-1"></div>
            </div>
          </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700 transition-colors">
          <Landmark className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="font-medium text-base">Seleccione los filtros para consultar el reporte de utilidades</p>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDetail && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 transition-opacity"
              onClick={closeModal}
              aria-hidden="true"
            ></div>
            <span
              className="hidden sm:inline-block sm:align-middle sm:h-screen"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <div
              className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-700 transform transition-all w-full sm:my-8 sm:align-middle sm:w-[92%] sm:max-w-5xl"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    Detalle: {selectedDetail.title} ({selectedDetail.currency})
                  </h3>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-semibold border border-blue-200 dark:border-blue-800">
                    {selectedDetail.items.length} registros
                  </span>
                </div>

                <div className="max-h-[550px] overflow-y-auto overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full min-w-[540px] text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                          #
                        </th>
                        <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Forma Pago
                        </th>
                        <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">
                          Monto
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {selectedDetail.items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-8 text-center text-sm text-gray-500 italic"
                          >
                            No hay registros
                          </td>
                        </tr>
                      ) : (
                        selectedDetail.items.map((item, index) => (
                          <tr
                            key={item.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                              {index + 1}
                            </td>
                            <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                              {item.fecha}
                            </td>
                            <td className="p-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                              {item.descripcion}
                            </td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                {item.formaPago || 'N/A'}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-gray-900 dark:text-gray-100 text-right font-bold">
                              {item.monto.toLocaleString("es-BO", {
                                style: "currency",
                                currency:
                                  selectedDetail.currency === "Bolivianos"
                                    ? "BOB"
                                    : "USD",
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-gray-700/60 font-bold border-t border-gray-200 dark:border-gray-700">
                      <tr>
                        <td
                          colSpan={4}
                          className="p-4 text-sm text-gray-900 dark:text-gray-100 text-right"
                        >
                          TOTAL:
                        </td>
                        <td className="p-4 text-sm text-blue-600 dark:text-blue-400 text-right font-bold">
                          {selectedDetail.items
                            .reduce((sum, i) => sum + i.monto, 0)
                            .toLocaleString("es-BO", {
                              style: "currency",
                              currency:
                                selectedDetail.currency === "Bolivianos"
                                  ? "BOB"
                                  : "USD",
                            })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 text-sm cursor-pointer"
                  onClick={closeModal}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showManual && (
        <ManualModal
          isOpen={showManual}
          onClose={() => setShowManual(false)}
          title="Manual Utilidades"
          sections={manualSections}
        />
      )}

      {/* Pie de página oficial para impresión */}
      <div className="hidden print:block mt-8">
        <StandardPrintFooter />
      </div>
    </div>
    </>
  );
};

export default Utilidades;
