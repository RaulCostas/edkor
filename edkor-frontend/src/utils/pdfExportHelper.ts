import jsPDF from "jspdf";
import autoTable, { type UserOptions } from "jspdf-autotable";

export const loadLogoBase64 = (url = "/logo.jpg"): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL("image/jpeg", 0.95));
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export interface StandardPDFOptions {
  title: string;
  subtitle?: string;
  filtersText?: string;
  totalRecords: number;
  totalRecordsLabel?: string;
  tableOptions: UserOptions;
  filename: string;
  orientation?: "portrait" | "landscape";
}

export const exportStandardPDF = async (options: StandardPDFOptions) => {
  const orientation = options.orientation || "landscape";
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  // Cargar logo oficial
  const logoBase64 = await loadLogoBase64();
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "JPEG", margin, 8, 30, 16);
    } catch {
      // continuar si falla imagen
    }
  }

  // Título principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(options.title.toUpperCase(), pageWidth / 2, 13, { align: "center" });

  // Subtítulo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text(
    (options.subtitle || "EDKOR MOTORS - CONTROL Y GESTIÓN DE TALLER").toUpperCase(),
    pageWidth / 2,
    18,
    { align: "center" }
  );

  // Filtros aplicados si existen
  if (options.filtersText) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(options.filtersText, pageWidth / 2, 22, { align: "center" });
  }

  // Metadatos (derecha)
  const fechaHoy = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const horaHoy = new Date().toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const recordsLabel = options.totalRecordsLabel || "Total Registros";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(`${recordsLabel}: ${options.totalRecords}`, pageWidth - margin, 11, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha: ${fechaHoy}`, pageWidth - margin, 15, { align: "right" });
  doc.text(`Hora: ${horaHoy}`, pageWidth - margin, 19, { align: "right" });

  // Línea divisoria formal
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.5);
  doc.line(margin, 25, pageWidth - margin, 25);

  // Configuración estandarizada de estilos de tabla
  const defaultHeadStyles = {
    fillColor: [241, 245, 249] as [number, number, number],
    textColor: [30, 41, 59] as [number, number, number],
    fontStyle: "bold" as const,
    fontSize: 7.5,
    halign: "left" as const,
    lineColor: [203, 213, 225] as [number, number, number],
    lineWidth: 0.2,
  };

  const defaultBodyStyles = {
    fontSize: 7,
    textColor: [15, 23, 42] as [number, number, number],
    lineColor: [226, 232, 240] as [number, number, number],
    lineWidth: 0.1,
  };

  const defaultFootStyles = {
    fillColor: [241, 245, 249] as [number, number, number],
    textColor: [30, 41, 59] as [number, number, number],
    fontSize: 8,
    lineColor: [148, 163, 184] as [number, number, number],
    lineWidth: 0.3,
  };

  const finalTableOptions: UserOptions = {
    startY: 28,
    theme: "grid",
    headStyles: defaultHeadStyles,
    bodyStyles: defaultBodyStyles,
    footStyles: defaultFootStyles,
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: margin, right: margin },
    ...options.tableOptions,
    didDrawPage: (data) => {
      if (options.tableOptions.didDrawPage) {
        options.tableOptions.didDrawPage(data);
      }
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      const pageNumber = `Página ${data.pageNumber}`;
      doc.text(
        "Sistema de Gestión de Taller EDKOR MOTORS",
        margin,
        doc.internal.pageSize.getHeight() - 6
      );
      doc.text(
        pageNumber,
        doc.internal.pageSize.getWidth() - margin,
        doc.internal.pageSize.getHeight() - 6,
        { align: "right" }
      );
    },
  };

  autoTable(doc, finalTableOptions);
  doc.save(options.filename);
};
