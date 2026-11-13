/**
 * Formats a date string or Date object to 'DD/MM/YYYY' format.
 * If the input is null or invalid, returns '-'.
 *
 * @param date - The date to format (string 'YYYY-MM-DD', ISO string, or Date object)
 * @returns formatted date string 'DD/MM/YYYY'
 */
export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return "-";

  if (typeof date === "string") {
    const datePart = date.split("T")[0];
    if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = datePart.split("-").map(Number);
      return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
    }
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Returns a date in 'YYYY-MM-DD' format using local time (never shifting due to UTC/timezone offset).
 * If no date is passed, returns today's local date.
 * Useful for initializing and binding <input type="date"> values.
 */
export const getLocalDateString = (dateInput?: string | Date | null): string => {
  if (dateInput) {
    if (typeof dateInput === "string") {
      const part = dateInput.split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(part)) return part;
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
