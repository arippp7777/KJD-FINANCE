/**
 * Database Seed Data — Phase 4
 * PT Putri Kharisma Jaya Finance
 *
 * This module provides the canonical initial data for the Google Sheets
 * database. Call `seedDatabase()` once when setting up a fresh spreadsheet.
 *
 * Expense Categories, default Settings, and sample Units/Customers are
 * defined here. TRIPS and EXPENSES start empty.
 */

import { generateId, nowISO } from "./utils";
import {
  getSheetsClient,
  insertRecord,
  readSheet,
} from "./sheets-client";
import { SHEET_NAMES } from "./sheets-config";
import type { ExpenseCategory } from "../types/expense";
import type { Unit } from "../types/unit";
import type { Customer } from "../types/customer";
import type { Setting, SettingKey } from "../types/settings";

// ---------------------------------------------------------------------------
// Expense Categories seed
// ---------------------------------------------------------------------------

const EXPENSE_CATEGORIES_SEED: Omit<ExpenseCategory, "id" | "created_at" | "updated_at">[] = [
  { name: "Solar",       description: "Bahan bakar solar untuk operasional unit",  status: "ACTIVE" },
  { name: "Tol",         description: "Biaya tol selama perjalanan",               status: "ACTIVE" },
  { name: "Makan",       description: "Uang makan operator dan kru",               status: "ACTIVE" },
  { name: "Parkir",      description: "Biaya parkir kendaraan",                    status: "ACTIVE" },
  { name: "Operator",    description: "Upah atau honor operator kendaraan",        status: "ACTIVE" },
  { name: "Maintenance", description: "Biaya perawatan dan servis unit",           status: "ACTIVE" },
  { name: "Transportasi","description": "Biaya transportasi pendukung operasional",status: "ACTIVE" },
  { name: "Lain-lain",   description: "Pengeluaran operasional lainnya",           status: "ACTIVE" },
];

// ---------------------------------------------------------------------------
// Default Settings seed
// ---------------------------------------------------------------------------

const SETTINGS_SEED: { key: SettingKey; value: string; description: string }[] = [
  {
    key: "company_name",
    value: "PT Putri Kharisma Jaya",
    description: "Nama perusahaan",
  },
  {
    key: "company_address",
    value: "-",
    description: "Alamat perusahaan",
  },
  {
    key: "company_phone",
    value: "-",
    description: "Nomor telepon perusahaan",
  },
  {
    key: "company_email",
    value: "-",
    description: "Email perusahaan",
  },
  {
    key: "tax_percentage",
    value: "0",
    description: "Persentase pajak (0 = tidak ada pajak)",
  },
  {
    key: "currency_locale",
    value: "id-ID",
    description: "Locale untuk format mata uang",
  },
  {
    key: "trip_number_sequence",
    value: "0",
    description: "Nomor urut trip terakhir yang digunakan pada tahun berjalan (auto-increment)",
  },
];

// ---------------------------------------------------------------------------
// Seeder
// ---------------------------------------------------------------------------

export interface SeedResult {
  categories_seeded: number;
  settings_seeded: number;
  skipped_categories: number;
  errors: string[];
}

/**
 * Seed the Google Sheets database with initial data.
 *
 * - Expense Categories: inserts all 8 categories if the sheet is empty.
 * - Settings: upserts each key (inserts if missing).
 * - Does NOT overwrite existing data.
 *
 * Safe to call multiple times — idempotent for categories (skips if any exist).
 */
export async function seedDatabase(): Promise<SeedResult> {
  const client = getSheetsClient();
  const result: SeedResult = {
    categories_seeded: 0,
    settings_seeded: 0,
    skipped_categories: 0,
    errors: [],
  };

  // ---- Expense Categories ------------------------------------------------
  try {
    const existing = await readSheet<ExpenseCategory>(
      client,
      SHEET_NAMES.EXPENSE_CATEGORIES,
    );

    if (existing.length > 0) {
      result.skipped_categories = EXPENSE_CATEGORIES_SEED.length;
    } else {
      const now = nowISO();
      for (const cat of EXPENSE_CATEGORIES_SEED) {
        const record: ExpenseCategory = {
          id: generateId(),
          name: cat.name,
          description: cat.description,
          status: cat.status,
          created_at: now,
          updated_at: now,
        };
        const res = await insertRecord(
          client,
          SHEET_NAMES.EXPENSE_CATEGORIES,
          record as unknown as Record<string, unknown>,
        );
        if (res.success) {
          result.categories_seeded++;
        } else {
          result.errors.push(`Category "${cat.name}": ${res.error}`);
        }
      }
    }
  } catch (err) {
    result.errors.push(`Categories seed error: ${String(err)}`);
  }

  // ---- Settings ----------------------------------------------------------
  try {
    const existing = await readSheet<Setting>(client, SHEET_NAMES.SETTINGS);
    const existingKeys = new Set(existing.map((s) => s.key));
    const now = nowISO();

    for (const s of SETTINGS_SEED) {
      if (existingKeys.has(s.key)) continue; // already present — skip

      const record: Setting = {
        key: s.key,
        value: s.value,
        description: s.description,
        updated_at: now,
      };
      const res = await insertRecord(
        client,
        SHEET_NAMES.SETTINGS,
        record as unknown as Record<string, unknown>,
      );
      if (res.success) {
        result.settings_seeded++;
      } else {
        result.errors.push(`Setting "${s.key}": ${res.error}`);
      }
    }
  } catch (err) {
    result.errors.push(`Settings seed error: ${String(err)}`);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Convenience: seed on startup (call from app bootstrap or API route)
// ---------------------------------------------------------------------------

let _seeded = false;

/**
 * Seeds the database once per process lifetime.
 * Safe to call from Next.js server components, API routes, etc.
 */
export async function ensureSeeded(): Promise<void> {
  if (_seeded) return;
  _seeded = true;
  const result = await seedDatabase();
  if (process.env.NODE_ENV !== "production") {
    console.log("[KJD Finance] DB Seed:", result);
  }
}
