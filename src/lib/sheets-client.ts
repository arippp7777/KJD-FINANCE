/**
 * Google Sheets Client — Phase 4 Stub
 *
 * This module defines the full contract (types + stub implementations) for
 * all Google Sheets database operations. In Phase 5, each stub will be
 * replaced with real googleapis calls via a Service Account.
 *
 * The interface surface is intentionally stable so that UI/business-logic
 * code written in Phase 3 can remain unchanged.
 */

import {
  SHEET_NAMES,
  SHEET_COLUMNS,
  NUMERIC_COLUMNS,
  type SheetName,
} from "./sheets-config";
import { rowToObject, objectToRow } from "./utils";

// ---------------------------------------------------------------------------
// Connection configuration type (populated from .env in Phase 5)
// ---------------------------------------------------------------------------

export interface SheetsClientConfig {
  spreadsheetId: string;
  /** Service Account credential JSON string (from env) */
  credentialsJson: string;
}

// ---------------------------------------------------------------------------
// Generic CRUD result types
// ---------------------------------------------------------------------------

export interface SheetReadResult<T> {
  data: T[];
  error: string | null;
}

export interface SheetWriteResult {
  success: boolean;
  error: string | null;
  /** The row index (1-based) where the record was written, if applicable */
  rowIndex?: number;
}

// ---------------------------------------------------------------------------
// Low-level Sheets operations interface
// Phase 5 will provide a real implementation of this interface.
// ---------------------------------------------------------------------------

export interface ISheetsClient {
  /**
   * Read all data rows from a sheet (excludes header row).
   * Returns raw string arrays — callers use rowToObject().
   */
  readRows(sheet: SheetName): Promise<string[][]>;

  /**
   * Append a new row to the end of a sheet.
   */
  appendRow(sheet: SheetName, row: string[]): Promise<SheetWriteResult>;

  /**
   * Update a specific row by its 1-based row index.
   */
  updateRow(
    sheet: SheetName,
    rowIndex: number,
    row: string[],
  ): Promise<SheetWriteResult>;

  /**
   * Find the 1-based row index of the first row where the given column
   * equals the given value. Returns -1 if not found.
   */
  findRowIndex(
    sheet: SheetName,
    column: string,
    value: string,
  ): Promise<number>;

  /**
   * Initialize a sheet with the correct header row if it is empty.
   */
  ensureHeaders(sheet: SheetName): Promise<void>;
}

// ---------------------------------------------------------------------------
// Stub client — used until Phase 5 wires up real googleapis
// ---------------------------------------------------------------------------

/**
 * SheetsClientStub — in-memory implementation of ISheetsClient.
 *
 * Data is stored per-sheet in module-level maps so it persists within a
 * single Node.js process lifecycle (useful for local dev without a real
 * spreadsheet). All data resets on server restart.
 *
 * Replace with `GoogleSheetsClient` in Phase 5.
 */
export class SheetsClientStub implements ISheetsClient {
  private store: Map<SheetName, string[][]> = new Map();

  private getStore(sheet: SheetName): string[][] {
    if (!this.store.has(sheet)) {
      this.store.set(sheet, []);
    }
    return this.store.get(sheet)!;
  }

  async readRows(sheet: SheetName): Promise<string[][]> {
    return this.getStore(sheet);
  }

  async appendRow(sheet: SheetName, row: string[]): Promise<SheetWriteResult> {
    const rows = this.getStore(sheet);
    rows.push(row);
    return { success: true, error: null, rowIndex: rows.length + 1 };
  }

  async updateRow(
    sheet: SheetName,
    rowIndex: number,
    row: string[],
  ): Promise<SheetWriteResult> {
    const rows = this.getStore(sheet);
    // rowIndex is 1-based; data rows start after header (offset by DATA_START_ROW - 1)
    const arrayIndex = rowIndex - 2; // row 2 → index 0
    if (arrayIndex < 0 || arrayIndex >= rows.length) {
      return { success: false, error: `Row index ${rowIndex} out of bounds` };
    }
    rows[arrayIndex] = row;
    return { success: true, error: null, rowIndex };
  }

  async findRowIndex(
    sheet: SheetName,
    column: string,
    value: string,
  ): Promise<number> {
    const columns = SHEET_COLUMNS[sheet] as readonly string[];
    const colIdx = columns.indexOf(column);
    if (colIdx === -1) return -1;

    const rows = this.getStore(sheet);
    const dataIdx = rows.findIndex((row) => row[colIdx] === value);
    if (dataIdx === -1) return -1;
    return dataIdx + 2; // convert 0-based array index → 1-based Sheets row (data starts row 2)
  }

  async ensureHeaders(sheet: SheetName): Promise<void> {
    // Stub does not maintain a header row — headers are implicit in SHEET_COLUMNS
  }
}

// ---------------------------------------------------------------------------
// Helper: typed read — reads rows and maps to objects
// ---------------------------------------------------------------------------

export async function readSheet<T extends object>(
  client: ISheetsClient,
  sheet: SheetName,
): Promise<T[]> {
  const rows = await client.readRows(sheet);
  const columns = SHEET_COLUMNS[sheet] as readonly string[];
  const numericCols = NUMERIC_COLUMNS[sheet];
  return rows.map((row) => rowToObject<T>(row, columns, numericCols));
}

// ---------------------------------------------------------------------------
// Helper: find by id — returns object or null
// ---------------------------------------------------------------------------

export async function findById<T extends object>(
  client: ISheetsClient,
  sheet: SheetName,
  id: string,
): Promise<T | null> {
  const rows = await readSheet<T>(client, sheet);
  return (rows.find((r) => (r as Record<string, unknown>)["id"] === id) as T) ?? null;
}

// ---------------------------------------------------------------------------
// Helper: write new record
// ---------------------------------------------------------------------------

export async function insertRecord(
  client: ISheetsClient,
  sheet: SheetName,
  record: Record<string, unknown>,
): Promise<SheetWriteResult> {
  const columns = SHEET_COLUMNS[sheet] as readonly string[];
  const row = objectToRow(record, columns);
  return client.appendRow(sheet, row);
}

// ---------------------------------------------------------------------------
// Helper: update existing record by id
// ---------------------------------------------------------------------------

export async function updateRecord(
  client: ISheetsClient,
  sheet: SheetName,
  record: Record<string, unknown>,
): Promise<SheetWriteResult> {
  const id = String(record["id"] ?? "");
  const rowIndex = await client.findRowIndex(sheet, "id", id);
  if (rowIndex === -1) {
    return { success: false, error: `Record with id "${id}" not found in ${sheet}` };
  }
  const columns = SHEET_COLUMNS[sheet] as readonly string[];
  const row = objectToRow(record, columns);
  return client.updateRow(sheet, rowIndex, row);
}

// ---------------------------------------------------------------------------
// Singleton stub instance — swapped with real client in Phase 5
// ---------------------------------------------------------------------------

let _client: ISheetsClient | null = null;

export function getSheetsClient(): ISheetsClient {
  if (!_client) {
    _client = new SheetsClientStub();
  }
  return _client;
}

/**
 * Override the singleton with a real implementation.
 * Called once during application bootstrap in Phase 5.
 */
export function setSheetsClient(client: ISheetsClient): void {
  _client = client;
}
