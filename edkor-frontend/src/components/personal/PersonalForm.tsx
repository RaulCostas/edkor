import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import type { CreatePersonalData, Personal } from "../../types/personal";
import type { AreaPersonal } from "../../types/areaPersonal";
import { getAreasPersonal, createAreaPersonal } from "../../services/areaPersonalService";
import { uploadFile } from "../../services/fileService";
import { API_BASE_URL } from "../../config";
import {
  User,
  CreditCard,
  Calendar,
  Phone,
  MapPin,
  Smartphone,
  Briefcase,
  DollarSign,
  Activity,
  Save,
  X,
  UserPlus,
  Users,
  ChevronDown,
  Plus,
  Upload,
  Eye,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
interface PersonalFormProps {
  initialData?: Personal | null;
  onSubmit: (data: CreatePersonalData) => Promise<void>;
  onCancel: () => void;
}

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

const parsePersonalPhone = (rawCel?: string, rawTel?: string) => {
  let source = (rawCel || "").trim();
  const celDigits = source.replace(/[^0-9]/g, "");
  const telDigits = (rawTel || "").replace(/[^0-9]/g, "");

  // Si celular solo tenía "591" y en teléfono estaba el número real
  if ((celDigits === "591" || celDigits.length <= 4) && telDigits.length >= 7) {
    source = (rawTel || "").trim();
  }

  if (!source) return { countryCode: "+591", number: "" };

  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  const matched = sorted.find((c) => source.startsWith(c.code));
  if (matched) {
    const numberPart = source.slice(matched.code.length).replace(/[^0-9]/g, "");
    return { countryCode: matched.code, number: numberPart };
  }

  for (const c of sorted) {
    const rawC = c.code.replace("+", "");
    if (source.startsWith(rawC) && source.length > rawC.length + 4) {
      const numberPart = source.slice(rawC.length).replace(/[^0-9]/g, "");
      return { countryCode: c.code, number: numberPart };
    }
  }

  return { countryCode: "+591", number: source.replace(/[^0-9]/g, "") };
};

export const PersonalForm: React.FC<PersonalFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [phoneCountryCode, setPhoneCountryCode] = useState("+591");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formData, setFormData] = useState<CreatePersonalData>({
    nombre: "",
    paterno: "",
    materno: "",
    ci: "",
    ci_anverso: "",
    ci_reverso: "",
    fecha_nacimiento: "",
    direccion: "",
    telefono: "",
    celular: "",
    tipo: "Planta",
    areaId: "",
    fecha_ingreso: "",
    salario: 0,
    precio_hora: undefined,
    estado: "activo",
  });
  const [areas, setAreas] = useState<AreaPersonal[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Tipos personal list
  const [tiposPersonal, setTiposPersonal] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("custom_tipos_personal");
      const base = ["Planta", "Contratista"];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return Array.from(new Set([...base, ...parsed]));
        }
      }
      return base;
    } catch {
      return ["Planta", "Contratista"];
    }
  });

  // Modal states for Tipo and Area
  const [showModalTipo, setShowModalTipo] = useState(false);
  const [nuevoTipoNombre, setNuevoTipoNombre] = useState("");

  const [showModalArea, setShowModalArea] = useState(false);
  const [nuevaAreaNombre, setNuevaAreaNombre] = useState("");
  const [savingArea, setSavingArea] = useState(false);

  // Upload and preview states for Carnet de Identidad
  const [uploadingAnverso, setUploadingAnverso] = useState(false);
  const [uploadingReverso, setUploadingReverso] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const data = await getAreasPersonal();
        setAreas(data.filter((a) => a.estado === "activo"));
      } catch (error) {
        console.error("Error loading areas", error);
      }
    };
    fetchAreas();
    if (initialData) {
      if (initialData.tipo && !tiposPersonal.includes(initialData.tipo)) {
        setTiposPersonal((prev) => [...prev, initialData.tipo]);
      }
      const parsed = parsePersonalPhone(initialData.celular, initialData.telefono);
      setPhoneCountryCode(parsed.countryCode);
      setPhoneNumber(parsed.number);

      const tel = initialData.telefono === parsed.number ? "" : (initialData.telefono || "");

      setFormData({
        nombre: initialData.nombre,
        paterno: initialData.paterno,
        materno: initialData.materno,
        ci: initialData.ci,
        ci_anverso: initialData.ci_anverso || "",
        ci_reverso: initialData.ci_reverso || "",
        fecha_nacimiento: initialData.fecha_nacimiento || "",
        direccion: initialData.direccion || "",
        telefono: tel,
        celular: parsed.number ? `${parsed.countryCode}${parsed.number}` : "",
        tipo: initialData.tipo,
        areaId: initialData.area?.id || "",
        fecha_ingreso: initialData.fecha_ingreso || "",
        salario: initialData.salario || 0,
        precio_hora: initialData.precio_hora !== undefined && initialData.precio_hora !== null ? Number(initialData.precio_hora) : undefined,
        estado: initialData.estado,
      });
    } else {
      setPhoneCountryCode("+591");
      setPhoneNumber("");
    }
  }, [initialData]);

  const handleUploadAnverso = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAnverso(true);
      const filename = await uploadFile(file);
      setFormData((prev) => ({ ...prev, ci_anverso: filename }));
    } catch (error) {
      console.error("Error subiendo CI Anverso:", error);
      Swal.fire("Error", "No se pudo subir la imagen del anverso", "error");
    } finally {
      setUploadingAnverso(false);
    }
  };

  const handleUploadReverso = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingReverso(true);
      const filename = await uploadFile(file);
      setFormData((prev) => ({ ...prev, ci_reverso: filename }));
    } catch (error) {
      console.error("Error subiendo CI Reverso:", error);
      Swal.fire("Error", "No se pudo subir la imagen del reverso", "error");
    } finally {
      setUploadingReverso(false);
    }
  };

  const handleCreateTipo = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const clean = nuevoTipoNombre.trim();
    if (!clean) return;
    const updated = Array.from(new Set([...tiposPersonal, clean]));
    setTiposPersonal(updated);
    try {
      localStorage.setItem(
        "custom_tipos_personal",
        JSON.stringify(updated.filter((t) => t !== "Planta" && t !== "Contratista"))
      );
    } catch (err) {
      console.error(err);
    }
    setFormData((prev) => ({ ...prev, tipo: clean }));
    setShowModalTipo(false);
    setNuevoTipoNombre("");
    Swal.fire({
      icon: "success",
      title: "Tipo de Personal Creado",
      text: `Se agregó "${clean}" correctamente.`,
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const handleCreateArea = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const clean = nuevaAreaNombre.trim();
    if (!clean) return;
    try {
      setSavingArea(true);
      const created = await createAreaPersonal({ area: clean, estado: "activo" });
      const data = await getAreasPersonal();
      setAreas(data.filter((a) => a.estado === "activo"));
      setFormData((prev) => ({ ...prev, areaId: String(created.id) }));
      setShowModalArea(false);
      setNuevaAreaNombre("");
      Swal.fire({
        icon: "success",
        title: "Área Creada",
        text: `Se agregó "${clean}" correctamente.`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error: any) {
      console.error("Error creating area personal:", error);
      Swal.fire(
        "Error",
        error?.response?.data?.message || "No se pudo crear el área",
        "error"
      );
    } finally {
      setSavingArea(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanDigits = (phoneNumber || "").replace(/[^0-9]/g, "");
      const fullCelular = cleanDigits ? `${phoneCountryCode}${cleanDigits}` : "";
      await onSubmit({
        ...formData,
        celular: fullCelular,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <form onSubmit={handleSubmit} className="p-6">
      {" "}
      <div className="flex items-center justify-between mb-6">
        {" "}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
          {" "}
          <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
            {" "}
            <UserPlus size={24} />{" "}
          </span>{" "}
          {initialData ? "Editar Personal" : "Registrar Nuevo Personal"}{" "}
        </h2>{" "}
      </div>{" "}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {" "}
        {/* Datos Personales */}{" "}
        <div className="col-span-1 md:col-span-2">
          {" "}
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 bg-gray-100 dark:bg-gray-700 p-2 rounded flex items-center gap-2">
            {" "}
            <User size={20} /> Datos Personales{" "}
          </h3>{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Nombre
          </label>{" "}
          <div className="relative">
            {" "}
            <User
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />{" "}
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) =>
                setFormData({ ...formData, nombre: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombres"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Paterno
          </label>{" "}
          <div className="relative">
            {" "}
            <User
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />{" "}
            <input
              type="text"
              required
              value={formData.paterno}
              onChange={(e) =>
                setFormData({ ...formData, paterno: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Apellido Paterno"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Materno
          </label>{" "}
          <div className="relative">
            {" "}
            <User
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />{" "}
            <input
              type="text"
              required
              value={formData.materno}
              onChange={(e) =>
                setFormData({ ...formData, materno: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Apellido Materno"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            CI
          </label>{" "}
          <div className="relative">
            {" "}
            <CreditCard
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />{" "}
            <input
              type="text"
              required
              value={formData.ci}
              onChange={(e) => setFormData({ ...formData, ci: e.target.value })}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Cédula de Identidad"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div>
          {" "}
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Fecha Nacimiento
          </label>{" "}
          <div className="relative">
            {" "}
            <Calendar
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />{" "}
            <input
              type="date"
              value={formData.fecha_nacimiento}
              onChange={(e) =>
                setFormData({ ...formData, fecha_nacimiento: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />{" "}
          </div>{" "}
        </div>{" "}
        {/* Contacto */}{" "}
        <div className="col-span-1 md:col-span-2 mt-2">
          {" "}
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 bg-gray-100 dark:bg-gray-700 p-2 rounded flex items-center gap-2">
            {" "}
            <Phone size={20} /> Datos de Contacto{" "}
          </h3>{" "}
        </div>{" "}
        <div className="md:col-span-2">
          {" "}
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Dirección
          </label>{" "}
          <div className="relative">
            {" "}
            <MapPin
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />{" "}
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Dirección completa"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Celular
          </label>
          <div className="flex items-center gap-2">
            <select
              className="w-32 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm shrink-0 font-medium cursor-pointer"
              value={phoneCountryCode}
              onChange={(e) => {
                const newCode = e.target.value;
                setPhoneCountryCode(newCode);
                const cleanNum = (phoneNumber || "").replace(/[^0-9]/g, "");
                setFormData((prev) => ({
                  ...prev,
                  celular: cleanNum ? `${newCode}${cleanNum}` : "",
                }));
              }}
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="relative flex-1 min-w-0">
              <Smartphone
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
                size={18}
              />
              <input
                type="tel"
                placeholder="Ej: 71234567"
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                value={phoneNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  setPhoneNumber(val);
                  const cleanNum = val.replace(/[^0-9]/g, "");
                  setFormData((prev) => ({
                    ...prev,
                    celular: cleanNum ? `${phoneCountryCode}${cleanNum}` : "",
                  }));
                }}
              />
            </div>
          </div>
        </div>{" "}
        <div>
          {" "}
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Teléfono
          </label>{" "}
          <div className="relative">
            {" "}
            <Phone
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />{" "}
            <input
              type="text"
              value={formData.telefono}
              onChange={(e) =>
                setFormData({ ...formData, telefono: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Teléfono fijo"
            />{" "}
          </div>{" "}
        </div>{" "}
        {/* Datos Laborales */}{" "}
        <div className="col-span-1 md:col-span-2 mt-2">
          {" "}
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 bg-gray-100 dark:bg-gray-700 p-2 rounded flex items-center gap-2">
            {" "}
            <Briefcase size={20} /> Datos Laborales{" "}
          </h3>{" "}
        </div>{" "}
        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Tipo Personal
          </label>
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Users
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
                size={18}
              />
              <select
                value={formData.tipo}
                onChange={(e) =>
                  setFormData({ ...formData, tipo: e.target.value })
                }
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-sm font-medium"
              >
                {tiposPersonal.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setNuevoTipoNombre("");
                setShowModalTipo(true);
              }}
              className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0"
              title="Registrar nuevo Tipo de Personal"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Área
          </label>
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative flex-1 min-w-0">
              <Briefcase
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
                size={18}
              />
              <select
                required
                value={formData.areaId}
                onChange={(e) =>
                  setFormData({ ...formData, areaId: e.target.value })
                }
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-sm font-medium"
              >
                <option value="">Seleccione Área...</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.area}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setNuevaAreaNombre("");
                setShowModalArea(true);
              }}
              className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0"
              title="Registrar nueva Área"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>{" "}
        <div>
          {" "}
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Fecha Ingreso
          </label>{" "}
          <div className="relative">
            {" "}
            <Calendar
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />{" "}
            <input
              type="date"
              value={formData.fecha_ingreso}
              onChange={(e) =>
                setFormData({ ...formData, fecha_ingreso: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />{" "}
          </div>{" "}
        </div>{" "}
        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Salario (Bs.)
          </label>
          <div className="relative">
            <DollarSign
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
              size={18}
            />
            <input
              type="number"
              step="0.01"
              value={formData.salario}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  salario: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {(() => {
          const selectedAreaObj = areas.find((a) => String(a.id) === String(formData.areaId));
          const isAreaMecanico = selectedAreaObj && (
            selectedAreaObj.area.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().includes("mecanic")
          );
          const esPlantaMecanico = formData.tipo === "Planta" && isAreaMecanico;

          if (!esPlantaMecanico) return null;

          return (
            <div>
              <label className="block mb-1 font-medium text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span>Precio por Hora Mecánico (Bs.) *</span>
                <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">Tarifa para planillas</span>
              </label>
              <div className="relative">
                <DollarSign
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-500"
                  size={18}
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.precio_hora !== undefined && formData.precio_hora !== null ? formData.precio_hora : ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      precio_hora: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Ej: 15.00"
                  className="w-full pl-10 pr-3 py-2 rounded-lg border-2 border-amber-400 dark:border-amber-600 bg-amber-50/40 dark:bg-amber-950/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                />
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                * Se usará para calcular automáticamente sus horas trabajadas en la planilla mensual.
              </p>
            </div>
          );
        })()}{" "}
        <div>
          {" "}
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
            Estado
          </label>{" "}
          <div className="relative">
            {" "}
            <Activity
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
              size={18}
            />{" "}
            <select
              value={formData.estado}
              onChange={(e) =>
                setFormData({ ...formData, estado: e.target.value })
              }
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              {" "}
              <option value="activo">Activo</option>{" "}
              <option value="inactivo">Inactivo</option>{" "}
            </select>{" "}
            <ChevronDown
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
              size={16}
            />{" "}
          </div>{" "}
        </div>

        {/* Documentos de Identidad (Fotografías) */}
        <div className="col-span-1 md:col-span-2 mt-4">
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 bg-gray-100 dark:bg-gray-700 p-2 rounded flex items-center gap-2">
            <CreditCard size={20} /> Carnet de Identidad (Fotografías)
          </h3>
        </div>

        <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* CI Anverso */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <ImageIcon size={18} className="text-[#3498db]" />
                CI Anverso (Frente)
              </span>
              {formData.ci_anverso && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Cargado
                </span>
              )}
            </div>

            {formData.ci_anverso ? (
              <div className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 aspect-video flex items-center justify-center">
                <img
                  src={`${API_BASE_URL}/files/${formData.ci_anverso}`}
                  alt="CI Anverso"
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() =>
                    setPreviewModalImg(
                      `${API_BASE_URL}/files/${formData.ci_anverso}`
                    )
                  }
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewModalImg(
                        `${API_BASE_URL}/files/${formData.ci_anverso}`
                      )
                    }
                    className="p-2 bg-white text-gray-800 rounded-lg shadow hover:bg-gray-100 transition-all"
                    title="Ver en grande"
                  >
                    <Eye size={16} />
                  </button>
                  <label
                    className="p-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-all cursor-pointer"
                    title="Cambiar imagen"
                  >
                    <Upload size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadAnverso}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, ci_anverso: "" }))
                    }
                    className="p-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-all"
                    title="Quitar imagen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#3498db] dark:hover:border-[#3498db] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all p-4">
                <Upload
                  size={28}
                  className={
                    uploadingAnverso
                      ? "animate-bounce text-[#3498db]"
                      : "text-gray-400"
                  }
                />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                  {uploadingAnverso
                    ? "Subiendo imagen..."
                    : "Clic o arrastra aquí la foto del frente"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadAnverso}
                  disabled={uploadingAnverso}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* CI Reverso */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <ImageIcon size={18} className="text-[#3498db]" />
                CI Reverso (Dorso)
              </span>
              {formData.ci_reverso && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  Cargado
                </span>
              )}
            </div>

            {formData.ci_reverso ? (
              <div className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 aspect-video flex items-center justify-center">
                <img
                  src={`${API_BASE_URL}/files/${formData.ci_reverso}`}
                  alt="CI Reverso"
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() =>
                    setPreviewModalImg(
                      `${API_BASE_URL}/files/${formData.ci_reverso}`
                    )
                  }
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewModalImg(
                        `${API_BASE_URL}/files/${formData.ci_reverso}`
                      )
                    }
                    className="p-2 bg-white text-gray-800 rounded-lg shadow hover:bg-gray-100 transition-all"
                    title="Ver en grande"
                  >
                    <Eye size={16} />
                  </button>
                  <label
                    className="p-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-all cursor-pointer"
                    title="Cambiar imagen"
                  >
                    <Upload size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadReverso}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, ci_reverso: "" }))
                    }
                    className="p-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-all"
                    title="Quitar imagen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#3498db] dark:hover:border-[#3498db] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all p-4">
                <Upload
                  size={28}
                  className={
                    uploadingReverso
                      ? "animate-bounce text-[#3498db]"
                      : "text-gray-400"
                  }
                />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                  {uploadingReverso
                    ? "Subiendo imagen..."
                    : "Clic o arrastra aquí la foto del reverso"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadReverso}
                  disabled={uploadingReverso}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
        >
          <X size={20} /> Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md disabled:opacity-50"
        >
          <Save size={20} /> {submitting ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>

      {/* Modal: Nuevo Tipo de Personal */}
      {showModalTipo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-lg">
                  <Plus className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  Nuevo Tipo de Personal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalTipo(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTipo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Tipo *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Pasante, Eventual, Administrativo, etc."
                  value={nuevoTipoNombre}
                  onChange={(e) => setNuevoTipoNombre(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalTipo(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span>Cancelar</span>
                </button>
                <button
                  type="submit"
                  disabled={!nuevoTipoNombre.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Tipo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nueva Área de Personal */}
      {showModalArea && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-lg">
                  <Plus className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  Nueva Área de Personal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModalArea(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateArea} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre del Área *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: Mecánica, Chapería, Pintura, Lavado, etc."
                  value={nuevaAreaNombre}
                  onChange={(e) => setNuevaAreaNombre(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalArea(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span>Cancelar</span>
                </button>
                <button
                  type="submit"
                  disabled={savingArea || !nuevaAreaNombre.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingArea ? "Guardando..." : "Guardar Área"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal for Carnet */}
      {previewModalImg && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPreviewModalImg(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-2xl overflow-hidden flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-all transform hover:-translate-y-0.5 z-10"
              title="Cerrar vista previa"
            >
              <X size={20} />
            </button>
            <img
              src={previewModalImg}
              alt="Carnet Vista Previa"
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </>
  );
};
