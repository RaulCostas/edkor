import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import Swal from "sweetalert2";
import ManualModal, { type ManualSection } from "./ManualModal";
import { uploadFile } from "../services/fileService";
import { createFormaPago } from "../services/formaPagoService";
import { Plus, X, Save, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { API_BASE_URL } from "../config";

const EgresoForm: React.FC = () => {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split("T")[0],
    detalle: "",
    monto: "",
    moneda: "Bolivianos",
    formaPagoId: "",
    imagen: "",
  });
  const [formasPago, setFormasPago] = useState<any[]>([]);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Modal rápida para nueva Forma de Pago
  const [showModalFormaPago, setShowModalFormaPago] = useState(false);
  const [nuevaFormaPagoNombre, setNuevaFormaPagoNombre] = useState('');
  const [savingFormaPago, setSavingFormaPago] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showManual, setShowManual] = useState(false);
  const manualSections: ManualSection[] = [
    {
      title: "Registro de Egresos",
      content:
        "Registre gastos generales del taller. Especifique detalle, monto, moneda y forma de pago.",
    },
    {
      title: "Moneda y Pago",
      content:
        "Seleccione la moneda (Bolivianos/Dólares) y la forma de pago para el registro contable correcto.",
    },
  ];
  useEffect(() => {
    fetchFormasPago();
    if (id) {
      api
        .get<any>(`/egresos/${id}`)
        .then((response) => {
          const data = response.data;
          setFormData({
            fecha: new Date(data.fecha).toISOString().split("T")[0],
            detalle: data.detalle,
            monto: data.monto.toString(),
            moneda: data.moneda,
            formaPagoId: data.formaPago?.id?.toString() || "",
            imagen: data.imagen || "",
          });
        })
        .catch((error) => {
          console.error("Error fetching egreso:", error);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Error al cargar el egreso",
          });
        });
    }
  }, [id]);
  const fetchFormasPago = async () => {
    try {
      const response = await api.get("/forma-pago");
      const activeFormasPago = (
        response.data.data ||
        response.data ||
        []
      ).filter((fp: any) => fp.estado?.toLowerCase() === "activo");
      setFormasPago(activeFormasPago);
    } catch (error) {
      console.error("Error fetching formas de pago:", error);
    }
  };
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const filename = await uploadFile(file);
      setFormData(prev => ({ ...prev, imagen: filename }));
      Swal.fire({
        icon: 'success',
        title: 'Comprobante cargado',
        text: 'La imagen se subió correctamente',
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error('Error subiendo comprobante:', err);
      Swal.fire('Error', 'No se pudo subir la imagen del comprobante', 'error');
    } finally {
      setUploadingImg(false);
    }
  };

  const handleCreateFormaPago = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nuevaFormaPagoNombre.trim();
    if (!trimmed) return;
    setSavingFormaPago(true);
    try {
      const created = await createFormaPago({
        forma_pago: trimmed,
        estado: 'activo'
      });
      await fetchFormasPago();
      setFormData(prev => ({ ...prev, formaPagoId: String(created.id) }));
      setShowModalFormaPago(false);
      setNuevaFormaPagoNombre('');
      Swal.fire({
        icon: 'success',
        title: 'Forma de Pago Creada',
        text: `Se agregó "${created.forma_pago}"`,
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error creando forma de pago:', error);
      Swal.fire('Error', 'No se pudo registrar la forma de pago', 'error');
    } finally {
      setSavingFormaPago(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        monto: parseFloat(formData.monto),
        formaPagoId: parseInt(formData.formaPagoId),
        imagen: formData.imagen || undefined,
      };
      if (id) {
        await api.patch(`/egresos/${id}`, payload);
        await Swal.fire({
          icon: "success",
          title: "Egreso Actualizado",
          text: "Egreso actualizado exitosamente",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("/egresos", payload);
        await Swal.fire({
          icon: "success",
          title: "Egreso Creado",
          text: "Egreso creado exitosamente",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      navigate("/egresos");
    } catch (error: any) {
      console.error("Error saving egreso:", error);
      const errorMessage =
        error.response?.data?.message || "Error al guardar el egreso";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: Array.isArray(errorMessage)
          ? errorMessage.join(", ")
          : errorMessage,
      });
    }
  };
  return (
    <div className="container mx-auto p-6 max-w-[700px] text-gray-800 dark:text-white">
      {" "}
      <div className="flex items-center justify-between mb-6">
        {" "}
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
          {" "}
          <span className="p-2 bg-red-100 dark:bg-red-900 rounded-lg text-red-600 dark:text-red-300">
            {" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {" "}
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
              />{" "}
            </svg>{" "}
          </span>{" "}
          {id ? "Editar Egreso" : "Nuevo Egreso"}{" "}
        </h2>{" "}
        <button
          type="button"
          onClick={() => setShowManual(true)}
          className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Ayuda / Manual"
        >
          {" "}
          ?{" "}
        </button>{" "}
      </div>{" "}
      <form onSubmit={handleSubmit} className="space-y-4">
        {" "}
        {/* Fecha */}{" "}
        <div>
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Fecha:
          </label>{" "}
          <div className="relative">
            {" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
            >
              {" "}
              <rect
                x="3"
                y="4"
                width="18"
                height="18"
                rx="2"
                ry="2"
              ></rect>{" "}
              <line x1="16" y1="2" x2="16" y2="6"></line>{" "}
              <line x1="8" y1="2" x2="8" y2="6"></line>{" "}
              <line x1="3" y1="10" x2="21" y2="10"></line>{" "}
            </svg>{" "}
            <input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />{" "}
          </div>{" "}
        </div>{" "}
        {/* Detalle */}{" "}
        <div>
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Detalle:
          </label>{" "}
          <div className="relative">
            {" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-6 text-gray-500 dark:text-gray-400 pointer-events-none"
            >
              {" "}
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>{" "}
              <polyline points="14 2 14 8 20 8"></polyline>{" "}
              <line x1="16" y1="13" x2="8" y2="13"></line>{" "}
              <line x1="16" y1="17" x2="8" y2="17"></line>{" "}
              <polyline points="10 9 9 9 8 9"></polyline>{" "}
            </svg>{" "}
            <textarea
              name="detalle"
              value={formData.detalle}
              onChange={handleChange}
              required
              rows={3}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />{" "}
          </div>{" "}
        </div>{" "}
        {/* Monto */}{" "}
        <div>
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Monto:
          </label>{" "}
          <div className="relative">
            {" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
            >
              {" "}
              <line x1="12" y1="1" x2="12" y2="23"></line>{" "}
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>{" "}
            </svg>{" "}
            <input
              type="number"
              step="0.01"
              name="monto"
              value={formData.monto}
              onChange={handleChange}
              required
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />{" "}
          </div>{" "}
        </div>{" "}
        {/* Moneda */}{" "}
        <div>
          {" "}
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Moneda:
          </label>{" "}
          <div className="relative">
            {" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
            >
              {" "}
              <line x1="12" y1="1" x2="12" y2="23"></line>{" "}
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>{" "}
            </svg>{" "}
            <select
              name="moneda"
              value={formData.moneda}
              onChange={handleChange}
              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              {" "}
              <option value="Bolivianos">Bolivianos</option>{" "}
              <option value="Dólares">Dólares</option>{" "}
            </select>{" "}
          </div>{" "}
        </div>{" "}
        {/* Forma de Pago */}
        <div>
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Forma de Pago:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none"
              >
                <rect
                  x="1"
                  y="4"
                  width="22"
                  height="16"
                  rx="2"
                  ry="2"
                ></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              <select
                name="formaPagoId"
                value={formData.formaPagoId}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">Seleccione...</option>
                {formasPago
                  .filter((fp) => fp.estado?.toLowerCase() === "activo")
                  .map((fp) => (
                    <option key={fp.id} value={fp.id}>
                      {fp.forma_pago}
                    </option>
                  ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setNuevaFormaPagoNombre("");
                setShowModalFormaPago(true);
              }}
              className="p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5 flex items-center justify-center shrink-0"
              title="Registrar nueva Forma de Pago"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subir Imagen de Factura / Recibo / Comprobante */}
        <div>
          <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
            Comprobante / Foto de Factura o Recibo:
          </label>
          {formData.imagen ? (
            <div className="relative border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700/40 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <img
                  src={`${API_BASE_URL}/files/${formData.imagen}`}
                  alt="Comprobante"
                  className="w-14 h-14 object-cover rounded-md border border-gray-200 dark:border-gray-600"
                  onError={(e) => {
                    (e.target as any).style.display = "none";
                  }}
                />
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {formData.imagen}
                  </p>
                  <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                    ✓ Archivo cargado
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, imagen: "" })}
                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                title="Quitar comprobante"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 rounded-lg p-4 text-center transition-colors bg-white dark:bg-gray-700">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                disabled={uploadingImg}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center gap-1">
                {uploadingImg ? (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Subiendo comprobante...
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-400" />
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      Haz clic o arrastra la foto de la factura / recibo
                    </p>
                    <p className="text-[10px] text-gray-400">
                      PNG, JPG, JPEG o PDF
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>{" "}
        <div className="flex gap-3 mt-6">
          {" "}
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transform hover:-translate-y-0.5 transition-all shadow-md"
          >
            {" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {" "}
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>{" "}
              <polyline points="17 21 17 13 7 13 7 21"></polyline>{" "}
              <polyline points="7 3 7 8 15 8"></polyline>{" "}
            </svg>{" "}
            {id ? "Actualizar" : "Guardar"}{" "}
          </button>{" "}
          <button
            type="button"
            onClick={() => navigate("/egresos")}
            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
          >
            {" "}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              {" "}
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />{" "}
            </svg>{" "}
            Cancelar{" "}
          </button>{" "}
        </div>{" "}
      </form>{" "}
      <ManualModal
        isOpen={showManual}
        onClose={() => setShowManual(false)}
        title="Manual - Egresos"
        sections={manualSections}
      />

      {/* Modal: Registrar Nueva Forma de Pago */}
      {showModalFormaPago && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-500" /> Nueva Forma de Pago
              </h2>
              <button
                type="button"
                onClick={() => setShowModalFormaPago(false)}
                className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center justify-center"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFormaPago} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre de la Forma de Pago *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ej: QR, Transferencia BNB, Efectivo..."
                  value={nuevaFormaPagoNombre}
                  onChange={(e) => setNuevaFormaPagoNombre(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-[#3498db] text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModalFormaPago(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingFormaPago}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm hover:shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingFormaPago ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}{" "}
    </div>
  );
};
export default EgresoForm;
