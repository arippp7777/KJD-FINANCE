import type { TripStatus } from "./trip";

export interface ReportSummary {
  total_trips: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
}

export interface TripReportItem {
  id: string;
  trip_no: string;
  date: string;
  customer_name: string;
  unit_name: string;
  unit_code: string;
  revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
  status: TripStatus;
}

export interface ExpenseCategoryReport {
  category_name: string;
  transaction_count: number;
  total_amount: number;
  percentage: number;
}

export interface CustomerReportItem {
  customer_name: string;
  total_trips: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
}

export interface ReportResponse {
  summary: ReportSummary;
  trips: TripReportItem[];
  expenses_by_category: ExpenseCategoryReport[];
  customers: CustomerReportItem[];
}
