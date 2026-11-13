import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Car,
  KeyRound,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [formData, setFormData] = useState({ email: "", password: "" });

  // Estados para modal de recuperación de contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      if (result.ok) {
        navigate("/");
      } else {
        setError(
          result.error ||
            "Credenciales inválidas. Por favor verifique su correo y contraseña."
        );
        setLoading(false);
      }
    } catch (err) {
      setError("No se pudo conectar con el servidor. Por favor intente más tarde.");
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setForgotError("Por favor ingresa tu correo electrónico.");
      return;
    }

    setForgotLoading(true);
    setForgotError(null);

    try {
      const res = await api.post("/users/forgot-password", { email: cleanEmail });
      setShowForgotModal(false);
      setForgotEmail("");
      await Swal.fire({
        icon: "success",
        title: "¡Contraseña Enviada!",
        text:
          res.data?.message ||
          "Se ha enviado una contraseña temporal a tu correo electrónico. Revisa tu bandeja de entrada o spam.",
        confirmButtonColor: "#dc2626",
        background: "#0f172a",
        color: "#f8fafc",
      });
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "No se pudo procesar la solicitud. Por favor verifica que el correo sea el correcto.";
      setForgotError(errorMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-900 text-slate-100 overflow-x-hidden overflow-y-auto">
      {/* ===================== COLUMNA IZQUIERDA: BRANDING / PRESENTACIÓN ===================== */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between p-8 xl:p-14 bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 border-r border-slate-800/80 overflow-hidden">
        {/* Glows ambientales y efectos de iluminación automotriz */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[30rem] h-[30rem] bg-rose-600/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

        {/* Encabezado superior del lado izquierdo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
            <Car size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-red-500 font-bold block">
              Plataforma Oficial
            </span>
            <span className="text-sm font-semibold text-slate-300 tracking-wide">
              EDKOR MOTORS S.R.L.
            </span>
          </div>
        </div>

        {/* Centro de la columna: Logo principal con marco elegante y copy */}
        <div className="relative z-10 my-auto py-8">
          {/* Tarjeta del logo con brillo sutil */}
          <div className="relative inline-block mb-8 group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-600/30 via-rose-500/20 to-transparent blur-xl opacity-75 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative bg-white rounded-2xl p-6 shadow-2xl shadow-black/60 border border-slate-700/50 max-w-sm">
              <img
                src="/logo.jpg"
                alt="EDKOR MOTORS Logo"
                className="w-full h-auto object-contain max-h-36 drop-shadow-sm"
              />
            </div>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Gestión Integral y Control de{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-red-400">
              Taller Automotriz
            </span>
          </h1>

          <p className="mt-4 text-slate-400 text-base max-w-lg leading-relaxed">
            Plataforma centralizada para la administración de hojas de recepción,
            diagnósticos técnicos, cotizaciones, órdenes de trabajo, inventarios y finanzas.
          </p>

          {/* Lista de características clave */}
          <div className="mt-8 space-y-3.5">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <Wrench size={16} />
              </div>
              <span className="text-sm font-medium">
                Trazabilidad completa de órdenes y aranceles mecánicos
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <CheckCircle2 size={16} />
              </div>
              <span className="text-sm font-medium">
                Control de inventario, compras y repuestos en tiempo real
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-300">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <ShieldCheck size={16} />
              </div>
              <span className="text-sm font-medium">
                Auditoría multi-sucursal, seguridad por roles y permisos
              </span>
            </div>
          </div>
        </div>

        {/* Pie de la columna izquierda */}
        <div className="relative z-10 pt-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
          <span>© {new Date().getFullYear()} EDKOR MOTORS</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistema en Línea v2.0
          </span>
        </div>
      </div>

      {/* ===================== COLUMNA DERECHA: FORMULARIO DE ACCESO ===================== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-8 sm:p-10 lg:p-12 xl:p-16 bg-slate-900/95 dark:bg-slate-950 min-h-screen lg:min-h-0">
        <div className="w-full max-w-md my-auto">
          {/* Logo en vista móvil/tablet (oculto en pantallas grandes) */}
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <div className="inline-block bg-white p-3.5 sm:p-4 rounded-2xl shadow-xl shadow-black/40 mb-3 border border-slate-700/50">
              <img
                src="/logo.jpg"
                alt="EDKOR MOTORS"
                className="h-12 sm:h-16 w-auto object-contain mx-auto"
              />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">EDKOR MOTORS</h2>
            <p className="text-xs text-slate-400">Sistema de Gestión de Taller</p>
          </div>

          {/* Encabezado del Formulario */}
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-2.5 sm:mb-3">
              <ShieldCheck size={14} />
              Portal Administrativo
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-400">
              Ingresa tus credenciales autorizadas para acceder a tu panel de trabajo.
            </p>
          </div>

          {/* Banner de Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-sm flex items-start gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo: Correo Electrónico */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="usuario@edkormotors.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/70 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700 focus:border-red-500 rounded-xl text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                />
              </div>
            </div>

            {/* Campo: Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300"
                >
                  Contraseña
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••••••"
                  className="w-full pl-11 pr-11 py-3 bg-slate-800/70 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700 focus:border-red-500 rounded-xl text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ backgroundColor: "transparent", border: "none" }}
                  className="absolute inset-y-0 right-0 px-3.5 py-0 bg-transparent hover:bg-transparent border-0 flex items-center text-slate-300 hover:text-red-400 focus:outline-none transition-colors"
                  tabIndex={-1}
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Opciones: Recordarme & Olvidaste tu contraseña */}
            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap sm:flex-nowrap">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-red-600 focus:ring-red-500/20 bg-slate-800 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-xs text-slate-400 hover:text-slate-300 transition-colors">
                  Mantener sesión iniciada
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setForgotError(null);
                  setForgotEmail(formData.email || "");
                  setShowForgotModal(true);
                }}
                className="text-xs text-red-400 hover:text-red-300 font-medium hover:underline bg-transparent border-0 p-0 cursor-pointer transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón de Ingreso */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full relative py-3.5 px-4 rounded-xl font-bold text-sm text-white shadow-xl shadow-red-600/25 bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:via-red-600 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all duration-300 transform active:scale-[0.99] flex items-center justify-center gap-2 ${
                loading
                  ? "opacity-75 cursor-not-allowed"
                  : "hover:-translate-y-0.5 hover:shadow-red-600/35"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <svg
                    className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Pie de seguridad */}
          <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-800/60 text-center">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5 flex-wrap">
              <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0" />
              <span>Conexión protegida y cifrada para personal autorizado.</span>
            </p>
          </div>
        </div>
      </div>

      {/* ===================== MODAL: RECUPERAR CONTRASEÑA ===================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 my-auto">
            {/* Botón cerrar modal */}
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(false);
                setForgotError(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Cerrar"
            >
              <X size={20} />
            </button>

            {/* Cabecera del modal */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Recuperar Contraseña</h3>
                <span className="text-xs text-slate-400">Verificación de usuario</span>
              </div>
            </div>

            <p className="text-sm text-slate-300 mb-5 leading-relaxed">
              Ingresa el correo electrónico registrado en tu cuenta de <strong className="text-white">EDKOR MOTORS</strong>. Si eres un usuario registrado y activo, te enviaremos una contraseña temporal a tu bandeja de correo.
            </p>

            {/* Banner de error dentro del modal */}
            {forgotError && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">{forgotError}</div>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
                >
                  Correo Electrónico Registrado
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail size={18} />
                  </div>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    autoFocus
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="usuario@edkormotors.com"
                    className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-700 focus:border-red-500 rounded-xl text-white text-base sm:text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-lg shadow-red-600/25 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all flex items-center justify-center gap-2 ${
                    forgotLoading ? "opacity-75 cursor-not-allowed" : "hover:-translate-y-0.5"
                  }`}
                >
                  {forgotLoading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Enviando...</span>
                    </>
                  ) : (
                    <span>Enviar Contraseña Temporal</span>
                  )}
                </button>

                <button
                  type="button"
                  disabled={forgotLoading}
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotError(null);
                  }}
                  className="py-3 px-4 rounded-xl font-medium text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-colors"
                >
                  Volver al Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
