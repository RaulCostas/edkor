import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import {
  ArrowLeft,
  Save,
  Car,
  User,
  Fuel,
  CheckSquare,
  AlignLeft,
  ChevronLeft,
  ChevronRight,
  X,
  Eraser,
  Edit,
  Trash2,
  Camera,
  Calendar,
  RefreshCw,
  Check,
  Plus,
  Phone,
} from "lucide-react";
import Swal from "sweetalert2";
import {
  createHojaRecepcion,
  getHojaRecepcion,
  updateHojaRecepcion,
  getHojaRecepcionByPlaca,
} from "../services/hojaRecepcionService";
import type { HojaRecepcion, FotoVehiculo } from "../services/hojaRecepcionService";
import { getPersonal } from "../services/personalService";
import { getTiposOrden, createTipoOrden } from "../services/tipoOrdenService";
import { getAllMarcasAuto, createMarcaAuto } from "../services/marcaAutoService";
import { getSeguros } from "../services/seguroService";
import { getInspectores } from "../services/inspectorService";
import type { TipoOrden } from "../types/tipoOrden";
import type { MarcaAuto } from "../types/marcaAuto";
import type { Seguro } from "../types/seguro";
import type { Inspector } from "../types/inspector";
import VehicleDiagramCanvas from "../components/VehicleDiagramCanvas";
import SearchableSelect from "../components/common/SearchableSelect";
const EXTERIOR_ITEMS = [
  "Faros delanteros",
  "Stop",
  "Antena",
  "Limpia parabrisas",
  "Espejos",
  "Vidrios",
  "Tapa",
  "Aros",
  "Dado de seguridad",
  "Tapa tanque",
  "Placa",
  "Salpicaderas",
  "Tapa cubos",
  "Emblemas",
  "Mando A/C",
  "Radio",
  "Encendedor",
  "Retrovisor",
  "Cinturones",
  "Pisos",
  "Bocina",
  "Jalador de puertas",
  "Palanca de cambios",
];
const ACCESORIOS_ITEMS = [
  "Gata",
  "Llave de ruedas",
  "Herramientas",
  "Triangulo",
  "Rueda de auxilio",
  "Extintor",
  "Botiquin",
];
const COMBUSTIBLE_LEVELS = ["E", "1/4", "1/2", "3/4", "F"];

const getFotoUrl = (foto: string | FotoVehiculo): string =>
  typeof foto === "string" ? foto : foto?.url || "";

const getFotoFecha = (foto: string | FotoVehiculo, fallbackDate?: string): string =>
  typeof foto === "string" ? fallbackDate || "" : foto?.fecha || fallbackDate || "";

const formatFechaFoto = (isoDate?: string): string => {
  if (!isoDate) return "";
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const detectMobileOrTablet = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isMobileUA =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet|Silk|Kindle|PlayBook/i.test(
      ua
    );
  const isIPadOS =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isCoarsePointer =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const isSmallOrMediumTouch =
    ("ontouchstart" in window || navigator.maxTouchPoints > 0) &&
    window.innerWidth <= 1024;
  return (
    isMobileUA ||
    isIPadOS ||
    isCoarsePointer ||
    isSmallOrMediumTouch ||
    window.innerWidth <= 1024
  );
};

const COUNTRY_CODES = [
  { code: "+591", flag: "🇧🇴", label: "🇧🇴 +591" },
  { code: "+54", flag: "🇦🇷", label: "🇦🇷 +54" },
  { code: "+55", flag: "🇧🇷", label: "🇧🇷 +55" },
  { code: "+56", flag: "🇨🇱", label: "🇨🇱 +56" },
  { code: "+57", flag: "🇨🇴", label: "🇨🇴 +57" },
  { code: "+51", flag: "🇵🇪", label: "🇵🇪 +51" },
  { code: "+595", flag: "🇵🇾", label: "🇵🇾 +595" },
  { code: "+598", flag: "🇺🇾", label: "🇺🇾 +598" },
  { code: "+58", flag: "🇻🇪", label: "🇻🇪 +58" },
  { code: "+52", flag: "🇲🇽", label: "🇲🇽 +52" },
  { code: "+1", flag: "🇺🇸", label: "🇺🇸 +1" },
  { code: "+34", flag: "🇪🇸", label: "🇪🇸 +34" },
];

const parsePhone = (rawPhone?: string) => {
  if (!rawPhone) return { countryCode: "+591", number: "" };
  const clean = rawPhone.trim();
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  const matched = sorted.find((c) => clean.startsWith(c.code));
  if (matched) {
    const numberPart = clean.slice(matched.code.length).replace(/[^0-9]/g, "");
    return { countryCode: matched.code, number: numberPart };
  }
  if (clean.startsWith("+")) {
    const spaceIdx = clean.indexOf(" ");
    if (spaceIdx > 1) {
      return { countryCode: clean.slice(0, spaceIdx), number: clean.slice(spaceIdx + 1).replace(/[^0-9]/g, "") };
    }
  }
  return { countryCode: "+591", number: clean.replace(/[^0-9]/g, "") };
};

const parseKilometraje = (km?: string | number | null): number | null => {
  if (km === undefined || km === null) return null;
  const str = String(km).trim();
  if (!str) return null;
  const digits = str.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) ? null : parsed;
};

const HojaRecepcionForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState("+591");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formData, setFormData] = useState<Partial<HojaRecepcion>>({
    cliente_nombre: "",
    cliente_telefono: "",
    cliente_fecha_nacimiento: "",
    vehiculo_marca: "",
    vehiculo_modelo: "",
    vehiculo_placa: "",
    vehiculo_color: "",
    vehiculo_kilometraje: "",
    vehiculo_chasis: "",
    nivel_combustible: "E",
    checklist_exterior_interior: {},
    checklist_accesorios: {},
    observaciones: "",
    trabajos_solicitados: "",
    tipo_orden_id: undefined,
    asesor_id: undefined,
    autoriza_pruebas: false,
    fotos: [],
    accesorios_otros: "",
    firma_cliente: "",
    firma_asesor: "",
    diagrama_vehiculo: "",
  });
  const [signatureType, setSignatureType] = useState<"cliente" | "asesor">("cliente");
  const [asesores, setAsesores] = useState<any[]>([]);
  const [tiposOrden, setTiposOrden] = useState<TipoOrden[]>([]);
  const [marcasAuto, setMarcasAuto] = useState<MarcaAuto[]>([]);
  const [seguros, setSeguros] = useState<Seguro[]>([]);
  const [inspectores, setInspectores] = useState<Inspector[]>([]);
  const [ultimoKilometraje, setUltimoKilometraje] = useState<number | null>(null);

  const currentKm = parseKilometraje(formData.vehiculo_kilometraje);
  const isKilometrajeInvalido = !isEdit && ultimoKilometraje !== null && currentKm !== null && currentKm < ultimoKilometraje;
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Quick modals for TipoOrden and MarcaAuto
  const [showModalTipoOrden, setShowModalTipoOrden] = useState(false);
  const [nuevoTipoOrdenNombre, setNuevoTipoOrdenNombre] = useState("");
  const [savingTipoOrden, setSavingTipoOrden] = useState(false);

  const [showModalMarca, setShowModalMarca] = useState(false);
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState("");
  const [savingMarca, setSavingMarca] = useState(false);

  // Mobile/Tablet & Camera state
  const [isMobileOrTablet, setIsMobileOrTablet] = useState<boolean>(detectMobileOrTablet);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedPhotos, setCapturedPhotos] = useState<
    { url: string; fecha: string; selected: boolean }[]
  >([]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(detectMobileOrTablet());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const startCameraStream = async (mode: "environment" | "user") => {
    stopCameraStream();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setShowCameraModal(false);
      cameraInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("No se pudo abrir getUserMedia, usando cámara nativa:", err);
      setShowCameraModal(false);
      cameraInputRef.current?.click();
    }
  };

  const handleOpenCamera = () => {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
      setCapturedPhotos([]);
      setShowCameraModal(true);
      setTimeout(() => {
        startCameraStream(facingMode);
      }, 100);
    } else {
      cameraInputRef.current?.click();
    }
  };

  const handleCloseCameraModal = () => {
    stopCameraStream();
    setShowCameraModal(false);
  };

  const handleSwitchCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  const handleCapturePhotoFromVideo = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const nowIso = new Date().toISOString();
    setCapturedPhotos((prev) => [...prev, { url: dataUrl, fecha: nowIso, selected: true }]);
  };

  const handleConfirmCapturedPhotos = () => {
    const selected = capturedPhotos
      .filter((p) => p.selected)
      .map((p) => ({ url: p.url, fecha: p.fecha }));
    if (selected.length === 0) {
      Swal.fire("Atención", "Seleccione al menos una foto capturada.", "warning");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      fotos: [...(prev.fotos || []), ...selected],
    }));
    handleCloseCameraModal();
  };

  const handlePhotoFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const nowIso = new Date().toISOString();
    const promises = files.map((file) => {
      return new Promise<FotoVehiculo>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) =>
          resolve({
            url: ev.target?.result as string,
            fecha: nowIso,
          });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });
    Promise.all(promises).then((newFotos) => {
      setFormData((prev) => ({
        ...prev,
        fotos: [...(prev.fotos || []), ...newFotos],
      }));
    });
    e.target.value = "";
  };

  useEffect(() => {
    loadAsesores();
    loadTiposOrden();
    loadMarcasAuto();
    loadSegurosEInspectores();
    if (isEdit) {
      loadHoja();
    }
  }, [isEdit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewerIndex === null || !formData.fotos || formData.fotos.length === 0) return;
      if (e.key === 'ArrowRight') {
        setViewerIndex((prev) => (prev! === formData.fotos!.length - 1 ? 0 : prev! + 1));
      } else if (e.key === 'ArrowLeft') {
        setViewerIndex((prev) => (prev! === 0 ? formData.fotos!.length - 1 : prev! - 1));
      } else if (e.key === 'Escape') {
        setViewerIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerIndex, formData.fotos]);

  // Autocompletar modelo, color, chasis y marca al digitar la placa si ya está registrada
  useEffect(() => {
    const fetchDataByPlaca = async () => {
      const placa = (formData.vehiculo_placa || "").trim();
      if (isEdit || placa.length < 3) {
        setUltimoKilometraje(null);
        return;
      }

      try {
        const vehiculo = await getHojaRecepcionByPlaca(placa);
        if (vehiculo) {
          // Verificar que la placa actual aún coincide
          if ((formData.vehiculo_placa || "").trim().toUpperCase() !== placa.toUpperCase()) {
            return;
          }

          // Resolver último kilometraje registrado del vehículo
          const lastKm =
            vehiculo.ultimo_kilometraje !== undefined && vehiculo.ultimo_kilometraje !== null
              ? Number(vehiculo.ultimo_kilometraje)
              : parseKilometraje(vehiculo.vehiculo_kilometraje);
          setUltimoKilometraje(lastKm);

          // Resolver marca si tenemos lista de marcas
          let targetMarcaId = vehiculo.idmarca_auto;
          let targetMarcaNombre = vehiculo.vehiculo_marca;
          if (!targetMarcaId && targetMarcaNombre && marcasAuto.length > 0) {
            const matched = marcasAuto.find(
              (m) => m.marca.toLowerCase() === targetMarcaNombre.toLowerCase()
            );
            if (matched) {
              targetMarcaId = matched.id;
            }
          } else if (targetMarcaId && !targetMarcaNombre && marcasAuto.length > 0) {
            const matched = marcasAuto.find((m) => m.id === targetMarcaId);
            if (matched) {
              targetMarcaNombre = matched.marca;
            }
          }

          setFormData((prev) => ({
            ...prev,
            idmarca_auto: targetMarcaId || prev.idmarca_auto,
            vehiculo_marca: targetMarcaNombre || prev.vehiculo_marca,
            vehiculo_modelo: vehiculo.vehiculo_modelo || prev.vehiculo_modelo,
            vehiculo_color: vehiculo.vehiculo_color || prev.vehiculo_color,
            vehiculo_chasis: vehiculo.vehiculo_chasis || prev.vehiculo_chasis,
            cliente_nombre: prev.cliente_nombre ? prev.cliente_nombre : (vehiculo.cliente_nombre || prev.cliente_nombre),
            cliente_fecha_nacimiento: prev.cliente_fecha_nacimiento ? prev.cliente_fecha_nacimiento : (vehiculo.cliente_fecha_nacimiento || prev.cliente_fecha_nacimiento),
          }));

          if (!phoneNumber && vehiculo.cliente_telefono) {
            const parsed = parsePhone(vehiculo.cliente_telefono);
            setPhoneCountryCode(parsed.countryCode);
            setPhoneNumber(parsed.number);
            setFormData((prev) => ({
              ...prev,
              cliente_telefono: vehiculo.cliente_telefono,
            }));
          }

          const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500,
            timerProgressBar: true,
          });
          Toast.fire({
            icon: 'info',
            title: `Vehículo ${placa.toUpperCase()} encontrado`,
            text: `${targetMarcaNombre || ''} ${vehiculo.vehiculo_modelo || ''}${lastKm ? ` · Último km: ${lastKm.toLocaleString()}` : ''}`.trim(),
          });
        } else {
          setUltimoKilometraje(null);
        }
      } catch (err) {
        setUltimoKilometraje(null);
        console.error("Error al autocompletar vehículo por placa:", err);
      }
    };

    const timer = setTimeout(fetchDataByPlaca, 400);
    return () => clearTimeout(timer);
  }, [formData.vehiculo_placa, isEdit, marcasAuto]);

  const loadAsesores = async () => {
    try {
      const data = await getPersonal();
      const soloAsesores = data.filter(
        (p) =>
          p.estado === "activo" &&
          (p.area?.area?.toLowerCase().includes("asesor") || Number(p.area_id) === 5)
      );
      setAsesores(soloAsesores);
    } catch (error) {
      console.error("Error loading asesores", error);
    }
  };

  const handleCreateTipoOrden = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nuevoTipoOrdenNombre.trim();
    if (!clean) return;
    try {
      setSavingTipoOrden(true);
      const created = await createTipoOrden({ tipo_orden: clean, estado: "activo" });
      await loadTiposOrden();
      setFormData((prev) => ({ ...prev, tipo_orden_id: Number(created.id) }));
      setShowModalTipoOrden(false);
      setNuevoTipoOrdenNombre("");
      Swal.fire({
        icon: "success",
        title: "Tipo de Orden Creado",
        text: `Se agregó "${clean}" correctamente.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: any) {
      console.error("Error creating tipo de orden:", error);
      Swal.fire("Error", error?.response?.data?.message || "No se pudo crear el tipo de orden", "error");
    } finally {
      setSavingTipoOrden(false);
    }
  };

  const handleCreateMarcaAuto = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = nuevaMarcaNombre.trim();
    if (!clean) return;
    try {
      setSavingMarca(true);
      const created = await createMarcaAuto({ marca: clean, estado: "activo" });
      await loadMarcasAuto();
      setFormData((prev) => ({
        ...prev,
        idmarca_auto: created.id,
        vehiculo_marca: created.marca,
      }));
      setShowModalMarca(false);
      setNuevaMarcaNombre("");
      Swal.fire({
        icon: "success",
        title: "Marca Creada",
        text: `Se agregó "${clean}" correctamente.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: any) {
      console.error("Error creating marca auto:", error);
      Swal.fire("Error", error?.response?.data?.message || "No se pudo crear la marca", "error");
    } finally {
      setSavingMarca(false);
    }
  };
  const loadTiposOrden = async () => {
    try {
      const data = await getTiposOrden();
      setTiposOrden(data.filter((t) => t.estado === "activo"));
    } catch (error) {
      console.error("Error loading tipos de orden", error);
    }
  };
  const loadMarcasAuto = async () => {
    try {
      const data = await getAllMarcasAuto();
      setMarcasAuto(data.filter((m) => m.estado === "activo"));
    } catch (error) {
      console.error("Error loading marcas de auto", error);
    }
  };
  const loadSegurosEInspectores = async () => {
    try {
      const [segurosData, inspectoresData] = await Promise.all([
        getSeguros(),
        getInspectores(),
      ]);
      setSeguros(segurosData.filter((s) => s.estado === "activo"));
      setInspectores(inspectoresData.filter((i) => i.estado === "activo"));
    } catch (error) {
      console.error("Error loading seguros e inspectores", error);
    }
  };
  const loadHoja = async () => {
    try {
      const data = await getHojaRecepcion(Number(id));
      const est = (data.estado || "").toLowerCase();
      const isCerrada = est === "orden cerrada" || est === "cerrada";
      if (est === "finalizado" || est === "terminado" || est === "anulado" || est === "anulada" || isCerrada) {
        await Swal.fire({
          icon: "info",
          title: est.includes("anula")
            ? "Hoja de Recepción Anulada"
            : isCerrada
            ? "Orden de Trabajo Cerrada"
            : "Orden de Trabajo Terminada",
          text: est.includes("anula")
            ? "Esta hoja de recepción ha sido anulada y no puede ser modificada."
            : isCerrada
            ? "Esta hoja de recepción corresponde a una orden de trabajo cerrada (totalmente pagada) y no puede ser modificada."
            : "Esta hoja de recepción corresponde a una orden de trabajo terminada en taller y no puede ser modificada.",
          confirmButtonText: "Entendido",
          confirmButtonColor: "#2563eb",
        });
        navigate("/hoja-recepcion");
        return;
      }
      const fallbackFecha = data.created_at || new Date().toISOString();
      const normalizedFotos: FotoVehiculo[] = Array.isArray(data.fotos)
        ? data.fotos.map((f) =>
            typeof f === "string"
              ? { url: f, fecha: fallbackFecha }
              : { url: f.url, fecha: f.fecha || fallbackFecha }
          )
        : [];
      const parsedTel = parsePhone(data.cliente_telefono);
      setPhoneCountryCode(parsedTel.countryCode);
      setPhoneNumber(parsedTel.number);
      setFormData({
        ...data,
        cliente_fecha_nacimiento: data.cliente_fecha_nacimiento || "",
        fotos: normalizedFotos,
        checklist_exterior_interior: data.checklist_exterior_interior || {},
        checklist_accesorios: data.checklist_accesorios || {},
        idmarca_auto: data.marca_auto?.id || data.idmarca_auto || undefined,
        vehiculo_marca: data.marca_auto?.marca || data.vehiculo_marca || "",
        tipo_orden_id: data.tipo_orden?.id || data.tipo_orden_id || undefined,
        idseguro: data.idseguro || data.seguro?.id || undefined,
        idinspector: data.idinspector || data.inspector?.id || undefined,
        asesor_id: data.asesor?.id || undefined,
        firma_cliente: data.firma_cliente || "",
        firma_asesor: data.firma_asesor || "",
        diagrama_vehiculo: data.diagrama_vehiculo || "",
      });
    } catch (error) {
      Swal.fire("Error", "No se pudo cargar la hoja de recepción", "error");
      navigate("/hoja-recepcion");
    }
  };
  const handleExteriorChange = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      checklist_exterior_interior: {
        ...prev.checklist_exterior_interior,
        [item]: !prev.checklist_exterior_interior?.[item],
      },
    }));
  };
  const handleAccesorioChange = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      checklist_accesorios: {
        ...prev.checklist_accesorios,
        [item]: !prev.checklist_accesorios?.[item],
      },
    }));
  };
  
  const handleSaveSignature = () => {
    try {
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        let dataUrl = "";
        try {
          dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
        } catch (e) {
          dataUrl = sigCanvas.current.getCanvas().toDataURL("image/png");
        }
        const key = signatureType === "asesor" ? "firma_asesor" : "firma_cliente";
        const newPayload = {
          ...formData,
          [key]: dataUrl,
        };
        setFormData(newPayload);
        setShowSignatureModal(false);
        if (isEdit) {
          updateHojaRecepcion(Number(id), { [key]: dataUrl }).catch(console.error);
        }
        return;
      }
    } catch (error) {
      console.error("Error al guardar la firma:", error);
      Swal.fire("Error", "No se pudo procesar la firma.", "error");
    }
    setShowSignatureModal(false);
  };

  const saveToServer = async (payload: any) => {
    if (!isEdit && ultimoKilometraje !== null) {
      const currentVal = parseKilometraje(payload.vehiculo_kilometraje);
      if (currentVal !== null && currentVal < ultimoKilometraje) {
        Swal.fire({
          icon: "error",
          title: "Kilometraje inválido",
          text: `No se puede guardar: el kilometraje ingresado (${currentVal.toLocaleString()} km) es menor al último registro (${ultimoKilometraje.toLocaleString()} km) para este vehículo.`,
          confirmButtonColor: "#ef4444",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const cleanDigits = (phoneNumber || "").replace(/[^0-9]/g, "");
      const fullPhone = cleanDigits
        ? `${phoneCountryCode}${cleanDigits}`
        : (payload.cliente_telefono || "");

      const selectedT = tiposOrden.find(t => t.id === payload.tipo_orden_id);
      const isSeg = selectedT?.tipo_orden?.toLowerCase().includes("seguro");

      const normalizedPayload = {
        ...payload,
        vehiculo_placa: (payload.vehiculo_placa || "").toUpperCase().trim(),
        cliente_telefono: fullPhone,
        idseguro: isSeg ? (payload.idseguro ? Number(payload.idseguro) : undefined) : undefined,
        idinspector: isSeg ? (payload.idinspector ? Number(payload.idinspector) : undefined) : undefined,
        fotos: Array.isArray(payload.fotos)
          ? payload.fotos.map((f: string | FotoVehiculo) =>
              typeof f === "string"
                ? { url: f, fecha: nowIso }
                : { url: f.url, fecha: f.fecha || nowIso }
            )
          : [],
      };
      if (isEdit) {
        await updateHojaRecepcion(Number(id), normalizedPayload);
        await Swal.fire({
          icon: "success",
          title: "Actualizado",
          text: "Hoja de recepción actualizada",
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        await createHojaRecepcion(normalizedPayload);
        await Swal.fire({
          icon: "success",
          title: "Creado",
          text: "Hoja de recepción registrada",
          showConfirmButton: false,
          timer: 1500,
        });
      }
      navigate("/hoja-recepcion");
    } catch (error: any) {
      console.error("Error al guardar la hoja de recepción:", error);
      const errorMsg =
        error?.response?.data?.message || "No se pudo guardar la hoja de recepción";
      Swal.fire("Error", errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && ultimoKilometraje !== null) {
      const currentVal = parseKilometraje(formData.vehiculo_kilometraje);
      if (currentVal !== null && currentVal < ultimoKilometraje) {
        Swal.fire({
          icon: "error",
          title: "Kilometraje inválido",
          text: `No se puede guardar: el kilometraje ingresado (${currentVal.toLocaleString()} km) es menor al último registro (${ultimoKilometraje.toLocaleString()} km) para este vehículo.`,
          confirmButtonColor: "#ef4444",
        });
        return;
      }
    }
    saveToServer(formData);
  };
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {" "}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate("/hoja-recepcion")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3.5 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center gap-2 text-sm"
          title="Volver a la lista de hojas de recepción"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {isEdit
              ? "Editar Hoja de Recepción"
              : "Nueva Hoja de Recepción"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Complete los datos del vehículo y el cliente
          </p>
        </div>
      </div>{" "}
      <form onSubmit={handleSubmit} className="space-y-6">
        {" "}
        {/* Datos Básicos */}{" "}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {" "}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            {" "}
            <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700 pb-2">
              {" "}
              <User className="w-5 h-5 text-blue-500" /> Datos del
              Propietario{" "}
            </div>{" "}
            <div className="space-y-4">
              {" "}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tipo de Orden
                </label>
                <div className="flex items-center gap-2 min-w-0">
                  <select
                    required
                    className="flex-1 min-w-0 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm truncate"
                    value={formData.tipo_orden_id || ""}
                    onChange={(e) => {
                      const newTipoId = e.target.value ? Number(e.target.value) : undefined;
                      const selectedT = tiposOrden.find(t => t.id === newTipoId);
                      const isSeg = selectedT?.tipo_orden?.toLowerCase().includes("seguro");
                      setFormData({
                        ...formData,
                        tipo_orden_id: newTipoId,
                        idseguro: isSeg ? formData.idseguro : undefined,
                        idinspector: isSeg ? formData.idinspector : undefined,
                      });
                    }}
                  >
                    <option value="">-- Seleccione un Tipo de Orden --</option>
                    {tiposOrden.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tipo_orden}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setNuevoTipoOrdenNombre("");
                      setShowModalTipoOrden(true);
                    }}
                    className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0"
                    title="Registrar nuevo Tipo de Orden"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Si el Tipo de Orden es Seguro, mostrar selectores de Seguro e Inspector */}
                {(() => {
                  const selectedTipo = tiposOrden.find(t => t.id === formData.tipo_orden_id);
                  const isSeguro = selectedTipo?.tipo_orden?.toLowerCase().includes("seguro");
                  if (!isSeguro) return null;

                  const inspectoresFiltrados = inspectores.filter(
                    i => formData.idseguro ? (Number(i.seguro?.id) === Number(formData.idseguro) || Number((i as any).seguro_id) === Number(formData.idseguro)) : true
                  );

                  return (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Compañía de Seguro *
                        </label>
                        <select
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] text-sm"
                          value={formData.idseguro || ""}
                          onChange={(e) => {
                            const newSeguroId = e.target.value ? Number(e.target.value) : undefined;
                            setFormData(prev => ({
                              ...prev,
                              idseguro: newSeguroId,
                              idinspector: undefined
                            }));
                          }}
                        >
                          <option value="">-- Seleccione el Seguro --</option>
                          {seguros.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.seguro}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                          Inspector Asignado
                        </label>
                        <select
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] text-sm"
                          value={formData.idinspector || ""}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            idinspector: e.target.value ? Number(e.target.value) : undefined
                          }))}
                          disabled={!formData.idseguro}
                        >
                          <option value="">{formData.idseguro ? "-- Seleccione Inspector (Opcional) --" : "-- Primero seleccione un Seguro --"}</option>
                          {inspectoresFiltrados.map(i => (
                            <option key={i.id} value={i.id}>
                              {i.inspector} {i.celular ? `(${i.celular})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })()}
              </div>{" "}
              <div>
                {" "}
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Asesor Técnico
                </label>{" "}
                <select
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                  value={formData.asesor_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      asesor_id: Number(e.target.value),
                    })
                  }
                >
                  {" "}
                  <option value="">-- Seleccione un Asesor --</option>{" "}
                  {asesores.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} {a.paterno} {a.materno}
                    </option>
                  ))}{" "}
                </select>{" "}
              </div>{" "}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre
                </label>
                <input
                  required
                  placeholder="Ej: Juan Pérez Morales"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                  value={formData.cliente_nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, cliente_nombre: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Celular / WhatsApp
                </label>
                <div className="flex items-center gap-2">
                  <select
                    className="w-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm shrink-0 font-medium cursor-pointer"
                    value={phoneCountryCode}
                    onChange={(e) => {
                      const newCode = e.target.value;
                      setPhoneCountryCode(newCode);
                      const cleanNum = (phoneNumber || "").replace(/[^0-9]/g, "");
                      setFormData((prev) => ({
                        ...prev,
                        cliente_telefono: cleanNum ? `${newCode}${cleanNum}` : "",
                      }));
                    }}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    placeholder="Ej: 71234567"
                    className="flex-1 min-w-0 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm"
                    value={phoneNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPhoneNumber(val);
                      const cleanNum = val.replace(/[^0-9]/g, "");
                      setFormData((prev) => ({
                        ...prev,
                        cliente_telefono: cleanNum ? `${phoneCountryCode}${cleanNum}` : "",
                      }));
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm"
                  value={formData.cliente_fecha_nacimiento || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cliente_fecha_nacimiento: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700 pb-2">
              <Car className="w-5 h-5 text-green-500" /> Datos del Vehículo
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Placa
                </label>
                <input
                  required
                  placeholder="Ej: 1234-ABC"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] transition-colors text-sm uppercase"
                  value={formData.vehiculo_placa}
                  onChange={(e) =>
                    setFormData({ ...formData, vehiculo_placa: e.target.value.toUpperCase() })
                  }
                />
              </div>
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Marca
                </label>
                <div className="flex items-center gap-2 min-w-0">
                  <SearchableSelect
                    className="flex-1 min-w-0"
                    placeholder="-- Seleccione una Marca --"
                    searchPlaceholder="Buscar marca (ej: Toyota, Nissan...)"
                    required
                    value={
                      formData.idmarca_auto ||
                      marcasAuto.find(
                        (m) =>
                          m.marca.toLowerCase() ===
                          (formData.vehiculo_marca || "").toLowerCase()
                      )?.id ||
                      ""
                    }
                    onChange={(val) => {
                      const selectedId = val ? Number(val) : undefined;
                      const selectedMarca = marcasAuto.find((m) => m.id === selectedId);
                      setFormData({
                        ...formData,
                        idmarca_auto: selectedId,
                        vehiculo_marca: selectedMarca?.marca || "",
                      });
                    }}
                    options={marcasAuto.map((m) => ({
                      value: m.id,
                      label: m.marca,
                    }))}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNuevaMarcaNombre("");
                      setShowModalMarca(true);
                    }}
                    className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0"
                    title="Registrar nueva Marca de Auto"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Modelo
                </label>
                <input
                  placeholder="Ej: Hilux, Corolla, Rav4"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                  value={formData.vehiculo_modelo}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vehiculo_modelo: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kilometraje
                  </label>
                  {!isEdit && ultimoKilometraje !== null && (
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                      Último reg: {ultimoKilometraje.toLocaleString()} km
                    </span>
                  )}
                </div>
                <input
                  placeholder="Ej: 45000"
                  className={`w-full px-4 py-2 rounded-lg border transition-colors text-sm focus:outline-none focus:ring-2 ${
                    isKilometrajeInvalido
                      ? "border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200 focus:ring-red-500"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500"
                  }`}
                  value={formData.vehiculo_kilometraje || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vehiculo_kilometraje: e.target.value,
                    })
                  }
                  onBlur={() => {
                    if (isKilometrajeInvalido) {
                      Swal.fire({
                        icon: "warning",
                        title: "Kilometraje inválido",
                        text: `El kilometraje (${currentKm?.toLocaleString()} km) no puede ser menor al último registro (${ultimoKilometraje?.toLocaleString()} km) de este vehículo.`,
                        confirmButtonColor: "#3085d6",
                      });
                    }
                  }}
                />
                {isKilometrajeInvalido && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1.5 font-medium flex items-center gap-1">
                    <span>⚠️ Bloqueado: No puede ser menor al último registro ({ultimoKilometraje?.toLocaleString()} km).</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <input
                  placeholder="Ej: Blanco, Plateado, Negro"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                  value={formData.vehiculo_color}
                  onChange={(e) =>
                    setFormData({ ...formData, vehiculo_color: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chasis
                </label>
                <input
                  placeholder="Ej: 1HGCR2F83HA000000"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                  value={formData.vehiculo_chasis}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vehiculo_chasis: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>{" "}
        {/* Checklists y Combustible */}{" "}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
          {" "}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Diagrama del Vehículo (4 puertas) */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700 pb-2">
                <Car className="w-5 h-5 text-blue-600" /> Figura del Vehículo (4 Puertas) - Marcar Detalles
              </div>
              <VehicleDiagramCanvas
                value={formData.diagrama_vehiculo}
                onChange={(dataUrl) =>
                  setFormData((prev) => ({
                    ...prev,
                    diagrama_vehiculo: dataUrl,
                  }))
                }
              />
            </div>

            {/* Exterior / Interior */}
            <div className="flex-1">
              {" "}
              <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700 pb-2">
                {" "}
                <CheckSquare className="w-5 h-5 text-indigo-500" /> Exterior /
                Interior{" "}
              </div>{" "}
              <div className="columns-1 sm:columns-2 gap-x-4 space-y-2">
                {" "}
                {EXTERIOR_ITEMS.map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer break-inside-avoid"
                  >
                    {" "}
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={!!formData.checklist_exterior_interior?.[item]}
                      onChange={() => handleExteriorChange(item)}
                    />{" "}
                    {item}{" "}
                  </label>
                ))}{" "}
              </div>{" "}
            </div>{" "}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100 dark:border-gray-700">
            <div>
              {" "}
              <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700 pb-2">
                {" "}
                <CheckSquare className="w-5 h-5 text-orange-500" />{" "}
                Accesorios{" "}
              </div>{" "}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {" "}
                {ACCESORIOS_ITEMS.map((item) => (
                  <label
                    key={item}
                    className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                  >
                    {" "}
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={!!formData.checklist_accesorios?.[item]}
                      onChange={() => handleAccesorioChange(item)}
                    />{" "}
                    {item}{" "}
                  </label>
                ))}{" "}
              </div>{" "}
              <div className="mt-3">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={!!formData.checklist_accesorios?.["Otros"]}
                    onChange={() => handleAccesorioChange("Otros")}
                  />
                  Otros:
                </label>
                {!!formData.checklist_accesorios?.["Otros"] && (
                  <input
                    type="text"
                    placeholder="Ej: Llave de repuesto, cable USB, etc."
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                    value={formData.accesorios_otros || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        accesorios_otros: e.target.value,
                      })
                    }
                  />
                )}
              </div>
            </div>{" "}
            <div>
              {" "}
              <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700 pb-2">
                {" "}
                <Fuel className="w-5 h-5 text-red-500" /> Nivel de
                Combustible{" "}
              </div>{" "}
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                {" "}
                {COMBUSTIBLE_LEVELS.map((level) => (
                  <label
                    key={level}
                    className="flex flex-col items-center gap-1 cursor-pointer flex-1"
                  >
                    {" "}
                    <input
                      type="radio"
                      name="combustible"
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      checked={formData.nivel_combustible === level}
                      onChange={() =>
                        setFormData({ ...formData, nivel_combustible: level })
                      }
                    />{" "}
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {level}
                    </span>{" "}
                  </label>
                ))}{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Observaciones y Trabajos */}{" "}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {" "}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            {" "}
            <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700 pb-2">
              {" "}
              <AlignLeft className="w-5 h-5 text-gray-500" /> Observaciones
              (Daños, Rayones){" "}
            </div>{" "}
            <textarea
              className="w-full h-32 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none text-sm"
              placeholder="Ej: Rayón en puerta derecha, abolladura en parachoques trasero o estado general..."
              value={formData.observaciones}
              onChange={(e) =>
                setFormData({ ...formData, observaciones: e.target.value })
              }
            />
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700 pb-2">
              <AlignLeft className="w-5 h-5 text-blue-500" /> Trabajos a
              Realizar / Solicitud del Cliente
            </div>
            <textarea
              required
              className="w-full h-32 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none text-sm"
              placeholder="Ej: Cambio de aceite y filtros, revisión de frenos y afinado de motor..."
              value={formData.trabajos_solicitados}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  trabajos_solicitados: e.target.value,
                })
              }
            />{" "}
          </div>{" "}
        </div>{" "}
        {/* Autorización de Prueba */}{" "}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          {" "}
          <label className="flex items-center gap-3 cursor-pointer">
            {" "}
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={formData.autoriza_pruebas}
              onChange={(e) =>
                setFormData({ ...formData, autoriza_pruebas: e.target.checked })
              }
            />{" "}
            <span className="text-gray-800 dark:text-white font-medium">
              {" "}
              Autorizo a conducir mi vehiculo para pruebas{" "}
            </span>{" "}
          </label>{" "}
        </div>{" "}
        {/* Fotos del Vehículo */}{" "}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          {" "}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-gray-800 dark:text-white font-medium border-b border-gray-100 dark:border-gray-700 pb-2">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-indigo-500" /> Fotos del Vehículo
            </div>
            {(formData.created_at || (formData.fotos && formData.fotos.length > 0)) && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Fecha guardado:{" "}
                  {formatFechaFoto(
                    formData.created_at ||
                      (formData.fotos && formData.fotos.length > 0
                        ? getFotoFecha(formData.fotos[formData.fotos.length - 1])
                        : new Date().toISOString())
                  )}
                </span>
              </div>
            )}
          </div>{" "}
          <div>
            {/* Input oculto para cámara nativa en móviles/tablets */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoFilesChange}
            />

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              {isMobileOrTablet && (
                <button
                  type="button"
                  onClick={handleOpenCamera}
                  className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all transform hover:-translate-y-0.5"
                >
                  <Camera className="w-4 h-4" />
                  Activar Cámara
                </button>
              )}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                onChange={handlePhotoFilesChange}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {" "}
              {formData.fotos?.map((foto, index) => {
                const fotoUrl = getFotoUrl(foto);
                const fotoFecha =
                  formatFechaFoto(getFotoFecha(foto, formData.created_at)) ||
                  formatFechaFoto(new Date().toISOString());
                return (
                  <div
                    key={index}
                    className="relative group cursor-pointer flex flex-col bg-gray-50 dark:bg-gray-700/40 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
                    onClick={() => setViewerIndex(index)}
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={fotoUrl}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-32 object-cover transition-transform group-hover:scale-105"
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData((prev) => ({
                            ...prev,
                            fotos: prev.fotos?.filter((_, i) => i !== index),
                          }));
                        }}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          ></path>
                        </svg>
                      </button>
                    </div>
                    <div className="px-2.5 py-1.5 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                      <span className="truncate" title={`Guardado: ${fotoFecha}`}>
                        {fotoFecha}
                      </span>
                    </div>
                  </div>
                );
              })}{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}

        {/* Sección de Firmas: Cliente y Asesor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Firma del Cliente */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                <div className="flex items-center gap-2 text-gray-800 dark:text-white font-medium">
                  <User className="w-5 h-5 text-purple-500" /> Firma del Cliente
                </div>
                {formData.firma_cliente && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, firma_cliente: "" })}
                    className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 px-3 py-1.5 rounded-md transition-colors font-medium border border-red-200 dark:border-red-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Firma
                  </button>
                )}
              </div>
              
              {formData.firma_cliente ? (
                <div className="mt-4 flex flex-col items-start gap-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Firma registrada:</p>
                  <div className="bg-white border-2 border-gray-200 dark:border-gray-600 rounded-lg p-2 max-w-full">
                    <img src={formData.firma_cliente} alt="Firma Cliente" className="h-24 object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSignatureType("cliente"); setShowSignatureModal(true); }}
                    className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 px-4 py-2 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                  >
                    <Edit className="w-4 h-4" />
                    Cambiar firma
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => { setSignatureType("cliente"); setShowSignatureModal(true); }}
                    className="px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors font-medium flex items-center gap-2"
                  >
                    <User className="w-4 h-4" /> Registrar Firma del Cliente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Firma del Asesor Técnico */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                <div className="flex items-center gap-2 text-gray-800 dark:text-white font-medium">
                  <User className="w-5 h-5 text-indigo-500" /> Firma del Asesor Técnico
                </div>
                {formData.firma_asesor && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, firma_asesor: "" })}
                    className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 px-3 py-1.5 rounded-md transition-colors font-medium border border-red-200 dark:border-red-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar Firma
                  </button>
                )}
              </div>
              
              {formData.firma_asesor ? (
                <div className="mt-4 flex flex-col items-start gap-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Firma registrada:</p>
                  <div className="bg-white border-2 border-gray-200 dark:border-gray-600 rounded-lg p-2 max-w-full">
                    <img src={formData.firma_asesor} alt="Firma Asesor" className="h-24 object-contain" />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSignatureType("asesor"); setShowSignatureModal(true); }}
                    className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 px-4 py-2 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                  >
                    <Edit className="w-4 h-4" />
                    Cambiar firma
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => { setSignatureType("asesor"); setShowSignatureModal(true); }}
                    className="px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors font-medium flex items-center gap-2"
                  >
                    <User className="w-4 h-4" /> Registrar Firma del Asesor
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>{" "}

        <div className="mt-8 flex flex-wrap justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          {" "}
          <button
            type="button"
            onClick={() => navigate("/hoja-recepcion")}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 text-sm"
          >
            {" "}
            Cancelar{" "}
          </button>{" "}
          <button
            type="submit"
            disabled={loading || isKilometrajeInvalido}
            title={isKilometrajeInvalido ? `El kilometraje no puede ser menor a ${ultimoKilometraje?.toLocaleString()} km` : undefined}
            className={`font-semibold py-2 px-6 rounded-lg shadow-md transition-all text-sm flex items-center gap-2 ${
              isKilometrajeInvalido
                ? "bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed opacity-75"
                : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 text-white"
            }`}
          >
            {" "}
            <Save className="w-4 h-4" />{" "}
            {loading ? "Guardando..." : isEdit ? "Actualizar Hoja de Recepción" : "Guardar Hoja de Recepción"}{" "}
          </button>{" "}
        </div>{" "}
      </form>{" "}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {signatureType === "asesor" ? "Firma del Asesor Técnico" : "Firma del Cliente"}
              </h3>
              <button onClick={() => setShowSignatureModal(false)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-all transform hover:-translate-y-0.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 p-1.5 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    className: "signature-canvas w-full h-80 cursor-crosshair"
                  }}
                  penColor="black"
                />
              </div>
              <div className="flex justify-between items-center mt-4">
                <button
                  type="button"
                  onClick={() => sigCanvas.current?.clear()}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition-all transform hover:-translate-y-0.5 border border-red-200 dark:border-red-800"
                >
                  <Eraser className="w-4 h-4" /> Limpiar
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSignatureModal(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700 rounded-lg transition-all transform hover:-translate-y-0.5"
                  >
                    <X className="w-4 h-4" /> Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSignature}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                  >
                    <Save className="w-4 h-4" /> Guardar Firma
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal (Mobile / Tablet) */}
      {showCameraModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-500" />
                Cámara de Fotos del Vehículo
              </h3>
              <button
                type="button"
                onClick={handleCloseCameraModal}
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 bg-gray-900 flex flex-col items-center justify-center relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-h-[45vh] object-contain rounded-lg bg-black"
              />
              <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Cambiar Cámara
                </button>
                <button
                  type="button"
                  onClick={handleCapturePhotoFromVideo}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg transition-transform active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  Capturar Foto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleCloseCameraModal();
                    cameraInputRef.current?.click();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-200 bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-500/40 rounded-lg transition-colors"
                >
                  Cámara del Dispositivo
                </button>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-gray-800 overflow-y-auto flex-1">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">
                Fotos capturadas (toque para seleccionar o deseleccionar):
              </p>
              {capturedPhotos.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center">
                  Aún no ha capturado fotos. Presione "Capturar Foto" para tomar fotografías y luego seleccionarlas.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {capturedPhotos.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() =>
                        setCapturedPhotos((prev) =>
                          prev.map((p, i) =>
                            i === idx ? { ...p, selected: !p.selected } : p
                          )
                        )
                      }
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        item.selected
                          ? "border-indigo-600 ring-2 ring-indigo-500/40"
                          : "border-gray-300 dark:border-gray-600 opacity-60"
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={`Captura ${idx + 1}`}
                        className="w-full h-20 object-cover"
                      />
                      <div
                        className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${
                          item.selected ? "bg-indigo-600" : "bg-black/50"
                        }`}
                      >
                        {item.selected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="text-[10px] text-center py-0.5 bg-black/70 text-white truncate px-1">
                        {formatFechaFoto(item.fecha)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <button
                type="button"
                onClick={handleCloseCameraModal}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:bg-gray-800 dark:border-gray-600 rounded-lg"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                type="button"
                disabled={capturedPhotos.filter((p) => p.selected).length === 0}
                onClick={handleConfirmCapturedPhotos}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
              >
                <Check className="w-4 h-4" /> Seleccionar Fotos (
                {capturedPhotos.filter((p) => p.selected).length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {viewerIndex !== null && formData.fotos && (
        <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setViewerIndex(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-50 p-2"
          >
            <X className="w-8 h-8" />
          </button>
          
          {formData.fotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerIndex((prev) => (prev! === 0 ? formData.fotos!.length - 1 : prev! - 1));
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 z-50"
            >
              <ChevronLeft className="w-12 h-12" />
            </button>
          )}

          <img 
            src={getFotoUrl(formData.fotos[viewerIndex])} 
            alt={`Vista ampliada ${viewerIndex + 1}`} 
            className="max-w-[90vw] max-h-[85vh] object-contain"
          />

          {formData.fotos.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setViewerIndex((prev) => (prev! === formData.fotos!.length - 1 ? 0 : prev! + 1));
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 p-2 z-50"
            >
              <ChevronRight className="w-12 h-12" />
            </button>
          )}
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-4 py-2 rounded-full flex items-center gap-3">
            <span>
              {viewerIndex + 1} de {formData.fotos.length}
            </span>
            {getFotoFecha(formData.fotos[viewerIndex], formData.created_at) && (
              <span className="flex items-center gap-1 text-xs text-indigo-300 border-l border-white/30 pl-3">
                <Calendar className="w-3.5 h-3.5" />
                Guardado:{" "}
                {formatFechaFoto(
                  getFotoFecha(formData.fotos[viewerIndex], formData.created_at)
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Modal: Registrar Tipo de Orden */}
      {showModalTipoOrden && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700 animate-fade-in-down">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" /> Nuevo Tipo de Orden
              </h2>
              <button
                type="button"
                onClick={() => setShowModalTipoOrden(false)}
                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTipoOrden} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Tipo de Orden *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Mantenimiento Preventivo, Chapería, etc."
                  value={nuevoTipoOrdenNombre}
                  onChange={(e) => setNuevoTipoOrdenNombre(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalTipoOrden(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span>Cancelar</span>
                </button>
                <button
                  type="submit"
                  disabled={savingTipoOrden || !nuevoTipoOrdenNombre.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingTipoOrden ? "Guardando..." : "Guardar Tipo de Orden"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Marca de Auto */}
      {showModalMarca && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700 animate-fade-in-down">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" /> Nueva Marca de Auto
              </h2>
              <button
                type="button"
                onClick={() => setShowModalMarca(false)}
                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateMarcaAuto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre de la Marca *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: TOYOTA, SUZUKI, HYUNDAI, etc."
                  value={nuevaMarcaNombre}
                  onChange={(e) => setNuevaMarcaNombre(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalMarca(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span>Cancelar</span>
                </button>
                <button
                  type="submit"
                  disabled={savingMarca || !nuevaMarcaNombre.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingMarca ? "Guardando..." : "Guardar Marca"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default HojaRecepcionForm;
