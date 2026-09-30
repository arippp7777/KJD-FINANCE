"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  FileText, Download, TrendingUp, TrendingDown, DollarSign, 
  Receipt, Truck, Search, Filter, AlertCircle 
} from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { formatIDR } from "@/lib/currency";
import { formatDateDisplay } from "@/lib/utils";
import type { ReportResponse } from "@/types/report";

export default function ReportsPage() {
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for API
  const now = new Date();
  const [year, setYear] = useState<string>(now.getFullYear().toString());
  const [month, setMonth] = useState<string>("ALL"); // "ALL" means null for month

  // Local filters for Trips table
  const [searchTrip, setSearchTrip] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"date" | "revenue" | "profit">("date");
  const [sortDesc, setSortDesc] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"TRIPS" | "EXPENSES" | "CUSTOMERS">("TRIPS");

  useEffect(() => {
    fetchReports();
  }, [year, month]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const reqMonth = month === "ALL" ? undefined : month;
      const res = await ApiClient.getReports({ year, month: reqMonth });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = "";
    let filename = "";

    if (activeTab === "TRIPS") {
      filename = `Profitability_Report_${year}${month !== "ALL" ? `_${month}` : ""}.csv`;
      csvContent = "Trip No,Tanggal,Customer,Unit,Revenue,Total Expense,Net Profit,Profit Margin,Status\n";
      filteredTrips.forEach(t => {
        csvContent += `"${t.trip_no}","${t.date}","${t.customer_name}","${t.unit_code}","${t.revenue}","${t.total_expenses}","${t.net_profit}","${t.profit_margin}%","${t.status}"\n`;
      });
    } else if (activeTab === "EXPENSES") {
      filename = `Expense_Report_${year}${month !== "ALL" ? `_${month}` : ""}.csv`;
      csvContent = "Kategori,Jumlah Transaksi,Total Expense,Persentase\n";
      data.expenses_by_category.forEach(e => {
        csvContent += `"${e.category_name}","${e.transaction_count}","${e.total_amount}","${e.percentage}%"\n`;
      });
    } else if (activeTab === "CUSTOMERS") {
      filename = `Customer_Report_${year}${month !== "ALL" ? `_${month}` : ""}.csv`;
      csvContent = "Customer,Total Trip,Total Revenue,Total Expense,Net Profit\n";
      data.customers.forEach(c => {
        csvContent += `"${c.customer_name}","${c.total_trips}","${c.total_revenue}","${c.total_expenses}","${c.net_profit}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTrips = useMemo(() => {
    if (!data) return [];
    let trips = data.trips;

    // Search
    if (searchTrip) {
      const lower = searchTrip.toLowerCase();
      trips = trips.filter(t => 
        t.trip_no.toLowerCase().includes(lower) || 
        t.customer_name.toLowerCase().includes(lower) ||
        t.unit_code.toLowerCase().includes(lower)
      );
    }

    // Status Filter
    if (statusFilter !== "ALL") {
      trips = trips.filter(t => t.status === statusFilter);
    }

    // Sorting
    trips = [...trips].sort((a, b) => {
      let diff = 0;
      if (sortBy === "date") diff = a.date.localeCompare(b.date);
      else if (sortBy === "revenue") diff = a.revenue - b.revenue;
      else if (sortBy === "profit") diff = a.net_profit - b.net_profit;
      return sortDesc ? -diff : diff;
    });

    return trips;
  }, [data, searchTrip, statusFilter, sortBy, sortDesc]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="text-blue-600" />
              Laporan Keuangan
            </h1>
            <p className="text-gray-500 text-sm mt-1">Analisis profitabilitas dan pengeluaran</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Semua Bulan</option>
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20"
            >
              <option value={now.getFullYear().toString()}>{now.getFullYear()}</option>
              <option value={(now.getFullYear() - 1).toString()}>{now.getFullYear() - 1}</option>
              <option value={(now.getFullYear() - 2).toString()}>{now.getFullYear() - 2}</option>
            </select>
            <button
              onClick={handleExportCSV}
              disabled={loading || !data}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-6 rounded-xl flex items-center gap-3 text-red-600">
            <AlertCircle size={24} />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : data ? (
          <>
            {/* KPI Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{formatIDR(data.summary.total_revenue)}</h3>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-medium">Total Expense</p>
                <h3 className="text-xl font-bold text-red-600 mt-1">{formatIDR(data.summary.total_expenses)}</h3>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-medium">Net Profit</p>
                <h3 className={`text-xl font-bold mt-1 ${data.summary.net_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatIDR(data.summary.net_profit)}
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-medium">Profit Margin</p>
                <h3 className={`text-xl font-bold mt-1 ${data.summary.profit_margin >= 20 ? "text-emerald-600" : data.summary.profit_margin > 0 ? "text-amber-600" : "text-red-600"}`}>
                  {data.summary.profit_margin}%
                </h3>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-medium">Total Trips</p>
                <h3 className="text-xl font-bold text-gray-900 mt-1">{data.summary.total_trips}</h3>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto border-b border-gray-200 hide-scrollbar">
              <button 
                className={`py-3 px-6 text-sm font-medium border-b-2 ${activeTab === "TRIPS" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("TRIPS")}
              >
                Profitability Trip
              </button>
              <button 
                className={`py-3 px-6 text-sm font-medium border-b-2 ${activeTab === "EXPENSES" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("EXPENSES")}
              >
                Breakdown Pengeluaran
              </button>
              <button 
                className={`py-3 px-6 text-sm font-medium border-b-2 ${activeTab === "CUSTOMERS" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                onClick={() => setActiveTab("CUSTOMERS")}
              >
                Kinerja Customer
              </button>
            </div>

            {/* TRIPS TAB */}
            {activeTab === "TRIPS" && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 bg-gray-50/50">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Cari trip, customer, unit..."
                      value={searchTrip}
                      onChange={e => setSearchTrip(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <div className="flex gap-2">
                    <select
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value as any)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="date">Urut: Tanggal</option>
                      <option value="revenue">Urut: Revenue</option>
                      <option value="profit">Urut: Profit</option>
                    </select>
                    <button 
                      onClick={() => setSortDesc(!sortDesc)}
                      className="px-3 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                    >
                      {sortDesc ? "↓" : "↑"}
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">Trip No & Tanggal</th>
                        <th className="px-4 sm:px-6 py-3 font-medium whitespace-nowrap">Customer & Unit</th>
                        <th className="px-4 sm:px-6 py-3 font-medium text-right whitespace-nowrap">Revenue</th>
                        <th className="px-4 sm:px-6 py-3 font-medium text-right whitespace-nowrap">Total Expense</th>
                        <th className="px-4 sm:px-6 py-3 font-medium text-right whitespace-nowrap">Net Profit</th>
                        <th className="px-4 sm:px-6 py-3 font-medium text-right whitespace-nowrap">Margin</th>
                        <th className="px-4 sm:px-6 py-3 font-medium text-center whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTrips.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Tidak ada data trip</td></tr>
                      ) : filteredTrips.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{t.trip_no}</div>
                            <div className="text-xs text-gray-500">{formatDateDisplay(t.date)}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 min-w-[150px] whitespace-normal">
                            <div className="text-gray-900 line-clamp-2" title={t.customer_name}>{t.customer_name}</div>
                            <div className="text-xs text-gray-500">{t.unit_code}</div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">{formatIDR(t.revenue)}</td>
                          <td className="px-4 sm:px-6 py-3 text-right text-red-600 whitespace-nowrap">{formatIDR(t.total_expenses)}</td>
                          <td className={`px-4 sm:px-6 py-3 text-right font-bold whitespace-nowrap ${t.net_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatIDR(t.net_profit)}
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-right whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${t.profit_margin >= 20 ? "bg-emerald-50 text-emerald-700" : t.profit_margin > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                              {t.profit_margin}%
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 text-center whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                              t.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : 
                              t.status === "ACTIVE" ? "bg-blue-100 text-blue-800" : 
                              "bg-red-100 text-red-800"
                            }`}>
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* EXPENSES TAB */}
            {activeTab === "EXPENSES" && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Kategori</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Jumlah Transaksi</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Total Expense</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Persentase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.expenses_by_category.length === 0 ? (
                        <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Tidak ada data pengeluaran</td></tr>
                      ) : data.expenses_by_category.map((e, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-4 font-medium text-gray-900 min-w-[150px] whitespace-normal">{e.category_name}</td>
                          <td className="px-4 sm:px-6 py-4 text-right text-gray-600 whitespace-nowrap">{e.transaction_count}</td>
                          <td className="px-4 sm:px-6 py-4 text-right font-medium text-red-600 whitespace-nowrap">{formatIDR(e.total_amount)}</td>
                          <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-gray-600 w-10 text-right">{e.percentage}%</span>
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 rounded-full" style={{ width: `${e.percentage}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CUSTOMERS TAB */}
            {activeTab === "CUSTOMERS" && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto hide-scrollbar">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="px-4 sm:px-6 py-4 font-medium whitespace-nowrap">Customer</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Total Trip</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Total Revenue</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Total Expense</th>
                        <th className="px-4 sm:px-6 py-4 font-medium text-right whitespace-nowrap">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.customers.length === 0 ? (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Tidak ada data customer</td></tr>
                      ) : data.customers.map((c, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 sm:px-6 py-4 font-medium text-gray-900 min-w-[150px] whitespace-normal">{c.customer_name}</td>
                          <td className="px-4 sm:px-6 py-4 text-right text-gray-600 whitespace-nowrap">{c.total_trips}</td>
                          <td className="px-4 sm:px-6 py-4 text-right text-emerald-600 whitespace-nowrap">{formatIDR(c.total_revenue)}</td>
                          <td className="px-4 sm:px-6 py-4 text-right text-red-600 whitespace-nowrap">{formatIDR(c.total_expenses)}</td>
                          <td className={`px-4 sm:px-6 py-4 text-right font-bold whitespace-nowrap ${c.net_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {formatIDR(c.net_profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </>
        ) : null}
      </div>
    </div>
  );
}
