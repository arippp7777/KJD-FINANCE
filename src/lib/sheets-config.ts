/**
 * Google Sheets Database Configuration
 * Phase 4 – KJD Finance (PT Putri Kharisma Jaya)
 *
 * SPREADSHEET_ID: Set via environment variable GOOGLE_SHEETS_SPREADSHEET_ID.
 * On Phase 5, this will be wired to a real Google Sheets via Service Account.
 */

// ---------------------------------------------------------------------------
// Spreadsheet identity
// ---------------------------------------------------------------------------

export const SPREADSHEET_ID =
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "";

// ---------------------------------------------------------------------------
// Sheet tab names (must match the actual tab names in the spreadsheet)
// ---------------------------------------------------------------------------

export const SHEET_NAMES = {
  TRIPS: "TRIPS",
  EXPENSES: "EXPENSES",
  CUSTOMERS: "CUSTOMERS",
  UNITS: "UNITS",
  EXPENSE_CATEGORIES: "EXPENSE_CATEGORIES",
  SETTINGS: "SETTINGS",
} as const;

export type SheetName = (typeof SHEET_NAMES)[keyof typeof SHEET_NAMES];

// ---------------------------------------------------------------------------
// Column definitions
// Each array represents the ordered column headers for that sheet.
// Column index = array position (0-based), maps to A, B, C, … in Sheets.
// ---------------------------------------------------------------------------

export const SHEET_COLUMNS = {
  TRIPS: [
    "id",
    "trip_no",
    "date",
    "customer_id",
    "unit_id",
    "operator",
    "origin",
    "destination",
    "trip_type",
    "revenue",
    "notes",
    "status",
    "created_at",
    "updated_at",
  ],

  EXPENSES: [
    "id",
    "trip_id",
    "category_id",
    "description",
    "amount",
    "expense_date",
    "created_at",
  ],

  CUSTOMERS: [
    "id",
    "name",
    "phone",
    "address",
    "contact_person",
    "status",
    "created_at",
    "updated_at",
  ],

  UNITS: [
    "id",
    "code",
    "name",
    "type",
    "plate_number",
    "status",
    "created_at",
    "updated_at",
  ],

  EXPENSE_CATEGORIES: [
    "id",
    "name",
    "description",
    "status",
    "created_at",
    "updated_at",
  ],

  SETTINGS: ["key", "value", "description", "updated_at"],
} as const;

// ---------------------------------------------------------------------------
// Row 1 is always the header row — data starts at row 2
// ---------------------------------------------------------------------------

export const HEADER_ROW = 1;
export const DATA_START_ROW = 2;

// ---------------------------------------------------------------------------
// Numeric columns — these must be stored/parsed as plain numbers, NOT strings
// ---------------------------------------------------------------------------

export const NUMERIC_COLUMNS: Record<SheetName, string[]> = {
  TRIPS: ["revenue"],
  EXPENSES: ["amount"],
  CUSTOMERS: [],
  UNITS: [],
  EXPENSE_CATEGORIES: [],
  SETTINGS: [],
};

// ---------------------------------------------------------------------------
// Relations (documented — enforced at application layer, not Sheets)
// ---------------------------------------------------------------------------
// CUSTOMERS.id  →  TRIPS.customer_id
// UNITS.id      →  TRIPS.unit_id
// TRIPS.id      →  EXPENSES.trip_id        (one-to-many)
// EXPENSE_CATEGORIES.id → EXPENSES.category_id
