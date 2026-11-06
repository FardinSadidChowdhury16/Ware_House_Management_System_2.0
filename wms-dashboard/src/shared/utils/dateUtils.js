/**
 * Format date & time in Bangladesh Standard Time (UTC+6)
 * Adjusts UTC database timestamps by +6 hours for Asia/Dhaka
 */
export function formatBDDateTime(dateInput, options = {}) {
  if (!dateInput) return "—";

  let dateStr = String(dateInput).trim();
  let ms;

  if (dateStr.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr);
    ms = d.getTime();
  } else {
    // If date has a space like "2026-10-01 07:10:00", normalize to ISO
    const normalized = dateStr.includes(" ") ? dateStr.replace(" ", "T") : dateStr;
    const d = new Date(normalized + "Z");
    if (!isNaN(d.getTime())) {
      ms = d.getTime();
    } else {
      const raw = new Date(dateStr);
      ms = raw.getTime() + 6 * 60 * 60 * 1000;
    }
  }

  const dateObj = new Date(ms);
  if (isNaN(dateObj.getTime())) return String(dateInput);

  return dateObj.toLocaleString("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...options,
  });
}

export function formatBDDate(dateInput, options = {}) {
  if (!dateInput) return "—";
  return formatBDDateTime(dateInput, {
    hour: undefined,
    minute: undefined,
    hour12: undefined,
    ...options,
  });
}
