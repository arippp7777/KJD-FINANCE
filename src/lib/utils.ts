import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// UUID
// ---------------------------------------------------------------------------

/** Generate a new UUID v4. Used as the primary key for all entities. */
export function generateId(): string {
  return uuidv4();
}

// ---------------------------------------------------------------------------
// Trip number (TRP-YYYY-NNNN)
// ---------------------------------------------------------------------------

/**
 * Build a trip number string.
 * @param year - 4-digit year (e.g. 2025)
 * @param sequence - Auto-increment sequence number for the year (e.g. 1 → "0001")
 */
export function buildTripNo(year: number, sequence: number): string {
  const seq = String(sequence).padStart(4, "0");
  return `TRP-${year}-${seq}`;
}

/**
 * Parse the year from an existing trip_no.
 * Returns null if the format is not recognised.
 */
export function parseTripNoYear(tripNo: string): number | null {
  const match = tripNo.match(/^TRP-(\d{4})-\d{4}$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parse the sequence number from an existing trip_no.
 * Returns null if the format is not recognised.
 */
export function parseTripNoSequence(tripNo: string): number | null {
  const match = tripNo.match(/^TRP-\d{4}-(\d{4})$/);
  return match ? parseInt(match[1], 10) : null;
}

// ---------------------------------------------------------------------------
// Date / time helpers
// ---------------------------------------------------------------------------

/** Current date as ISO 8601 date-only string: YYYY-MM-DD */
export function todayISODate(): string {
  return new Date().toISOString().split("T")[0];
}

/** Current timestamp as ISO 8601 string (UTC) */
export function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Format a raw ISO timestamp or date string for display (WIB, id-ID locale).
 * e.g. "29 Sep 2025"
 */
export function formatDateDisplay(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

/**
 * Format an ISO timestamp for display with time (WIB).
 * e.g. "29 Sep 2025, 14:30"
 */
export function formatDateTimeDisplay(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

// ---------------------------------------------------------------------------
// Net profit (computed — never stored)
// ---------------------------------------------------------------------------

/**
 * Calculate net profit for a trip.
 * This value must NEVER be persisted to storage.
 */
export function calcNetProfit(revenue: number, totalExpenses: number): number {
  return revenue - totalExpenses;
}

// ---------------------------------------------------------------------------
// Row ↔ Object mapping helpers (for Sheets rows, which are string arrays)
// ---------------------------------------------------------------------------

/**
 * Convert a raw Sheets row (string[]) to a typed object using the column
 * definition for that sheet.
 *
 * Numeric columns are coerced to numbers; all others remain strings.
 */
export function rowToObject<T extends object>(
  row: string[],
  columns: readonly string[],
  numericColumns: string[] = [],
): T {
  const obj: Record<string, unknown> = {};
  columns.forEach((col, i) => {
    const raw = row[i] ?? "";
    obj[col] = numericColumns.includes(col) ? parseFloat(raw) || 0 : raw;
  });
  return obj as T;
}

/**
 * Convert a typed object to an ordered string[] row for writing to Sheets.
 * Numbers are serialised to plain numeric strings (no formatting).
 */
export function objectToRow(
  obj: Record<string, unknown>,
  columns: readonly string[],
): string[] {
  return columns.map((col) => {
    const val = obj[col];
    if (val === null || val === undefined) return "";
    if (typeof val === "number") return String(val);
    return String(val);
  });
}
