/**
 * Timezone setting for Bolivia
 */
export const BOLIVIA_TZ = 'America/La_Paz';

/**
 * Returns the current date parts in Bolivia timezone (UTC-4).
 */
export const getBoliviaDateParts = (dateInput: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOLIVIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(dateInput).split('-').map(Number);
  return { year, month, day };
};

/**
 * Formats a date string or Date object to 'DD/MM/YYYY' format using Bolivia timezone.
 * If the input is null or invalid, returns '-'.
 *
 * @param date - The date to format (string 'YYYY-MM-DD', ISO string, or Date object)
 * @returns formatted date string 'DD/MM/YYYY'
 */
export const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return "-";

  // If already plain YYYY-MM-DD (e.g. from input date), display directly
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split("-").map(Number);
    return `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`;
  }

  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  // Use Bolivia timezone formatting so UTC timestamps (e.g. 2026-11-21T02:00:00Z) display as Bolivia local date (20/11/2026)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BOLIVIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(d).split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Returns a date in 'YYYY-MM-DD' format using Bolivia time (never shifting due to UTC/server offset).
 * If no date is passed, returns today's date in Bolivia.
 * Useful for initializing and binding <input type="date"> values.
 */
export const getLocalDateString = (dateInput?: string | Date | null): string => {
  if (dateInput) {
    if (typeof dateInput === "string") {
      const part = dateInput.split("T")[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(part) && !dateInput.includes("T")) {
        return part;
      }
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: BOLIVIA_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
    }
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BOLIVIA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};
