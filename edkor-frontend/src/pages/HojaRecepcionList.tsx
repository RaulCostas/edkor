import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  FileText,
  Eye,
  Printer,
  X,
  ClipboardList,
  Pencil,
  Trash2,
  Wrench,
  MessageCircle,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import Pagination from "../components/Pagination";
import Swal from "sweetalert2";
import ManualModal, { type ManualSection } from "../components/ManualModal";
import { StandardExportToolbar } from "../components/common/StandardExportToolbar";
import { API_BASE_URL } from "../config";
import {
  getHojasRecepcion,
  deleteHojaRecepcion,
  getHojaRecepcion,
} from "../services/hojaRecepcionService";
import type { HojaRecepcion } from "../services/hojaRecepcionService";
import { getTiposOrdenEnHojasRecepcion } from "../services/tipoOrdenService";
import type { TipoOrden } from "../types/tipoOrden";
import { getLocalDateString } from "../utils/dateUtils";
import HojaRecepcionPrintView from "../components/HojaRecepcionPrintView";
import AltaRecepcionPrintView, {
  type AltaRecepcionData,
} from "../components/AltaRecepcionPrintView";
import { HojasRecepcionListPrintView } from "../components/HojasRecepcionListPrintView";

const HojaRecepcionList = () => {
  const navigate = useNavigate();
  const [hojas, setHojas] = useState<HojaRecepcion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTipoOrden, setSelectedTipoOrden] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<"todos" | "hoy" | "ayer" | "semana">("todos");
  const [tiposOrden, setTiposOrden] = useState<TipoOrden[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedHoja, setSelectedHoja] = useState<HojaRecepcion | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [altaModalOpen, setAltaModalOpen] = useState(false);
  const [printMode, setPrintMode] = useState<"hoja" | "alta">("hoja");
  const [isPrintingList, setIsPrintingList] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [whatsappHoja, setWhatsappHoja] = useState<HojaRecepcion | null>(null);
  const whatsappPrintRef = useRef<HTMLDivElement>(null);

  const handleView = async (id: number) => {
    try {
      const data = await getHojaRecepcion(id);
      setSelectedHoja(data);
      setPrintMode("hoja");
      setViewModalOpen(true);
    } catch (error) {
      Swal.fire("Error", "No se pudo cargar la hoja de recepción", "error");
    }
  };

  const handlePrint = async (id: number) => {
    try {
      const data = await getHojaRecepcion(id);
      setIsPrintingList(false);
      setSelectedHoja(data);
      setPrintMode("hoja");
      setTimeout(() => {
        window.print();
      }, 400);
    } catch (error) {
      Swal.fire("Error", "No se pudo preparar la impresión", "error");
    }
  };

  const handlePrintAlta = async (id: number) => {
    try {
      const data = await getHojaRecepcion(id);
      setIsPrintingList(false);
      setSelectedHoja(data);
      setPrintMode("alta");
      setTimeout(() => {
        window.print();
      }, 400);
    } catch (error) {
      Swal.fire("Error", "No se pudo preparar la impresión", "error");
    }
  };

  const loadImageAsBase64 = (url: string): Promise<string | null> => {
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

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredHojas.map((h, idx) => ({
        "#": idx + 1,
        "N° Hoja": String(h.nro || h.id).padStart(6, "0"),
        "Tipo Orden":
          h.tipo_orden?.tipo_orden || (h as any)?.tipo_orden || "Particular",
        Fecha: h.fecha_ingreso
          ? new Date(h.fecha_ingreso).toLocaleDateString("es-ES")
          : "-",
        Placa: h.vehiculo_placa || "-",
        Marca: h.vehiculo_marca || "-",
        Modelo: h.vehiculo_modelo || "-",
        Color: h.vehiculo_color || "-",
        Cliente: h.cliente_nombre || "-",
        Teléfono: h.cliente_telefono || "-",
        Asesor: h.asesor
          ? `${h.asesor.nombre || ""} ${h.asesor.paterno || ""}`.trim()
          : "-",
        Estado: h.estado || "REGISTRADO",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HojasRecepcion");
    XLSX.writeFile(
      workbook,
      `HojasRecepcion_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const exportToPDF = async () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;

    const logoBase64 = await loadImageAsBase64("/logo.jpg");
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, "JPEG", margin, 8, 30, 16);
      } catch {
        // Silently fallback if error
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("REPORTE DE HOJAS DE RECEPCIÓN", pageWidth / 2, 13, {
      align: "center",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      "EDKOR MOTORS - CONTROL Y GESTIÓN DE TALLER",
      pageWidth / 2,
      18,
      { align: "center" }
    );

    if (searchTerm || selectedTipoOrden) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const matchedTipo = tiposOrden.find(
        (t) => String(t.id) === selectedTipoOrden
      );
      const tipoNombreLabel = matchedTipo
        ? matchedTipo.tipo_orden
        : selectedTipoOrden;
      const filtroTexto = `Filtros: ${
        selectedTipoOrden ? `Tipo: ${tipoNombreLabel}` : ""
      } ${searchTerm ? `| Búsqueda: "${searchTerm}"` : ""}`;
      doc.text(filtroTexto, pageWidth / 2, 22, { align: "center" });
    }

    const fechaHoy = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const horaHoy = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `Total Hojas: ${filteredHojas.length}`,
      pageWidth - margin,
      11,
      { align: "right" }
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha: ${fechaHoy}`, pageWidth - margin, 15, { align: "right" });
    doc.text(`Hora: ${horaHoy}`, pageWidth - margin, 19, { align: "right" });

    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.line(margin, 25, pageWidth - margin, 25);

    autoTable(doc, {
      startY: 28,
      head: [
        [
          "#",
          "N° Hoja",
          "Tipo Orden",
          "Fecha",
          "Placa",
          "Vehículo",
          "Cliente",
          "Teléfono",
          "Asesor",
          "Estado",
        ],
      ],
      body: filteredHojas.map((h, index) => [
        index + 1,
        String(h.nro || h.id).padStart(6, "0"),
        h.tipo_orden?.tipo_orden || (h as any)?.tipo_orden || "Particular",
        h.fecha_ingreso
          ? new Date(h.fecha_ingreso).toLocaleDateString("es-ES")
          : "-",
        h.vehiculo_placa || "-",
        `${h.vehiculo_marca || ""} ${h.vehiculo_modelo || ""}`.trim() || "-",
        h.cliente_nombre || "-",
        h.cliente_telefono || "-",
        h.asesor
          ? `${h.asesor.nombre || ""} ${h.asesor.paterno || ""}`.trim()
          : "-",
        (h.estado || "REGISTRADO").toUpperCase(),
      ]),
      foot: [
        [
          {
            content: `TOTAL REGISTROS: ${filteredHojas.length} HOJAS DE RECEPCIÓN`,
            colSpan: 10,
            styles: { halign: "right", fontStyle: "bold" },
          },
        ],
      ],
      theme: "grid",
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        fontSize: 7.5,
        halign: "left",
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontSize: 8,
        lineColor: [148, 163, 184],
        lineWidth: 0.3,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "center", fontStyle: "bold", cellWidth: 18 },
        2: { cellWidth: 26 },
        3: { halign: "center", cellWidth: 20 },
        4: { halign: "center", fontStyle: "bold", cellWidth: 18 },
        5: { cellWidth: 38 },
        6: { cellWidth: "auto" },
        7: { cellWidth: 24, fontSize: 6.5 },
        8: { cellWidth: 30, fontSize: 6.5 },
        9: {
          halign: "center",
          fontStyle: "bold",
          cellWidth: 24,
          fontSize: 6.5,
        },
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
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
    });

    doc.save(`HojasRecepcion_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const printList = () => {
    setSelectedHoja(null);
    setIsPrintingList(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const manualSections: ManualSection[] = [
    {
      title: "Gestión de Hojas de Recepción",
      content:
        "Consulte, registre y controle el ingreso de vehículos al taller con su inventario de accesorios, nivel de combustible y estado visual.",
    },
    {
      title: "Filtros y Búsqueda",
      content:
        'Busque rápidamente por cliente, placa o número de hoja, o filtre por "Tipo de Orden" (Particular, Seguros, etc.). Los filtros se mantienen al exportar a Excel, PDF o Imprimir.',
    },
    {
      title: "Nueva Hoja de Recepción",
      content:
        'Haga clic en "+ Nueva Hoja" para registrar un nuevo ingreso de vehículo con el diagrama de daños y firma del cliente/asesor.',
    },
    {
      title: "Exportación e Impresión del Listado",
      content:
        "Utilice los botones superiores para exportar a Excel (.xlsx), generar un reporte formal en PDF con membrete y logo de EDKOR MOTORS o imprimir el listado en papel.",
    },
    {
      title: "Acciones por Fila",
      content:
        "Puede Ver la hoja digital, Imprimir la Hoja de Recepción individual o el Acta de Entrega/Alta, enviar la hoja por WhatsApp al cliente y Editar/Desactivar registros según corresponda.",
    },
  ];

  const handleSendWhatsApp = async (id: number) => {
    try {
      const hojaData = await getHojaRecepcion(id);
      const telefonoInicial = hojaData.cliente_telefono || "";

      const result = await Swal.fire({
        title: "Enviar Hoja de Recepción por WhatsApp",
        html: `
          <div class="text-left">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Número de teléfono del cliente:
            </label>
            <input
              type="text"
              id="swal-hoja-phone"
              class="swal2-input"
              value="${telefonoInicial}"
              placeholder="Ej: 59170000000"
            />
            <p class="text-xs text-gray-500 mt-2">
              El PDF de la Hoja de Recepción N° ${String(hojaData.nro).padStart(6, "0")} será enviado a este número mediante el Chatbot.
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: "Enviar PDF",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#16a34a",
        preConfirm: () => {
          const phoneInput = document.getElementById("swal-hoja-phone") as HTMLInputElement;
          const phone = phoneInput?.value?.trim();
          if (!phone) {
            Swal.showValidationMessage("Por favor ingrese un número de teléfono");
            return false;
          }
          return phone;
        },
      });

      if (!result.isConfirmed || !result.value) return;
      const confirmedPhone = result.value;

      Swal.fire({
        title: "Generando PDF...",
        text: "Por favor espere",
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // Renderizar la vista de impresión fuera de pantalla para capturarla idéntica
      setWhatsappHoja(hojaData);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 450);
        });
      });

      const element = whatsappPrintRef.current;
      if (!element) {
        throw new Error("No se pudo renderizar la vista de impresión");
      }

      // Esperar a que carguen todas las imágenes (logo, diagrama, firmas)
      const images = Array.from(element.querySelectorAll("img"));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise<void>((res) => {
            img.onload = () => res();
            img.onerror = () => res();
          });
        })
      );

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 6;
      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - margin * 2;

      const ratio = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
      const renderWidth = canvas.width * ratio;
      const renderHeight = canvas.height * ratio;
      const offsetX = (pageWidth - renderWidth) / 2;

      doc.addImage(imgData, "JPEG", offsetX, margin, renderWidth, renderHeight);

      const pdfBlob = doc.output("blob");

      Swal.update({
        title: "Enviando por WhatsApp...",
        text: "Por favor espere",
        showConfirmButton: false,
      });
      Swal.showLoading();

      const nroPad = String(hojaData.nro).padStart(6, "0");
      const placaSlug = (hojaData.vehiculo_placa || "SIN_PLACA").replace(/[^a-zA-Z0-9_-]/g, "");
      const formData = new FormData();
      formData.append("file", pdfBlob, `Hoja_Recepcion_${nroPad}_${placaSlug}.pdf`);
      formData.append("phoneNumber", confirmedPhone);
      formData.append(
        "caption",
        `Hoja de Recepción N° ${nroPad} - ${hojaData.cliente_nombre}${
          hojaData.vehiculo_placa ? ` (${hojaData.vehiculo_placa.toUpperCase()})` : ""
        }`
      );

      const response = await fetch(`${API_BASE_URL}/chatbot/send-document`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to send document");
      }

      await Swal.fire({
        icon: "success",
        title: "¡Enviado!",
        text: "El PDF de la Hoja de Recepción fue enviado por WhatsApp exitosamente",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error sending Hoja de Recepción by WhatsApp:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo enviar el PDF por WhatsApp. Verifique que el bot esté conectado.",
      });
    } finally {
      setWhatsappHoja(null);
    }
  };

  const handleOpenAltaRecepcion = async (id: number) => {
    try {
      const data = await getHojaRecepcion(id);
      setSelectedHoja(data);
      setPrintMode("alta");
      setAltaModalOpen(false);
      setTimeout(() => {
        window.print();
      }, 300);
    } catch (error) {
      Swal.fire("Error", "No se pudo preparar el Alta de Recepción", "error");
    }
  };

  const handlePrintAltaNow = () => {
    setPrintMode("alta");
    setTimeout(() => {
      window.print();
    }, 300);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [hojasData, tiposEnHojas] = await Promise.all([
        getHojasRecepcion(),
        getTiposOrdenEnHojasRecepcion().catch(() => []),
      ]);
      setHojas(hojasData);

      // Extraer y consolidar solo los tipos de orden registrados en las hojas de recepción
      const tiposMap = new Map<string, { id: string; tipo_orden: string }>();

      tiposEnHojas.forEach((t) => {
        if (t && t.tipo_orden) {
          tiposMap.set(t.tipo_orden.trim().toLowerCase(), {
            id: String(t.id),
            tipo_orden: t.tipo_orden.trim(),
          });
        }
      });

      hojasData.forEach((h) => {
        const nombre = h.tipo_orden?.tipo_orden || (h as any).tipo_orden;
        const id = h.tipo_orden_id || h.tipo_orden?.id;
        if (nombre && typeof nombre === "string" && nombre.trim()) {
          const key = nombre.trim().toLowerCase();
          if (!tiposMap.has(key)) {
            tiposMap.set(key, {
              id: String(id || nombre),
              tipo_orden: nombre.trim(),
            });
          }
        }
      });

      const tiposRegistrados = Array.from(tiposMap.values()).sort((a, b) =>
        a.tipo_orden.localeCompare(b.tipo_orden)
      );
      setTiposOrden(tiposRegistrados as TipoOrden[]);
    } catch (error) {
      Swal.fire(
        "Error",
        "No se pudieron cargar las hojas de recepción",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const target = hojas.find((h) => h.id === id);
    const targetEst = (target?.estado || "").toLowerCase();
    if (
      target &&
      (targetEst === "finalizado" ||
        targetEst === "terminado" ||
        targetEst === "orden cerrada" ||
        targetEst === "cerrada" ||
        targetEst === "anulado" ||
        targetEst === "anulada")
    ) {
      Swal.fire({
        icon: "warning",
        title: "Acción bloqueada",
        text: targetEst.includes("anula")
          ? "No se puede eliminar una hoja de recepción anulada."
          : targetEst.includes("cerrad")
          ? "No se puede eliminar una hoja de recepción con orden de trabajo cerrada."
          : "No se puede eliminar una hoja de recepción cuya orden de trabajo ya está terminada.",
      });
      return;
    }

    const result = await Swal.fire({
      title: "¿Está seguro?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      try {
        await deleteHojaRecepcion(id);
        setHojas(hojas.filter((h) => h.id !== id));
        Swal.fire(
          "Eliminada",
          "La hoja de recepción ha sido eliminada.",
          "success"
        );
      } catch (error) {
        Swal.fire("Error", "No se pudo eliminar la hoja", "error");
      }
    }
  };

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case "Orden Creada":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800";
      case "En Proceso":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800";
      case "Finalizado":
      case "Terminado":
      case "Terminado en Taller":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800";
      case "Orden Cerrada":
      case "Cerrada":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700";
      case "Anulado":
      case "Anulada":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800";
      case "Pendiente":
      default:
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800";
    }
  };

  const getAsesorPhone = (asesor?: any): string => {
    if (!asesor) return "";
    const cel = (asesor.celular || "").trim();
    const tel = (asesor.telefono || "").trim();
    const celDigits = cel.replace(/[^0-9]/g, "");
    const telDigits = tel.replace(/[^0-9]/g, "");

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
    if (!phone) return "-";
    const clean = phone.trim();
    if (!clean) return "-";
    if (clean.startsWith("(")) {
      return clean;
    }
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

  const filteredHojas = hojas.filter((h) => {
    const matchesSearch =
      h.cliente_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.vehiculo_placa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.nro?.toString().includes(searchTerm);

    if (!matchesSearch) return false;

    if (selectedTipoOrden) {
      const tipoId = String(h.tipo_orden_id || h.tipo_orden?.id || "");
      const tipoNombre = (h.tipo_orden?.tipo_orden || (h as any).tipo_orden || "Particular").toLowerCase();
      const matched = tiposOrden.find((t) => String(t.id) === selectedTipoOrden);
      const targetNombre = (matched?.tipo_orden || "").toLowerCase();

      const matchesTipo =
        tipoId === selectedTipoOrden || (targetNombre && tipoNombre === targetNombre);
      if (!matchesTipo) return false;
    }

    if (selectedDateFilter !== "todos") {
      const todayStr = getLocalDateString(new Date());
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = getLocalDateString(yesterdayDate);

      const now = new Date();
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const mondayDate = new Date(now);
      mondayDate.setDate(now.getDate() - diffToMonday);
      const mondayStr = getLocalDateString(mondayDate);

      const hojaDate = getLocalDateString(h.fecha_ingreso || (h as any).created_at);

      if (selectedDateFilter === "hoy" && hojaDate !== todayStr) return false;
      if (selectedDateFilter === "ayer" && hojaDate !== yesterdayStr) return false;
      if (selectedDateFilter === "semana" && (hojaDate < mondayStr || hojaDate > todayStr)) return false;
    }

    return true;
  });

  const totalPages = Math.ceil(filteredHojas.length / itemsPerPage);
  const paginatedHojas = filteredHojas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const mapHojaToAltaData = (hoja: HojaRecepcion): AltaRecepcionData => ({
    nro: hoja.nro || hoja.id,
    fecha: hoja.created_at,
    tipo_orden: hoja.tipo_orden?.tipo_orden || undefined,
    cliente_nombre: hoja.cliente_nombre,
    cliente_telefono: formatPhoneDisplay(hoja.cliente_telefono),
    cliente_fecha_nacimiento: hoja.cliente_fecha_nacimiento,
    asesor_nombre: hoja.asesor
      ? `${hoja.asesor.nombre} ${hoja.asesor.paterno || ""}`.trim()
      : undefined,
    asesor_celular: hoja.asesor
      ? formatPhoneDisplay(getAsesorPhone(hoja.asesor))
      : undefined,
    vehiculo_marca: hoja.vehiculo_marca,
    vehiculo_modelo: hoja.vehiculo_modelo,
    vehiculo_placa: (hoja.vehiculo_placa || "").toUpperCase(),
    vehiculo_color: hoja.vehiculo_color,
    vehiculo_kilometraje: hoja.vehiculo_kilometraje,
    vehiculo_chasis: hoja.vehiculo_chasis,
    trabajos_solicitados: hoja.trabajos_solicitados,
    observaciones: hoja.observaciones,
  });

  return (
    <>
      <div className="container mx-auto relative min-h-screen print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
              <FileText className="text-blue-600" size={32} />
              Hojas de Recepción
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Gestione las hojas de recepción de vehículos
            </p>
          </div>
          <StandardExportToolbar
            onExportExcel={exportToExcel}
            onExportPDF={exportToPDF}
            onPrint={printList}
            onHelp={() => setShowManual(true)}
            helpTitle="Ayuda / Manual de Hoja de Recepción"
          >
            <button
              onClick={() => navigate("/hoja-recepcion/nueva")}
              className="bg-[#3498db] hover:bg-[#2980b9] text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 font-medium text-xs sm:text-sm"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" /> Nueva Hoja
            </button>
          </StandardExportToolbar>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 no-print">
          <div className="relative w-full md:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar por cliente, placa o Nro..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <div className="w-full sm:w-auto">
            <select
              value={selectedTipoOrden}
              onChange={(e) => {
                setSelectedTipoOrden(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-56 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all text-sm cursor-pointer"
            >
              <option value="">Todos los Tipos de Orden</option>
              {tiposOrden.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tipo_orden}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Rápido de Fechas: Todas, Hoy, Ayer, Esta Semana */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => {
                setSelectedDateFilter("todos");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedDateFilter === "todos"
                  ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDateFilter("hoy");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedDateFilter === "hoy"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Hojas registradas hoy"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDateFilter("ayer");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedDateFilter === "ayer"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Hojas registradas ayer"
            >
              Ayer
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDateFilter("semana");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedDateFilter === "semana"
                  ? "bg-blue-600 text-white shadow-xs font-bold"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Hojas de esta semana"
            >
              Esta Semana
            </button>
          </div>

          {(searchTerm || selectedTipoOrden || selectedDateFilter !== "todos") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedTipoOrden("");
                setSelectedDateFilter("todos");
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors border border-red-200 dark:border-red-800 flex items-center gap-1 cursor-pointer shrink-0"
              title="Limpiar filtros"
            >
              <X className="h-4 w-4" />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        <div className="mb-2 text-sm text-gray-500 dark:text-gray-400 no-print">
          Mostrando {filteredHojas.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} -{" "}
          {Math.min(currentPage * itemsPerPage, filteredHojas.length)} de {filteredHojas.length} registros
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16">
                    #
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    N° Hoja
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tipo Orden
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Placa
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Vehículo
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Asesor
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right no-print">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500">
                      Cargando hojas de recepción...
                    </td>
                  </tr>
                ) : filteredHojas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-8 text-center text-gray-500 dark:text-gray-400"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="h-8 w-8 text-gray-400" />
                        <p>No se encontraron hojas de recepción</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedHojas.map((hoja, index) => (
                    <tr
                      key={hoja.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="p-4 text-blue-600 dark:text-blue-400 font-bold text-sm">
                        {String(hoja.nro || hoja.id).padStart(6, "0")}
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                        {(() => {
                          const tipo = hoja.tipo_orden?.tipo_orden || (hoja as any).tipo_orden || "Particular";
                          const isSeguro = tipo.toLowerCase().includes("seguro");
                          return (
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                isSeguro
                                  ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
                              }`}
                            >
                              {tipo}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                        {new Date(hoja.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-gray-800 dark:text-gray-200 font-mono font-bold uppercase text-sm">
                        {(hoja.vehiculo_placa || (hoja as any).placa || "S/P").toUpperCase()}
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {hoja.marca_auto?.marca || hoja.vehiculo_marca || "N/A"}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {hoja.vehiculo_modelo || (hoja as any).modelo || ""}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-200 font-medium text-sm">
                        {hoja.cliente_nombre || (hoja as any).cliente}
                        <div className="text-xs text-gray-400 font-normal font-mono">
                          {formatPhoneDisplay(hoja.cliente_telefono || (hoja as any).celular)}
                        </div>
                      </td>
                      <td className="p-4 text-gray-700 dark:text-gray-200 text-sm">
                        {hoja.asesor
                          ? `${hoja.asesor.nombre} ${hoja.asesor.paterno}`
                          : "No asignado"}
                      </td>
                      <td className="p-4 text-sm">
                        <div className="flex flex-col items-start gap-1">
                          {(() => {
                            const est = (hoja.estado || "").toLowerCase();
                            const isAnulada = est === "anulada" || est === "anulado";
                            const estadoLabel = isAnulada ? "Anulada" : hoja.estado;
                            return (
                              <>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getEstadoBadgeClass(
                                    hoja.estado
                                  )}`}
                                >
                                  {estadoLabel}
                                </span>
                                {isAnulada && hoja.motivo_anulacion && (
                                  <span
                                    className="text-[11px] text-red-500 dark:text-red-400 font-normal italic max-w-[140px] truncate"
                                    title={`Motivo: ${hoja.motivo_anulacion}`}
                                  >
                                    Motivo: {hoja.motivo_anulacion}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="p-4 text-right no-print">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAltaRecepcion(hoja.id)}
                            className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                            title="Imprimir Orden de Trabajo"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </button>
                          {(() => {
                            const est = (hoja.estado || "").toLowerCase();
                            const isTerminado = est === "finalizado" || est === "terminado" || est === "terminado en taller";
                            const isCerrada = est === "orden cerrada" || est === "cerrada";
                            const isAnulada = est === "anulada" || est === "anulado";
                            const isBlocked = isTerminado || isCerrada || isAnulada;
                            const hasOrden = est === "orden creada" || est === "en proceso" || isTerminado || isCerrada || isAnulada;

                            return (
                              <>
                                {!hasOrden && (
                                  <button
                                    onClick={() =>
                                      navigate(`/ordenes-trabajo/create?hojaId=${hoja.id}`)
                                    }
                                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                    title="Crear Orden de Trabajo"
                                  >
                                    <Wrench className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleView(hoja.id)}
                                  className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                  title="Ver Hoja de Recepción"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handlePrint(hoja.id)}
                                  className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                                  title="Imprimir Hoja de Recepción"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleSendWhatsApp(hoja.id)}
                                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                                  title="Enviar por WhatsApp (PDF)"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    !isBlocked &&
                                    navigate(`/hoja-recepcion/editar/${hoja.id}`)
                                  }
                                  disabled={isBlocked}
                                  className={`p-2 rounded-lg shadow-sm transition-all ${
                                    isBlocked
                                      ? "bg-gray-200 dark:bg-gray-700/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                      : "bg-amber-400 hover:bg-amber-500 text-white transform hover:-translate-y-0.5 cursor-pointer"
                                  }`}
                                  title={
                                    isAnulada
                                      ? "Hoja anulada: edición bloqueada"
                                      : isCerrada
                                      ? "Orden cerrada: edición bloqueada"
                                      : isTerminado
                                      ? "Orden terminada: edición bloqueada"
                                      : "Editar"
                                  }
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => !isBlocked && handleDelete(hoja.id)}
                                  disabled={isBlocked}
                                  className={`p-2 rounded-lg shadow-sm transition-all ${
                                    isBlocked
                                      ? "bg-gray-200 dark:bg-gray-700/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                                      : "bg-red-500 hover:bg-red-600 text-white transform hover:-translate-y-0.5 cursor-pointer"
                                  }`}
                                  title={
                                    isAnulada
                                      ? "Hoja anulada: no se puede eliminar"
                                      : isCerrada
                                      ? "Orden cerrada: no se puede eliminar"
                                      : isTerminado
                                      ? "Orden terminada: no se puede eliminar"
                                      : "Eliminar"
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Print View Individual (Hidden on screen, shown when printing individual hoja/alta) */}
      {!isPrintingList && selectedHoja && (
        <div className="hidden print:block w-full bg-white text-black">
          {printMode === "alta" ? (
            <AltaRecepcionPrintView data={mapHojaToAltaData(selectedHoja)} />
          ) : (
            <HojaRecepcionPrintView hoja={selectedHoja} />
          )}
        </div>
      )}

      {/* Print View Lista de Hojas de Recepción (mostrado al hacer clic en Imprimir lista) */}
      {isPrintingList && (
        <div className="hidden print:block w-full bg-white text-black">
          <HojasRecepcionListPrintView
            hojas={filteredHojas}
            searchTerm={searchTerm}
            selectedTipoOrden={
              tiposOrden.find((t) => String(t.id) === selectedTipoOrden)
                ?.tipo_orden || selectedTipoOrden
            }
          />
        </div>
      )}

      <ManualModal
        isOpen={showManual}
        onClose={() => setShowManual(false)}
        title="Manual de Hojas de Recepción"
        sections={manualSections}
      />

      {/* View Modal: Hoja de Recepción */}
      {viewModalOpen && selectedHoja && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-end p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative">
              <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-800 dark:text-white">
                Hoja de Recepción
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSendWhatsApp(selectedHoja.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:-translate-y-0.5 shadow-sm cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" /> Enviar WhatsApp
                </button>
                <button
                  onClick={() => handlePrint(selectedHoja.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:-translate-y-0.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="p-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-all transform hover:-translate-y-0.5 shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <HojaRecepcionPrintView hoja={selectedHoja} />
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alta de Recepción */}
      {altaModalOpen && selectedHoja && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 print:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 z-10 flex items-center justify-end p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 relative">
              <h2 className="absolute left-1/2 -translate-x-1/2 text-xl font-bold text-gray-800 dark:text-white">
                Orden de Trabajo
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintAltaNow}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all transform hover:-translate-y-0.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Imprimir Orden de Trabajo
                </button>
                <button
                  onClick={() => setAltaModalOpen(false)}
                  className="p-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-all transform hover:-translate-y-0.5 shadow-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <AltaRecepcionPrintView data={mapHojaToAltaData(selectedHoja)} />
            </div>
          </div>
        </div>
      )}
      {/* Offscreen Print Container para generar PDF idéntico al de impresión */}
      {whatsappHoja && (
        <div
          style={{
            position: "fixed",
            left: "-99999px",
            top: 0,
            width: "850px",
            backgroundColor: "#ffffff",
            color: "#000000",
            zIndex: -1,
          }}
        >
          <div ref={whatsappPrintRef} className="bg-white text-black">
            <HojaRecepcionPrintView hoja={whatsappHoja} />
          </div>
        </div>
      )}
    </>
  );
};
export default HojaRecepcionList;
