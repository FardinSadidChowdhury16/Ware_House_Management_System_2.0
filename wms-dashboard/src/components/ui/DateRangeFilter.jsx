import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  ChevronDown,
} from "lucide-react";

function toYMD(date) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYMD(str) {
  if (!str) return null;
  try {
    const [y, m, d] = str.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  } catch {
    return null;
  }
}

function formatDisplayDate(dateStr) {
  const d = parseYMD(dateStr);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function DateRangeFilter({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  placeholder = "Filter by Date Range",
  presets: presetsProp = null,
  fullWidth = false,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(fromDate || null);
  const [tempEnd, setTempEnd] = useState(toDate || null);
  const [hoverDate, setHoverDate] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    return parseYMD(fromDate) || new Date();
  });

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Sync internal state when props change
  useEffect(() => {
    setTempStart(fromDate || null);
    setTempEnd(toDate || null);
    if (fromDate) {
      const parsed = parseYMD(fromDate);
      if (parsed) setCurrentMonth(parsed);
    }
  }, [fromDate, toDate]);

  // Position popover right under trigger button using viewport coordinates
  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popoverWidth = window.innerWidth < 640 ? 300 : 450;
      const popoverHeight = 340;
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - popoverWidth - 12);
      }
      let top = rect.bottom + 6;
      if (top + popoverHeight > window.innerHeight - 12 && rect.top > popoverHeight + 12) {
        top = rect.top - popoverHeight - 6;
      }
      setCoords({
        top: Math.max(12, top),
        left: left,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
    }
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  // Calendar days computation
  const { monthName, calendarDays } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const name = currentMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({
        dateStr: toYMD(prevDate),
        dayNumber: d,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      days.push({
        dateStr: toYMD(curDate),
        dayNumber: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      days.push({
        dateStr: toYMD(nextDate),
        dayNumber: d,
        isCurrentMonth: false,
      });
    }

    return { monthName: name, calendarDays: days };
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Day click logic
  const handleDayClick = (dStr) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(dStr);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (dStr < tempStart) {
        setTempStart(dStr);
        setTempEnd(tempStart);
      } else {
        setTempEnd(dStr);
      }
    }
  };

  // Apply button
  const handleApply = () => {
    if (tempStart && tempEnd) {
      onFromDateChange(tempStart);
      onToDateChange(tempEnd);
    } else if (tempStart && !tempEnd) {
      onFromDateChange(tempStart);
      onToDateChange(tempStart);
    }
    setIsOpen(false);
  };

  // Quick Preset
  const applyPreset = (startStr, endStr) => {
    setTempStart(startStr);
    setTempEnd(endStr);
    onFromDateChange(startStr);
    onToDateChange(endStr);
    setIsOpen(false);
  };

  // Clear Filter
  const handleClear = (e) => {
    e?.stopPropagation();
    setTempStart(null);
    setTempEnd(null);
    onFromDateChange("");
    onToDateChange("");
  };

  const todayStr = toYMD(new Date());

  const presets = useMemo(() => {
    if (presetsProp === "warranty") {
      const now = new Date();
      const addMonths = (date, m) => {
        const d = new Date(date);
        d.setMonth(d.getMonth() + m);
        return d;
      };
      const addYears = (date, y) => {
        const d = new Date(date);
        d.setFullYear(d.getFullYear() + y);
        return d;
      };

      return [
        { label: "6 Months", start: todayStr, end: toYMD(addMonths(now, 6)) },
        { label: "1 Year", start: todayStr, end: toYMD(addYears(now, 1)) },
        { label: "2 Years", start: todayStr, end: toYMD(addYears(now, 2)) },
        { label: "3 Years", start: todayStr, end: toYMD(addYears(now, 3)) },
        { label: "5 Years", start: todayStr, end: toYMD(addYears(now, 5)) },
      ];
    }

    if (Array.isArray(presetsProp)) {
      return presetsProp;
    }

    const now = new Date();
    const yest = new Date();
    yest.setDate(now.getDate() - 1);

    const past7 = new Date();
    past7.setDate(now.getDate() - 6);

    const past30 = new Date();
    past30.setDate(now.getDate() - 29);

    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return [
      { label: "Today", start: todayStr, end: todayStr },
      { label: "Yesterday", start: toYMD(yest), end: toYMD(yest) },
      { label: "Last 7 Days", start: toYMD(past7), end: todayStr },
      { label: "Last 30 Days", start: toYMD(past30), end: todayStr },
      { label: "This Month", start: toYMD(firstOfMonth), end: todayStr },
    ];
  }, [todayStr, presetsProp]);

  const triggerLabel = useMemo(() => {
    if (fromDate && toDate) {
      if (fromDate === toDate) return formatDisplayDate(fromDate);
      return `${formatDisplayDate(fromDate)} → ${formatDisplayDate(toDate)}`;
    }
    if (fromDate) return `From ${formatDisplayDate(fromDate)}`;
    if (toDate) return `Until ${formatDisplayDate(toDate)}`;
    return placeholder;
  }, [fromDate, toDate, placeholder]);

  const monthsList = useMemo(
    () => [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ],
    []
  );

  const yearsList = useMemo(() => {
    const list = [];
    const thisYear = new Date().getFullYear();
    for (let y = thisYear - 5; y <= thisYear + 10; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const curYear = currentMonth.getFullYear();
  const curMonthIdx = currentMonth.getMonth();

  return (
    <div className={`relative ${fullWidth ? "w-full" : "inline-block"} text-left shrink-0 ${className}`}>
      {/* ─── Main Trigger Button ────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
        }}
        className={`${
          fullWidth ? "w-full justify-between" : "inline-flex"
        } items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-amber-500 shadow-sm transition-all select-none cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${
          fromDate || toDate
            ? "bg-amber-50/70 text-slate-900 hover:bg-amber-50"
            : "bg-white text-slate-800 hover:bg-amber-50/40"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarDays
            size={14}
            className="text-amber-500 shrink-0"
          />
          <span className="font-semibold truncate">{triggerLabel}</span>
        </div>

        <div className="flex items-center shrink-0">
          {/* Clear (X) icon directly on button when dates are set */}
          {(fromDate || toDate) && (
            <span
              role="button"
              title="Clear date filter"
              onClick={handleClear}
              className="p-0.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-amber-100 transition-colors mr-0.5"
            >
              <X size={12} />
            </span>
          )}

          <ChevronDown size={13} className="text-slate-400 ml-0.5" />
        </div>
      </button>

      {/* ─── Portal Calendar Popover (Rendered directly in body) ────────── */}
      {isOpen &&
        createPortal(
          <>
            {/* Backdrop to catch outside clicks and close */}
            <div
              className="fixed inset-0 z-[9998] bg-black/10 sm:bg-transparent"
              onClick={() => setIsOpen(false)}
            />

            {/* Popover Floating Container */}
            <div
              ref={popoverRef}
              style={{
                position: "fixed",
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 9999,
              }}
              className="bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col sm:flex-row overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150"
            >
              {/* Presets Sidebar */}
              <div className="w-full sm:w-36 bg-slate-50/80 border-b sm:border-b-0 sm:border-r border-slate-200 p-2.5 flex sm:flex-col gap-1 overflow-x-auto shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 hidden sm:block">
                  {presetsProp === "warranty" ? "Warranty Presets" : "Quick Presets"}
                </span>
                {presets.map((p) => {
                  const isSelected = fromDate === p.start && toDate === p.end;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p.start, p.end)}
                      className={`text-left text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? "bg-amber-500 text-white font-semibold shadow-sm hover:bg-amber-600"
                          : "text-slate-600 hover:bg-slate-200/70 hover:text-slate-900"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
                {(fromDate || toDate) && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-left text-xs px-2.5 py-1.5 rounded-md font-medium text-rose-600 hover:bg-rose-50 transition-colors mt-auto hidden sm:block cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Main Calendar Body */}
              <div className="p-3.5 w-72 sm:w-80 flex flex-col justify-between">
                <div>
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <div className="flex items-center gap-1">
                      <select
                        value={curMonthIdx}
                        onChange={(e) =>
                          setCurrentMonth(
                            new Date(curYear, Number(e.target.value), 1)
                          )
                        }
                        className="text-xs font-bold text-slate-800 bg-transparent hover:bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200 outline-none cursor-pointer focus:ring-1 focus:ring-amber-500"
                      >
                        {monthsList.map((m, idx) => (
                          <option key={m} value={idx}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        value={curYear}
                        onChange={(e) =>
                          setCurrentMonth(
                            new Date(Number(e.target.value), curMonthIdx, 1)
                          )
                        }
                        className="text-xs font-bold text-slate-800 bg-transparent hover:bg-slate-100 rounded px-1.5 py-0.5 border border-slate-200 outline-none cursor-pointer focus:ring-1 focus:ring-amber-500"
                      >
                        {yearsList.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Day of week abbreviations */}
                  <div className="grid grid-cols-7 text-center pt-2 pb-1 text-[11px] font-semibold text-slate-400">
                    <span>Su</span>
                    <span>Mo</span>
                    <span>Tu</span>
                    <span>We</span>
                    <span>Th</span>
                    <span>Fr</span>
                    <span>Sa</span>
                  </div>

                  {/* Days Grid */}
                  <div
                    className="grid grid-cols-7 gap-y-1 text-center text-xs"
                    onMouseLeave={() => setHoverDate(null)}
                  >
                    {calendarDays.map((d, index) => {
                      const isStart = d.dateStr === tempStart;
                      const isEnd = d.dateStr === tempEnd;
                      const isSameDay = isStart && isEnd;

                      const isInRange =
                        tempStart &&
                        tempEnd &&
                        d.dateStr > tempStart &&
                        d.dateStr < tempEnd;

                      const isInHover =
                        tempStart &&
                        !tempEnd &&
                        hoverDate &&
                        ((d.dateStr > tempStart && d.dateStr <= hoverDate) ||
                          (d.dateStr < tempStart && d.dateStr >= hoverDate));

                      const isToday = d.dateStr === todayStr;

                      return (
                        <div
                          key={`${d.dateStr}-${index}`}
                          className={`relative py-1 flex items-center justify-center ${
                            isInRange || isInHover
                              ? "bg-amber-50/90 text-amber-900"
                              : ""
                          } ${isStart && !isSameDay ? "rounded-l-lg" : ""} ${
                            isEnd && !isSameDay ? "rounded-r-lg" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleDayClick(d.dateStr)}
                            onMouseEnter={() => {
                              if (tempStart && !tempEnd) {
                                setHoverDate(d.dateStr);
                              }
                            }}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              isStart || isEnd
                                ? "bg-amber-500 text-white font-bold shadow-sm hover:bg-amber-600"
                                : !d.isCurrentMonth
                                ? "text-slate-300 hover:text-slate-500"
                                : isToday
                                ? "font-bold text-slate-900 underline decoration-amber-500 decoration-2"
                                : "text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {d.dayNumber}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Range Text & Actions */}
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 truncate">
                    {tempStart && tempEnd ? (
                      <span>
                        <strong className="text-slate-800">
                          {formatDisplayDate(tempStart)}
                        </strong>{" "}
                        →{" "}
                        <strong className="text-slate-800">
                          {formatDisplayDate(tempEnd)}
                        </strong>
                      </span>
                    ) : tempStart ? (
                      <span>Click end date...</span>
                    ) : (
                      <span>Click start date...</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-md font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      disabled={!tempStart}
                      className="px-3 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-md shadow-sm transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}