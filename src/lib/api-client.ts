export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export class ApiClient {
  private static readonly baseUrl = process.env.NEXT_PUBLIC_GAS_URL || "";

  private static async request<T>(
    method: "GET" | "POST",
    action: string,
    payload?: any
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("NEXT_PUBLIC_GAS_URL is not set");
    }

    let url = this.baseUrl;
    let options: RequestInit;

    if (method === "GET") {
      // GET: append all params as query string — no custom headers → no CORS preflight
      const params = new URLSearchParams();
      params.append("action", action);
      if (payload) {
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
      url = `${url}?${params.toString()}`;
      options = {
        method: "GET",
        redirect: "follow",
      };
    } else {
      // POST: send as URL-encoded form data (no Content-Type: application/json)
      // This is a "simple request" and does NOT trigger a CORS preflight.
      // GAS receives this via e.postData.contents and we JSON.stringify the payload.
      const params = new URLSearchParams();
      params.append("action", action);
      if (payload) {
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
          }
        });
      }
      options = {
        method: "POST",
        redirect: "follow",
        body: params.toString(),
        // application/x-www-form-urlencoded is a safe "simple" content type
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<T> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Unknown API error");
      }

      return result.data as T;
    } catch (error) {
      console.error(`API Error [${action}]:`, error);
      throw error;
    }
  }

  // --- TRIPS ---
  static async getTrips(params?: {
    status?: string;
    customer_id?: string;
    unit_id?: string;
    date_from?: string;
    date_to?: string;
  }) {
    return this.request<import("@/types/trip").TripWithDetails[]>("GET", "trips", params);
  }

  static async getTrip(id: string) {
    return this.request<import("@/types/trip").TripWithDetails>("GET", "trip", { id });
  }

  static async createTrip(data: import("@/types/trip").CreateTripInput) {
    return this.request<import("@/types/trip").TripWithDetails>("POST", "createTrip", data);
  }

  static async updateTrip(data: import("@/types/trip").UpdateTripInput) {
    return this.request<import("@/types/trip").TripWithDetails>("POST", "updateTrip", data);
  }

  static async deleteTrip(id: string) {
    return this.request<{ deleted_id: string; expenses_deleted: number }>("POST", "deleteTrip", { id });
  }

  // --- CUSTOMERS ---
  static async getCustomers(params?: { status?: string }) {
    return this.request<import("@/types/customer").Customer[]>("GET", "customers", params);
  }

  static async createCustomer(data: Omit<import("@/types/customer").Customer, "id" | "created_at" | "updated_at">) {
    return this.request<import("@/types/customer").Customer>("POST", "createCustomer", data);
  }

  static async updateCustomer(data: Partial<import("@/types/customer").Customer> & { id: string }) {
    return this.request<import("@/types/customer").Customer>("POST", "updateCustomer", data);
  }

  static async deleteCustomer(id: string) {
    return this.request<{ deleted_id: string }>("POST", "deleteCustomer", { id });
  }

  // --- UNITS ---
  static async getUnits(params?: { status?: string; type?: string }) {
    return this.request<import("@/types/unit").Unit[]>("GET", "units", params);
  }

  static async createUnit(data: Omit<import("@/types/unit").Unit, "id" | "created_at" | "updated_at">) {
    return this.request<import("@/types/unit").Unit>("POST", "createUnit", data);
  }

  static async updateUnit(data: Partial<import("@/types/unit").Unit> & { id: string }) {
    return this.request<import("@/types/unit").Unit>("POST", "updateUnit", data);
  }

  static async deleteUnit(id: string) {
    return this.request<{ deleted_id: string }>("POST", "deleteUnit", { id });
  }

  // --- EXPENSES ---
  static async getExpenses(params?: { trip_id?: string; category_id?: string }) {
    return this.request<(import("@/types/expense").Expense & { category_name?: string })[]>("GET", "expenses", params);
  }

  static async createExpense(data: import("@/types/expense").CreateExpenseInput) {
    return this.request<import("@/types/expense").Expense & { category_name?: string }>("POST", "createExpense", data);
  }

  static async updateExpense(data: { id: string } & Partial<import("@/types/expense").CreateExpenseInput>) {
    return this.request<import("@/types/expense").Expense & { category_name?: string }>("POST", "updateExpense", data);
  }

  static async deleteExpense(id: string) {
    return this.request<{ deleted_id: string }>("POST", "deleteExpense", { id });
  }

  // --- CATEGORIES ---
  static async getCategories(params?: { status?: string }) {
    return this.request<import("@/types/expense").ExpenseCategory[]>("GET", "categories", params);
  }

  static async createCategory(data: Omit<import("@/types/expense").ExpenseCategory, "id" | "created_at" | "updated_at">) {
    return this.request<import("@/types/expense").ExpenseCategory>("POST", "createCategory", data);
  }

  static async updateCategory(data: Partial<import("@/types/expense").ExpenseCategory> & { id: string }) {
    return this.request<import("@/types/expense").ExpenseCategory>("POST", "updateCategory", data);
  }

  static async deleteCategory(id: string) {
    return this.request<{ deleted_id: string }>("POST", "deleteCategory", { id });
  }

  // --- SETTINGS ---
  static async getSettings() {
    return this.request<import("@/types/settings").Setting[]>("GET", "settings");
  }

  static async updateSetting(key: string, value: string) {
    return this.request<import("@/types/settings").Setting>("POST", "updateSetting", { key, value });
  }

  // --- DASHBOARD ---
  static async getDashboard(params?: { year?: string; month?: string }) {
    return this.request<import("@/types/dashboard").DashboardResponse>("GET", "dashboard", params);
  }

  // --- REPORTS ---
  static async getReports(params?: { year?: string; month?: string }) {
    return this.request<import("@/types/report").ReportResponse>("GET", "reports", params);
  }
}
