export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export class ApiClient {
  private static readonly baseUrl = process.env.NEXT_PUBLIC_GAS_URL || "";

  /**
   * Core HTTP request to Google Apps Script.
   *
   * WHY THE CACHE BUSTER?
   * GAS responds to every request with a 302 redirect to a short-lived signed URL
   * on script.googleusercontent.com.  If the browser (or Next.js fetch cache) stores
   * that redirect, the next request replays the *same* signed URL – which by then has
   * expired – and Google returns 404.  Adding `_t=<timestamp>` to the URL makes every
   * request unique, preventing any caching of the redirect.
   *
   * WHY AUTO-RETRY?
   * Even with the cache buster, a stale cached redirect can sometimes slip through on
   * the very first request after the page loads (race condition with the HTTP cache).
   * A single automatic retry is enough to recover from that without any visible error.
   */
  private static async request<T>(
    method: "GET" | "POST",
    action: string,
    payload?: any,
    _retryCount = 0
  ): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("NEXT_PUBLIC_GAS_URL tidak dikonfigurasi.");
    }

    // Always append a unique timestamp so GAS redirect is never cached
    const cacheBuster = `_t=${Date.now()}`;
    let url = `${this.baseUrl}?${cacheBuster}`;
    let options: RequestInit;

    if (method === "GET") {
      // GET: append action + payload as query params
      const params = new URLSearchParams();
      params.append("action", action);
      if (payload) {
        Object.entries(payload).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }
      url = `${url}&${params.toString()}`;
      options = {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
      };
    } else {
      // POST: send action + payload as URL-encoded body
      // (application/x-www-form-urlencoded is a "simple" request – no CORS preflight)
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
        cache: "no-store",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      };
    }

    try {
      const response = await fetch(url, options);

      // If we hit a 404/5xx and haven't retried yet, wait briefly and retry once.
      // This recovers from the rare case where a stale cached GAS redirect slips through.
      if ((response.status === 404 || response.status >= 500) && _retryCount === 0) {
        console.warn(`[ApiClient] ${method} ${action} → HTTP ${response.status}. Retrying once…`);
        await new Promise((r) => setTimeout(r, 800));
        return this.request<T>(method, action, payload, 1);
      }

      if (!response.ok) {
        throw new Error(`Permintaan gagal (HTTP ${response.status}). Coba beberapa saat lagi.`);
      }

      // Guard: if GAS returns non-JSON (e.g. an HTML error page), give a clear message
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
        const body = await response.text();
        console.error(`[ApiClient] Non-JSON response for ${action}:`, body.slice(0, 300));
        throw new Error("Server mengembalikan format yang tidak dikenali. Coba beberapa saat lagi.");
      }

      const result: ApiResponse<T> = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Terjadi kesalahan di server.");
      }

      return result.data as T;
    } catch (error: any) {
      // Re-throw with a friendlier message if it's a raw network failure
      if (error?.name === "TypeError" && error?.message?.includes("fetch")) {
        throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
      }
      console.error(`[ApiClient] Error [${action}]:`, error);
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
