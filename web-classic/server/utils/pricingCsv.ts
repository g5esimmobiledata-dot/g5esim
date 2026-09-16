export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      current = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  if (rows.length < 2) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => {
    const item: CsvRow = {};
    headers.forEach((header, index) => {
      item[header] = cells[index]?.trim() || "";
    });
    return item;
  });
}

function escapeCsvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escapeCsvCell(row[header])).join(","));
  });
  return `${lines.join("\n")}\n`;
}

export function readCsvValue(row: CsvRow, aliases: string[]): string {
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase());
  const key = Object.keys(row).find((candidate) =>
    normalizedAliases.includes(candidate.trim().toLowerCase()),
  );
  return key ? row[key] : "";
}

export function normalizeMoneyInput(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`${label} must be a valid positive amount`);
  }
  return numeric.toFixed(2);
}

export function calculateMarkupPercent(cost: number, sellingPrice: number): string {
  if (!Number.isFinite(cost) || cost <= 0) return "0.00";
  return (((sellingPrice - cost) / cost) * 100).toFixed(2);
}
