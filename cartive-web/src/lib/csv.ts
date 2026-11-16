export function escapeCsvCell(value: string | number | null) {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[\s]*[=+\-@]/.test(value)) {
    text = `'${text}`;
  }
  return `"${text.replaceAll('"', '""')}"`;
}

export function serializeCsv(rows: Array<Array<string | number | null>>) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
