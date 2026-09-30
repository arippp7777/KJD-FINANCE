export interface DashboardSummary {
  period_label: string;
  total_trips: number;
  active_trips: number;
  completed_trips: number;
  cancelled_trips: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
}

export interface RevenueChartData {
  period: string;
  trip_count: number;
  revenue: number;
  expenses: number;
  net_profit: number;
  profit_margin: number;
}

export interface ExpenseByCategoryData {
  category_id: string;
  category_name: string;
  total_amount: number;
  percentage: number;
}

export interface TopCustomerData {
  id: string;
  name: string;
  trip_count: number;
  total_revenue: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  revenue_chart: RevenueChartData[];
  expense_by_category: ExpenseByCategoryData[];
  top_customers: TopCustomerData[];
  recent_trips: import("./trip").TripWithDetails[];
}
