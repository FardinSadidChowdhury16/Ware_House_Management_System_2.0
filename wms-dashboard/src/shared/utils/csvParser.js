/**
 * Robust CSV parser compliant with RFC 4180
 * Correctly parses multi-line values, escaped quotes (""), and varied line breaks (\r\n, \n).
 * 
 * @param {string} text - The raw CSV string
 * @returns {Array<Record<string, string>>} Array of objects where keys are column headers
 */
export function parseCSV(text) {
  if (!text || typeof text !== "string") return [];

  // Strip UTF-8 BOM if present
  let cleanText = text.replace(/^\uFEFF/, "");

  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  let i = 0;
  const len = cleanText.length;

  while (i < len) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentField += '"';
          i += 2;
          continue;
        } else {
          // Closing quote
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = "";
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i += 2;
        } else {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((c) => c !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        continue;
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = "";
        if (currentRow.some((c) => c !== "")) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push final field and row if any
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((c) => c !== "")) {
      rows.push(currentRow);
    }
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip empty rows
    if (row.length === 0 || row.every((c) => c === "")) continue;

    const rowObj = {};
    headers.forEach((header, colIdx) => {
      if (header) {
        rowObj[header] = row[colIdx] !== undefined ? row[colIdx] : "";
      }
    });
    data.push(rowObj);
  }

  return data;
}

