export type CategoryStatus = "ACTIVE" | "INACTIVE";

export interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  status: CategoryStatus;
  created_at: string; // ISO 8601
  updated_at: string; // ISO 8601
}

export interface Expense {
  id: string;
  trip_id: string;
  category_id: string;
  description: string;
  /** Raw number in IDR — never store as string or formatted Rupiah */
  amount: number;
  expense_date: string; // ISO 8601 date (YYYY-MM-DD)
  created_at: string; // ISO 8601
}

export interface CreateExpenseInput {
  trip_id: string;
  category_id: string;
  description: string;
  amount: number;
  expense_date: string;
}

export interface CreateCategoryInput {
  name: string;
  description: string;
  status?: CategoryStatus;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  id: string;
}
