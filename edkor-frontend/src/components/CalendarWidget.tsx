import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";

interface CalendarWidgetProps {
  selectedDate: string; // "YYYY-MM-DD"
  onDateSelect: (date: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAYS = ["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"];

const CalendarWidget: React.FC<CalendarWidgetProps> = ({
  selectedDate,
  onDateSelect,
  className = "",
}) => {
  // Parse initial date safely (avoid timezone shift by treating YYYY-MM-DD as local)
  const parseLocalDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  };

  const [currentDate, setCurrentDate] = useState<Date>(() =>
    parseLocalDate(selectedDate)
  );

  // Sync view when selectedDate changes from outside
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(parseLocalDate(selectedDate));
    }
  }, [selectedDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    onDateSelect(todayStr);
  };

  // Days calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  // Monday start: 0=Mon, 1=Tue, ..., 6=Sun
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;

  // Build grid cells
  const totalDaysSoFar = firstDayOfWeek + daysInMonth;
  const totalCells = totalDaysSoFar > 35 ? 42 : 35;
  const nextMonthDaysCount = totalCells - totalDaysSoFar;

  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;

  const cells = [];

  // Previous month trailing days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isSelected = selectedDate === dateStr;

    cells.push(
      <button
        key={`prev-${d}`}
        type="button"
        onClick={() => {
          setCurrentDate(prevMonthDate);
          onDateSelect(dateStr);
        }}
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-xs transition-all font-medium border-0 ${
          isSelected
            ? "bg-[#3498db] text-white font-bold shadow-md shadow-blue-500/30 scale-105"
            : "bg-transparent text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/40"
        }`}
      >
        {d}
      </button>
    );
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isSelected = selectedDate === dateStr;
    const isToday = todayStr === dateStr;
    const dayOfWeek = (new Date(year, month, d).getDay() + 6) % 7;
    const isWeekend = dayOfWeek >= 5;

    let dayStyle = "bg-transparent text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700/60 hover:text-[#3498db] border-0";
    if (isWeekend) {
      dayStyle = "bg-transparent text-rose-500/80 dark:text-rose-400/80 hover:bg-rose-50 dark:hover:bg-rose-900/20 border-0";
    }

    if (isSelected) {
      dayStyle = "bg-[#3498db] text-white font-bold shadow-md shadow-blue-500/30 scale-105 border-0";
    } else if (isToday) {
      dayStyle = "bg-transparent border-2 border-[#3498db] text-[#3498db] dark:text-blue-400 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20";
    }

    cells.push(
      <button
        key={`curr-${d}`}
        type="button"
        onClick={() => onDateSelect(dateStr)}
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-xs sm:text-sm font-semibold transition-all transform hover:-translate-y-0.5 active:translate-y-0 ${dayStyle}`}
      >
        {d}
      </button>
    );
  }

  // Next month leading days
  for (let d = 1; d <= nextMonthDaysCount; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isSelected = selectedDate === dateStr;

    cells.push(
      <button
        key={`next-${d}`}
        type="button"
        onClick={() => {
          setCurrentDate(nextMonthDate);
          onDateSelect(dateStr);
        }}
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-xs transition-all font-medium border-0 ${
          isSelected
            ? "bg-[#3498db] text-white font-bold shadow-md shadow-blue-500/30 scale-105"
            : "bg-transparent text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/40"
        }`}
      >
        {d}
      </button>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 border border-gray-100 dark:border-gray-700 flex flex-col justify-between ${className}`}
    >
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-[#3498db] rounded-lg">
            <CalendarIcon size={18} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white text-base capitalize leading-tight">
              {MONTH_NAMES[month]} {year}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToToday}
            className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-[#3498db] dark:text-blue-300 transition-all transform hover:-translate-y-0.5 mr-1 border border-blue-100 dark:border-blue-800/40"
            title="Ir al día de hoy"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 rounded-lg bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 border-0"
            title="Mes anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-lg bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0 border-0"
            title="Mes siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className={`text-[11px] font-bold uppercase tracking-wider py-1 ${
              idx >= 5 ? "text-rose-400/90 dark:text-rose-400" : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 place-items-center">
        {cells}
      </div>
    </div>
  );
};

export default CalendarWidget;
