/**
 * Funciones de utilidad para manejar comprobantes múltiples (imágenes o PDFs)
 * guardados como nombre individual o JSON array en campo de texto.
 */

export const getComprobantesList = (comprobante?: string | null): string[] => {
  if (!comprobante || !comprobante.trim()) return [];
  const trimmed = comprobante.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      // fallback
    }
  }
  if (trimmed.includes(",")) {
    return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [trimmed];
};

export const serializeComprobantes = (list: string[]): string | undefined => {
  const filtered = list.filter((s) => typeof s === "string" && s.trim().length > 0);
  if (filtered.length === 0) return undefined;
  if (filtered.length === 1) return filtered[0];
  return JSON.stringify(filtered);
};
