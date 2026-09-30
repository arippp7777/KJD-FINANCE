export type TripStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type TripType = "REGULER" | "CHARTER" | "KONTRAK";

export interface Trip {
  id: string;
  /** Format: TRP-YYYY-NNNN (e.g. TRP-2025-0001) */
  trip_no: string;
  date: string; // ISO 8601 date (YYYY-MM-DD)
  customer_id: string;
  unit_id: string;
  operator: string;
  origin: string;
  destination: string;
  trip_type: TripType;
  /** Raw number in IDR — never store as string or formatted Rupiah */
  revenue: number;
  notes: string;
  status: TripStatus;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

/**
 * Trip with denormalized customer/unit names + computed net profit.
 * net_profit is NEVER persisted — always derived: revenue - total_expenses.
 */
export interface TripWithDetails extends Trip {
  customer_name: string;
  unit_name: string;
  unit_code: string;
  total_expenses: number;
  /** Computed: revenue - total_expenses */
  net_profit: number;
  profit_margin: number;
  expenses: (import("./expense").Expense & { category_name?: string })[];
}

export interface CreateTripInput {
  date: string;
  customer_id: string;
  unit_id: string;
  operator: string;
  origin: string;
  destination: string;
  trip_type: TripType;
  revenue: number;
  notes?: string;
  status?: TripStatus;
}

export interface UpdateTripInput extends Partial<CreateTripInput> {
  id: string;
}
